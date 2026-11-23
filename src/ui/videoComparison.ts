import type { CabinetAction } from '../game/cabinetAction';
import type { RenderQuality } from '../game/renderQuality';
import { nextCameraPreset } from '../game/cameraPreset';
import type { CameraPreset } from '../game/cameraPreset';
import { isModernView, togglePracticeView } from '../game/gamePresentation';
import type { VideoSource } from '../emulation/videoSource';
import { mountPracticeHud } from './practiceHud';
import { mountGameHelp } from './gameHelp';
import { mountPracticeCameraControls } from './practiceCameraControls';
import type { VenueEffects } from '../emulation/venueEffects';
import type { createVideoView } from '../app/createVideoView';
import {
  MAX_TERRAIN_BYTES,
  parsePracticeTerrain,
} from '../game/modern/practiceTerrain';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { mountCrtControls } from './crtControls';
import type { RollingActors } from '../emulation/rollingActors';

export function mountVideoComparison(
  source: VideoSource,
  effects?: VenueEffects,
) {
  const mode = document.querySelector<HTMLSelectElement>('#video-mode')!;
  const hudMode =
    document.querySelector<HTMLSelectElement>('#game-video-mode')!;
  hudMode.replaceChildren(
    ...Array.from(mode.options, (option) => option.cloneNode(true)),
  );
  const terrainFile =
    document.querySelector<HTMLInputElement>('#live-terrain-file')!;
  const terrainStatus = document.querySelector<HTMLElement>(
    '#live-terrain-status',
  )!;
  const modernOptions = [mode, hudMode].flatMap((selector) =>
    Array.from(
      selector.querySelectorAll<HTMLOptionElement>('[value^="modern"]'),
    ),
  );
  const terrains = new Map<PracticeTerrain['level'], PracticeTerrain>();
  let actorLibrary: RollingActors | undefined;
  let terrainLoad = 0;
  const camera = document.querySelector<HTMLSelectElement>('#camera-view')!,
    hudCamera = document.querySelector<HTMLSelectElement>('#game-camera')!;
  const quality = document.querySelector<HTMLSelectElement>('#render-quality')!,
    hudQuality = document.querySelector<HTMLSelectElement>('#game-quality')!;
  const spatial = document.querySelector<HTMLInputElement>('#spatial-audio')!,
    hudSpatial = document.querySelector<HTMLInputElement>(
      '#game-spatial-audio',
    )!;
  const explore = document.querySelector<HTMLButtonElement>('#explore-bar')!,
    hudExplore = document.querySelector<HTMLButtonElement>('#game-explore')!;
  const leave = document.querySelector<HTMLButtonElement>('#leave-cabinet')!,
    hudLeave = document.querySelector<HTMLButtonElement>(
      '#game-leave-cabinet',
    )!;
  const stage = document.querySelector<HTMLElement>('#video-stage')!,
    status = document.querySelector<HTMLElement>('#video-status')!;
  const viewLabel = document.getElementById('babylon-view-label')!;
  const updateModernHud = mountPracticeHud(
    document.getElementById('practice-hud')!,
  );
  const canvas = document.querySelector<HTMLCanvasElement>('#babylon-video')!;
  const controller = new AbortController(),
    options = { signal: controller.signal };
  const disposeHelp = mountGameHelp(options);
  let disposed = false,
    view: ReturnType<typeof createVideoView> | undefined,
    pending: Promise<void> | undefined;
  const crt = mountCrtControls(options, (value) => view?.setCrt(value));
  const practiceCameras = mountPracticeCameraControls(options, {
    select: (preset) => view?.selectPracticeCamera(preset),
    lens: (fov) => view?.setPracticeFov(fov),
  });
  const marbleShadows = [
    'practice-marble-shadows',
    'game-practice-marble-shadows',
  ].map((id) => document.querySelector<HTMLInputElement>(`#${id}`)!);
  for (const checkbox of marbleShadows) {
    checkbox.addEventListener(
      'change',
      () => {
        for (const other of marbleShadows) other.checked = checkbox.checked;
        view?.setPracticeMarbleShadows(checkbox.checked);
      },
      options,
    );
  }
  let venue: 'inspect' | 'explore' | 'game' = 'inspect';
  let canEnter = true;
  const press = (id: string) => document.getElementById(id)?.click();
  function selectedCamera(): CameraPreset {
    const value = camera.value;
    return value === 'front' ||
      value === 'monitor' ||
      value === 'controls' ||
      value === 'bar'
      ? value
      : 'perspective';
  }
  function selectedQuality(): RenderQuality {
    return quality.value === 'eco'
      ? 'eco'
      : quality.value === 'retina'
        ? 'retina'
        : 'balanced';
  }
  function sync() {
    const ready = mode.value === 'stage' && Boolean(view);
    practiceCameras.setAvailable(isModernView(mode.value) && Boolean(view));
    hudMode.value = mode.value;
    crt.setAvailable(ready);
    hudCamera.value = camera.value;
    hudQuality.value = quality.value;
    hudSpatial.checked = spatial.checked;
    camera.disabled = hudCamera.disabled = !ready;
    quality.disabled = hudQuality.disabled = mode.value === 'direct' || !view;
    spatial.disabled = hudSpatial.disabled = !ready;
    explore.disabled = hudExplore.disabled = !ready || venue === 'explore';
    leave.disabled = hudLeave.disabled = !ready;
    stage.dataset.exploring = String(venue === 'explore');
    const message =
      venue === 'explore'
        ? `Exploration : ZQSD/WASD ou flèches pour marcher, trackpad pour regarder. ${canEnter ? 'E pour jouer dans la borne.' : 'Approcher la borne pour jouer.'} Échap : pause.`
        : venue === 'game'
          ? `Jeu : trackpad pour la bille, Espace pour le boost${ready ? ', C pour changer de vue' : ''}. Échap puis Quitter la borne pour revenir au bar.`
          : 'Bar en observation. Explorer pour marcher et entendre la borne à distance ; cliquer sur l’écran ou le trackball pour jouer.';
    for (const id of ['venue-status', 'game-venue-status']) {
      const element = document.getElementById(id)!;
      if (element.textContent !== message) element.textContent = message;
    }
  }
  function enterGame(center = false) {
    if (venue === 'game') return;
    const walking = venue === 'explore';
    venue = 'game';
    view?.endExploration(true);
    if (mode.value === 'stage' && (center || walking)) {
      camera.value = 'front';
      view?.setCameraPreset('front', true);
    }
    sync();
  }
  function cabinetCommand(action: Exclude<CabinetAction, 'preview2'>) {
    if (action === 'play') enterGame(true);
    press(
      {
        credit: 'credit',
        start1: 'start-player',
        start2: 'start-player2',
        play: 'capture',
      }[action],
    );
  }
  function stopExploration() {
    if (venue !== 'explore') return;
    venue = 'inspect';
    view?.endExploration();
    camera.value = 'bar';
    view?.setCameraPreset('bar');
    sync();
  }
  function interrupted() {
    if (disposed) return;
    press('pause');
    stopExploration();
  }
  function modernVisibility(visible: boolean) {
    if (!isModernView(mode.value)) return;
    stage.dataset.modernReady = String(visible);
    stage.dataset.mode =
      mode.value === 'modern-compare'
        ? mode.value
        : visible
          ? 'babylon'
          : 'direct';
    status.textContent = visible
      ? mode.value === 'modern-compare'
        ? 'Jeu original et 3D moderne issus de la même partie.'
        : '3D moderne active sur le parcours.'
      : source.modernPhase?.() === 'arcade'
        ? 'Résultats, fin de partie et menus : affichage du jeu original.'
        : 'L’image arcade reste affichée en attendant un parcours 3D compatible.';
  }
  function fail(error: unknown) {
    if (venue === 'explore') interrupted();
    mode.value = 'direct';
    stage.dataset.mode = 'direct';
    updateModernHud(undefined);
    view?.setEnabled(false);
    sync();
    status.textContent = `Vue BabylonJS indisponible : ${String(error)}. La vue directe reste disponible.`;
  }
  async function select() {
    if (mode.value === 'modern') stage.dataset.mode = 'babylon';
    try {
      if (mode.value !== 'direct' && !view) {
        status.textContent = 'Chargement de la vue BabylonJS…';
        pending ??= import('../app/createVideoView').then(
          ({ createVideoView }) => {
            if (!disposed)
              view = createVideoView(canvas, source, fail, cabinetCommand, {
                ...(effects ? { effects } : {}),
                explorationEnded: interrupted,
                modernVisibility,
                modernHud: updateModernHud,
                modernTwoPlayers: (duo) => practiceCameras.setTwoPlayers(duo),
                navigationStatus(value) {
                  if (canEnter !== value) {
                    canEnter = value;
                    sync();
                  }
                },
              });
          },
        );
        await pending;
      }
      if (disposed) return;
      if (venue === 'explore') interrupted();
      const modern = isModernView(mode.value);
      stage.dataset.mode = mode.value === 'modern' ? 'babylon' : mode.value;
      viewLabel.textContent = modern
        ? '3D moderne'
        : 'Vidéo arcade · BabylonJS';
      view?.setCameraPreset(selectedCamera());
      if (modern && view) {
        if (actorLibrary) view.setActors(actorLibrary);
        for (const terrain of terrains.values())
          view.setModernTerrain(terrain, terrain === preferredTerrain);
      }
      view?.setPresentation(
        modern ? 'modern' : mode.value === 'stage' ? 'stage' : 'flat',
      );
      view?.setEnabled(mode.value !== 'direct');
      view?.setQuality(selectedQuality());
      view?.setCrt(crt.settings());
      view?.setSpatialEnabled(spatial.checked);
      sync();
      if (modern) return;
      status.textContent =
        mode.value === 'direct'
          ? 'Jeu original. Même émulateur.'
          : mode.value === 'stage'
            ? 'Borne et bar : observation, exploration et jeu partagent la même session.'
            : 'Même session sur un plan BabylonJS.';
    } catch (error) {
      if (!disposed) {
        pending = undefined;
        fail(error);
      }
    }
  }
  async function exploreBar() {
    if (!view || venue === 'explore') return;
    press('pause');
    venue = 'explore';
    sync();
    // Resume audio in this user gesture; a failed lock immediately pauses again.
    press('resume');
    if (!(await view.beginExploration())) interrupted();
  }
  function returnToBar() {
    press('pause');
    view?.endExploration();
    venue = 'inspect';
    camera.value = 'bar';
    view?.setCameraPreset('bar', true);
    sync();
  }
  function changeCamera(value: string) {
    camera.value = value;
    sync();
    try {
      view?.setCameraPreset(selectedCamera(), true);
    } catch (error) {
      fail(error);
    }
  }
  for (const selector of [camera, hudCamera])
    selector.addEventListener(
      'change',
      () => {
        if (venue === 'explore') interrupted();
        changeCamera(selector.value);
      },
      options,
    );
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        venue !== 'game' ||
        document.pointerLockElement !== source.canvas ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable]'))
      )
        return;
      const key = event.key.toLowerCase();
      const changeView = key === 'v' && terrains.size > 0;
      const modern = isModernView(mode.value);
      const cycleCamera = key === 'c' && (modern || !camera.disabled);
      const zoom = modern && (key === '+' || key === '=' || key === '-');
      if (!changeView && !cycleCamera && !zoom) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (changeView) {
        mode.value = togglePracticeView(mode.value, event.shiftKey);
        void select();
      } else if (zoom) practiceCameras.adjust(key === '-' ? -1 : 1);
      else if (modern) practiceCameras.next();
      else changeCamera(nextCameraPreset(selectedCamera()));
    },
    { ...options, capture: true },
  );
  for (const selector of [quality, hudQuality])
    selector.addEventListener(
      'change',
      () => {
        quality.value = selector.value;
        view?.setQuality(selectedQuality());
        sync();
      },
      options,
    );
  for (const checkbox of [spatial, hudSpatial])
    checkbox.addEventListener(
      'change',
      () => {
        spatial.checked = checkbox.checked;
        view?.setSpatialEnabled(spatial.checked);
        sync();
      },
      options,
    );
  for (const button of [explore, hudExplore])
    button.addEventListener(
      'click',
      () => {
        void exploreBar();
      },
      options,
    );
  for (const button of [leave, hudLeave])
    button.addEventListener('click', returnToBar, options);
  if (Number.isFinite(source.geometry.aspect) && source.geometry.aspect > 0)
    stage.style.setProperty('--arcade-aspect', String(source.geometry.aspect));
  terrainFile.disabled = !source.practicePose;
  let preferredTerrain: PracticeTerrain | undefined;
  async function setTerrain(data: PracticeTerrain, show = false) {
    if (disposed) return;
    terrains.set(data.level, data);
    if (show || !preferredTerrain) preferredTerrain = data;
    for (const option of modernOptions) option.disabled = false;
    terrainStatus.textContent =
      'Relevé chargé. En capture, V fait défiler 3D, comparaison et arcade.';
    if (show) mode.value = 'modern';
    if (isModernView(mode.value)) await select();
  }
  terrainFile.addEventListener(
    'change',
    async () => {
      const file = terrainFile.files?.[0];
      if (!file) return;
      const attempt = ++terrainLoad;
      try {
        if (file.size > MAX_TERRAIN_BYTES)
          throw new Error('Relevé trop volumineux.');
        const data = parsePracticeTerrain(await file.text());
        if (disposed || attempt !== terrainLoad) return;
        await setTerrain(data);
      } catch (error) {
        if (!disposed && attempt === terrainLoad)
          terrainStatus.textContent = String(error);
      }
    },
    options,
  );
  mode.disabled = hudMode.disabled = false;
  for (const selector of [mode, hudMode])
    selector.addEventListener(
      'change',
      () => {
        mode.value = selector.value;
        void select();
      },
      options,
    );
  sync();
  return {
    setActors(actors: RollingActors) {
      actorLibrary = actors;
      view?.setActors(actors);
    },
    setTerrain,
    restartOpening() {
      view?.restartOpening();
    },
    enterGame: () => enterGame(false),
    stopExploration,
    get isExploring() {
      return venue === 'explore';
    },
    get diagnostics() {
      return {
        mode: mode.value,
        cameraPreset: camera.value,
        venue,
        ...(view?.diagnostics ?? { copies: 0 }),
      };
    },
    dispose() {
      disposed = true;
      controller.abort();
      disposeHelp();
      crt.setAvailable(false);
      practiceCameras.setAvailable(false);
      terrainFile.disabled = true;
      for (const option of modernOptions) option.disabled = true;
      if (venue === 'explore') press('pause');
      view?.dispose();
      updateModernHud(undefined);
      for (const input of [
        mode,
        hudMode,
        camera,
        hudCamera,
        quality,
        hudQuality,
        spatial,
        hudSpatial,
        explore,
        hudExplore,
        leave,
        hudLeave,
      ])
        input.disabled = true;
    },
  };
}
