import type { TerrainPalette } from './terrainPalette';
import { createSpatialOutput } from '../audio/spatialOutput';
import type { SpatialPose } from '../game/spatialMix';
import type { VenueEffects } from './venueEffects';
import { createEmulatorConfig, EMULATOR_DATA_PATH } from './config';
import {
  CORE_GLUE_SHA256,
  CORE_WASM_SHA256,
  isolateTrackpadPort,
  patchCoreInput,
} from './coreInputPatch';
import { createBoostMotion } from '../input/boostMotion';
import { createRelativeMotion } from '../input/relativeMotion';
import { createCameraRelativeMotion } from '../input/cameraRelativeMotion';
import { createMotionTimeline } from '../input/motionTimeline';
import { createNativeMotionMetrics } from '../input/nativeMotionMetrics';
import { createButtonPulses } from '../input/buttonPulses';
import type { ArcadeButton, ArcadePlayer } from '../input/buttonPulses';
import { directionButtons, directionMotion } from '../input/player2Keyboard';
import type { Direction } from '../input/player2Keyboard';
import type { VideoSource } from './videoSource';
import { readPracticePose, readModernPhase } from './practicePose';
import {
  matchesRestoredCheckpoint,
  restoreCheckpointPorts,
  restoreCheckpointHardware,
} from './intermediateCheckpoint';
import type {
  CheckpointLevel,
  IntermediateCheckpoint,
} from './intermediateCheckpoint';
import { patchCoreVideo } from './coreVideoPatch';
import { safariAudioLatency, setAudioLatency } from './retroArchAudio';

interface NativeMouseState {
  pendingX: number;
  pendingY: number;
  polledX: number;
  polledY: number;
  buttons: number;
}
interface RuntimeModule {
  HEAPU8?: Uint8Array;
  marbleBeforeIteration?: () => void;
  marbleOnVideoFrame?: () => void;
  marbleAfterIteration?: () => void;
  marbleNativeInput?: {
    state(): NativeMouseState;
    clear(): void;
    setPending(x: number, y: number): void;
  };
  marbleMouseTransform?: (
    event: MouseEvent,
    state: NativeMouseState,
  ) => [number, number];
  AL?: {
    currentCtx?: {
      audioCtx: AudioContext;
      gain: GainNode;
      sources: Array<{ gain: GainNode } | undefined>;
    };
  };
}
interface GameManager {
  supportsStates(): boolean;
  loadState(bytes: Uint8Array): void;
  getVideoDimensions(key: 'width' | 'height' | 'aspect'): number | undefined;
  FS: {
    mkdir(path: string): void;
    mount(type: unknown, options: object, path: string): void;
    filesystems: { MEMFS: unknown };
  };
  simulateInput(player: number, button: number, value: number): void;
  functions: { setKeyboardEnabled(value: number): void; getFrameNum(): number };
}
interface EmulatorInstance {
  canvas: HTMLCanvasElement;
  Module: RuntimeModule;
  gameManager: GameManager;
  started: boolean;
  paused: boolean;
  failedToStart: boolean;
  pause(): void;
  play(): void;
  setVolume(value: number): void;
  startGameError(message: string): void;
  on(event: string, callback: () => void): void;
}
interface EmulatorGlobals extends Window {
  EmulatorJS: {
    new (
      selector: string,
      config: ReturnType<typeof createEmulatorConfig>,
    ): EmulatorInstance;
    prototype: {
      checkForUpdates(): void;
      initGameCore(
        this: EmulatorInstance,
        js: Uint8Array<ArrayBuffer>,
        wasm: Uint8Array<ArrayBuffer>,
        thread?: Uint8Array<ArrayBuffer>,
      ): void;
    };
  };
  EJS_STORAGE: unknown;
  EJS_DUMMYSTORAGE: unknown;
  EJS_GameManager: {
    prototype: {
      mountFileSystems(this: GameManager): Promise<void>;
      getRetroArchCfg(this: GameManager): string;
    };
  };
}

