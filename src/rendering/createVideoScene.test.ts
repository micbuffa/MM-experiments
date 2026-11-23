import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { expect, it } from 'vitest';
import { CABINET } from '../game/venueLayout';
import { createVideoScene } from './createVideoScene';

it('limits CRT rendering to the cabinet and reuses its material on reactivation', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    const screen = view.scene.getMeshByName('arcade-video')!;
    const settings = {
      enabled: true,
      curvature: 0.5,
      scanlines: 0.4,
      interference: 0,
    };
    view.setCrt(settings);
    view.setPresentation('stage');
    expect(screen.material).toBe(view.material);

    const firstTexture = new Texture(null, view.scene);
    view.setVideoTexture(firstTexture);
    const crt = screen.material!;
    expect(crt.name).toBe('arcade-crt');
    expect(crt.getActiveTextures()).toEqual([firstTexture]);

    view.setVideoTexture(null);
    expect(screen.material).toBe(view.material);
    expect(crt.getActiveTextures()).toEqual([]);
    view.setPresentation('flat');
    expect(screen.material).toBe(view.material);
    const replacement = new Texture(null, view.scene);
    view.setVideoTexture(replacement);
    view.setPresentation('stage');
    expect(screen.material).toBe(crt);
    expect(crt.getActiveTextures()).toEqual([replacement]);

    view.setCrt({ ...settings, enabled: false });
    expect(screen.material).toBe(crt);
    expect(view.material.emissiveTexture).toBe(replacement);
    view.scene.dispose();
    expect(view.scene.materials).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});

it.each([
  [20, 0, 1, 0],
  [-20, 0, -1, 0],
  [0, 20, 0, -1],
  [0, -20, 0, 1],
  [20, 20, 1, -1],
] as const)(
  'rolls the top surface along the cabinet for input (%i, %i) after prior mixed motion',
  (x, y, right, depth) => {
    const engine = new NullEngine();
    try {
      const view = createVideoScene(engine);
      view.setPresentation('stage');
      const ball = view.scene.getMeshByName('cabinet-trackball')!;
      view.rollTrackball(65, -85);
      const world = ball.computeWorldMatrix(true);
      const top = ball.position.add(new Vector3(0, CABINET.trackballRadius, 0));
      const marker = Vector3.TransformCoordinates(top, world.clone().invert());
      view.rollTrackball(0, 0);
      expect(
        Vector3.TransformCoordinates(
          marker,
          ball.computeWorldMatrix(true),
        ).equalsWithEpsilon(top),
      ).toBe(true);
      view.rollTrackball(x, y);
      const delta = Vector3.TransformCoordinates(
        marker,
        ball.computeWorldMatrix(true),
      ).subtract(top);
      const tangent =
        (CABINET.trackballRadius * Math.sin(Math.hypot(x, y) * 0.006)) /
        Math.hypot(right, depth);
      expect(delta.x).toBeCloseTo(tangent * right, 6);
      expect(delta.z).toBeCloseTo(tangent * depth, 6);
    } finally {
      engine.dispose();
    }
  },
);

it('keeps a fast trackpad sample from making the top appear to roll backward', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    view.setPresentation('stage');
    const ball = view.scene.getMeshByName('cabinet-trackball')!;
    view.rollTrackball(870, 0);
    const top = Vector3.TransformCoordinates(
      new Vector3(0, CABINET.trackballRadius, 0),
      ball.computeWorldMatrix(true),
    );
    expect(top.x).toBeGreaterThan(ball.position.x);
    expect(top.y).toBeGreaterThan(ball.position.y);
    expect(top.z).toBeCloseTo(ball.position.z);
    expect(() => view.rollTrackball(NaN, 0)).toThrow(RangeError);
  } finally {
    engine.dispose();
  }
});

it('crée un plan non éclairé et une caméra fixe, sans physique ni contrôles', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    view.layout(4 / 3, 2);
    const plane = view.scene.getMeshByName('arcade-video')!;
    expect(plane.scaling.x / plane.scaling.y).toBeCloseTo(4 / 3);
    expect(view.scene.activeCamera?.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
    expect(view.scene.lights).toHaveLength(0);
    expect(view.material.disableLighting).toBe(true);
    expect(view.scene.imageProcessingConfiguration.isEnabled).toBe(false);
    view.scene.render();
    view.scene.dispose();
    expect(view.scene.isDisposed).toBe(true);
    expect(view.scene.meshes).toHaveLength(0);
    expect(view.scene.materials).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});

