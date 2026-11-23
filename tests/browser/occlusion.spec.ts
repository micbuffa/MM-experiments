import type { createCameraOcclusion as OcclusionFactory } from '../../src/rendering/createCameraOcclusion';
import type { createWorm as WormFactory } from '../../src/rendering/createWorm';
import type { createPracticeMarble as MarbleFactory } from '../../src/rendering/createPracticeMarble';
import type { createLivePracticeView as ViewFactory } from '../../src/rendering/createLivePracticeView';
import type { createApplication as ApplicationFactory } from '../../src/app/createApplication';
import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { expect, test } from './fixtures';

test('une paroi entre caméra et bille devient traversable visuellement puis réapparaît', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const paths = [
      '/src/app/createApplication.ts',
      '/src/rendering/createLivePracticeView.ts',
      '/src/rendering/createPracticeMarble.ts',
      '/src/rendering/createWorm.ts',
      '/src/rendering/createCameraOcclusion.ts',
    ];
    const [
      { createApplication },
      { createLivePracticeView },
      { createPracticeMarble },
      { createWorm },
      { createCameraOcclusion },
    ] = await Promise.all([
      import(paths[0]!) as Promise<{
        createApplication: typeof ApplicationFactory;
      }>,
      import(paths[1]!) as Promise<{
        createLivePracticeView: typeof ViewFactory;
      }>,
      import(paths[2]!) as Promise<{
        createPracticeMarble: typeof MarbleFactory;
      }>,
      import(paths[3]!) as Promise<{ createWorm: typeof WormFactory }>,
      import(paths[4]!) as Promise<{
        createCameraOcclusion: typeof OcclusionFactory;
      }>,
    ]);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:640px;height:480px';
    document.body.replaceChildren(canvas);
    const app = createApplication(
      canvas,
      (engine) =>
        createLivePracticeView(engine, {
          cells: Array.from({ length: 14 }, () =>
            Array.from({ length: 20 }, () => [0, 0, 0, 0]),
          ),
          origin: { x: 10, z: 11 },
          lastScroll: -16069,
        }).scene,
    );
    const scene = app.scene;
    const camera = scene.getCameraByName(
      'practice-perspective-camera',
    ) as FreeCamera;
    camera.position.set(0, 2.3, -6);
    const target = camera.position.clone().set(0, 0.675, 0);
    camera.setTarget(target);
    scene.activeCamera = camera;
    const ball = createPracticeMarble(scene, 'occlusion-test-ball');
    ball.update({ x: 0, y: 0, z: 0 });
    createWorm(scene, 'test-wall');
    const wall = scene.getMeshByName('test-wall-body') as Mesh;
    wall.parent!.setEnabled(true);
    for (const mesh of scene.meshes)
      if (mesh.name.startsWith('test-wall') && mesh !== wall)
        mesh.setEnabled(false);
    wall.setVerticesData(
      'position',
      [-2, -1, -3, 2, -1, -3, 2, 4, -3, -2, 4, -3],
      true,
    );
    wall.setVerticesData('normal', [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    wall.setVerticesData(
      'color',
      [0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1],
    );
    wall.setIndices([0, 1, 2, 0, 2, 3]);
    wall.refreshBoundingInfo();
    const occlusion = createCameraOcclusion(scene);
    await new Promise<void>((resolve) =>
      scene.executeWhenReady(() => resolve()),
    );
    const gl = canvas.getContext('webgl2')!;
    const pixels = new Uint8Array(80 * 80 * 4);
    function blue() {
      scene.render();
      gl.readPixels(
        Math.floor(canvas.width / 2) - 40,
        Math.floor(canvas.height / 2) - 40,
        80,
        80,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          pixels[i + 2]! > 70 &&
          pixels[i + 2]! > pixels[i]! * 1.5 &&
          pixels[i + 2]! > pixels[i + 1]! * 1.15
        )
          count++;
      return count;
    }
    occlusion({ x: 0, y: 0, z: 0 }, false, 0.05);
    const hidden = blue();
    for (let i = 0; i < 10; i++) occlusion({ x: 0, y: 0, z: 0 }, true, 0.05);
    const revealed = blue();
    occlusion({ x: 10, y: 0, z: 0 }, true, 0.05);
    const outside = blue();
    for (let i = 0; i < 10; i++) occlusion({ x: 0, y: 0, z: 0 }, false, 0.05);
    const restored = blue();
    wall.name = 'foreground-paving';
    wall.setVerticesData(
      'position',
      [-3, 1.3, -5, 3, 1.3, -5, 3, 1.3, -1, -3, 1.3, -1],
      true,
    );
    wall.setVerticesData('normal', [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    wall.refreshBoundingInfo();
    const floorHidden = blue();
    for (let i = 0; i < 10; i++) occlusion({ x: 0, y: 0, z: 0 }, true, 0.05);
    const floorRevealed = blue();
    occlusion({ x: 10, y: 0, z: 0 }, true, 0.05);
    const floorRestored = blue();
    // Verify ground directly underneath the marble's feet stays opaque (never see-through).
    wall.setEnabled(false);
    for (let i = 0; i < 10; i++) occlusion({ x: 0, y: 0, z: 0 }, true, 0.05);
    scene.render();
    const footSample = new Uint8Array(24 * 12 * 4);
    gl.readPixels(
      Math.floor(canvas.width / 2) - 12,
      Math.floor(canvas.height / 2) - 48,
      24,
      12,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      footSample,
    );
    let footFloor = 0;
    for (let i = 0; i < footSample.length; i += 4)
      if (
        footSample[i]! > 30 &&
        footSample[i + 1]! > 30 &&
        footSample[i + 2]! > 30
      )
        footFloor++;
    app.dispose();
    return {
      hidden,
      revealed,
      restored,
      outside,
      floorHidden,
      floorRevealed,
      floorRestored,
      footFloor,
    };
  });
  expect(result.floorHidden).toBeLessThan(10);
  expect(result.floorRevealed).toBeGreaterThan(150);
  expect(result.floorRestored).toBeLessThan(10);
  expect(result.footFloor).toBeGreaterThan(200);
  expect(result.hidden).toBeLessThan(10);
  expect(result.revealed).toBeGreaterThan(150);
  expect(result.outside).toBeLessThan(10);
  expect(result.restored).toBeLessThan(10);
});
