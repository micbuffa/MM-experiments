import { Engine } from '@babylonjs/core/Engines/engine';
import { HtmlElementTexture } from '@babylonjs/core/Materials/Textures/htmlElementTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createLivePracticeView } from '../rendering/createLivePracticeView';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { practiceLens } from '../game/modern/practiceCameraSettings';
import type { PracticeCameraPreset } from '../game/modern/practiceCameraSettings';
import { createVideoScene } from '../rendering/createVideoScene';
import type { CameraPreset } from '../game/cameraPreset';
import { createRenderMetrics } from '../rendering/renderMetrics';
import { createBarExplorer } from '../input/barExplorer';
import { BAR_EYE_HEIGHT } from '../game/barNavigation';
import { renderResolution } from '../game/renderQuality';
import type { RenderQuality } from '../game/renderQuality';
import type { SpatialPose } from '../game/spatialMix';
import type { CabinetAction } from '../game/cabinetAction';
import type { VenueEffects } from '../emulation/venueEffects';
import type { VideoSource } from '../emulation/videoSource';
import type { PracticeHud } from '../emulation/practiceHud';
import type { CrtSettings } from '../rendering/createCrtMaterial';
import type { RollingActors } from '../emulation/rollingActors';
interface ViewOptions {
  effects?: VenueEffects;
  explorationEnded?(): void;
  navigationStatus?(canEnter: boolean): void;
  modernVisibility?(visible: boolean): void;
  modernHud?(hud: PracticeHud | undefined): void;
  modernTwoPlayers?(twoPlayers: boolean): void;
}

