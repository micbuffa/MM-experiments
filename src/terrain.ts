import { loadRollingActors } from './emulation/rollingActors';
import type { RollingActors } from './emulation/rollingActors';
import './styles.css';
import {
  loadIntermediateTerrain,
  loadLevel3Terrain,
  loadLevel4Terrain,
  loadLevel5Terrain,
  loadLevel6Terrain,
  loadPracticeTerrain,
} from './emulation/localStudy';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { createApplication } from './app/createApplication';
import {
  practiceFrame,
  practiceFrustum,
  practiceOpeningScroll,
} from './game/modern/practiceProjection';
import {
  setLevel6MazeAutoCycle,
  setLevel6MazePhase,
} from './rendering/createLevel6Terrain';
import { createTerrainStudy } from './rendering/createTerrainStudy';
import {
  MAX_TERRAIN_BYTES,
  intermediateOpeningScroll,
  level3OpeningScroll,
  level4OpeningScroll,
  level5OpeningScroll,
  level6OpeningScroll,
  parsePracticeTerrain,
  type PracticeTerrain,
} from './game/modern/practiceTerrain';

let rollingLibrary: RollingActors | undefined;
if (import.meta.env.DEV) {
  void loadRollingActors()
    .then((library) => {
      if (controller.signal.aborted || !library) return;
      rollingLibrary = library;
      if (terrain?.level === 'level4' || terrain?.level === 'level5')
        showTerrain(terrain);
    })
    .catch(() => {});
}

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const picker = document.querySelector<HTMLInputElement>('#terrain-file')!;
const status = document.querySelector<HTMLElement>('#terrain-status')!;
const camera = document.querySelector<HTMLSelectElement>('#terrain-camera')!;
const captureFile = document.querySelector<HTMLInputElement>(
  '#terrain-reference-file',
)!;
const overlay = document.querySelector<HTMLImageElement>('#terrain-reference')!;
const opacity = document.querySelector<HTMLInputElement>('#terrain-opacity')!;
const referenceStatus =
  document.querySelector<HTMLElement>('#reference-status')!;
const orbitHelp = document.querySelector<HTMLElement>('#terrain-orbit-help')!;
const scrollControl = document.querySelector<HTMLElement>(
  '#terrain-scroll-control',
)!;
const scroll = document.querySelector<HTMLInputElement>('#terrain-scroll')!;
const scrollValue = document.querySelector<HTMLOutputElement>(
  '#terrain-scroll-value',
)!;
const l6PhaseControl = document.querySelector<HTMLElement>(
  '#terrain-l6-phase-control',
);
const l6PhaseSelect =
  document.querySelector<HTMLSelectElement>('#terrain-l6-phase');
const compareMode = document.querySelector<HTMLSelectElement>(
  '#terrain-compare-mode',
);
const pngPane = document.querySelector<HTMLElement>('#terrain-png-pane');
const pngSideCanvas =
  document.querySelector<HTMLCanvasElement>('#terrain-png-side');
const pngOverlayCanvas = document.querySelector<HTMLCanvasElement>(
  '#terrain-png-overlay',
);
const pngAlign = document.querySelector<HTMLElement>('#terrain-png-align');
const pngOffsetY = document.querySelector<HTMLInputElement>(
  '#terrain-png-offset-y',
);
const pngOffsetX = document.querySelector<HTMLInputElement>(
  '#terrain-png-offset-x',
);
const controller = new AbortController();
let application = createApplication(canvas, createTerrainStudy);
let generation = 0;
let captureGeneration = 0;
let pngGeneration = 0;
let imageUrl: string | undefined;
let terrain: PracticeTerrain | undefined;
let levelPngImage: HTMLImageElement | undefined;

