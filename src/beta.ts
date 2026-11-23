import './beta.css';
import { createVideoView } from './app/createVideoView';
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
  follow: 'Suivi',
  overhead: 'Dessus',
  chase: 'Poursuite',
};

async function fetchFirst(name: string): Promise<Response | undefined> {
  for (const url of betaAssetUrls(name, import.meta.env.BASE_URL)) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
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
  let audioUnlocked = false;
  let session: ProbeSession | undefined;
  let view: ReturnType<typeof createVideoView> | undefined;
  const controller = new AbortController();
  const signal = controller.signal;

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
      ? 'Souris / trackpad capturé'
      : 'Clic pour capturer la souris / trackpad';
    if (audioUnlocked) {
      attractHint.innerHTML =
        'Appuyer sur <kbd>5</kbd> puis <kbd>1</kbd> ou <kbd>2</kbd> pour démarrer';
    }
    if (view) {
      const wantModern = phase === 'playing' && viewMode !== 'direct';
      view.setPresentation(wantModern ? 'modern' : 'flat');
      view.setEnabled(wantModern);
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

  function enterPlaying() {
    phase = 'playing';
    viewMode = 'compare';
    nullPoseFrames = 0;
    syncUi();
    view?.restartOpening();
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

  // Preload 3D assets in parallel with ROM assembly.
  const assetsPromise = Promise.all([
    loadTerrain('practice-complete-terrain.json').catch(() => undefined),
    loadTerrain('intermediate-terrain-pipes.json').catch(() => undefined),
    loadTerrain('level3-terrain.json').catch(() => undefined),
    loadTerrain('level4-terrain.json').catch(() => undefined),
    loadTerrain('level5-terrain.json').catch(() => undefined),
    loadActors().catch(() => undefined),
    loadCheckpoint('intermediate-web.state').catch(() => undefined),
    loadCheckpoint('level3-web.state').catch(() => undefined),
    loadCheckpoint('level4-web.state').catch(() => undefined),
    loadCheckpoint('level5-web.state').catch(() => undefined),
  ]);

  const checkpoints = new Map<BetaCheckpointLevel, IntermediateCheckpoint>();

  async function startSelectedCheckpoint(level: BetaCheckpointLevel) {
    if (!session || restoring) return;
    restoring = true;
    try {
      await assetsPromise;
      const state = checkpoints.get(level);
      if (!state) return;
      unlockAudio();
      session.resume();
      const ok = await session.restoreIntermediate?.(state, level);
      if (ok) enterPlaying();
    } finally {
      restoring = false;
    }
  }

  try {
    status.textContent = 'Chargement des archives arcade (marble.zip)…';
    const [gameBytes, biosBytes] = await Promise.all([
      loadBinary('marble.zip'),
      loadBinary('atarisy1.zip'),
    ]);
    if (!gameBytes) {
      throw new Error(
        'Archive marble.zip introuvable dans beta-data/ ou roms/.',
      );
    }
    const merged = await assembleRomArchive(gameBytes, biosBytes);
    const archive = new File([merged], 'marble.zip', {
      type: 'application/zip',
    });

    status.textContent = 'Initialisation de MAME 2003-Plus…';
    let unsubscribeVideo: (() => void) | undefined;
    session = await prepareEmulator(
      archive,
      () => {
        if (!session) return;
        session.setGain(DEFAULT_GAIN);
        session.setVolume(0.5);
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

        void assetsPromise.then(
          ([t1, t2, t3, t4, t5, actors, cp2, cp3, cp4, cp5]) => {
            if (actors) view?.setActors(actors);
            for (const terrain of [t1, t2, t3, t4, t5]) {
              if (terrain) view?.setModernTerrain(terrain, terrain === t1);
            }
            if (cp2) checkpoints.set('intermediate', cp2);
            if (cp3) checkpoints.set('level3', cp3);
            if (cp4) checkpoints.set('level4', cp4);
            if (cp5) checkpoints.set('level5', cp5);
          },
        );

        unsubscribeVideo = session.video.subscribe(() => {
          const pose = session?.video.practicePose?.() ?? null;
          if (phase === 'attract' && pose !== null) {
            enterPlaying();
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

        enterAttract();
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
          if (event.repeat) return;
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
    status.textContent = `Erreur au démarrage : ${String(error)}`;
  }
}

void bootBeta();