it('switches the same screen between flat and perspective, reuses stage resources and disposes them', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    view.layout(4 / 3, 4 / 3);
    expect(view.scene.meshes).toHaveLength(1);
    expect(view.scene.activeCamera!.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
    view.setPresentation('stage');
    const count = view.scene.meshes.length;
    expect(count).toBeGreaterThan(8);
    expect(view.scene.activeCamera!.mode).toBe(Camera.PERSPECTIVE_CAMERA);
    expect(view.scene.getMeshByName('arcade-video')!.position.y).toBe(
      CABINET.screenY,
    );
    const housing = view.scene.getMeshByName('screen-housing')!;
    const width = housing.getBoundingInfo().boundingBox.extendSize.x;
    view.layout(16 / 9, 0.8);
    expect(housing.getBoundingInfo().boundingBox.extendSize.x).toBe(width);
    const screen = view.scene.getMeshByName('arcade-video')!;
    expect(screen.scaling.y).toBeCloseTo(CABINET.screenHalfHeight);
    expect(screen.scaling.x / screen.scaling.y).toBeCloseTo(4 / 3);
    view.scene.render();
    view.setPresentation('flat');
    expect(view.scene.getMeshByName('screen-housing')!.isEnabled()).toBe(false);
    expect(view.scene.activeCamera!.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
    expect(view.scene.lights.every((light) => !light.isEnabled())).toBe(true);
    view.setPresentation('stage');
    expect(view.scene.meshes).toHaveLength(count);
    expect(view.scene.lights.every((light) => light.isEnabled())).toBe(true);
    expect(view.material.disableLighting).toBe(true);
    view.scene.dispose();
    expect(view.scene.isDisposed).toBe(true);
    expect(view.scene.meshes).toHaveLength(0);
    expect(view.scene.lights).toHaveLength(0);
    expect(view.scene.materials).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});

it('frames the front screen without distortion across aspects and keeps the preset across flat views', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    view.setCameraPreset('front');
    view.setPresentation('stage');
    const camera = view.scene.activeCamera as FreeCamera;
    const plane = view.scene.getMeshByName('arcade-video')!;
    const count = view.scene.meshes.length;
    for (const [source, viewport] of [
      [4 / 3, 2],
      [4 / 3, 0.6],
      [16 / 9, 1],
    ]) {
      view.layout(source!, viewport!);
      expect(camera.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
      expect(camera.position.subtract(plane.position).length()).toBeCloseTo(3);
      expect(camera.rotation.x).toBeCloseTo(CABINET.screenTilt);
      expect(plane.rotation.x).toBeCloseTo(CABINET.screenTilt);
      expect(camera.rotation.y).toBeCloseTo(0);
      expect(camera.orthoRight! / camera.orthoTop!).toBeCloseTo(viewport!);
      expect(camera.orthoRight!).toBeGreaterThan(plane.scaling.x);
      expect(camera.orthoTop!).toBeGreaterThan(plane.scaling.y * 1.07);
      expect(plane.scaling.x / plane.scaling.y).toBeCloseTo(4 / 3);
      view.scene.render();
    }
    view.setPresentation('flat');
    expect(camera.position.y).toBe(0);
    view.setPresentation('stage');
    expect(camera.position.y).toBeGreaterThan(CABINET.screenY);
    view.setCameraPreset('perspective');
    expect(camera.mode).toBe(Camera.PERSPECTIVE_CAMERA);
    expect(camera.position.x).toBeGreaterThan(0);
    view.setCameraPreset('front');
    expect(view.scene.meshes).toHaveLength(count);
    expect(view.scene.cameras).toHaveLength(1);
    expect(view.material.disableLighting).toBe(true);
    view.scene.dispose();
  } finally {
    engine.dispose();
  }
});