function terrainLevelNumber(data: PracticeTerrain | undefined): number {
  if (!data) return 0;
  if (data.level === 'intermediate') return 2;
  if (data.level === 'level3') return 3;
  if (data.level === 'level4') return 4;
  if (data.level === 'level5') return 5;
  if (data.level === 'level6') return 6;
  return 1;
}

function terrainOpeningScroll(data: PracticeTerrain): number {
  if (data.level === 'level6') return level6OpeningScroll;
  if (data.level === 'level5') return level5OpeningScroll;
  if (data.level === 'level4') return level4OpeningScroll;
  if (data.level === 'level3') return level3OpeningScroll;
  if (data.level === 'intermediate') return intermediateOpeningScroll;
  return practiceOpeningScroll;
}

function drawLevelPng() {
  const img = levelPngImage;
  const targets = [pngSideCanvas, pngOverlayCanvas].filter(
    (c): c is HTMLCanvasElement => c !== null,
  );
  if (!img || !terrain) return;
  // Full-level reference PNGs (576 px wide) are rendered at 2x native arcade pixel scale.
  const pngScale = 2;
  const cropW = practiceFrame.width * pngScale;
  const cropH = practiceFrame.height * pngScale;
  const delta = scroll.valueAsNumber;
  const offX = pngOffsetX ? pngOffsetX.valueAsNumber : 0;
  const offY = pngOffsetY ? pngOffsetY.valueAsNumber : 0;
  const srcX = Math.round((img.naturalWidth - cropW) / 2) + offX * pngScale;
  const srcY =
    terrain.level === 'level5'
      ? img.naturalHeight - cropH - delta * pngScale + offY * pngScale
      : delta * pngScale + offY * pngScale;
  for (const target of targets) {
    const ctx = target.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(
      img,
      srcX,
      srcY,
      cropW,
      cropH,
      0,
      0,
      target.width,
      target.height,
    );
  }
}

function loadLevelPng(data: PracticeTerrain) {
  const num = terrainLevelNumber(data);
  const attempt = ++pngGeneration;
  levelPngImage = undefined;
  if (import.meta.env.DEV) {
    if (num < 1 || num > 6) {
      if (compareMode) compareMode.disabled = true;
      return;
    }
    const img = new Image();
    img.src = `/__local-roms/level-png-${num}.png`;
    void img
      .decode()
      .then(() => {
        if (controller.signal.aborted || attempt !== pngGeneration) return;
        levelPngImage = img;
        if (compareMode) compareMode.disabled = false;
        drawLevelPng();
        updateCamera();
      })
      .catch(() => {
        if (attempt === pngGeneration && compareMode)
          compareMode.disabled = true;
      });
    return;
  }
  if (compareMode) compareMode.disabled = true;
}

const intermediateViews = new Map([
  ['bridge', { x: 63, y: -14.4, z: 58, alpha: 3.29, beta: 1.38, radius: 13 }],
  ['pipes', { x: 78, y: -21, z: 84, alpha: 0.86, beta: 1, radius: 43 }],
  ['ice', { x: 103, y: -26, z: 107, alpha: 0.78, beta: 1.01, radius: 42 }],
]);

