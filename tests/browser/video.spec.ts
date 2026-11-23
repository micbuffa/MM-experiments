import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import type { PracticePose } from '../../src/emulation/practicePose';

interface VideoFixture {
  draw(alternate?: boolean): number[][];
  boundary(): number[];
  stageColors(alternate?: boolean): number[];
  screenSpans(width: number): number[];
  dispose(): void;
  diagnostics(): {
    mode: string;
    copies: number;
    transitioning?: boolean;
    practiceCamera?: { active: string; opening: number | null } | null;
  };
  listenerCount(): number;
  setPracticePose(pose: PracticePose | null): void;
  setModernPhase(phase: 'level' | 'arcade'): void;
}
declare global {
  interface Window {
    videoFixture: VideoFixture;
  }
}

async function mountVideoFixture(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/ui/videoComparison.ts';
    const { mountVideoComparison } = await import(/* @vite-ignore */ path);
    const source = document.createElement('canvas');
    source.width = 320;
    source.height = 240;
    document.querySelector('#emulator')!.appendChild(source);
    const gl = source.getContext('webgl2')!;
    const listeners = new Set<() => void>();
    let pose: PracticePose | null = null;
    let phase: 'level' | 'arcade' = 'level';
    const comparison = mountVideoComparison({
      practicePose: () => pose,
      modernPhase: () => phase,
      canvas: source,
      geometry: { width: 320, height: 240, aspect: 4 / 3 },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    });
    function draw(alternate = false) {
      gl.enable(gl.SCISSOR_TEST);
      const colors = alternate
        ? [
            [0, 1, 1],
            [1, 0, 1],
            [64 / 255, 128 / 255, 192 / 255],
            [0, 0, 0],
          ]
        : [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
          ];
      // Ordre : haut gauche, haut droite, bas gauche, bas droite.
      colors.forEach((color, index) => {
        gl.scissor((index % 2) * 160, index < 2 ? 120 : 0, 160, 120);
        gl.clearColor(color[0]!, color[1]!, color[2]!, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
      for (const listener of listeners) listener();
      const target =
        document.querySelector<HTMLCanvasElement>('#babylon-video')!;
      const output = target.getContext('webgl2');
      if (!output) return [];
      const height = Math.min(target.height, target.width / (4 / 3)) / 1.04;
      const width = (height * 4) / 3;
      return [0, 1, 2, 3].map((index) => {
        const pixel = new Uint8Array(4);
        output.readPixels(
          Math.floor(target.width / 2 + ((index % 2 ? 1 : -1) * width) / 4),
          Math.floor(target.height / 2 + ((index < 2 ? 1 : -1) * height) / 4),
          1,
          1,
          output.RGBA,
          output.UNSIGNED_BYTE,
          pixel,
        );
        return [...pixel];
      });
    }
    window.videoFixture = {
      draw,
      boundary() {
        draw();
        const target =
          document.querySelector<HTMLCanvasElement>('#babylon-video')!;
        const gl = target.getContext('webgl2')!;
        const pixel = new Uint8Array(4);
        gl.readPixels(
          Math.floor(target.width / 2),
          Math.floor(target.height * 0.75),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        );
        return [...pixel];
      },
      stageColors(alternate = false) {
        draw(alternate);
        const target =
          document.querySelector<HTMLCanvasElement>('#babylon-video')!;
        const output = target.getContext('webgl2')!;
        const pixels = new Uint8Array(target.width * target.height * 4);
        output.readPixels(
          0,
          0,
          target.width,
          target.height,
          output.RGBA,
          output.UNSIGNED_BYTE,
          pixels,
        );
        let red = 0,
          cyan = 0,
          blue = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i]! > 250 && pixels[i + 1]! < 5 && pixels[i + 2]! < 5)
            red++;
          if (pixels[i]! < 5 && pixels[i + 1]! > 250 && pixels[i + 2]! > 250)
            cyan++;
          if (pixels[i + 2]! > 85 && pixels[i + 2]! > 2 * pixels[i + 1]! + 28)
            blue++;
        }
        return [red, cyan, blue];
      },
      screenSpans(width) {
        source.width = width;
        gl.disable(gl.SCISSOR_TEST);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (const listener of listeners) listener();
        const target =
          document.querySelector<HTMLCanvasElement>('#babylon-video')!;
        const output = target.getContext('webgl2')!;
        const w = target.width;
        const h = target.height;
        const pixels = new Uint8Array(w * h * 4);
        output.readPixels(
          0,
          0,
          w,
          h,
          output.RGBA,
          output.UNSIGNED_BYTE,
          pixels,
        );
        function span(vertical: boolean, offset: number) {
          const fixed = Math.floor(
            (vertical ? w : h) / 2 + offset * Math.min(w, h),
          );
          let count = 0;
          for (let i = 0; i < (vertical ? h : w); i++) {
            const index = vertical ? i * w + fixed : fixed * w + i;
            if (pixels[4 * index]! > 180) count++;
          }
          return count;
        }
        return [
          span(false, 0),
          span(true, 0),
          span(false, 0.3),
          span(true, 0.3),
        ];
      },
      dispose: () => comparison.dispose(),
      diagnostics: () => comparison.diagnostics,
      listenerCount: () => listeners.size,
      setModernPhase(value: 'level' | 'arcade') {
        phase = value;
        for (const listener of listeners) listener();
      },
      setPracticePose(value) {
        pose = value;
        draw();
      },
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await mountVideoFixture(page);
});