/** One GPU owner and one render owner at a time; never iterates the arcade core. */
export function createVideoView(
  canvas: HTMLCanvasElement,
  source: VideoSource,
  onError: (error: unknown) => void,
  onAction?: (action: Exclude<CabinetAction, 'preview2'>) => void,
  options: ViewOptions = {},
) {
  const engine = new Engine(canvas, true);
  const view = createVideoScene(engine),
    metrics = createRenderMetrics(engine, view.scene);
  let texture: HtmlElementTexture | undefined,
    enabled = false,
    disposed = false,
    stagePresentation = false,
    stageCreated = false;
  let modern: ReturnType<typeof createLivePracticeView> | undefined;
  let modernTerrain: PracticeTerrain | undefined;
  const modernTerrains = new Map<PracticeTerrain['level'], PracticeTerrain>();
  let preferredTerrain: PracticeTerrain | undefined;
  let actorLibrary: RollingActors | undefined;
  let modernSelected = false;
  let modernVisible: boolean | undefined;
  const inputForward = Vector3.Zero();
  const cameraForward = new Vector3(0, 0, 1);
  let practiceCamera: PracticeCameraPreset = 'arcade';
  let practiceFov = practiceLens.initial;
  let practiceMarbleShadows = false;
  let contextLost = false;
  let contextLosses = 0;
  let animationFrame = 0,
    animationStart = 0,
    transitioning = false,
    lastFrame = 0;
  let sourceWidth = 0,
    sourceHeight = 0,
    copies = 0,
    totalMs = 0,
    maxMs = 0;
  let quality: RenderQuality = 'balanced',
    spatialEnabled = true;
  let crtEnabled = false;
  const controller = new AbortController(),
    events = { signal: controller.signal };
  const listener: SpatialPose = { x: 0, y: BAR_EYE_HEIGHT, z: -3, yaw: 0 };
  function aspect() {
    const announced = source.geometry.aspect;
    return sourceWidth && sourceHeight
      ? sourceWidth / sourceHeight
      : Number.isFinite(announced) && announced > 0
        ? announced
        : 1;
  }
  function stopLoop() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrame = 0;
  }
  function stopWalking(notify: boolean, keepLock = false) {
    explorer.stop(keepLock);
    view.stopNavigation();
    options.effects?.setSpatialListener(null);
    if (!transitioning) stopLoop();
    if (notify) options.explorationEnded?.();
  }
  const explorer = createBarExplorer(canvas, {
    pose(pose) {
      view.setNavigationPose(pose);
      listener.x = pose.x;
      listener.z = pose.z;
      listener.yaw = pose.yaw;
      options.effects?.setSpatialListener(spatialEnabled ? listener : null);
      options.navigationStatus?.(
        Math.hypot(pose.x, pose.z) < 3.25 && pose.z < -0.65,
      );
    },
    stopped() {
      stopWalking(true);
    },
    enterCabinet() {
      onAction?.('play');
    },
  });
  function schedule() {
    if (!animationFrame && enabled && !disposed && !document.hidden)
      animationFrame = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    animationFrame = 0;
    if (disposed || !enabled || document.hidden) return;
    try {
      if (explorer.active)
        explorer.step(lastFrame ? Math.max(0, (now - lastFrame) / 1000) : 0);
      if (transitioning)
        transitioning = view.updateTransition(
          Math.max(0, (now - animationStart) / 1000),
        );
      lastFrame = now;
      metrics.render();
      if (explorer.active || transitioning) schedule();
      else lastFrame = 0;
    } catch (error) {
      stopLoop();
      onError(error);
    }
  }
  function resizeLayout() {
    if (
      disposed ||
      !enabled ||
      contextLost ||
      !canvas.clientWidth ||
      !canvas.clientHeight
    )
      return;
    const level = 1 / renderResolution(quality, window.devicePixelRatio || 1);
    if (engine.getHardwareScalingLevel() !== level)
      engine.setHardwareScalingLevel(level);
    engine.resize();
    view.resizeLayout(
      aspect(),
      engine.getRenderWidth() / engine.getRenderHeight(),
    );
    return true;
  }
  function render() {
    if (!modernSelected) {
      metrics.render();
      return;
    }
    const pose = source.practicePose?.() ?? null;
    const terrain = pose
      ? modernTerrains.get(pose.level)
      : (modernTerrain ?? preferredTerrain);
    if (terrain && terrain !== modernTerrain) {
      const next = createLivePracticeView(engine, terrain, actorLibrary);
      next.camera.select(practiceCamera);
      next.camera.restartOpening();
      next.camera.setFov(practiceFov);
      next.setMarbleShadows(practiceMarbleShadows);
      modern?.scene.dispose();
      modern = next;
      modernTerrain = terrain;
    }
    const updated = modern?.update(pose) ?? false;
    // Keep the prepared 3D shot while the core is between drawable level states.
    const visible =
      updated ||
      (!pose && modern !== undefined && source.modernPhase?.() !== 'arcade');
    if (visible && modern?.scene.activeCamera) {
      modern.scene.activeCamera.getDirectionToRef(cameraForward, inputForward);
      options.effects?.setInputCamera?.(inputForward.x, inputForward.z);
    } else options.effects?.setInputCamera?.(0, 0);
    if (visible !== modernVisible) {
      modernVisible = visible;
      options.modernVisibility?.(visible);
      if (visible) resizeLayout();
    }
    options.modernTwoPlayers?.(Boolean(visible && pose?.player2));
    options.modernHud?.(
      visible && pose?.opening === undefined ? pose?.hud : undefined,
    );
    if (visible && modern) {
      engine.beginFrame();
      try {
        modern.scene.render();
      } finally {
        engine.endFrame();
      }
    }
  }
  function resize() {
    if (resizeLayout() && !animationFrame) render();
  }
  function refreshModern() {
    if (
      !modernSelected ||
      !enabled ||
      disposed ||
      contextLost ||
      document.hidden
    )
      return;
    try {
      render();
    } catch (error) {
      onError(error);
    }
  }
  let waitingForScene: typeof view.scene | undefined;
  function readyRender() {
    const scene = modernSelected ? modern?.scene : view.scene;
    if (!enabled || contextLost || !scene || waitingForScene === scene) return;
    waitingForScene = scene;
    scene.executeWhenReady(() => {
      if (waitingForScene === scene) waitingForScene = undefined;
      if (scene !== (modernSelected ? modern?.scene : view.scene)) return;
      if (
        !disposed &&
        enabled &&
        !contextLost &&
        !document.hidden &&
        !animationFrame
      )
        render();
    });
  }
  function stopTransition() {
    transitioning = false;
    view.finishTransition();
    if (!explorer.active) stopLoop();
    if (enabled && !disposed && !contextLost && !document.hidden) render();
  }
  function pick(event: MouseEvent, button = 0) {
    if (disposed || !enabled || !stagePresentation || explorer.active)
      return null;
    const rect = canvas.getBoundingClientRect();
    return view.pickAction(
      event.clientX - rect.left,
      event.clientY - rect.top,
      document.pointerLockElement !== null,
      button,
    );
  }
  let previewClick = false;
  canvas.addEventListener(
    'click',
    (event) => {
      if (previewClick) {
        previewClick = false;
        return;
      }
      const action = pick(event, event.button);
      if (action && action !== 'preview2') {
        event.preventDefault();
        onAction?.(action);
      }
    },
    events,
  );
  const titles = {
    credit: 'Insérer un crédit',
    start1: 'Start joueur 1',
    start2: 'Start joueur 2',
    play: 'Cliquer pour jouer / capturer le trackpad',
    preview2: 'Maintenir le clic et glisser pour faire tourner la boule J2',
  };
  let previewPointer: number | undefined;
  function stopPreview() {
    const pointer = previewPointer;
    previewPointer = undefined;
    if (pointer !== undefined && canvas.hasPointerCapture(pointer))
      canvas.releasePointerCapture(pointer);
  }
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      previewClick = pick(event, event.button) === 'preview2';
      if (!previewClick) return;
      previewPointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    },
    events,
  );
  for (const name of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] as const)
    canvas.addEventListener(
      name,
      (event) => {
        if (event.pointerId === previewPointer) previewPointer = undefined;
      },
      events,
    );
  canvas.addEventListener(
    'pointermove',
    (event) => {
      const action = pick(event);
      canvas.style.cursor = action ? 'pointer' : '';
      canvas.title = action ? titles[action] : '';
      if (
        previewPointer === event.pointerId &&
        event.buttons & 1 &&
        enabled &&
        stagePresentation &&
        !explorer.active &&
        document.pointerLockElement === null
      ) {
        view.rollTrackball(event.movementX, event.movementY, 1);
        schedule();
      }
    },
    events,
  );
  window.addEventListener('resize', resize, events);
  window.addEventListener(
    'blur',
    () => {
      stopPreview();
      stopTransition();
    },
    events,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        stopPreview();
        stopTransition();
      }
    },
    { ...events, capture: true },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stopPreview();
        stopLoop();
        transitioning = false;
        view.finishTransition();
      } else if (enabled) readyRender();
    },
    events,
  );
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  engine.onContextLostObservable.add(() => {
    contextLost = true;
    contextLosses++;
    // The previous texture belongs to the lost context. Wait for a fresh
    // source draw before creating its replacement.
    view.setVideoTexture(null);
    texture?.dispose();
    texture = undefined;
    onError(new Error('Contexte graphique 3D perdu'));
  });
  engine.onContextRestoredObservable.add(() => {
    contextLost = false;
  });
  const stopMotion = options.effects?.subscribeMotion((x, y, player) =>
    view.rollTrackball(x, y, player),
  );
  const unsubscribe = source.subscribe(() => {
    if (
      disposed ||
      !enabled ||
      contextLost ||
      document.hidden ||
      !source.canvas.width ||
      !source.canvas.height
    )
      return;
    const start = performance.now();
    try {
      if (modernSelected) {
        render();
        return;
      }
      if (
        !texture ||
        sourceWidth !== source.canvas.width ||
        sourceHeight !== source.canvas.height
      ) {
        texture?.dispose();
        sourceWidth = source.canvas.width;
        sourceHeight = source.canvas.height;
        texture = new HtmlElementTexture('arcade-canvas', source.canvas, {
          scene: view.scene,
          engine,
          generateMipMaps: false,
          samplingMode: Texture.BILINEAR_SAMPLINGMODE,
        });
        texture.hasAlpha = false;
        view.setVideoTexture(texture);
        resizeLayout();
      } else texture.update(true);
      updateCrtFrame(copies + 1);
      if (!animationFrame) metrics.render();
      copies++;
      const elapsed = performance.now() - start;
      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    } catch (error) {
      enabled = false;
      stopLoop();
      onError(error);
    }
  });
  function updateCrtFrame(frame = copies) {
    if (!stagePresentation || !crtEnabled || !texture) return;
    const rows = source.geometry.height;
    view.updateCrtFrame(rows > 0 ? rows : sourceHeight, frame / 60);
  }
  return {
    async beginExploration() {
      if (!stagePresentation || !enabled || disposed) return false;
      stopPreview();
      transitioning = false;
      stopLoop();
      const result = await explorer.begin();
      if (result) schedule();
      return result;
    },
    endExploration(keepLock = false) {
      stopWalking(false, keepLock);
    },
    get exploring() {
      return explorer.active;
    },
    setSpatialEnabled(value: boolean) {
      spatialEnabled = value;
      options.effects?.setSpatialListener(
        value && explorer.active ? listener : null,
      );
    },
    setQuality(value: RenderQuality) {
      quality = value;
      view.setQuality(value);
      resize();
      readyRender();
    },
    setCrt(value: CrtSettings) {
      crtEnabled = value.enabled;
      view.setCrt(value);
      updateCrtFrame();
      readyRender();
    },
    setCameraPreset(value: CameraPreset, animated = false) {
      stopPreview();
      stopWalking(false);
      stopLoop();
      transitioning = view.setCameraPreset(value, animated && enabled);
      if (transitioning) {
        animationStart = performance.now();
        schedule();
      } else resize();
    },
    restartOpening() {
      modern?.camera.restartOpening();
    },
    setModernTerrain(terrain: PracticeTerrain, preferred = false) {
      modernTerrains.set(terrain.level, terrain);
      if (preferred || !preferredTerrain) preferredTerrain = terrain;
    },
    setActors(actors: RollingActors) {
      if (actors === actorLibrary) return;
      actorLibrary = actors;
      modernTerrain = undefined;
    },
    selectPracticeCamera(preset: PracticeCameraPreset) {
      practiceCamera = preset;
      modern?.camera.select(preset);
      refreshModern();
    },
    setPracticeFov(degrees: number) {
      practiceFov = degrees;
      modern?.camera.setFov(degrees);
      refreshModern();
    },
    setPracticeMarbleShadows(enabled: boolean) {
      practiceMarbleShadows = enabled;
      modern?.setMarbleShadows(enabled);
      refreshModern();
    },
    setPresentation(value: 'flat' | 'stage' | 'modern') {
      options.effects?.setInputCamera?.(0, 0);
      stopPreview();
      stopWalking(false);
      stopLoop();
      transitioning = false;
      stagePresentation = value === 'stage';
      modernVisible = undefined;
      modernSelected = value === 'modern';
      options.modernHud?.(undefined);
      if (!modernSelected) modern?.update(null);
      view.setPresentation(stagePresentation ? 'stage' : 'flat');
      updateCrtFrame();
      resize();
      if (stagePresentation && !stageCreated) {
        stageCreated = true;
        view.scene.executeWhenReady(() => {
          if (enabled && !disposed && !document.hidden) resize();
        });
      }
    },
    setEnabled(value: boolean) {
      if (value && contextLost)
        throw new Error('Contexte graphique 3D en cours de récupération');
      enabled = value;
      if (!value) {
        stopPreview();
        stopWalking(false);
        stopLoop();
        transitioning = false;
        view.finishTransition();
      }
      if (modernSelected && enabled) render();
      else resize();
      readyRender();
    },
    get diagnostics() {
      return {
        enabled,
        transitioning,
        exploration: explorer.diagnostics,
        quality,
        modernVisible,
        practiceCamera: modern?.camera.diagnostics ?? null,
        practiceMarbleShadows,
        contextLost,
        contextLosses,
        copies,
        sourceWidth,
        sourceHeight,
        copyAndRenderMeanMs: copies
          ? Number((totalMs / copies).toFixed(3))
          : null,
        copyAndRenderMaxMs: Number(maxMs.toFixed(3)),
        timing: 'CPU video callback; complete renderer CPU/GPU in rendering',
        rendering: metrics.diagnostics,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      options.effects?.setInputCamera?.(0, 0);
      stopPreview();
      transitioning = false;
      stopWalking(false);
      stopLoop();
      explorer.dispose();
      controller.abort();
      observer.disconnect();
      unsubscribe();
      stopMotion?.();
      canvas.style.cursor = '';
      canvas.title = '';
      metrics.dispose();
      texture?.dispose();
      modern?.scene.dispose();
      view.scene.dispose();
      engine.dispose();
    },
  };
}