export interface ProbeSession extends VenueEffects {
  readonly video: VideoSource;
  readonly canvas: HTMLCanvasElement;
  readonly started: boolean;
  readonly paused: boolean;
  readonly failed: boolean;
  readonly diagnostics: Record<string, unknown>;
  pause(): void;
  resume(): void;
  setCaptured(value: boolean): void;
  setBoost(value: boolean): void;
  setPlayer2Direction(direction: Direction, pressed: boolean): void;
  setGain(value: number): void;
  resetMetrics(): void;
  setVolume(value: number): void;
  pulse(button: ArcadeButton, player?: ArcadePlayer): void;
  restoreIntermediate?(
    checkpoint: IntermediateCheckpoint,
    level?: CheckpointLevel,
  ): Promise<boolean>;
  restoreRawState?(state: Uint8Array): boolean;
  dispose(): void;
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          'Frontend indisponible. Exécuter npm run setup:emulator puis recharger.',
        ),
      );
    document.head.appendChild(script);
  });
}

/** Une session par document. Les API internes et l'ABI sont liées aux versions figées. */
export async function prepareEmulator(
  archive: File,
  onStart: () => void,
  options: { startOnLoad?: boolean } = {},
): Promise<ProbeSession> {
  const [response] = await Promise.all([
    fetch(`${EMULATOR_DATA_PATH}localization/af-FR.json`),
    loadScript(`${EMULATOR_DATA_PATH}emulator.min.js`),
  ]);
  const globals = window as unknown as EmulatorGlobals;
  globals.EmulatorJS.prototype.checkForUpdates = () => {};
  globals.EJS_STORAGE = globals.EJS_DUMMYSTORAGE;
  globals.EJS_GameManager.prototype.mountFileSystems = function () {
    this.FS.mkdir('/data');
    this.FS.mkdir('/data/saves');
    this.FS.mount(this.FS.filesystems.MEMFS, {}, '/data/saves');
    return Promise.resolve();
  };
  const audioLatency = safariAudioLatency(navigator.userAgent);
  if (audioLatency !== undefined) {
    const gameManager = globals.EJS_GameManager.prototype;
    const getConfig = gameManager.getRetroArchCfg;
    gameManager.getRetroArchCfg = function () {
      return setAudioLatency(getConfig.call(this), audioLatency);
    };
  }
  const originalInit = globals.EmulatorJS.prototype.initGameCore;
  globals.EmulatorJS.prototype.initGameCore = function (js, wasm, thread) {
    void (async () => {
      const hash = async (bytes: Uint8Array<ArrayBuffer>) => {
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
      };
      const [glueHash, wasmHash] = await Promise.all([hash(js), hash(wasm)]);
      if (glueHash !== CORE_GLUE_SHA256 || wasmHash !== CORE_WASM_SHA256) {
        throw new Error(
          'Version glue/WASM MAME non vérifiée : arrêt du chargement.',
        );
      }
      const patched = patchCoreVideo(
        isolateTrackpadPort(patchCoreInput(new TextDecoder().decode(js))),
      );
      originalInit.call(this, new TextEncoder().encode(patched), wasm, thread);
    })().catch((error: unknown) => this.startGameError(String(error)));
  };
  if (!response.ok)
    throw new Error(
      'Traduction locale indisponible. Exécuter npm run setup:emulator.',
    );
  const translation: Record<string, string> = await response.json();
  const config = createEmulatorConfig(archive);
  if (options.startOnLoad) config.startOnLoad = true;
  config.langJson = { ...translation, ...config.langJson };
  const instance = new globals.EmulatorJS('#emulator', config);
  let captured = false;
  let volume = 0.5;
  let disposed = false;
  let restoring:
    | {
        level: CheckpointLevel;
        remaining: number;
        finish(restored: boolean): void;
      }
    | undefined;
  let analyser: AnalyserNode | undefined;
  const measured = new Set<GainNode>();
  const motionListeners = new Set<
    Parameters<VenueEffects['subscribeMotion']>[0]
  >();
  const player2Directions = new Set<Direction>();
  let listenerPose: SpatialPose | null = null;
  let spatial: ReturnType<typeof createSpatialOutput> | undefined;
  let spatialError: string | null = null;
  const signal = new Float32Array(256);
  const motion = createRelativeMotion();
  const cameraMotion = createCameraRelativeMotion();
  const nativeMetrics = createNativeMotionMetrics();
  const timeline = createMotionTimeline();
  const boost = createBoostMotion();
  const videoListeners = new Set<() => void>();
  let terrainPalette: TerrainPalette | undefined;
  function practicePose() {
    const heap = instance.Module?.HEAPU8;
    const pose =
      !disposed && instance.started && heap
        ? readPracticePose(
            heap,
            instance.gameManager.functions.getFrameNum(),
            terrainPalette,
          )
        : null;
    terrainPalette = pose?.terrainPalette;
    return pose;
  }
  const video: VideoSource = {
    practicePose,
    modernPhase() {
      const heap = instance.Module?.HEAPU8;
      return !disposed && instance.started && heap
        ? readModernPhase(heap)
        : 'loading';
    },
    get canvas() {
      return instance.canvas;
    },
    get geometry() {
      return {
        width: instance.gameManager.getVideoDimensions('width') ?? 0,
        height: instance.gameManager.getVideoDimensions('height') ?? 0,
        aspect: instance.gameManager.getVideoDimensions('aspect') ?? 0,
      };
    },
    subscribe(listener) {
      videoListeners.add(listener);
      return () => {
        videoListeners.delete(listener);
      };
    },
  };
  const pulses = createButtonPulses((button, down) =>
    instance.gameManager.simulateInput(0, button, down),
  );
  const player2Pulses = createButtonPulses((button, down) =>
    instance.gameManager.simulateInput(1, button, down),
  );
  const context = () => instance.Module?.AL?.currentCtx;
  let watchedAudio: AudioContext | undefined;
  function enforceAudioPause() {
    if (instance.paused && watchedAudio?.state === 'running')
      void watchedAudio.suspend().catch(() => {});
  }
  function watchAudio() {
    if (disposed) return;
    const audio = context()?.audioCtx;
    if (audio === watchedAudio) return;
    watchedAudio?.removeEventListener('statechange', enforceAudioPause);
    spatial?.dispose();
    spatial = undefined;
    analyser?.disconnect();
    analyser = undefined;
    measured.clear();
    watchedAudio = audio;
    watchedAudio?.addEventListener('statechange', enforceAudioPause);
    const ctx = context();
    if (ctx?.gain && typeof ctx.audioCtx.createStereoPanner === 'function') {
      try {
        spatial = createSpatialOutput(ctx.audioCtx, ctx.gain);
        spatial.update(listenerPose);
      } catch (error) {
        spatialError = String(error);
      }
    }
  }
  function resetMetrics() {
    motion.resetMetrics();
    nativeMetrics.reset();
    timeline.arm(motion.gain);
    boost.resetMetrics();
  }
  function clearInputs() {
    boost.reset();
    nativeMetrics.breakSequence();
    motion.reset();
    pulses.releaseAll();
    player2Pulses.releaseAll();
    player2Directions.clear();
    if (!instance.started) return;
    // ejs_set_keyboard_enabled(0) appelle zero_inputs() pour les 4 joueurs.
    instance.gameManager.functions.setKeyboardEnabled(0);
    instance.Module.marbleNativeInput?.clear();
  }
  function resumeAudio() {
    watchAudio();
    const ctx = context()?.audioCtx;
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
    instance.setVolume(volume);
  }
  function pauseSession() {
    timeline.stop('interrupted');
    captured = false;
    if (!instance.started) return;
    clearInputs();
    instance.pause();
    instance.setVolume(0);
    const ctx = context()?.audioCtx;
    if (ctx?.state === 'running') void ctx.suspend().catch(() => {});
  }
  instance.on('start', () => {
    if (disposed) {
      instance.pause();
      return;
    }
    instance.Module.marbleBeforeIteration = () => {
      if (disposed || instance.paused || !captured) return;
      const native = instance.Module.marbleNativeInput;
      if (!native) return;
      const command = boost.next();
      if (!command) return;
      native.setPending(command[0], command[1]);
      timeline.event(
        performance.now() / 1000,
        0,
        0,
        command[0],
        command[1],
        true,
      );
    };
    instance.Module.marbleAfterIteration = () => {
      if (disposed || instance.paused) return;
      if (restoring) {
        const restored = matchesRestoredCheckpoint(
          practicePose(),
          restoring.level,
        );
        if (restored || --restoring.remaining === 0) {
          const { finish } = restoring;
          restoring = undefined;
          finish(restored);
        }
      }
      if (captured) {
        const native = instance.Module.marbleNativeInput?.state();
        if (native) {
          nativeMetrics.sample(native.polledX, native.polledY);
          if (native.polledX || native.polledY)
            for (const listener of motionListeners)
              listener(native.polledX, native.polledY, 0);
          timeline.sample(
            performance.now() / 1000,
            instance.gameManager.functions.getFrameNum(),
            native.polledX,
            native.polledY,
          );
        }
        if (player2Directions.size) {
          const [x, y] = directionMotion(player2Directions);
          if (x || y) for (const listener of motionListeners) listener(x, y, 1);
        }
      }
    };
    instance.Module.marbleOnVideoFrame = () => {
      if (disposed || instance.paused) return;
      for (const listener of videoListeners) listener();
    };
    instance.Module.marbleMouseTransform = (event, native) => {
      if (
        !captured ||
        instance.paused ||
        !event.isTrusted ||
        document.pointerLockElement !== instance.canvas
      )
        return [0, 0];
      const [x, y] = cameraMotion.transform(event.movementX, event.movementY);
      boost.observe(x, y, performance.now() / 1000);
      const transformed = boost.held
        ? ([0, 0] as [number, number])
        : motion.transform(x, y, native.pendingX, native.pendingY);
      timeline.event(
        performance.now() / 1000,
        event.movementX,
        event.movementY,
        transformed[0],
        transformed[1],
      );
      return transformed;
    };
    clearInputs();
    watchAudio();
    document
      .querySelector<HTMLElement>('#emulator')
      ?.focus({ preventScroll: true });
    onStart();
  });
  return {
    video,
    setInputCamera: cameraMotion.setForward,
    subscribeMotion(listener) {
      motionListeners.add(listener);
      return () => {
        motionListeners.delete(listener);
      };
    },
    setSpatialListener(pose) {
      listenerPose = pose;
      watchAudio();
      try {
        spatial?.update(pose);
      } catch (error) {
        spatialError = String(error);
      }
    },
    get canvas() {
      return instance.canvas;
    },
    get started() {
      return instance.started;
    },
    get paused() {
      return instance.paused;
    },
    get failed() {
      return instance.failedToStart;
    },
    get diagnostics() {
      watchAudio();
      const ctx = context();
      let rms = 0;
      if (ctx && !disposed) {
        analyser ??= ctx.audioCtx.createAnalyser();
        analyser.fftSize = 256;
        for (const source of ctx.sources) {
          if (source?.gain && !measured.has(source.gain)) {
            source.gain.connect(analyser);
            measured.add(source.gain);
          }
        }
        analyser.getFloatTimeDomainData(signal);
        rms = Math.sqrt(
          signal.reduce((sum, value) => sum + value * value, 0) / signal.length,
        );
      }
      return {
        paused: instance.paused,
        captured,
        gain: motion.gain,
        ...motion.totals,
        native: instance.Module?.marbleNativeInput?.state() ?? null,
        nativeSampling: {
          mode: 'last-poll-after-emulator-iteration',
          ...nativeMetrics.snapshot,
        },
        motionTimeline: timeline.snapshot,
        boost: boost.snapshot,
        practicePose: practicePose(),
        videoGeometry: instance.started ? video.geometry : null,
        heldButtons: pulses.held,
        heldPlayer2Buttons: player2Pulses.held,
        heldPlayer2Directions: [...player2Directions],
        frame: instance.started
          ? instance.gameManager.functions.getFrameNum()
          : null,
        spatialAudio: spatial
          ? spatial.diagnostics
          : { routed: false, error: spatialError, available: false },
        audioState: ctx?.audioCtx.state ?? 'indisponible',
        audioLatencyRequestedMs: audioLatency ?? 64,
        audioSampleRate: ctx?.audioCtx.sampleRate ?? null,
        audioSources: ctx?.sources.filter(Boolean).length ?? 0,
        audioRms: Number(rms.toFixed(5)),
        volume,
      };
    },
    pause: pauseSession,
    resume() {
      if (disposed || !instance.started) return;
      clearInputs();
      resumeAudio();
      instance.play();
    },
    setCaptured(value) {
      // A successful new capture always starts an aligned, usable measurement.
      if (value && !captured) resetMetrics();
      if (!value) timeline.stop('capture-lost');
      clearInputs();
      captured = value;
    },
    setBoost(value) {
      if (value) {
        if (disposed || instance.paused || !captured || boost.held) return;
        resetMetrics();
        motion.reset();
        instance.Module.marbleNativeInput?.setPending(0, 0);
        boost.press(performance.now() / 1000);
      } else if (boost.held) {
        boost.release();
        motion.reset();
        instance.Module.marbleNativeInput?.setPending(0, 0);
      }
    },
    setPlayer2Direction(direction, pressed) {
      if (disposed || instance.paused || !captured) return;
      if (player2Directions.has(direction) === pressed) return;
      if (pressed) player2Directions.add(direction);
      else player2Directions.delete(direction);
      instance.gameManager.simulateInput(
        1,
        directionButtons[direction],
        Number(pressed),
      );
    },
    setGain(value) {
      motion.setGain(value);
      if (boost.held) instance.Module.marbleNativeInput?.setPending(0, 0);
      boost.reset();
      timeline.stop('gain-change', true);
    },
    resetMetrics,
    setVolume(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new RangeError('Volume hors limites.');
      volume = value;
      if (instance.started && !instance.paused) resumeAudio();
    },
    pulse(button, player = 0) {
      if (disposed || !instance.started || instance.paused) return;
      resumeAudio();
      (player === 1 ? player2Pulses : pulses).pulse(button);
    },
    restoreIntermediate({ state, ports, hardware }, level = 'intermediate') {
      const heap = instance.Module?.HEAPU8;
      if (
        disposed ||
        !instance.started ||
        !heap ||
        !instance.gameManager.supportsStates()
      )
        return Promise.resolve(false);
      restoring?.finish(false);
      restoring = undefined;
      clearInputs();
      instance.gameManager.loadState(state);
      restoreCheckpointPorts(heap, ports);
      restoreCheckpointHardware(heap, hardware);
      if (instance.paused) instance.play();
      return new Promise((resolve) => {
        restoring = { level, remaining: 120, finish: resolve };
      });
    },
    restoreRawState(state) {
      if (
        disposed ||
        !instance.started ||
        !instance.gameManager.supportsStates()
      )
        return false;
      clearInputs();
      instance.gameManager.loadState(state);
      if (instance.paused) instance.play();
      return true;
    },
    dispose() {
      restoring?.finish(false);
      restoring = undefined;
      timeline.stop('disposed', true);
      pauseSession();
      disposed = true;
      videoListeners.clear();
      motionListeners.clear();
      spatial?.dispose();
      if (instance.Module) {
        delete instance.Module.marbleAfterIteration;
        delete instance.Module.marbleBeforeIteration;
        delete instance.Module.marbleOnVideoFrame;
        delete instance.Module.marbleMouseTransform;
      }
      watchedAudio?.removeEventListener('statechange', enforceAudioPause);
      for (const gain of measured) {
        try {
          if (analyser) gain.disconnect(analyser);
        } catch {
          /* Source déjà libérée par le cœur. */
        }
      }
      analyser?.disconnect();
      measured.clear();
    },
  };
}