test('le tube reste 4:3 et le CRT bombe les deux axes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('#video-mode').selectOption('stage');
  await page.locator('#camera-view').selectOption('front');
  await expect
    .poll(() =>
      page.evaluate(() => window.videoFixture.diagnostics().transitioning),
    )
    .toBe(false);
  const spans = (width: number) =>
    page.evaluate((w) => window.videoFixture.screenSpans(w), width);
  await expect
    .poll(async () => {
      const [x, y] = await spans(320);
      return x! / y!;
    })
    .toBeCloseTo(4 / 3, 2);
  const [wideX, wideY] = await spans(427);
  expect(wideX! / wideY!).toBeCloseTo(427 / 240, 2);
  const [flatX] = await spans(320);
  expect(wideX).toBe(flatX);
  await page.locator('#render-crt').check();
  await page.locator('#crt-curvature').fill('100');
  await page.locator('#crt-scanlines').fill('0');
  await expect
    .poll(async () => {
      const [x, y, upperWidth, rightHeight] = await spans(320);
      return Math.min(x! - upperWidth!, y! - rightHeight!);
    })
    .toBeGreaterThan(15);
});

const primary = [
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255],
  [255, 255, 0, 255],
];

test('copie un canvas WebGL sans inversion, conserve les couleurs, resize et source masquée', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  expect(
    await page.evaluate(() => window.videoFixture.diagnostics().copies),
  ).toBe(0);
  await page.locator('#video-mode').selectOption('compare');
  await expect(page.locator('#video-stage')).toHaveAttribute(
    'data-mode',
    'compare',
  );
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.setViewportSize({ width: 780, height: 900 });
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#video-mode').selectOption('babylon');
  await expect(page.locator('.source-view')).toHaveCSS('visibility', 'hidden');
  const alternate = [
    [0, 255, 255, 255],
    [255, 0, 255, 255],
    [64, 128, 192, 255],
    [0, 0, 0, 255],
  ];
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw(true)))
    .toEqual(alternate);
  expect(errors).toEqual([]);
});

test('arrête les copies en vue directe et libère son abonnement au démontage', async ({
  page,
}) => {
  await page.locator('#video-mode').selectOption('compare');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#video-mode').selectOption('direct');
  const copies = await page.evaluate(
    () => window.videoFixture.diagnostics().copies,
  );
  await page.evaluate(() => window.videoFixture.draw());
  expect(
    await page.evaluate(() => window.videoFixture.diagnostics().copies),
  ).toBe(copies);
  await page.evaluate(() => {
    window.videoFixture.dispose();
    window.videoFixture.dispose();
  });
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
  await expect(page.locator('#video-mode')).toBeDisabled();
});

test('un échec de création GPU laisse la vue directe disponible', async ({
  page,
}) => {
  await page.route('**/src/app/createVideoView.ts*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: "export function createVideoView() { throw new Error('GPU indisponible (test)'); }",
    }),
  );
  await page.locator('#video-mode').selectOption('compare');
  await expect(page.locator('#video-status')).toContainText(
    'GPU indisponible (test)',
  );
  await expect(page.locator('#video-stage')).toHaveAttribute(
    'data-mode',
    'direct',
  );
  await expect(page.locator('.source-view')).toBeVisible();
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
});

