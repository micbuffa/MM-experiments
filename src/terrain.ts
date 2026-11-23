import { loadRollingActors } from './emulation/rollingActors';
import type { RollingActors } from './emulation/rollingActors';
import './styles.css';
import {
  loadIntermediateTerrain,
  loadLevel3Terrain,
  loadLevel4Terrain,
  loadLevel5Terrain,
} from './emulation/localStudy';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { createApplication } from './app/createApplication';
import {
  practiceFrame,
  practiceFrustum,
} from './game/modern/practiceProjection';
import { createTerrainStudy } from './rendering/createTerrainStudy';
import {
  MAX_TERRAIN_BYTES,
  intermediateOpeningScroll,
  level3OpeningScroll,
  level4OpeningScroll,
  level5OpeningScroll,
  parsePracticeTerrain,
  type PracticeTerrain,
} from './game/modern/practiceTerrain';

let rollingLibrary: RollingActors | undefined;
void loadRollingActors()
  .then((library) => {
    if (controller.signal.aborted || !library) return;
    rollingLibrary = library;
    if (terrain?.level === 'level4' || terrain?.level === 'level5')
      showTerrain(terrain);
  })
  .catch(() => {});

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
const controller = new AbortController();
let application = createApplication(canvas, createTerrainStudy);
let generation = 0;
let captureGeneration = 0;
let imageUrl: string | undefined;
let terrain: PracticeTerrain | undefined;

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
  if (next instanceof ArcRotateCamera && terrain?.level === 'intermediate') {
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
  orbitHelp.hidden = compare;
  scrollControl.hidden =
    !compare ||
    (terrain?.level !== 'intermediate' &&
      terrain?.level !== 'level3' &&
      terrain?.level !== 'level4' &&
      terrain?.level !== 'level5');
  overlay.hidden = !compare || !imageUrl;
  opacity.disabled = overlay.hidden;
}
camera.addEventListener('change', updateCamera, { signal: controller.signal });
scroll.addEventListener(
  'input',
  () => {
    const arcade = application.scene.getCameraByName(
      'practice-reference-camera',
    );
    if (
      !arcade ||
      (terrain?.level !== 'intermediate' &&
        terrain?.level !== 'level3' &&
        terrain?.level !== 'level4' &&
        terrain?.level !== 'level5')
    )
      return;
    const delta = scroll.valueAsNumber;
    const opening =
      terrain.level === 'level5'
        ? level5OpeningScroll
        : terrain.level === 'level3'
          ? level3OpeningScroll
          : terrain.level === 'level4'
            ? level4OpeningScroll
            : intermediateOpeningScroll;
    const { top, bottom } = practiceFrustum(
      terrain.cells[0]!.length,
      terrain.cells.length,
      opening + (terrain.level === 'level5' ? -delta : delta),
      terrain.origin,
    );
    arcade.orthoTop = top;
    arcade.orthoBottom = bottom;
    scrollValue.value = `${delta} px`;
  },
  { signal: controller.signal },
);
opacity.addEventListener(
  'input',
  () => {
    overlay.style.opacity = String(opacity.valueAsNumber / 100);
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
      referenceStatus.textContent = 'Capture trop volumineuse.';
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
        throw new Error('Choisir une capture arcade de 336 × 240 pixels.');
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = url;
      overlay.src = url;
      referenceStatus.textContent = '';
      camera.value = 'arcade';
      updateCamera();
    } catch (error) {
      if (!controller.signal.aborted && attempt === captureGeneration)
        referenceStatus.textContent =
          error instanceof Error ? error.message : 'Capture illisible.';
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
  for (const option of camera.options) {
    if (intermediateViews.has(option.value))
      option.hidden = option.disabled = !intermediate;
  }
  scroll.value = '0';
  scrollValue.value = '0 px';
  if (intermediate || level3 || level4 || level5) {
    const opening = level5
      ? level5OpeningScroll
      : level3
        ? level3OpeningScroll
        : level4
          ? level4OpeningScroll
          : intermediateOpeningScroll;
    scroll.max = String(Math.abs(data.lastScroll - opening));
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
  updateCamera();
  status.textContent =
    data.level === 'level5'
      ? 'Niveau 5 · Silly Race (relevé arcade)'
      : data.level === 'level4'
        ? 'Niveau 4 · Aerial Race (relevé arcade)'
        : data.level === 'level3'
          ? 'Niveau 3 · Relevé du terrain arcade'
          : data.level === 'intermediate'
            ? data.pipes
              ? 'Intermediate Race · Relevé et tuyaux'
              : 'Intermediate Race · Relevé du terrain arcade'
            : data.origin.x === 0
              ? 'Practice Race · Du départ à l’arrivée'
              : 'Practice Race · Extrait du terrain arcade';
}

picker.addEventListener(
  'change',
  async () => {
    const file = picker.files?.[0];
    if (!file) return;
    const attempt = ++generation;
    try {
      if (file.size > MAX_TERRAIN_BYTES)
        throw new Error('Relevé trop volumineux.');
      const data = parsePracticeTerrain(await file.text());
      if (attempt !== generation || controller.signal.aborted) return;
      showTerrain(data);
    } catch (error) {
      if (attempt === generation && !controller.signal.aborted)
        status.textContent =
          error instanceof Error ? error.message : 'Relevé illisible.';
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
  void loadIntermediateTerrain()
    .then((data) => {
      if (!data || controller.signal.aborted) return;
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
