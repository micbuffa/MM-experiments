import './beta.css';
import { unzlibSync } from 'fflate';
import { createVideoView } from './app/createVideoView';
import {
  readCachedArchive,
  registerBetaServiceWorker,
  writeCachedArchive,
} from './beta/betaCache';
import {
  BETA_VIEW_LABELS,
  betaAssetUrls,
  checkpointForStartLevel,
  nextBetaViewMode,
  parseBetaStartLevel,
  type BetaCheckpointLevel,
  type BetaStartLevel,
  type BetaViewMode,
} from './beta/betaState';
import { prepareEmulator, type ProbeSession } from './emulation/emulatorjs';
import {
  decodeIntermediateCheckpoint,
  type IntermediateCheckpoint,
} from './emulation/intermediateCheckpoint';
import {
  parseRollingActors,
  type RollingActors,
} from './emulation/rollingActors';
import { decodeRollingActorsBinary } from './emulation/rollingActorsBinary';
import { assembleRomArchive } from './emulation/romArchive';
import {
  clampPracticeFov,
  nextPracticeCamera,
  practiceLens,
  type PracticeCameraPreset,
} from './game/modern/practiceCameraSettings';
import {
  parsePracticeTerrain,
  type PracticeTerrain,
} from './game/modern/practiceTerrain';
import { arcadeShortcut } from './input/arcadeShortcuts';
import { DEFAULT_GAIN } from './input/relativeMotion';
import { requestPointerCapture } from './input/requestPointerCapture';
import { mountPracticeHud } from './ui/practiceHud';

const CAMERA_LABELS: Readonly<Record<PracticeCameraPreset, string>> = {
  arcade: 'Arcade',
  follow: 'Follow',
  overhead: 'Overhead',
  chase: 'Chase',
};

// Fallback cap if pixel probe cannot read the WebGL canvas (e.g. preserveDrawingBuffer=false).
const MAX_POST_FRAMES = 220;

const CHECKPOINT_FILES: Readonly<Record<BetaCheckpointLevel, string>> = {
  intermediate: 'intermediate-web.state',
  level3: 'level3-web.state',
  level4: 'level4-web.state',
  level5: 'level5-web.state',
};

async function fetchFirst(name: string): Promise<Response | undefined> {
  for (const url of betaAssetUrls(name, import.meta.env.BASE_URL)) {
    try {
      const response = await fetch(url, { cache: 'default' });
      if (response.ok) return response;
    } catch {
      // Try next candidate URL.
    }
  }
  return undefined;
}

async function loadBinary(
  name: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const response = await fetchFirst(name);
  if (!response) return undefined;
  return new Uint8Array(await response.arrayBuffer());
}

async function loadTerrain(name: string): Promise<PracticeTerrain | undefined> {
  const response = await fetchFirst(name);
  if (!response) return undefined;
  return parsePracticeTerrain(await response.text());
}

async function loadActors(): Promise<RollingActors | undefined> {
  const binary = await loadBinary('rolling-actors.bin');
  if (binary) return decodeRollingActorsBinary(binary);
  const response = await fetchFirst('rolling-actors.json');
  if (!response) return undefined;
  return parseRollingActors(await response.text());
}

async function loadCheckpoint(
  name: string,
): Promise<IntermediateCheckpoint | undefined> {
  const bytes = await loadBinary(name);
  return bytes ? decodeIntermediateCheckpoint(bytes) : undefined;
}