// À une échelle fractionnaire, les couleurs de part et d'autre d'une arête
// doivent être interpolées au lieu de basculer brutalement d'un texel à l'autre.
test('interpole les arêtes à une échelle fractionnaire sans changer les couleurs intérieures', async ({
  page,
}) => {
  await page.locator('#video-mode').selectOption('compare');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#babylon-video').evaluate((canvas: HTMLCanvasElement) => {
    canvas.style.width = '513px';
    canvas.style.height = '384px';
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const [r, g, b] = window.videoFixture.boundary();
        return r! > 100 && r! < 155 && g! > 100 && g! < 155 && b === 0;
      }),
    )
    .toBe(true);
});

test('la scène en perspective utilise la même vidéo animée, masque la source et revient au plan sans fuite', async ({
  page,
}) => {
  await page.locator('#video-mode').selectOption('stage');
  await expect(page.locator('#video-stage')).toHaveAttribute(
    'data-mode',
    'stage',
  );
  await expect(page.locator('.source-view')).toHaveCSS('visibility', 'hidden');
  await expect
    .poll(() =>
      page.evaluate(() => window.videoFixture.stageColors()[0]! > 100),
    )
    .toBe(true);
  const changed = await page.evaluate(() =>
    window.videoFixture.stageColors(true),
  );
  expect(changed[0]).toBe(0);
  expect(changed[1]).toBeGreaterThan(100);
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
  await page.setViewportSize({ width: 780, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(() => window.videoFixture.stageColors()[0]! > 100),
    )
    .toBe(true);
  await page.locator('#video-mode').selectOption('babylon');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#video-mode').selectOption('stage');
  await expect
    .poll(() =>
      page.evaluate(() => window.videoFixture.stageColors()[0]! > 100),
    )
    .toBe(true);
  await page.evaluate(() => window.videoFixture.dispose());
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
});

test('la vue 3D plein écran garde une vidéo animée et revient à la page sans nouvel abonnement', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const path = '/src/ui/gamePresentation.ts';
    const { mountGamePresentation } = await import(/* @vite-ignore */ path);
    Object.assign(window, { disposePresentation: mountGamePresentation() });
  });
  await page.locator('#enter-game').click();
  await expect(page.locator('#video-stage')).toHaveAttribute(
    'data-mode',
    'stage',
  );
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors()[0]))
    .toBeGreaterThan(100);
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors(true)[1]))
    .toBeGreaterThan(100);
  const canvas = page.locator('#babylon-video');
  await expect(canvas).toBeInViewport();
  const box = await canvas.boundingBox();
  expect(box!.height).toBeGreaterThan(250);
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
  await page.locator('#leave-game').click();
  await expect(page.locator('#game-player')).toHaveAttribute(
    'data-playing',
    'false',
  );
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
  await page.evaluate(() => {
    Reflect.get(window, 'disposePresentation')();
    window.videoFixture.dispose();
  });
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
});

test('caméras frontale et perspective synchronisées dans le HUD, vidéo proportionnée et ressources conservées', async ({
  page,
}) => {
  await expect(page.locator('#camera-view')).toBeDisabled();
  await page.locator('#video-mode').selectOption('stage');
  await expect(page.locator('#camera-view')).toBeEnabled();
  await page.locator('#camera-view').selectOption('front');
  await expect(page.locator('#game-camera')).toHaveValue('front');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  const path = '/src/ui/gamePresentation.ts';
  await page.evaluate(async (path) => {
    const { mountGamePresentation } = await import(/* @vite-ignore */ path);
    Object.assign(window, { disposePresentation: mountGamePresentation() });
  }, path);
  await page.locator('#enter-game').click();
  await expect(page.locator('#game-camera')).toBeEnabled();
  await expect(page.locator('#game-camera')).toHaveValue('front');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors()[0]))
    .toBeGreaterThan(100);
  await page.locator('#game-camera').selectOption('perspective');
  await expect(page.locator('#camera-view')).toHaveValue('perspective');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors(true)[1]))
    .toBeGreaterThan(100);
  await page.locator('#game-camera').selectOption('front');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#leave-game').click();
  await page.setViewportSize({ width: 450, height: 800 });
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.locator('#video-mode').selectOption('babylon');
  await expect(page.locator('#camera-view')).toBeDisabled();
  await page.locator('#video-mode').selectOption('stage');
  await expect(page.locator('#camera-view')).toHaveValue('front');
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
  await page.evaluate(() => {
    Reflect.get(window, 'disposePresentation')();
    window.videoFixture.dispose();
  });
  await expect(page.locator('#camera-view')).toBeDisabled();
  await expect(page.locator('#game-camera')).toBeDisabled();
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
});

