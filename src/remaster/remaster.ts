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
import {
  parseRollingActors,
  type RollingActors,
} from '../emulation/rollingActors';
import { decodeRollingActorsBinary } from '../emulation/rollingActorsBinary';
import { practiceDisplayTerrain } from '../rendering/createPracticeLandmarks';
import { intermediateDisplayTerrain } from '../rendering/intermediateLandmarks';
import { level3DisplayTerrain } from '../rendering/createLevel3Materials';
import { level4DisplayTerrain } from '../rendering/createLevel4Materials';
import { level5DisplayTerrain } from '../rendering/level5DisplayTerrain';
import { level6DisplayTerrain } from '../rendering/level6DisplayTerrain';
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
import {
  AUTO_ADVANCE_DELAY_SECONDS,
  computeAttractAiInput,
  createAttractCycle,
  getCourseShowcase,
  loadHighScores,
  recordHighScore,
  stepAttractCycle,
  switchAttractStage,
  type RemasterScreenMode,
} from './engine/remasterAttract';
import {
  practiceTerrainToRemasterLevel,
  sampleLayerHeight,
} from './levels/remasterLevel';
import { createHavokBackend } from './physics/createHavokBackend';
import { createAmigaDemo3DScene } from './rendering/createAmigaDemo3DScene';
import { createAttract3DScene } from './rendering/createAttract3DScene';
import { createRemasterScene } from './rendering/createRemasterScene';
import { createVictory3DScene } from './rendering/createVictory3DScene';

const CAMERA_LABELS: Record<PracticeCameraPreset, string> = {
  arcade: 'Arcade',
  follow: 'Follow',
  overhead: 'Overhead',
  chase: 'Chase',
  chaseHigh: 'Chase High',
};

type RemasterCourseIndex = 1 | 2 | 3 | 4 | 5 | 6;

