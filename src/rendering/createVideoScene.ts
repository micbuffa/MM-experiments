// Registers Scene.pick/createPickingRay for the real canvas interactions.
import '@babylonjs/core/Culling/ray';
import { CABINET } from '../game/venueLayout';
import { BAR_EYE_HEIGHT } from '../game/barNavigation';
import type { BarPose } from '../game/barNavigation';
import type { RenderQuality } from '../game/renderQuality';
import { cameraTransition } from '../game/cameraTransition';
import type { CameraPreset } from '../game/cameraPreset';
import { cabinetAction } from '../game/cabinetAction';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { Scene } from '@babylonjs/core/scene';
import { createScreenStage } from './createScreenStage';
import { videoFit, videoFrustum } from './videoLayout';
import { createCrtMaterial, createVideoMesh } from './createCrtMaterial';
import type { CrtSettings } from './createCrtMaterial';

export function createVideoScene(engine: AbstractEngine) {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.07, 0.08, 0.1, 1);
  scene.imageProcessingConfiguration.isEnabled = false;
  const camera = new FreeCamera('video-camera', new Vector3(0, 0, -3), scene);
  camera.minZ = 0.05;
  camera.setTarget(Vector3.Zero());
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  // Caméra fixe : aucun attachControl, les entrées appartiennent au cœur.
  const plane = createVideoMesh(scene);
  const material = new StandardMaterial('arcade-video-material', scene);
  material.disableLighting = true;
  material.diffuseColor = Color3.Black();
  material.emissiveColor = Color3.Black();
  material.specularColor = Color3.Black();
  plane.material = material;
  plane.metadata = { cabinetAction: 'play' };
  let stage: ReturnType<typeof createScreenStage> | undefined;
  let presentation: 'flat' | 'stage' = 'flat';
  let crt: ReturnType<typeof createCrtMaterial> | undefined;
  let crtSettings: CrtSettings | undefined;
  function syncScreenMaterial() {
    const texture = material.emissiveTexture;
    if (presentation !== 'stage' || !texture) {
      plane.material = material;
      return;
    }
    crt ??= createCrtMaterial(scene);
    crt.setTexture('videoSampler', texture);
    applyVideoFit();
    const settings = crtSettings?.enabled ? crtSettings : undefined;
    crt.setFloat('curvature', settings?.curvature ?? 0);
    crt.setFloat('scanlines', settings?.scanlines ?? 0);
    crt.setFloat('interference', settings?.interference ?? 0);
    plane.material = crt;
  }
  let cameraPreset: CameraPreset = 'perspective';
  let transitioning = false;
  let walking = false;
  let quality: RenderQuality = 'balanced';
  const walkTarget = Vector3.Zero();
  const fromPosition = Vector3.Zero(),
    fromTarget = Vector3.Zero();
  const toPosition = Vector3.Zero(),
    toTarget = Vector3.Zero(),
    currentTarget = Vector3.Zero();
  const resizePosition = Vector3.Zero(),
    resizeTarget = Vector3.Zero();
  const perspectiveFov = () =>
    camera.mode === Camera.ORTHOGRAPHIC_CAMERA
      ? 2 *
        Math.atan(
          camera.orthoTop! / Math.abs(camera.position.z - CABINET.screenZ),
        )
      : camera.fov;
  let fromFov = 0.72,
    toFov = 0.72;
  let aspect = 1;
  let viewport = 1;
  function applyVideoFit() {
    if (!crt || presentation !== 'stage') return;
    const fit = videoFit(aspect, CABINET.screenAspect);
    crt.setFloat('videoFitX', fit.x);
    crt.setFloat('videoFitY', fit.y);
  }
  function layout(sourceAspect: number, viewportAspect: number) {
    transitioning = false;
    aspect = sourceAspect;
    viewport = viewportAspect;
    if (presentation === 'stage') {
      const halfHeight = CABINET.screenHalfHeight;
      plane.scaling.set(CABINET.screenAspect * halfHeight, halfHeight, 1);
      applyVideoFit();
      if (cameraPreset === 'front') {
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.position.set(
          0,
          CABINET.screenY + 3 * Math.sin(CABINET.screenTilt),
          CABINET.screenZ - 3 * Math.cos(CABINET.screenTilt),
        );
        camera.setTarget(new Vector3(0, CABINET.screenY, CABINET.screenZ));
        // Frame the screen and its bezel, without perspective distortion.
        const frame = videoFrustum(CABINET.screenAspect, viewportAspect);
        camera.orthoLeft = frame.left * 1.08 * halfHeight;
        camera.orthoRight = frame.right * 1.08 * halfHeight;
        camera.orthoTop = frame.top * 1.08 * halfHeight;
        camera.orthoBottom = frame.bottom * 1.08 * halfHeight;
      } else {
        camera.mode = Camera.PERSPECTIVE_CAMERA;
        if (cameraPreset === 'bar') {
          const distance = Math.max(1, 1 / viewportAspect);
          camera.position.set(6.2 * distance, 3.7 * distance, -8.6 * distance);
          camera.setTarget(new Vector3(1.0, 1.35, 1.0));
          camera.fov = 0.85;
        } else if (cameraPreset === 'monitor') {
          const distance = Math.max(1, 1.25 / viewportAspect);
          camera.position.set(
            0.06,
            CABINET.screenY + 0.37 * distance,
            CABINET.screenZ - distance,
          );
          camera.setTarget(new Vector3(0, CABINET.screenY, CABINET.screenZ));
          camera.fov = 0.4;
        } else if (cameraPreset === 'controls') {
          const distance = Math.max(1, 0.95 / viewportAspect);
          camera.position.set(0.14, 1.56, -1.55 * distance);
          camera.setTarget(new Vector3(0, 1.26, -0.13));
          camera.fov = 0.64;
        } else {
          camera.position.set(1.05, 1.42, -2.55);
          camera.setTarget(new Vector3(0, 0.88, 0));
          camera.fov = viewportAspect < 1 ? 1.05 : 0.72;
        }
      }
      plane.position.set(0, CABINET.screenY, CABINET.screenZ);
      plane.rotation.x = CABINET.screenTilt;
      scene.clearColor.set(0.025, 0.04, 0.07, 1);
      return;
    }
    plane.scaling.y = 1;
    plane.rotation.x = 0;
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.position.set(0, 0, -3);
    camera.setTarget(Vector3.Zero());
    plane.position.set(0, 0, 0);
    scene.clearColor.set(0.07, 0.08, 0.1, 1);
    const frame = videoFrustum(sourceAspect, viewportAspect);
    plane.scaling.x = sourceAspect;
    camera.orthoLeft = frame.left;
    camera.orthoRight = frame.right;
    camera.orthoTop = frame.top;
    camera.orthoBottom = frame.bottom;
  }
  layout(1, 1);
  return {
    scene,
    material,
    setVideoTexture(texture: BaseTexture | null) {
      material.emissiveTexture = texture;
      if (!texture) crt?.removeTexture('videoSampler');
      syncScreenMaterial();
    },
    setCrt(value: CrtSettings) {
      crtSettings = value;
      syncScreenMaterial();
    },
    updateCrtFrame(rows: number, frameSeconds: number) {
      crt?.setFloat('videoRows', rows);
      crt?.setFloat('frameSeconds', frameSeconds);
    },
    layout,
    rollTrackball(x: number, y: number, player: 0 | 1 = 0) {
      stage?.roll(x, y, player);
    },
    setQuality(value: RenderQuality) {
      quality = value;
      stage?.setQuality(value);
    },
    setNavigationPose(pose: BarPose) {
      walking = true;
      transitioning = false;
      camera.mode = Camera.PERSPECTIVE_CAMERA;
      camera.fov = 0.85;
      camera.position.set(pose.x, BAR_EYE_HEIGHT, pose.z);
      const horizontal = Math.cos(pose.pitch);
      walkTarget.set(
        pose.x + Math.sin(pose.yaw) * horizontal,
        BAR_EYE_HEIGHT - Math.sin(pose.pitch),
        pose.z + Math.cos(pose.yaw) * horizontal,
      );
      camera.setTarget(walkTarget);
    },
    stopNavigation() {
      walking = false;
    },
    resizeLayout(sourceAspect: number, viewportAspect: number) {
      if (walking) {
        aspect = sourceAspect;
        viewport = viewportAspect;
        applyVideoFit();
        return;
      }
      if (!transitioning) {
        layout(sourceAspect, viewportAspect);
        return;
      }
      resizePosition.copyFrom(camera.position);
      resizeTarget.copyFrom(camera.getTarget());
      const resizeFov = camera.fov;
      layout(sourceAspect, viewportAspect);
      toPosition.copyFrom(camera.position);
      toTarget.copyFrom(camera.getTarget());
      toFov = perspectiveFov();
      camera.mode = Camera.PERSPECTIVE_CAMERA;
      camera.position.copyFrom(resizePosition);
      camera.setTarget(resizeTarget);
      camera.fov = resizeFov;
      transitioning = true;
    },
    setCameraPreset(value: CameraPreset, animate = false) {
      walking = false;
      const shouldAnimate =
        animate && presentation === 'stage' && value !== cameraPreset;
      fromPosition.copyFrom(camera.position);
      fromTarget.copyFrom(camera.getTarget());
      fromFov =
        camera.mode === Camera.ORTHOGRAPHIC_CAMERA
          ? 2 *
            Math.atan(
              camera.orthoTop! / Math.abs(camera.position.z - CABINET.screenZ),
            )
          : camera.fov;
      cameraPreset = value;
      layout(aspect, viewport);
      if (!shouldAnimate) return false;
      toPosition.copyFrom(camera.position);
      toTarget.copyFrom(camera.getTarget());
      toFov =
        camera.mode === Camera.ORTHOGRAPHIC_CAMERA
          ? 2 *
            Math.atan(
              camera.orthoTop! / Math.abs(camera.position.z - CABINET.screenZ),
            )
          : camera.fov;
      camera.mode = Camera.PERSPECTIVE_CAMERA;
      camera.position.copyFrom(fromPosition);
      camera.setTarget(fromTarget);
      camera.fov = fromFov;
      transitioning = true;
      return true;
    },
    updateTransition(elapsedSeconds: number) {
      if (!transitioning) return false;
      const progress = cameraTransition(elapsedSeconds);
      Vector3.LerpToRef(fromPosition, toPosition, progress, camera.position);
      Vector3.LerpToRef(fromTarget, toTarget, progress, currentTarget);
      camera.setTarget(currentTarget);
      camera.fov = fromFov + (toFov - fromFov) * progress;
      if (progress === 1) layout(aspect, viewport);
      return transitioning;
    },
    finishTransition() {
      layout(aspect, viewport);
    },
    pickAction(x: number, y: number, captured: boolean, button = 0) {
      if (presentation !== 'stage' || transitioning || captured || button !== 0)
        return null;
      const hit = scene.pick(
        x,
        y,
        (mesh) => mesh.isEnabled() && mesh.isVisible && mesh.isPickable,
      );
      const metadata: unknown = hit?.pickedMesh?.metadata;
      return cabinetAction(metadata, captured, button);
    },
    setPresentation(value: 'flat' | 'stage') {
      walking = false;
      presentation = value;
      syncScreenMaterial();
      if (value === 'stage' && !stage) {
        stage = createScreenStage(scene);
        stage.setQuality(quality);
      }
      stage?.setEnabled(value === 'stage');
      layout(aspect, viewport);
    },
  };
}