function updateCamera() {
  const compare = !camera.disabled && camera.value === 'arcade';
  const scene = application.scene;
  const next = scene.getCameraByName(
    compare ? 'practice-reference-camera' : 'terrain-camera',
  );
  if (next && next !== scene.activeCamera) {
    scene.activeCamera?.detachControl();
    scene.activeCamera = next;
    if (!compare) next.attachControl(canvas, true);
  }
  if (next instanceof ArcRotateCamera) {
    if (camera.value === 'top') {
      next.lowerBetaLimit = 0.01;
      next.alpha = Math.PI / 4;
      next.beta = 0.01;
      next.radius = terrain
        ? Math.max(
            45,
            Math.max(terrain.cells.length, terrain.cells[0]!.length) * 0.65,
          )
        : 20;
    } else if (camera.value === 'orbit') {
      next.beta = Math.PI / 3;
    } else if (terrain?.level === 'intermediate') {
      const view = intermediateViews.get(camera.value);
      if (view) {
        next.target.set(
          view.x - terrain.cells[0]!.length / 2,
          view.y,
          view.z - terrain.cells.length / 2,
        );
        next.alpha = view.alpha;
        next.beta = view.beta;
        next.radius = view.radius;
      }
    }
  }
  orbitHelp.hidden = compare;
  if (l6PhaseControl) l6PhaseControl.hidden = terrain?.level !== 'level6';
  scrollControl.hidden = !compare || !terrain;
  const mode = compareMode?.value ?? 'single';
  const showSplit = mode === 'split' && Boolean(levelPngImage);
  const showPngOverlay =
    compare && mode === 'overlay' && Boolean(levelPngImage);
  if (pngPane) {
    const wasHidden = pngPane.hidden;
    pngPane.hidden = !showSplit;
    if (wasHidden !== pngPane.hidden) {
      application.scene.getEngine().resize();
    }
  }
  if (pngOverlayCanvas) {
    pngOverlayCanvas.hidden = !showPngOverlay;
    pngOverlayCanvas.style.opacity = String(opacity.valueAsNumber / 100);
  }
  if (pngAlign) pngAlign.hidden = !showSplit && !showPngOverlay;
  overlay.hidden = !compare || !imageUrl;
  opacity.disabled = overlay.hidden && !showPngOverlay;
  if (showSplit || showPngOverlay) drawLevelPng();
}
camera.addEventListener('change', updateCamera, { signal: controller.signal });
// Smooth keyboard panning (Arrows / WASD / ZQSD) for free orbit & top-down views.
window.addEventListener(
  'keydown',
  (event) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      camera.value === 'arcade'
    )
      return;
    const active = application.scene.activeCamera;
    if (!(active instanceof ArcRotateCamera)) return;
    const key = event.key.toLowerCase();
    let right = 0;
    let forward = 0;
    if (key === 'arrowleft' || key === 'a' || key === 'q') right = -1;
    else if (key === 'arrowright' || key === 'd') right = 1;
    else if (key === 'arrowup' || key === 'w' || key === 'z') forward = 1;
    else if (key === 'arrowdown' || key === 's') forward = -1;
    else return;
    event.preventDefault();
    const step = Math.max(0.8, active.radius * 0.04);
    const cos = Math.cos(active.alpha);
    const sin = Math.sin(active.alpha);
    // Horizontal forward (towards target) and right vectors derived from ArcRotateCamera alpha.
    active.target.x += (-cos * forward + sin * right) * step;
    active.target.z += (-sin * forward - cos * right) * step;
  },
  { signal: controller.signal },
);
compareMode?.addEventListener(
  'change',
  () => {
    if (compareMode.value !== 'single' && !camera.disabled) {
      camera.value = 'arcade';
    }
    updateCamera();
  },
  { signal: controller.signal },
);
pngOffsetX?.addEventListener('input', drawLevelPng, {
  signal: controller.signal,
});
pngOffsetY?.addEventListener('input', drawLevelPng, {
  signal: controller.signal,
});
l6PhaseSelect?.addEventListener(
  'change',
  () => {
    if (terrain?.level !== 'level6') return;
    const val = l6PhaseSelect.value;
    if (val === 'auto') {
      setLevel6MazeAutoCycle(application.scene, true);
    } else {
      setLevel6MazeAutoCycle(application.scene, false);
      setLevel6MazePhase(application.scene, Number(val) as 0 | 1 | 2 | 3);
    }
  },
  { signal: controller.signal },
);
scroll.addEventListener(
  'input',
  () => {
    const arcade = application.scene.getCameraByName(
      'practice-reference-camera',
    );
    if (!arcade || !terrain) return;
    const delta = scroll.valueAsNumber;
    const opening = terrainOpeningScroll(terrain);
    const { top, bottom } = practiceFrustum(
      terrain.cells[0]!.length,
      terrain.cells.length,
      opening + (terrain.level === 'level5' ? -delta : delta),
      terrain.origin,
    );
    arcade.orthoTop = top;
    arcade.orthoBottom = bottom;
    scrollValue.value = `${delta} px`;
    drawLevelPng();
  },
  { signal: controller.signal },
);
opacity.addEventListener(
  'input',
  () => {
    const value = String(opacity.valueAsNumber / 100);
    overlay.style.opacity = value;
    if (pngOverlayCanvas) pngOverlayCanvas.style.opacity = value;
  },
  { signal: controller.signal },
);
captureFile.addEventListener(
  'change',
  async () => {
    const file = captureFile.files?.[0];
    if (!file) return;
    const attempt = ++captureGeneration;
    if (file.size > 2 * 1024 * 1024) {
      referenceStatus.textContent = 'Capture file is too large.';
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (controller.signal.aborted || attempt !== captureGeneration) return;
      if (
        image.naturalWidth !== practiceFrame.width ||
        image.naturalHeight !== practiceFrame.height
      )
        throw new Error('Choose a 336 × 240 arcade screenshot.');
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = url;
      overlay.src = url;
      referenceStatus.textContent = '';
      camera.value = 'arcade';
      updateCamera();
    } catch (error) {
      if (!controller.signal.aborted && attempt === captureGeneration)
        referenceStatus.textContent =
          error instanceof Error ? error.message : 'Unreadable capture.';
    } finally {
      if (imageUrl !== url) URL.revokeObjectURL(url);
    }
  },
  { signal: controller.signal },
);
function showTerrain(data: PracticeTerrain) {
  application.dispose();
  application = createApplication(canvas, (engine, element) =>
    createTerrainStudy(engine, element, data, false, rollingLibrary),
  );
  terrain = data;
  const intermediate = data.level === 'intermediate';
  const level3 = data.level === 'level3';
  const level4 = data.level === 'level4';
  const level5 = data.level === 'level5';
  const level6 = data.level === 'level6';
  for (const option of camera.options) {
    if (intermediateViews.has(option.value))
      option.hidden = option.disabled = !intermediate;
  }
  scroll.value = '0';
  scrollValue.value = '0 px';
  if (pngOffsetX) pngOffsetX.value = '0';
  if (pngOffsetY) pngOffsetY.value = '0';
  if (l6PhaseSelect) l6PhaseSelect.value = 'auto';
  const opening = terrainOpeningScroll(data);
  scroll.max = String(Math.max(0, Math.abs(data.lastScroll - opening)));
  if (intermediate || level3 || level4 || level5 || level6) {
    camera.value = 'arcade';
  } else if (intermediateViews.has(camera.value)) {
    camera.value = 'orbit';
  }
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
    overlay.removeAttribute('src');
    imageUrl = undefined;
  }
  captureGeneration++;
  referenceStatus.textContent = '';
  camera.disabled = captureFile.disabled = false;
  loadLevelPng(data);
  updateCamera();
  status.textContent =
    data.level === 'level6'
      ? 'Level 6 · Ultimate Race (arcade survey)'
      : data.level === 'level5'
        ? 'Level 5 · Silly Race (arcade survey)'
        : data.level === 'level4'
          ? 'Level 4 · Aerial Race (arcade survey)'
          : data.level === 'level3'
            ? 'Level 3 · Intermediate Race (arcade survey)'
            : data.level === 'intermediate'
              ? data.pipes
                ? 'Intermediate Race · Survey & pipes'
                : 'Intermediate Race · Arcade terrain survey'
              : data.origin.x === 0
                ? 'Practice Race · Start to finish'
                : 'Practice Race · Arcade terrain excerpt';
}