test('borne et bar : transition en pause, vrais boutons 3D, monnayeur et trackball sans commande pendant la capture', async ({
  page,
}) => {
  await page.evaluate(() => {
    const calls: string[] = [];
    for (const id of ['credit', 'start-player', 'start-player2', 'capture']) {
      const target = document.getElementById(id) as HTMLButtonElement;
      target.disabled = false;
      target.addEventListener('click', () => {
        calls.push(id);
        if (id === 'capture')
          void document
            .querySelector<HTMLCanvasElement>('#emulator canvas')!
            .requestPointerLock();
      });
    }
    Object.assign(window, { cabinetCalls: calls });
  });
  await page.locator('#video-mode').selectOption('stage');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors()[0]))
    .toBeGreaterThan(100);
  await page.locator('#camera-view').selectOption('bar');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window.videoFixture.diagnostics(), 'transitioning'),
      ),
    )
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors(true)[1]))
    .toBeGreaterThan(100);
  await page.locator('#camera-view').selectOption('perspective');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window.videoFixture.diagnostics(), 'transitioning'),
      ),
    )
    .toBe(false);
  const clickMesh = async (name: string) => {
    const projected = await page.evaluate(async (name) => {
      const path = '/tests/browser/cabinetHarness.ts';
      const { projectCabinetMesh } = await import(/* @vite-ignore */ path);
      return projectCabinetMesh(name);
    }, name);
    await page.locator('#babylon-video').scrollIntoViewIfNeeded();
    const box = (await page.locator('#babylon-video').boundingBox())!;
    expect(projected.picked).toBe(name);
    const x = box.x + (projected.x * box.width) / projected.width;
    const y = box.y + (projected.y * box.height) / projected.height;
    await page.mouse.move(x, y);
    await expect(page.locator('#babylon-video')).toHaveCSS('cursor', 'pointer');
    await page.mouse.click(x, y);
  };
  await clickMesh('cabinet-button-credit');
  await clickMesh('cabinet-button-start1');
  await clickMesh('cabinet-button-start2');
  await clickMesh('cabinet-coin-slot');
  expect(
    await page.evaluate(() => Reflect.get(window, 'cabinetCalls')),
  ).toEqual(['credit', 'start-player', 'start-player2', 'credit']);
  await clickMesh('cabinet-trackball');
  await expect(page.locator('#camera-view')).toHaveValue('front');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement !== null))
    .toBe(true);
  const capturedCalls = await page.evaluate(
    () => Reflect.get(window, 'cabinetCalls').length,
  );
  await page.mouse.click(500, 500);
  expect(
    await page.evaluate(() => Reflect.get(window, 'cabinetCalls').length),
  ).toBe(capturedCalls);
  await page.evaluate(() => document.exitPointerLock());
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window.videoFixture.diagnostics(), 'transitioning'),
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(() => Reflect.get(window, 'cabinetCalls')),
  ).toContain('capture');
  // No new video frame is needed to complete a camera movement in pause.
  const before = await page.evaluate(
    () => window.videoFixture.diagnostics().copies,
  );
  await page.locator('#camera-view').selectOption('bar');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window.videoFixture.diagnostics(), 'transitioning'),
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(() => window.videoFixture.diagnostics().copies),
  ).toBe(before);
  await page.evaluate(async () => {
    const path = '/tests/browser/cabinetHarness.ts';
    const { captureCabinetResources } = await import(/* @vite-ignore */ path);
    Object.assign(window, { cabinetResources: captureCabinetResources() });
  });
  expect(
    (await page.evaluate(() => Reflect.get(window, 'cabinetResources')()))
      .textures,
  ).toBeGreaterThan(3);
  await page.locator('#camera-view').selectOption('front');
  await page.evaluate(() => window.videoFixture.dispose());
  expect(
    await page.evaluate(() => Reflect.get(window, 'cabinetResources')()),
  ).toEqual({
    disposed: true,
    meshes: 0,
    textures: 0,
    materials: 0,
    lights: 0,
    cameras: 0,
  });
  expect(
    await page.evaluate(() =>
      Reflect.get(window.videoFixture.diagnostics(), 'transitioning'),
    ),
  ).toBe(false);
  await expect(page.locator('#camera-view')).toBeDisabled();
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    0,
  );
});