async function bootBeta() {
  const stage = document.getElementById('beta-stage')!;
  const loading = document.getElementById('beta-loading')!;
  const status = document.getElementById('beta-status')!;
  const substatus = document.getElementById('beta-substatus')!;
  const progressBar = document.getElementById('beta-progress')!;
  const progressTrack = progressBar.parentElement!;
  const attractOverlay = document.getElementById('attract-overlay')!;
  const attractHint = document.getElementById('attract-hint')!;
  const playBanner = document.getElementById('play-banner')!;
  const bannerView = document.getElementById('banner-view')!;
  const bannerCamera = document.getElementById('banner-camera')!;
  const bannerCapture = document.getElementById('banner-capture')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#babylon-video')!;
  const hudRoot = document.getElementById('practice-hud')!;
  const updateHud = mountPracticeHud(hudRoot);

  let selectedLevel: BetaStartLevel = 1;
  let phase: 'loading' | 'attract' | 'playing' = 'loading';
  let viewMode: BetaViewMode = 'direct';
  let cameraPreset: PracticeCameraPreset = 'arcade';
  let fov = practiceLens.initial;
  let twoPlayers = false;
  let spaceHeld = false;
  let restoring = false;
  let nullPoseFrames = 0;
  let bootFrames = 0;
  let audioUnlocked = false;
  let session: ProbeSession | undefined;
  let view: ReturnType<typeof createVideoView> | undefined;
  const controller = new AbortController();
  const signal = controller.signal;
  const probeCanvas = document.createElement('canvas');
  probeCanvas.width = 16;
  probeCanvas.height = 16;
  const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });

  function hasNonBlackFrame(source: HTMLCanvasElement): boolean {
    if (!probeCtx || !source.width || !source.height) return false;
    try {
      probeCtx.drawImage(source, 0, 0, 16, 16);
      const data = probeCtx.getImageData(0, 0, 16, 16).data;
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! + data[i + 1]! + data[i + 2]! > 36) lit++;
      }
      return lit >= 8;
    } catch {
      return false;
    }
  }

  function setProgress(percent: number, message: string, detail?: string) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    progressBar.style.width = `${clamped}%`;
    progressTrack.setAttribute('aria-valuenow', String(clamped));
    status.textContent = message;
    if (detail !== undefined) substatus.textContent = detail;
  }

  for (const radio of document.querySelectorAll<HTMLInputElement>(
    'input[name="start-level"]',
  )) {
    radio.addEventListener(
      'change',
      () => {
        if (radio.checked) selectedLevel = parseBetaStartLevel(radio.value);
      },
      { signal },
    );
  }

  function syncUi() {
    stage.dataset.phase = phase;
    stage.dataset.mode = phase === 'playing' ? viewMode : 'direct';
    loading.hidden = phase !== 'loading';
    attractOverlay.hidden = phase !== 'attract';
    playBanner.hidden = phase !== 'playing';
    bannerView.textContent = BETA_VIEW_LABELS[viewMode];
    bannerCamera.textContent = CAMERA_LABELS[cameraPreset];
    const locked =
      Boolean(session) && document.pointerLockElement === session?.canvas;
    bannerCapture.textContent = locked
      ? 'Mouse / trackpad captured'
      : 'Click to capture mouse / trackpad';
    if (audioUnlocked) {
      attractHint.innerHTML =
        'Press <kbd>5</kbd> then <kbd>1</kbd> or <kbd>2</kbd> to start';
    }
    if (view) {
      const wantModern = phase === 'playing' && viewMode !== 'direct';
      view.setPresentation(wantModern ? 'modern' : 'flat');
      view.setEnabled(wantModern);
      if (wantModern) window.dispatchEvent(new Event('resize'));
    }
  }

  function enterAttract() {
    phase = 'attract';
    viewMode = 'direct';
    nullPoseFrames = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    updateHud(undefined);
    syncUi();
  }

  function enterPlaying(restartFlyover: boolean) {
    phase = 'playing';
    viewMode = 'compare';
    nullPoseFrames = 0;
    syncUi();
    if (restartFlyover) view?.restartOpening();
  }

  function unlockAudio() {
    if (audioUnlocked || !session) return;
    audioUnlocked = true;
    session.resume();
    syncUi();
  }

  async function requestCapture() {
    if (!session || document.pointerLockElement === session.canvas) return;
    unlockAudio();
    session.resume();
    try {
      await requestPointerCapture(session.canvas);
      if (document.pointerLockElement === session.canvas) {
        session.canvas.tabIndex = 0;
        session.canvas.focus({ preventScroll: true });
        session.setCaptured(true);
      }
    } catch {
      // Ignore user cancellation.
    }
    syncUi();
  }

  const checkpoints = new Map<BetaCheckpointLevel, IntermediateCheckpoint>();
  let backgroundAssetsStarted = false;

  // Load Level 1 terrain immediately; defer heavy 3D actors & levels 2..5 until Attract Mode is live.
  const level1TerrainPromise = loadTerrain(
    'practice-complete-terrain.json',
  ).catch(() => undefined);

  function startBackgroundAssets() {
    if (backgroundAssetsStarted) return;
    backgroundAssetsStarted = true;
    void Promise.all([
      loadTerrain('intermediate-terrain-pipes.json').catch(() => undefined),
      loadTerrain('level3-terrain.json').catch(() => undefined),
      loadTerrain('level4-terrain.json').catch(() => undefined),
      loadTerrain('level5-terrain.json').catch(() => undefined),
      loadActors().catch(() => undefined),
    ]).then(([t2, t3, t4, t5, actors]) => {
      if (actors) view?.setActors(actors);
      for (const terrain of [t2, t3, t4, t5]) {
        if (terrain) view?.setModernTerrain(terrain, false);
      }
    });
  }

  async function startSelectedCheckpoint(level: BetaCheckpointLevel) {
    if (!session || restoring) return;
    restoring = true;
    try {
      startBackgroundAssets();
      let state = checkpoints.get(level);
      if (!state) {
        state = await loadCheckpoint(CHECKPOINT_FILES[level]);
        if (state) checkpoints.set(level, state);
      }
      if (!state) return;
      unlockAudio();
      session.resume();
      const ok = await session.restoreIntermediate?.(state, level);
      if (ok) enterPlaying(true);
    } finally {
      restoring = false;
    }
  }

  try {
    registerBetaServiceWorker(import.meta.env.BASE_URL);
    setProgress(
      15,
      'Loading arcade ROMs & BIOS…',
      'Checking local cache & reading marble.zip',
    );
    const [cachedRom, attractCompressed] = await Promise.all([
      readCachedArchive('marble-assembled-v1'),
      loadBinary('attract-web.state'),
    ]);
    let merged = cachedRom;
    if (!merged) {
      const [gameBytes, biosBytes] = await Promise.all([
        loadBinary('marble.zip'),
        loadBinary('atarisy1.zip'),
      ]);
      if (!gameBytes) {
        throw new Error('marble.zip not found in beta-data/ or roms/.');
      }
      setProgress(35, 'Verifying arcade archive…', 'Checking ROM checksums');
      merged = await assembleRomArchive(gameBytes, biosBytes);
      void writeCachedArchive('marble-assembled-v1', merged);
    }
    const attractState = attractCompressed
      ? unzlibSync(attractCompressed)
      : undefined;
    const archive = new File([merged], 'marble.zip', {
      type: 'application/zip',
    });

    setProgress(
      55,
      'Initializing MAME 2003-Plus…',
      'Starting WebAssembly arcade core',
    );
    let unsubscribeVideo: (() => void) | undefined;
    let attractRestored = false;
    session = await prepareEmulator(
      archive,
      () => {
        if (!session) return;
        session.setGain(DEFAULT_GAIN);
        session.setVolume(0.5);
        setProgress(
          82,
          'Preparing 3D renderer & worlds…',
          'Jumping directly to Attract Mode',
        );
        view = createVideoView(
          canvas,
          session.video,
          (error) => {
            console.error('BabylonJS error:', error);
          },
          undefined,
          {
            effects: session,
            modernHud(hud) {
              hudRoot.hidden = !hud || phase !== 'playing';
              updateHud(phase === 'playing' ? hud : undefined);
            },
            modernTwoPlayers(duo) {
              twoPlayers = duo;
            },
          },
        );
        view.setQuality('balanced');
        view.selectPracticeCamera(cameraPreset);
        view.setPracticeFov(fov);
        view.setPracticeMarbleShadows(true);

        void level1TerrainPromise.then((t1) => {
          if (t1) view?.setModernTerrain(t1, true);
        });

        if (attractState && session.restoreRawState?.(attractState)) {
          attractRestored = true;
        }

        unsubscribeVideo = session.video.subscribe(() => {
          const pose = session?.video.practicePose?.() ?? null;
          if (phase === 'loading') {
            bootFrames++;
            if (attractRestored && bootFrames >= 6) {
              setProgress(100, 'Ready!', 'Starting Attract Mode');
              enterAttract();
              startBackgroundAssets();
              return;
            }
            const pct = 82 + Math.min(18, (bootFrames / MAX_POST_FRAMES) * 18);
            setProgress(
              pct,
              'Booting Atari System 1 hardware…',
              'Starting Attract Mode',
            );
            const titleVisible =
              bootFrames >= 60 &&
              bootFrames % 8 === 0 &&
              session?.video.canvas !== undefined &&
              hasNonBlackFrame(session.video.canvas);
            if (titleVisible || bootFrames >= MAX_POST_FRAMES) {
              enterAttract();
              startBackgroundAssets();
            }
            return;
          }
          if (phase === 'attract' && pose !== null) {
            // Level 1 drives its own native pose.opening flyover; no extra reset needed.
            enterPlaying(false);
            return;
          }
          if (phase === 'playing') {
            if (pose === null) {
              nullPoseFrames++;
              if (nullPoseFrames > 240) enterAttract();
            } else {
              nullPoseFrames = 0;
            }
          }
        });
      },
      { startOnLoad: true },
    );

    window.addEventListener(
      'pointerdown',
      (event) => {
        unlockAudio();
        if (
          phase === 'playing' &&
          event.target instanceof Element &&
          !event.target.closest('input, button, label, fieldset')
        ) {
          void requestCapture();
        }
      },
      { signal },
    );

    document.addEventListener(
      'pointerlockchange',
      () => {
        if (session && document.pointerLockElement !== session.canvas) {
          session.setCaptured(false);
          if (spaceHeld) {
            spaceHeld = false;
            session.setBoost(false);
          }
        }
        syncUi();
      },
      { signal },
    );

    window.addEventListener(
      'keydown',
      (event) => {
        if (!session || event.ctrlKey || event.metaKey || event.altKey) return;
        const shortcut = arcadeShortcut(event);
        if (shortcut) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (event.repeat || phase === 'loading') return;
          unlockAudio();
          session.resume();
          const cp = checkpointForStartLevel(selectedLevel);
          if (phase === 'attract' && shortcut.button === 3 && cp) {
            void startSelectedCheckpoint(cp);
            return;
          }
          if (session.paused) session.resume();
          session.pulse(shortcut.button, shortcut.player);
          return;
        }
        const key = event.key.toLowerCase();
        if (event.code === 'Space' && phase === 'playing') {
          event.preventDefault();
          if (!spaceHeld) {
            spaceHeld = true;
            session.setBoost(true);
          }
          return;
        }
        if (event.key === 'Escape' && phase === 'playing') {
          if (document.pointerLockElement) document.exitPointerLock();
          return;
        }
        if (phase === 'playing' && !event.repeat) {
          if (key === 'v') {
            event.preventDefault();
            viewMode = nextBetaViewMode(viewMode, event.shiftKey);
            syncUi();
            return;
          }
          if (key === 'c' && viewMode !== 'direct') {
            event.preventDefault();
            cameraPreset = nextPracticeCamera(cameraPreset, twoPlayers);
            view?.selectPracticeCamera(cameraPreset);
            syncUi();
            return;
          }
          if (
            viewMode !== 'direct' &&
            (key === '+' || key === '=' || key === '-')
          ) {
            event.preventDefault();
            fov = clampPracticeFov(
              fov + (key === '-' ? practiceLens.step : -practiceLens.step),
            );
            view?.setPracticeFov(fov);
          }
        }
      },
      { signal, capture: true },
    );

    window.addEventListener(
      'keyup',
      (event) => {
        if (event.code === 'Space' && spaceHeld && session) {
          spaceHeld = false;
          session.setBoost(false);
        }
      },
      { signal, capture: true },
    );

    window.addEventListener(
      'beforeunload',
      () => {
        controller.abort();
        unsubscribeVideo?.();
        view?.dispose();
        session?.dispose();
      },
      { once: true },
    );
  } catch (error) {
    setProgress(100, 'Startup error', String(error));
  }
}

void bootBeta();