picker.addEventListener(
  'change',
  async () => {
    const file = picker.files?.[0];
    if (!file) return;
    const attempt = ++generation;
    try {
      if (file.size > MAX_TERRAIN_BYTES)
        throw new Error('Survey file is too large.');
      const data = parsePracticeTerrain(await file.text());
      if (attempt !== generation || controller.signal.aborted) return;
      showTerrain(data);
    } catch (error) {
      if (attempt === generation && !controller.signal.aborted)
        status.textContent =
          error instanceof Error ? error.message : 'Unreadable survey.';
    }
  },
  { signal: controller.signal },
);
if (import.meta.env.DEV) {
  const attempt = ++generation;
  const play = document.querySelector<HTMLButtonElement>('#terrain-play')!;
  const frame = document.querySelector<HTMLIFrameElement>('#terrain-player')!;
  const back = document.querySelector<HTMLAnchorElement>('#terrain-return')!;
  frame.src = './index.html?study=intermediate';
  function launch() {
    if (play.hidden || !frame.hidden) return;
    document.querySelector('main')!.hidden = true;
    application.scene.getEngine().stopRenderLoop();
    frame.hidden = back.hidden = false;
    frame.focus();
  }
  play.addEventListener('click', launch, { signal: controller.signal });
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'F2' || play.hidden || !frame.hidden) return;
      event.preventDefault();
      launch();
    },
    { signal: controller.signal },
  );
  const loadL1Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level1',
  );
  if (loadL1Button) {
    void loadPracticeTerrain()
      .then((level1Data) => {
        if (!level1Data || controller.signal.aborted) return;
        loadL1Button.hidden = false;
        loadL1Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(level1Data);
          },
          { signal: controller.signal },
        );
      })
      .catch(() => {});
  }
  const loadL2Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level2',
  );
  const loadL3Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level3',
  );
  if (loadL3Button) {
    void loadLevel3Terrain()
      .then((level3Data) => {
        if (!level3Data || controller.signal.aborted) return;
        loadL3Button.hidden = false;
        loadL3Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(level3Data);
          },
          { signal: controller.signal },
        );
      })
      .catch(() => {});
  }
  const loadL4Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level4',
  );
  if (loadL4Button) {
    void loadLevel4Terrain()
      .then((level4Data) => {
        if (!level4Data || controller.signal.aborted) return;
        loadL4Button.hidden = false;
        loadL4Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(level4Data);
          },
          { signal: controller.signal },
        );
      })
      .catch(() => {});
  }
  const loadL5Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level5',
  );
  if (loadL5Button) {
    void loadLevel5Terrain()
      .then((level5Data) => {
        if (!level5Data || controller.signal.aborted) return;
        loadL5Button.hidden = false;
        loadL5Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(level5Data);
          },
          { signal: controller.signal },
        );
      })
      .catch(() => {});
  }
  const loadL6Button = document.querySelector<HTMLButtonElement>(
    '#terrain-load-level6',
  );
  if (loadL6Button) {
    void loadLevel6Terrain()
      .then((level6Data) => {
        if (!level6Data || controller.signal.aborted) return;
        loadL6Button.hidden = false;
        loadL6Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(level6Data);
          },
          { signal: controller.signal },
        );
      })
      .catch(() => {});
  }
  void loadIntermediateTerrain()
    .then((data) => {
      if (!data || controller.signal.aborted) return;
      if (loadL2Button) {
        loadL2Button.hidden = false;
        loadL2Button.addEventListener(
          'click',
          () => {
            ++generation;
            showTerrain(data);
          },
          { signal: controller.signal },
        );
      }
      if (attempt === generation) showTerrain(data);
      play.hidden = false;
    })
    .catch((error) => {
      console.error('Failed to load Intermediate Race terrain study:', error);
      if (!controller.signal.aborted && attempt === generation)
        status.textContent =
          error instanceof Error ? error.message : 'Relevé local indisponible.';
    });
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    controller.abort();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    application.dispose();
  });