test('le filtre CRT agit sur le moniteur et restaure les pixels à la désactivation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader/i.test(message.text()))
      errors.push(message.text());
  });
  await page.locator('#video-mode').selectOption('stage');
  await page.locator('#camera-view').selectOption('front');
  const red = () => page.evaluate(() => window.videoFixture.stageColors()[0]!);
  await expect
    .poll(() =>
      page.evaluate(() => window.videoFixture.diagnostics().transitioning),
    )
    .toBe(false);
  await expect.poll(red).toBeGreaterThan(1000);
  const baseline = await red();
  const copies = () =>
    page.evaluate(() => window.videoFixture.diagnostics().copies);
  const count = await copies();

  await page.locator('#render-crt').check();
  await expect(page.locator('#game-crt')).toBeChecked();
  await expect(page.locator('#crt-curvature')).toBeEnabled();
  await page.locator('#crt-curvature').fill('0');
  await page.locator('#crt-scanlines').fill('100');
  await expect.poll(copies).toBe(count);
  await expect.poll(red).toBeLessThan(baseline * 0.85);

  await page.locator('#crt-scanlines').fill('0');
  await expect.poll(red).toBeGreaterThan(baseline * 0.95);
  await page.locator('#crt-curvature').fill('100');
  await expect.poll(red).toBeLessThan(baseline * 0.7);
  await page.locator('#crt-interference').fill('35');
  await page.locator('#render-crt').uncheck();
  await expect(page.locator('#game-crt')).not.toBeChecked();
  await expect(page.locator('#render-crt')).not.toBeChecked();
  await expect.poll(red).toBe(baseline);

  await page.evaluate(async () => {
    const path = '/src/ui/gamePresentation.ts';
    const { mountGamePresentation } = await import(/* @vite-ignore */ path);
    mountGamePresentation();
  });
  await page.locator('#enter-game').click();
  await page.locator('#game-crt').check();
  await page.locator('#leave-game').click();
  await expect(page.locator('#render-crt')).toBeChecked();

  await page.locator('#video-mode').selectOption('babylon');
  await expect(page.locator('#game-crt')).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);

  await page.reload();
  await mountVideoFixture(page);
  await page.locator('#video-mode').selectOption('stage');
  await expect(page.locator('#render-crt')).toBeChecked();
  await expect(page.locator('#crt-curvature')).toHaveValue('100');
  await expect(page.locator('#crt-scanlines')).toHaveValue('0');
  await expect(page.locator('#crt-interference')).toHaveValue('35');
  expect(errors).toEqual([]);
});

test('revient à la vue directe après une perte WebGL 3D et récupère la vidéo sans nouvel abonnement', async ({
  page,
}) => {
  await page.locator('#video-mode').selectOption('babylon');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#babylon-video')!;
    canvas.addEventListener(
      'webglcontextrestored',
      () => {
        canvas.dataset.restored = 'true';
      },
      { once: true },
    );
    const gpu = canvas
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!;
    canvas.addEventListener(
      'webglcontextlost',
      () => setTimeout(() => gpu.restoreContext(), 100),
      {
        once: true,
      },
    );
    gpu.loseContext();
  });
  await expect(page.locator('#video-mode')).toHaveValue('direct');
  await expect(page.locator('#video-status')).toContainText(
    'Contexte graphique 3D perdu',
  );
  await expect(page.locator('.source-view')).toBeVisible();
  await expect(page.locator('#babylon-video')).toHaveAttribute(
    'data-restored',
    'true',
  );
  await expect
    .poll(async () => {
      await page.locator('#video-mode').selectOption('babylon');
      return page.locator('#video-stage').getAttribute('data-mode');
    })
    .toBe('babylon');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.draw()))
    .toEqual(primary);
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
});