async function loadCourseTerrain(
  courseIndex: RemasterCourseIndex,
): Promise<PracticeTerrain> {
  const filename =
    courseIndex === 6
      ? 'level6-terrain.json'
      : courseIndex === 5
        ? 'level5-terrain.json'
        : courseIndex === 4
          ? 'level4-terrain.json'
          : courseIndex === 3
            ? 'level3-terrain.json'
            : courseIndex === 2
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

async function loadCourseActors(): Promise<RollingActors | undefined> {
  const binUrl = `${import.meta.env.BASE_URL}beta-data/rolling-actors.bin`;
  try {
    const response = await fetch(binUrl);
    if (response.ok) {
      return decodeRollingActorsBinary(
        new Uint8Array(await response.arrayBuffer()),
      );
    }
  } catch {
    // Fall through to JSON candidates.
  }
  const jsonCandidates = [
    '/__local-roms/rolling-actors.json',
    `${import.meta.env.BASE_URL}beta-data/rolling-actors.json`,
  ];
  for (const url of jsonCandidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return parseRollingActors(await response.text());
    } catch {
      // Try next source.
    }
  }
  return undefined;
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
  const btnTimer = document.querySelector<HTMLButtonElement>('#btn-timer')!;
  const btnScanlines =
    document.querySelector<HTMLButtonElement>('#btn-scanlines')!;
  const btnReset = document.querySelector<HTMLButtonElement>('#btn-reset')!;
  const btnAudio = document.querySelector<HTMLButtonElement>('#btn-audio')!;
  const mixMusic = document.querySelector<HTMLInputElement>('#mix-music')!;
  const mixSfx = document.querySelector<HTMLInputElement>('#mix-sfx')!;
  const vgmFile = document.querySelector<HTMLInputElement>('#vgm-file')!;
  const telemetryEl = document.querySelector<HTMLElement>('#telemetry')!;
  const scanlinesOverlay =
    document.querySelector<HTMLElement>('#scanlines-overlay')!;
  const btnAttract = document.querySelector<HTMLButtonElement>('#btn-attract')!;

  const controller = new AbortController();
  const { signal } = controller;

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false });
  const audio = createRemasterAudio(import.meta.env.BASE_URL);
  let audioMuted = false;

  const attract3D = createAttract3DScene(
    engine,
    loadHighScores(window.localStorage),
  );
  const amigaDemo3D = createAmigaDemo3DScene(engine);
  const victory3D = createVictory3DScene(engine);

  let currentCourse: RemasterCourseIndex = 1;
  let screenMode: RemasterScreenMode = 'attract';
  let attractCycle = createAttractCycle(1, 'flyover');
  let attractSwitching = false;
  let wasAmigaStage = false;
  let autoAdvanceTimer = -1;
  let autoAdvancing = false;
  let victoryShownForRun = false;
  let twoPlayers = false;
  let timerFrozen = false;
  let scanlinesEnabled = true;
  let controls: RemasterPlayerControls = { ...DEFAULT_REMASTER_CONTROLS };
  let cameraPreset: PracticeCameraPreset = 'arcade';
  let fov = practiceLens.initial;

  function prepareLevel(rawTerrain: PracticeTerrain) {
    const displayTerrain: PracticeTerrain =
      rawTerrain.level === undefined
        ? { ...rawTerrain, cells: practiceDisplayTerrain(rawTerrain) }
        : rawTerrain.level === 'intermediate'
          ? { ...rawTerrain, cells: intermediateDisplayTerrain(rawTerrain) }
          : rawTerrain.level === 'level3'
            ? { ...rawTerrain, cells: level3DisplayTerrain(rawTerrain.cells) }
            : rawTerrain.level === 'level4'
              ? { ...rawTerrain, cells: level4DisplayTerrain(rawTerrain.cells) }
              : rawTerrain.level === 'level5'
                ? {
                    ...rawTerrain,
                    cells: level5DisplayTerrain(rawTerrain.cells),
                  }
                : rawTerrain.level === 'level6'
                  ? {
                      ...rawTerrain,
                      cells: level6DisplayTerrain(rawTerrain.cells),
                    }
                  : rawTerrain;
    return practiceTerrainToRemasterLevel(displayTerrain);
  }

  statusEl.textContent = 'LOADING COURSE…';
  const [initialTerrain, rollingActors] = await Promise.all([
    loadCourseTerrain(currentCourse),
    loadCourseActors(),
  ]);
  let terrain = initialTerrain;
  let level = prepareLevel(terrain);

  let view = createRemasterScene(engine, terrain, rollingActors);
  view.camera.select(cameraPreset);
  view.camera.setFov(fov);

  statusEl.textContent = 'PREPARING ARENA…';
  let physics = await createHavokBackend(view.scene, level, twoPlayers);
  let sim = createRemasterSimulation(level, physics, twoPlayers);
  sim.setTimerFrozen(timerFrozen);

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

  function enterAttractMode() {
    screenMode = 'attract';
    victoryShownForRun = false;
    autoAdvanceTimer = -1;
    autoAdvancing = false;
    attractCycle = createAttractCycle(currentCourse, 'flyover');
    bannerEl.hidden = true;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }
    view.camera.select('arcade');
    attract3D.setHighScores(loadHighScores(window.localStorage));
    attract3D.setMode(
      attractCycle.stage,
      attractCycle.course,
      CAMERA_LABELS[attractCycle.cameraPreset],
    );
    updateHud();
  }

  function openVictory3D(p1Score: number, p2Score?: number, gameOver = false) {
    screenMode = 'victory';
    victoryShownForRun = true;
    autoAdvanceTimer = -1;
    bannerEl.hidden = true;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }
    victory3D.configure(p1Score, twoPlayers ? p2Score : undefined, {
      gameOver,
      course: currentCourse,
    });
    updateHud();
  }

  async function startGameFrom3DMenu(
    course: RemasterCourseIndex,
    multiplayer: boolean,
  ) {
    unlockAudio();
    screenMode = 'playing';
    victoryShownForRun = false;
    autoAdvanceTimer = -1;
    autoAdvancing = false;
    const needsReload = course !== currentCourse;
    const needsModeChange = multiplayer !== twoPlayers;
    twoPlayers = multiplayer;
    view.camera.select(cameraPreset);
    if (needsReload) {
      await loadLevel(course, [0, 0]);
    } else if (needsModeChange) {
      await rebuildSession([0, 0]);
    } else {
      sim.reset();
      sim.setTimerFrozen(timerFrozen);
      audio.playLevelTheme(currentCourse);
      updateToolbarLabels();
    }
    updateHud();
  }

  function updateToolbarLabels() {
    levelSelect.value = String(currentCourse);
    levelLabelEl.textContent = `LEVEL ${currentCourse} · ${level.name.toUpperCase()}`;
    btnCamera.textContent = `Camera: ${CAMERA_LABELS[cameraPreset]} (C)`;
    btnPlayers.textContent = `Mode: ${twoPlayers ? '2P' : '1P'}`;
    btnTimer.textContent = timerFrozen
      ? 'Timer: Infinite ∞ (T)'
      : 'Timer: Regular (T)';
    btnScanlines.textContent = scanlinesEnabled
      ? 'Scanlines: ON (S)'
      : 'Scanlines: OFF (S)';
    scanlinesOverlay.hidden = !scanlinesEnabled;
    p1ControlSelect.value = controls.p1;
    p2ControlSelect.value = controls.p2;
    p2ControlWrap.hidden = !twoPlayers;
    p2HudBlock.hidden = !twoPlayers;
    btnAudio.textContent = audioMuted ? 'Audio: Muted (M)' : 'Audio: ON (M)';
  }

  async function loadLevel(
    course: RemasterCourseIndex,
    carryScores: readonly [number, number] = [0, 0],
  ) {
    currentCourse = course;
    statusEl.textContent = `LOADING LEVEL ${course}…`;
    terrain = await loadCourseTerrain(course);
    level = prepareLevel(terrain);
    physics.dispose();
    view.dispose();
    view = createRemasterScene(engine, terrain, rollingActors);
    view.camera.select(
      screenMode === 'attract' ? attractCycle.cameraPreset : cameraPreset,
    );
    view.camera.setFov(fov);
    physics = await createHavokBackend(view.scene, level, twoPlayers);
    sim = createRemasterSimulation(
      level,
      physics,
      twoPlayers,
      Math.random,
      carryScores,
    );
    sim.setTimerFrozen(timerFrozen);
    accumulator = 0;
    autoAdvanceTimer = -1;
    if (screenMode === 'playing') {
      audio.playLevelTheme(currentCourse);
    }
    updateToolbarLabels();
  }

  async function rebuildSession(
    carryScores: readonly [number, number] = [0, 0],
  ) {
    physics.dispose();
    physics = await createHavokBackend(view.scene, level, twoPlayers);
    sim = createRemasterSimulation(
      level,
      physics,
      twoPlayers,
      Math.random,
      carryScores,
    );
    sim.setTimerFrozen(timerFrozen);
    accumulator = 0;
    autoAdvanceTimer = -1;
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
        const gain = agilityFactor / 28;
        sx += Math.max(-1, Math.min(1, mouseDx * gain));
        sy += Math.max(-1, Math.min(1, mouseDy * gain));
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
    const frozenSuffix = timerFrozen ? ' ∞' : '';
    timerEl.textContent = twoPlayers
      ? `P1 ${secs}s · P2 ${Math.ceil(p2?.remainingTime ?? 0)}s${frozenSuffix}`
      : `${secs}${frozenSuffix}`;
    timerEl.classList.toggle(
      'low-time',
      Math.min(secs, p2 ? Math.ceil(p2.remainingTime) : secs) <= 10 &&
        snap.phase === 'playing',
    );

    if (screenMode === 'attract') {
      statusEl.textContent = 'ATTRACT';
      bannerEl.hidden = true;
    } else if (screenMode === 'victory') {
      statusEl.textContent = 'VICTORY!';
      bannerEl.hidden = true;
    } else if (snap.phase === 'opening') {
      statusEl.textContent = 'FLYOVER';
      bannerEl.hidden = false;
      bannerTitle.textContent = level.name.toUpperCase();
      const showcase = getCourseShowcase(currentCourse);
      bannerSub.textContent = `${showcase.subtitle} · Space to roll!`;
    } else if (snap.phase === 'finished') {
      statusEl.textContent = 'GOAL!';
      bannerEl.hidden = false;
      bannerTitle.textContent = `GOAL! SCORE ${p1?.score ?? 0}`;
      bannerSub.textContent =
        currentCourse < 6
          ? `Advancing to Level ${currentCourse + 1}… (Space to continue now)`
          : 'All 6 courses completed!';
    } else if (snap.phase === 'gameOver') {
      statusEl.textContent = 'TIME UP';
      bannerEl.hidden = false;
      bannerTitle.textContent = 'GAME OVER';
      bannerSub.textContent = 'Press R to try again';
    } else {
      statusEl.textContent =
        p1?.life === 'shattered'
          ? 'SHATTERED'
          : p1?.life === 'melting'
            ? 'DISSOLVING'
            : p1?.life === 'suctioned'
              ? 'SUCTIONED'
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

    if (screenMode === 'attract') {
      audio.updateRolling(0, false);
      const prevStage = attractCycle.stage;
      const prevCam = attractCycle.cameraPreset;
      const next = stepAttractCycle(attractCycle, dt);
      attractCycle = next.state;

      if (next.courseChanged && !attractSwitching) {
        attractSwitching = true;
        void loadLevel(attractCycle.course).finally(() => {
          attractSwitching = false;
        });
      }
      if (attractCycle.stage === 'aiDemo' && prevStage !== 'aiDemo') {
        sim.reset();
        sim.setTimerFrozen(true);
        sim.skipOpening();
        accumulator = 0;
        view.camera.select(attractCycle.cameraPreset);
      } else if (
        attractCycle.stage === 'aiDemo' &&
        attractCycle.cameraPreset !== prevCam
      ) {
        view.camera.select(attractCycle.cameraPreset);
      } else if (attractCycle.stage === 'flyover' && prevStage !== 'flyover') {
        view.camera.select('arcade');
      }

      attract3D.setMode(
        attractCycle.stage,
        attractCycle.course,
        CAMERA_LABELS[attractCycle.cameraPreset],
      );
      attract3D.update(dt);
      updateHud();

      if (attractCycle.stage === 'flyover') {
        const flySnap = {
          ...sim.snapshot,
          phase: 'opening' as const,
          openingProgress: attractCycle.flyoverProgress,
        };
        view.sync(flySnap, dt);
        engine.beginFrame();
        try {
          view.scene.render();
          attract3D.scene.render();
        } finally {
          engine.endFrame();
        }
      } else if (attractCycle.stage === 'aiDemo') {
        const mainLayer = level.heightLayers[0];
        const sampleH = (wx: number, wz: number) =>
          mainLayer ? sampleLayerHeight(mainLayer, wx, wz) : 0;
        accumulator += dt;
        const fixed = REMASTER_PHYSICS.fixedStepSeconds;
        let aiSnap = sim.snapshot;
        while (accumulator >= fixed) {
          const p = aiSnap.players[0];
          const cmd = p
            ? computeAttractAiInput(
                p.position,
                p.velocity,
                level.direction,
                sampleH,
              )
            : { x: 0, z: 0, boost: false };
          aiSnap = sim.step(fixed, [
            { x: cmd.x, z: cmd.z, boost: cmd.boost, agility: 0.78 },
          ]);
          accumulator -= fixed;
        }
        view.sync(aiSnap, dt);
        engine.beginFrame();
        try {
          view.scene.render();
          attract3D.scene.render();
        } finally {
          engine.endFrame();
        }
      } else if (attractCycle.stage === 'amigaDemo') {
        if (!wasAmigaStage) {
          amigaDemo3D.resetScroll();
          wasAmigaStage = true;
        }
        amigaDemo3D.setScanlines(scanlinesEnabled);
        amigaDemo3D.update(dt);
        engine.beginFrame();
        try {
          amigaDemo3D.scene.render();
        } finally {
          engine.endFrame();
        }
      } else {
        wasAmigaStage = false;
        engine.beginFrame();
        try {
          attract3D.scene.render();
        } finally {
          engine.endFrame();
        }
      }
      if (attractCycle.stage !== 'amigaDemo') {
        wasAmigaStage = false;
      }
      return;
    }
    wasAmigaStage = false;

    if (screenMode === 'victory') {
      audio.updateRolling(0, false);
      victory3D.update(dt);
      updateHud();
      engine.beginFrame();
      try {
        victory3D.scene.render();
      } finally {
        engine.endFrame();
      }
      return;
    }

    accumulator += dt;
    const fixed = REMASTER_PHYSICS.fixedStepSeconds;
    let latestSnap = sim.snapshot;
    while (accumulator >= fixed) {
      latestSnap = sim.step(fixed, sampleInputs());
      if (latestSnap.events.length > 0) audio.handleEvents(latestSnap.events);
      accumulator -= fixed;
    }

    if (latestSnap.phase === 'gameOver' && !victoryShownForRun) {
      openVictory3D(
        latestSnap.players[0]?.score ?? 0,
        latestSnap.players[1]?.score,
        true,
      );
    } else if (latestSnap.phase === 'finished') {
      if (currentCourse === 6 && !victoryShownForRun) {
        openVictory3D(
          latestSnap.players[0]?.score ?? 0,
          latestSnap.players[1]?.score,
        );
      } else if (currentCourse < 6 && !autoAdvancing) {
        if (autoAdvanceTimer < 0) {
          autoAdvanceTimer = AUTO_ADVANCE_DELAY_SECONDS;
        } else {
          autoAdvanceTimer -= dt;
          if (autoAdvanceTimer <= 0) {
            autoAdvancing = true;
            const scores: [number, number] = [
              latestSnap.players[0]?.score ?? 0,
              latestSnap.players[1]?.score ?? 0,
            ];
            void loadLevel(
              (currentCourse + 1) as RemasterCourseIndex,
              scores,
            ).finally(() => {
              autoAdvancing = false;
            });
          }
        }
      }
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
    (event) => {
      unlockAudio();
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (screenMode === 'attract') {
        const action =
          attractCycle.stage === 'amigaDemo'
            ? amigaDemo3D.pickAction(px, py)
            : attract3D.pickAction(px, py);
        if (action === 'start2p') {
          void startGameFrom3DMenu(currentCourse, true);
        } else {
          void startGameFrom3DMenu(currentCourse, false);
        }
        return;
      }
      if (screenMode === 'victory') {
        const action = victory3D.pickAction(px, py);
        if (action === 'replay') {
          void startGameFrom3DMenu(1, twoPlayers);
        } else if (action === 'attract') {
          enterAttractMode();
        }
        return;
      }
      if (document.pointerLockElement !== canvas) {
        void canvas.requestPointerLock?.();
      }
    },
    { signal },
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (screenMode === 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (screenMode === 'attract') {
        if (attractCycle.stage === 'amigaDemo') {
          amigaDemo3D.setHover(px, py);
        } else {
          attract3D.setHover(px, py);
        }
      } else if (screenMode === 'victory') {
        victory3D.setHover(px, py);
      }
    },
    { signal },
  );

  btnAttract.addEventListener(
    'click',
    () => {
      enterAttractMode();
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
      if (screenMode === 'attract') {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          void startGameFrom3DMenu(currentCourse, false);
        } else if (event.code === 'Digit2' || event.code === 'Numpad2') {
          void startGameFrom3DMenu(currentCourse, true);
        } else if (event.code === 'ArrowRight') {
          attractCycle = switchAttractStage(attractCycle, 1);
          if (attractCycle.stage === 'aiDemo') {
            sim.reset();
            sim.setTimerFrozen(true);
            sim.skipOpening();
          }
          view.camera.select(attractCycle.cameraPreset);
        } else if (event.code === 'ArrowLeft') {
          attractCycle = switchAttractStage(attractCycle, -1);
          if (attractCycle.stage === 'aiDemo') {
            sim.reset();
            sim.setTimerFrozen(true);
            sim.skipOpening();
          }
          view.camera.select(attractCycle.cameraPreset);
        } else if (event.code === 'KeyS') {
          scanlinesEnabled = !scanlinesEnabled;
          amigaDemo3D.setScanlines(scanlinesEnabled);
          updateToolbarLabels();
        } else if (event.shiftKey && event.code === 'KeyV') {
          audio.handleEvents([{ type: 'goal', player: 1, timeBonus: 0 }]);
          openVictory3D(
            sim.snapshot.players[0]?.score ?? 0,
            sim.snapshot.players[1]?.score,
          );
        }
        return;
      }
      if (screenMode === 'victory') {
        const action = victory3D.handleKey(event.code, event.key);
        if (action === 'saveScore') {
          const p1Score = sim.snapshot.players[0]?.score ?? 0;
          const p2Score = sim.snapshot.players[1]?.score ?? 0;
          const updated = recordHighScore(
            window.localStorage,
            victory3D.initials,
            Math.max(p1Score, p2Score),
            currentCourse,
          );
          attract3D.setHighScores(updated);
          victory3D.markSaved();
        } else if (action === 'replay') {
          void startGameFrom3DMenu(1, twoPlayers);
        } else if (action === 'attract') {
          enterAttractMode();
        }
        return;
      }
      if (event.shiftKey && event.code === 'KeyV') {
        audio.handleEvents([{ type: 'goal', player: 1, timeBonus: 0 }]);
        openVictory3D(
          sim.snapshot.players[0]?.score ?? 0,
          sim.snapshot.players[1]?.score,
        );
        return;
      }
      if (event.code === 'Space' && sim.snapshot.phase === 'opening') {
        sim.skipOpening();
      } else if (
        event.code === 'Space' &&
        sim.snapshot.phase === 'finished' &&
        currentCourse < 6 &&
        !autoAdvancing
      ) {
        autoAdvanceTimer = 0;
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
        victoryShownForRun = false;
        autoAdvanceTimer = -1;
        sim.reset();
        audio.playLevelTheme(currentCourse);
      } else if (event.code === 'KeyM') {
        audioMuted = !audioMuted;
        audio.setMuted(audioMuted);
        updateToolbarLabels();
      } else if (event.code === 'KeyS') {
        scanlinesEnabled = !scanlinesEnabled;
        amigaDemo3D.setScanlines(scanlinesEnabled);
        updateToolbarLabels();
      } else if (event.code === 'KeyQ') {
        enterAttractMode();
      } else if (event.code === 'KeyT') {
        timerFrozen = !timerFrozen;
        sim.setTimerFrozen(timerFrozen);
        updateToolbarLabels();
        updateHud();
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

  const parseCourseValue = (raw: string): RemasterCourseIndex =>
    raw === '6'
      ? 6
      : raw === '5'
        ? 5
        : raw === '4'
          ? 4
          : raw === '3'
            ? 3
            : raw === '2'
              ? 2
              : 1;

  levelSelect.addEventListener(
    'change',
    () => {
      unlockAudio();
      const target = parseCourseValue(levelSelect.value);
      if (screenMode !== 'playing') {
        void startGameFrom3DMenu(target, twoPlayers);
      } else if (target !== currentCourse) {
        void loadLevel(target);
      }
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

  btnTimer.addEventListener(
    'click',
    () => {
      timerFrozen = !timerFrozen;
      sim.setTimerFrozen(timerFrozen);
      updateToolbarLabels();
      updateHud();
    },
    { signal },
  );

  btnScanlines.addEventListener(
    'click',
    () => {
      scanlinesEnabled = !scanlinesEnabled;
      amigaDemo3D.setScanlines(scanlinesEnabled);
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
    attract3D.dispose();
    amigaDemo3D.dispose();
    victory3D.dispose();
    engine.dispose();
  }

  window.addEventListener('beforeunload', dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);

  const initialSelected = parseCourseValue(levelSelect.value);
  updateToolbarLabels();
  engine.resize();
  rafId = requestAnimationFrame(tick);
  if (initialSelected !== currentCourse) {
    void startGameFrom3DMenu(initialSelected, twoPlayers);
  }
}

bootRemaster().catch((error) => {
  console.error('Remaster boot failed:', error);
  const status = document.querySelector<HTMLElement>('#hud-status');
  if (status) status.textContent = `ERR: ${String(error)}`;
});
