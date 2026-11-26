import './remaster.css';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  clampPracticeFov,
  nextPracticeCamera,
  practiceLens,
  type PracticeCameraPreset,
} from '../game/modern/practiceCameraSettings';
import {
  parsePracticeTerrain,
  type PracticeTerrain,
} from '../game/modern/practiceTerrain';
import { practiceDisplayTerrain } from '../rendering/createPracticeLandmarks';
import { intermediateDisplayTerrain } from '../rendering/intermediateLandmarks';
import { createRemasterAudio } from './audio/createRemasterAudio';
import { REMASTER_PHYSICS } from './engine/physicsConstants';
import {
  DEFAULT_REMASTER_CONTROLS,
  parseRemasterControlMode,
  readKeyboardScreenInput,
  resolveRemasterControls,
  type RemasterControlMode,
  type RemasterPlayerControls,
} from './engine/remasterControls';
import {
  createRemasterSimulation,
  type PlayerInput,
} from './engine/remasterSimulation';
import { practiceTerrainToRemasterLevel } from './levels/remasterLevel';
import { createHavokBackend } from './physics/createHavokBackend';
import { createRemasterScene } from './rendering/createRemasterScene';

const CAMERA_LABELS: Record<PracticeCameraPreset, string> = {
  arcade: 'Arcade',
  follow: 'Follow',
  overhead: 'Overhead',
  chase: 'Chase',
  chaseHigh: 'Chase High',
};

async function loadCourseTerrain(courseIndex: 1 | 2): Promise<PracticeTerrain> {
  const filename =
    courseIndex === 2
      ? 'intermediate-terrain-pipes.json'
      : 'practice-complete-terrain.json';
  const candidates = [
    `/__local-roms/${filename}`,
    `${import.meta.env.BASE_URL}beta-data/${filename}`,
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return parsePracticeTerrain(await response.text());
    } catch {
      // Try next source.
    }
  }
  throw new Error(`Impossible de charger ${filename}.`);
}