test('la vue moderne affiche la partie et revient à la source arcade hors du relevé', async ({
  page,
}) => {
  const rows = Array.from({ length: 14 }, () =>
    Array.from({ length: 20 }, () => Array<number>(4).fill(0x4000)),
  );
  await page.locator('#live-terrain-file').setInputFiles({
    name: 'practice.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'practice-terrain-v1', rows }),
    ),
  });
  const mode = page.locator('#video-mode');
  const stage = page.locator('#video-stage');
  await mode.selectOption('modern');
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  const activePose: PracticePose = {
    marble: 'visible',
    x: 140,
    z: 140,
    height: 0x4000,
    scroll: -16144,
    hud: { score: '0', seconds: 58 },
  };
  const sample = (pose: PracticePose) =>
    page.evaluate((value) => window.videoFixture.setPracticePose(value), pose);
  await sample(activePose);
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await expect(page.locator('#babylon-video')).toBeVisible();
  await expect(page.locator('#practice-score')).toHaveText('0');
  await expect(page.getByRole('timer')).toHaveText('58');
  const hud = page.locator('#practice-hud canvas');
  await expect(hud).toBeVisible();
  const pixels = await hud.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')!;
    const at = (x: number, y: number) =>
      Array.from(context.getImageData(x, y, 1, 1).data);
    return {
      outside: at(0, 0),
      scoreBacking: at(24, 8),
      scoreInk: at(25, 8),
      clockOutline: at(154, 8),
      clockInk: at(154, 9),
      aspect: canvas.clientWidth / canvas.clientHeight,
    };
  });
  expect(pixels).toMatchObject({
    outside: [0, 0, 0, 0],
    scoreBacking: [169, 169, 169, 255],
    scoreInk: [0, 0, 254, 255],
    clockOutline: [0, 0, 0, 255],
    clockInk: [0, 0, 254, 255],
  });
  expect(pixels.aspect).toBeCloseTo(4 / 3, 2);
  await sample({ ...activePose, hud: { score: '0', seconds: 55 } });
  await expect(page.getByRole('timer')).toHaveText('55');
  const clockGap = await hud.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')!;
    const reds = (x: number) =>
      Array.from(context.getImageData(x, 8, 1, 16).data).filter(
        (_, index) => index % 4 === 0,
      );
    return { left: reds(166), gutter: reds(167), right: reds(169) };
  });
  expect(clockGap.left).toContain(0);
  expect(clockGap.right).toContain(0);
  expect(clockGap.gutter).toEqual(Array<number>(16).fill(169));
  const bluePixels = () =>
    page.evaluate(() => window.videoFixture.stageColors()[2]);
  await expect.poll(bluePixels).toBeGreaterThan(50);
  await sample({
    ...activePose,
    marble: 'hidden',
    z: 205,
    scroll: -16124,
    hud: { score: '150', seconds: 53 },
  });
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await expect.poll(bluePixels).toBe(0);
  await expect(page.locator('#practice-score')).toHaveText('150');
  await expect(page.getByRole('timer')).toHaveText('53');
  await sample({ ...activePose, marble: 'rebuilding', x: 168, scroll: -16124 });
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await expect.poll(bluePixels).toBe(0);
  await sample({ ...activePose, x: 168, scroll: -16124 });
  await expect.poll(bluePixels).toBeGreaterThan(50);

  await sample({ ...activePose, z: 201 });
  await expect(stage).toHaveAttribute('data-mode', 'direct');
  await sample(activePose);
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await sample({ ...activePose, scroll: -16124 });
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await sample({ ...activePose, scroll: -16068 });
  await expect(stage).toHaveAttribute('data-mode', 'direct');
  expect(
    await page.evaluate(() => window.videoFixture.diagnostics().copies),
  ).toBe(0);
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
});