it('builds a real cabinet, room and actionable controls, animates while paused and disposes all resources', () => {
  const engine = new NullEngine();
  try {
    const view = createVideoScene(engine);
    view.layout(4 / 3, 1.4);
    view.setPresentation('stage');
    const scene = view.scene,
      camera = scene.activeCamera as FreeCamera;
    for (const name of [
      'cabinet-trackball',
      'cabinet-trackball-p2',
      'cabinet-coin-slot',
      'bar-counter-top',
      'bar-stool-seat-0',
      'bar-back-wall',
      'cabinet-marquee',
    ])
      expect(scene.getMeshByName(name)).toBeTruthy();
    expect(
      scene.getMeshByName('cabinet-trackball')!.metadata.cabinetAction,
    ).toBe('play');
    expect(
      scene.getMeshByName('cabinet-button-start2')!.metadata.cabinetAction,
    ).toBe('start2');
    const ball = scene.getMeshByName('cabinet-trackball')!;
    ball.computeWorldMatrix(true);
    expect(ball.getBoundingInfo().boundingBox.maximumWorld.y).toBeLessThan(
      CABINET.screenY - CABINET.screenHalfHeight,
    );
    const redBall = scene.getMeshByName('cabinet-trackball-p2')!;
    expect(ball.position.x).toBeLessThan(0);
    expect(redBall.position.x).toBeGreaterThan(0);
    redBall.computeWorldMatrix(true);
    expect(redBall.getBoundingInfo().boundingBox.extendSize.x).toBeCloseTo(
      CABINET.trackballRadius,
    );
    expect(ball.getBoundingInfo().boundingBox.extendSize.x).toBeCloseTo(
      CABINET.trackballRadius,
    );
    const idleOrientation = redBall.rotationQuaternion!.clone();
    view.rollTrackball(30, 20);
    expect(redBall.rotationQuaternion!.equals(idleOrientation)).toBe(true);
    const blueOrientation = ball.rotationQuaternion!.clone();
    view.rollTrackball(30, 20, 1);
    expect(redBall.rotationQuaternion!.equals(idleOrientation)).toBe(false);
    expect(ball.rotationQuaternion!.equals(blueOrientation)).toBe(true);
    const riser = scene.getMeshByName('cabinet-deck-riser')!;
    riser.computeWorldMatrix(true);
    expect(riser.getBoundingInfo().boundingBox.maximumWorld.y).toBeLessThan(
      CABINET.screenY - CABINET.screenHalfHeight,
    );

    expect(view.pickAction(0, 0, true)).toBeNull();
    expect(view.pickAction(0, 0, false, 2)).toBeNull();
    const count = scene.meshes.length;
    view.setCameraPreset('bar');
    const barPosition = camera.position.clone();
    expect(view.setCameraPreset('front', true)).toBe(true);
    expect(camera.position.equals(barPosition)).toBe(true);
    expect(view.updateTransition(0.325)).toBe(true);
    expect(camera.position.equals(barPosition)).toBe(false);
    expect(view.pickAction(0, 0, false)).toBeNull();
    expect(view.updateTransition(0.65)).toBe(false);
    expect(camera.mode).toBe(Camera.ORTHOGRAPHIC_CAMERA);
    expect(view.updateTransition(1)).toBe(false);
    view.setCameraPreset('bar', true);
    view.updateTransition(0.2);
    view.resizeLayout(4 / 3, 0.7);
    expect(view.updateTransition(0.3)).toBe(true);
    expect(view.updateTransition(0.65)).toBe(false);

    view.setCameraPreset('front');
    expect(view.setCameraPreset('bar', true)).toBe(true);
    expect(view.updateTransition(0)).toBe(true);
    view.layout(4 / 3, 0.7);
    expect(view.updateTransition(0.2)).toBe(false);
    view.setPresentation('flat');
    expect(view.pickAction(0, 0, false)).toBeNull();
    expect(scene.getMeshByName('bar-counter-top')!.isEnabled()).toBe(false);
    expect(scene.lights.every((light) => !light.isEnabled())).toBe(true);
    view.setPresentation('stage');
    expect(scene.meshes).toHaveLength(count);
    scene.dispose();
    expect(scene.meshes).toHaveLength(0);
    expect(scene.textures).toHaveLength(0);
    expect(scene.materials).toHaveLength(0);
    expect(scene.lights).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});