async function bootRemaster() {
  const canvas = document.querySelector<HTMLCanvasElement>('#remaster-canvas')!;
  const scoreEl = document.querySelector<HTMLElement>('#hud-score')!;
  const p2HudBlock = document.querySelector<HTMLElement>('#hud-p2-block')!;
  const scoreP2El = document.querySelector<HTMLElement>('#hud-score-p2')!;
  const timerEl = document.querySelector<HTMLElement>('#hud-timer')!;
  const levelLabelEl = document.querySelector<HTMLElement>('#hud-level-label')!;
  const statusEl = document.querySelector<HTMLElement>('#hud-status')!;
  const bannerEl = document.querySelector<HTMLElement>('#remaster-banner')!;
  const bannerTitle = document.querySelector<HTMLElement>('#banner-title')!;
  const bannerSub = document.querySelector<HTMLElement>('#banner-sub')!;
  const levelSelect =
    document.querySelector<HTMLSelectElement>('#level-select')!;
  const btnCamera = document.querySelector<HTMLButtonElement>('#btn-camera')!;
  const btnPlayers = document.querySelector<HTMLButtonElement>('#btn-players')!;
  const p1ControlSelect =
    document.querySelector<HTMLSelectElement>('#p1-control')!;
  const p2ControlWrap =
    document.querySelector<HTMLElement>('#p2-control-wrap')!;
  const p2ControlSelect =
    document.querySelector<HTMLSelectElement>('#p2-control')!;
  const btnReset = document.querySelector<HTMLButtonElement>('#btn-reset')!;
  const btnAudio = document.querySelector<HTMLButtonElement>('#btn-audio')!;
  const mixMusic = document.querySelector<HTMLInputElement>('#mix-music')!;
  const mixSfx = document.querySelector<HTMLInputElement>('#mix-sfx')!;
  const vgmFile = document.querySelector<HTMLInputElement>('#vgm-file')!;
  const telemetryEl = document.querySelector<HTMLElement>('#telemetry')!;

  const controller = new AbortController();
  const { signal } = controller;

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false });
  const audio = createRemasterAudio(import.meta.env.BASE_URL);
  let audioMuted = false;

  let currentCourse: 1 | 2 = 1;
  let twoPlayers = false;
  let controls: RemasterPlayerControls = { ...DEFAULT_REMASTER_CONTROLS };
  let cameraPreset: PracticeCameraPreset = 'arcade';
  let fov = practiceLens.initial;

  function prepareLevel(rawTerrain: PracticeTerrain) {
    const displayTerrain: PracticeTerrain =
      rawTerrain.level === undefined
        ? { ...rawTerrain, cells: practiceDisplayTerrain(rawTerrain) }
        : rawTerrain.level === 'intermediate'
          ? { ...rawTerrain, cells: intermediateDisplayTerrain(rawTerrain) }
          : rawTerrain;
    return practiceTerrainToRemasterLevel(displayTerrain);
  }

  statusEl.textContent = 'LOADING TERRAIN…';
  let terrain = await loadCourseTerrain(currentCourse);
  let level = prepareLevel(terrain);

  let view = createRemasterScene(engine, terrain);
  view.camera.select(cameraPreset);
  view.camera.setFov(fov);

  statusEl.textContent = 'LOADING HAVOK…';
  let physics = await createHavokBackend(view.scene, level, twoPlayers);
  let sim = createRemasterSimulation(level, physics, twoPlayers);

  const heldKeys = new Set<string>();
  let mouseDx = 0;
  let mouseDy = 0;
  const agilitySlider = document.getElementById(
    'agility-slider',
  ) as HTMLInputElement | null;
  const agilityValEl = document.getElementById('agility-val');
  let agilityFactor = agilitySlider ? Number(agilitySlider.value) / 100 : 0.8;
  let rafId = 0;
  let lastTime = performance.now();
  let accumulator = 0;
  let disposed = false;

  const camForward = Vector3.Zero();

  function unlockAudio() {
    void audio.unlock().catch((err) => {
      console.warn('AudioWorklet init skipped:', err);
    });
  }

  function updateToolbarLabels() {
    levelSelect.value = String(currentCourse);
    levelLabelEl.textContent = `LEVEL ${currentCourse} · ${level.name.toUpperCase()}`;
    btnCamera.textContent = `Camera: ${CAMERA_LABELS[cameraPreset]} (C)`;
    btnPlayers.textContent = `Mode: ${twoPlayers ? '2P' : '1P'}`;
    p1ControlSelect.value = controls.p1;
    p2ControlSelect.value = controls.p2;
    p2ControlWrap.hidden = !twoPlayers;
    p2HudBlock.hidden = !twoPlayers;
    btnAudio.textContent = audioMuted
      ? 'Audio: Muted (M)'
      : 'Audio: YM2151 + POKEY (M)';
  }

  async function loadLevel(course: 1 | 2) {
    currentCourse = course;
    statusEl.textContent = `LOADING LEVEL ${course}…`;
    terrain = await loadCourseTerrain(course);
    level = prepareLevel(terrain);
    physics.dispose();
    view.dispose();
    view = createRemasterScene(engine, terrain);
    view.camera.select(cameraPreset);
    view.camera.setFov(fov);
    physics = await createHavokBackend(view.scene, level, twoPlayers);
    sim = createRemasterSimulation(level, physics, twoPlayers);
    accumulator = 0;
    audio.playLevelTheme(currentCourse);
    updateToolbarLabels();
  }

  async function rebuildSession() {
    physics.dispose();
    physics = await createHavokBackend(view.scene, level, twoPlayers);
    sim = createRemasterSimulation(level, physics, twoPlayers);
    accumulator = 0;
    audio.playLevelTheme(currentCourse);
    updateToolbarLabels();
  }

  function projectScreenToWorld(
    sx: number,
    sy: number,
  ): { x: number; z: number } {
    view.getCameraForwardToRef(camForward);
    let fx = camForward.x;
    let fz = camForward.z;
    const len = Math.hypot(fx, fz);
    if (len < 0.001) {
      fx = Math.SQRT1_2;
      fz = Math.SQRT1_2;
    } else {
      fx /= len;
      fz /= len;
    }
    // Left-handed BabylonJS: screen-right = (fz, -fx), screen-up = (fx, fz).
    const rightX = fz;
    const rightZ = -fx;
    return {
      x: sx * rightX - sy * fx,
      z: sx * rightZ - sy * fz,
    };
  }

  function readGamepad(index: number): {
    x: number;
    y: number;
    boost: boolean;
  } {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[index];
    if (!pad) return { x: 0, y: 0, boost: false };
    const deadzone = 0.12;
    let gx = Math.abs(pad.axes[0] ?? 0) > deadzone ? (pad.axes[0] ?? 0) : 0;
    let gy = Math.abs(pad.axes[1] ?? 0) > deadzone ? (pad.axes[1] ?? 0) : 0;
    if (pad.buttons[14]?.pressed) gx -= 1;
    if (pad.buttons[15]?.pressed) gx += 1;
    if (pad.buttons[12]?.pressed) gy -= 1;
    if (pad.buttons[13]?.pressed) gy += 1;
    const boost = Boolean(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);
    return { x: gx, y: gy, boost };
  }

  function sampleForControl(
    mode: RemasterControlMode,
    allowKeyboardFallback: boolean,
  ): PlayerInput {
    let sx = 0;
    let sy = 0;
    let boost = false;

    if (mode === 'trackpad') {
      if (Math.abs(mouseDx) > 0.01 || Math.abs(mouseDy) > 0.01) {
        sx += Math.max(-1, Math.min(1, mouseDx / 28));
        sy += Math.max(-1, Math.min(1, mouseDy / 28));
        mouseDx *= 0.45;
        mouseDy *= 0.45;
      }
      if (heldKeys.has('Space')) boost = true;
      if (allowKeyboardFallback) {
        const kb = readKeyboardScreenInput(heldKeys, 'keyboard');
        sx += kb.x;
        sy += kb.y;
        boost = boost || kb.boost;
      }
    } else if (mode === 'keyboard' || mode === 'arrows' || mode === 'wasd') {
      const kb = readKeyboardScreenInput(heldKeys, mode);
      sx = kb.x;
      sy = kb.y;
      boost = kb.boost;
    } else if (mode === 'gamepad1' || mode === 'gamepad2') {
      const pad = readGamepad(mode === 'gamepad1' ? 0 : 1);
      sx = pad.x;
      sy = pad.y;
      boost = pad.boost;
    }

    const world = projectScreenToWorld(sx, sy);
    return { x: world.x, z: world.z, boost, agility: agilityFactor };
  }

  function sampleInputs(): PlayerInput[] {
    if (!twoPlayers) {
      return [sampleForControl(controls.p1, true)];
    }
    // In 2P mode each player strictly reads only their own assigned device.
    return [
      sampleForControl(controls.p1, false),
      sampleForControl(controls.p2, false),
    ];
  }

  function updateHud() {
    const snap = sim.snapshot;
    const p1 = snap.players[0];
    const p2 = snap.players[1];
    scoreEl.textContent = String(p1?.score ?? 0);
    if (p2) {
      scoreP2El.textContent = `${p2.score} · ${Math.ceil(p2.remainingTime)}s`;
    }
    const secs = Math.ceil(p1?.remainingTime ?? snap.remainingTime);
    timerEl.textContent = twoPlayers
      ? `P1 ${secs}s · P2 ${Math.ceil(p2?.remainingTime ?? 0)}s`
      : String(secs);
    timerEl.classList.toggle(
      'low-time',
      Math.min(secs, p2 ? Math.ceil(p2.remainingTime) : secs) <= 10 &&
        snap.phase === 'playing',
    );

    if (snap.phase === 'opening') {
      statusEl.textContent = 'FLYOVER';
      bannerEl.hidden = false;
      bannerTitle.textContent = level.name.toUpperCase();
      bannerSub.textContent =
        'Remaster Havok + YM2151/POKEY · Space to skip flyover · Click to capture trackpad';
    } else if (snap.phase === 'finished') {
      statusEl.textContent = 'GOAL!';
      bannerEl.hidden = false;
      bannerTitle.textContent = `GOAL! SCORE ${p1?.score ?? 0}`;
      bannerSub.textContent =
        currentCourse === 1
          ? 'Press N for Level 2 (Beginner Race) or R to replay'
          : 'Press R to race again';
    } else if (snap.phase === 'gameOver') {
      statusEl.textContent = 'TIME UP';
      bannerEl.hidden = false;
      bannerTitle.textContent = 'GAME OVER';
      bannerSub.textContent = 'Press R to try again';
    } else {
      statusEl.textContent =
        p1?.life === 'shattered'
          ? 'SHATTERED'
          : p1?.life === 'falling'
            ? 'FALLING'
            : p1?.life === 'respawning'
              ? 'RESPAWN'
              : 'PLAYING';
      bannerEl.hidden = true;
    }

    if (p1) {
      const speed = Math.hypot(p1.velocity.x, p1.velocity.z);
      telemetryEl.textContent = `${speed.toFixed(1)} c/s · ${p1.grounded ? 'GND' : 'AIR'}`;
    }
  }

  function tick(now: number) {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    accumulator += dt;
    const fixed = REMASTER_PHYSICS.fixedStepSeconds;
    let latestSnap = sim.snapshot;
    while (accumulator >= fixed) {
      latestSnap = sim.step(fixed, sampleInputs());
      if (latestSnap.events.length > 0) audio.handleEvents(latestSnap.events);
      accumulator -= fixed;
    }

    const p1 = latestSnap.players[0];
    if (p1 && latestSnap.phase === 'playing' && p1.life === 'active') {
      audio.updateRolling(
        Math.hypot(p1.velocity.x, p1.velocity.z),
        p1.grounded && p1.surface !== 'ice',
      );
    } else {
      audio.updateRolling(0, false);
    }

    view.sync(latestSnap, dt);
    updateHud();
    // Wrap in beginFrame/endFrame so engine.getDeltaTime() updates for scene animations (e.g. GOAL flags).
    engine.beginFrame();
    try {
      view.scene.render();
    } finally {
      engine.endFrame();
    }
  }

  // Event listeners (all scoped to AbortController for clean disposal).
  canvas.addEventListener(
    'click',
    () => {
      unlockAudio();
      if (document.pointerLockElement !== canvas) {
        void canvas.requestPointerLock?.();
      }
    },
    { signal },
  );

  document.addEventListener(
    'mousemove',
    (event) => {
      if (document.pointerLockElement === canvas) {
        mouseDx += event.movementX;
        mouseDy += event.movementY;
      }
    },
    { signal },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      unlockAudio();
      heldKeys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Space' && sim.snapshot.phase === 'opening') {
        sim.skipOpening();
      } else if (event.code === 'KeyC') {
        cameraPreset = nextPracticeCamera(cameraPreset, twoPlayers);
        view.camera.select(cameraPreset);
        updateToolbarLabels();
      } else if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        fov = clampPracticeFov(fov - practiceLens.step);
        view.camera.setFov(fov);
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        fov = clampPracticeFov(fov + practiceLens.step);
        view.camera.setFov(fov);
      } else if (event.code === 'KeyR') {
        sim.reset();
        audio.playLevelTheme(currentCourse);
      } else if (event.code === 'KeyN' && currentCourse === 1) {
        void loadLevel(2);
      } else if (event.code === 'KeyM') {
        audioMuted = !audioMuted;
        audio.setMuted(audioMuted);
        updateToolbarLabels();
      }
    },
    { signal },
  );

  window.addEventListener(
    'keyup',
    (event) => {
      heldKeys.delete(event.code);
    },
    { signal },
  );

  levelSelect.addEventListener(
    'change',
    () => {
      unlockAudio();
      const target = levelSelect.value === '2' ? 2 : 1;
      if (target !== currentCourse) void loadLevel(target);
    },
    { signal },
  );

  btnCamera.addEventListener(
    'click',
    () => {
      unlockAudio();
      cameraPreset = nextPracticeCamera(cameraPreset, twoPlayers);
      view.camera.select(cameraPreset);
      updateToolbarLabels();
    },
    { signal },
  );

  btnPlayers.addEventListener(
    'click',
    () => {
      unlockAudio();
      twoPlayers = !twoPlayers;
      void rebuildSession();
    },
    { signal },
  );

  p1ControlSelect.addEventListener(
    'change',
    () => {
      controls = resolveRemasterControls(
        controls,
        1,
        parseRemasterControlMode(p1ControlSelect.value),
      );
      updateToolbarLabels();
    },
    { signal },
  );

  p2ControlSelect.addEventListener(
    'change',
    () => {
      controls = resolveRemasterControls(
        controls,
        2,
        parseRemasterControlMode(p2ControlSelect.value),
      );
      updateToolbarLabels();
    },
    { signal },
  );

  btnReset.addEventListener(
    'click',
    () => {
      unlockAudio();
      sim.reset();
      audio.playLevelTheme();
    },
    { signal },
  );

  btnAudio.addEventListener(
    'click',
    () => {
      unlockAudio();
      audioMuted = !audioMuted;
      audio.setMuted(audioMuted);
      updateToolbarLabels();
    },
    { signal },
  );

  function syncMix() {
    unlockAudio();
    audio.setMix(Number(mixMusic.value) / 100, Number(mixSfx.value) / 100);
  }
  mixMusic.addEventListener('input', syncMix, { signal });
  mixSfx.addEventListener('input', syncMix, { signal });
  agilitySlider?.addEventListener(
    'input',
    () => {
      agilityFactor = Number(agilitySlider.value) / 100;
      if (agilityValEl) {
        agilityValEl.textContent = `${agilityFactor.toFixed(2)}×`;
      }
    },
    { signal },
  );

  vgmFile.addEventListener(
    'change',
    async () => {
      const file = vgmFile.files?.[0];
      if (!file) return;
      await audio.unlock();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = audio.loadVgm(bytes);
      statusEl.textContent = `VGM (${parsed.commands.length} ops)`;
    },
    { signal },
  );

  window.addEventListener('resize', () => engine.resize(), { signal });

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    controller.abort();
    audio.dispose();
    physics.dispose();
    view.dispose();
    engine.dispose();
  }

  window.addEventListener('beforeunload', dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);

  updateToolbarLabels();
  engine.resize();
  rafId = requestAnimationFrame(tick);
}

bootRemaster().catch((error) => {
  console.error('Remaster boot failed:', error);
  const status = document.querySelector<HTMLElement>('#hud-status');
  if (status) status.textContent = `ERR: ${String(error)}`;
});