test('le relevé complet garde la 3D à l’arrivée et pendant la transition suivante', async ({
  page,
}) => {
  const floor = [16339, 16339, 16339, 16339];
  const empty = [0, 0, 0, 0];
  const rows = Array.from({ length: 91 }, (_, z) =>
    Array.from({ length: 91 }, (_, x) =>
      x >= 72 && x <= 79 && z >= 65 && z <= 66 ? floor : empty,
    ),
  );
  await page.locator('#live-terrain-file').setInputFiles({
    name: 'practice-finish.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'practice-terrain-v2', rows }),
    ),
  });
  await page.locator('#video-mode').selectOption('modern');
  const score = page.locator('#practice-score');
  const clock = page.getByRole('timer', { name: 'Chrono' });
  await expect(score).toBeHidden();
  await page.evaluate(() =>
    window.videoFixture.setPracticePose({
      marble: 'visible',
      x: 615,
      z: 528,
      height: 16339,
      scroll: -15784,
      atGoal: true,
      hud: { score: '1,270', seconds: 7 },
    }),
  );
  const stage = page.locator('#video-stage');
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await expect(score).toHaveText('1,270');
  await expect(clock).toHaveText('07');
  await expect
    .poll(() => page.evaluate(() => window.videoFixture.stageColors()[2]))
    .toBeGreaterThan(50);
  await page.locator('#video-mode').selectOption('direct');
  await expect(score).toBeHidden();
  await page.locator('#video-mode').selectOption('modern-compare');
  await expect(score).toBeVisible();
  await expect(clock).toHaveText('07');
  await page.evaluate(() =>
    window.videoFixture.setPracticePose({
      marble: 'visible',
      x: 751,
      z: 528,
      height: 16430,
      scroll: -15765,
      player2: { marble: 'rebuilding', x: 612, z: 520, height: 16339 },
      hud: { score: '1,270', seconds: 7, player2: { score: '90', seconds: 9 } },
    }),
  );
  await expect(stage).toHaveAttribute('data-modern-ready', 'true');
  await expect(page.locator('#modern-unavailable')).toBeHidden();
  await expect(page.locator('#practice-score-2')).toHaveText('90');
  await expect(page.getByRole('timer', { name: 'Chrono J2' })).toHaveText('09');
  await expect(page.getByRole('timer', { name: 'Chrono J1' })).toHaveText('07');
  await page.evaluate(() => window.videoFixture.setPracticePose(null));
  await expect(stage).toHaveAttribute('data-modern-ready', 'true');
  await expect(stage).toHaveAttribute('data-mode', 'modern-compare');
  await expect(score).toBeHidden();
  await page.evaluate(() => window.videoFixture.setModernPhase('arcade'));
  await expect(stage).toHaveAttribute('data-modern-ready', 'false');
  await expect(page.locator('#modern-unavailable')).toBeVisible();
  await page.locator('#video-mode').selectOption('modern');
  await expect(stage).toHaveAttribute('data-mode', 'direct');
  await expect(page.locator('.source-view')).toBeVisible();
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
});

test('conserve les relevés complets et choisit le niveau actif sans nouveau fichier', async ({
  page,
}) => {
  for (const [format, dimension] of [
    ['practice-terrain-v2', 91],
    ['intermediate-terrain-v1', 130],
  ] as const) {
    const rows = Array.from({ length: dimension }, (_, z) =>
      Array.from({ length: dimension }, (_, x) =>
        Array<number>(4).fill(
          x >= 15 && x <= 29 && z >= 11 && z <= 20 ? 16378 : 0,
        ),
      ),
    );
    await page.locator('#live-terrain-file').setInputFiles({
      name: format + '.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format, rows })),
    });
    await expect(page.locator('#live-terrain-status')).toContainText(
      'Relevé chargé',
    );
  }
  await page.locator('#video-mode').selectOption('modern');
  for (const level of [undefined, 'intermediate', undefined] as const) {
    await page.evaluate(
      (level) =>
        window.videoFixture.setPracticePose({
          marble: 'visible',
          x: level ? 220 : 140,
          z: level ? 108 : 140,
          height: 16378,
          scroll: level ? -16152 : -16144,
          ...(level ? { level } : {}),
          frame: 1000,
          hud: { score: level ? '500' : '100', seconds: 60 },
        }),
      level,
    );
    await expect(page.locator('#video-stage')).toHaveAttribute(
      'data-modern-ready',
      'true',
    );
    await expect(page.locator('#practice-score')).toHaveText(
      level ? '500' : '100',
    );
    await expect(page.locator('#babylon-video')).toBeVisible();
    expect(
      await page.evaluate(
        () => window.videoFixture.diagnostics().practiceCamera?.active,
      ),
    ).toBe('opening');
    await page.evaluate((level) => {
      window.videoFixture.setPracticePose({
        marble: 'visible',
        x: level ? 220 : 140,
        z: level ? 108 : 140,
        height: 16378,
        scroll: level ? -16152 : -16144,
        ...(level ? { level } : {}),
        frame: 1180,
      });
    }, level);
    expect(
      await page.evaluate(
        () => window.videoFixture.diagnostics().practiceCamera?.active,
      ),
    ).toBe('arcade');
  }
  expect(await page.evaluate(() => window.videoFixture.listenerCount())).toBe(
    1,
  );
});
