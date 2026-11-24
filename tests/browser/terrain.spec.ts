import type { Scene } from '@babylonjs/core/scene';
import { expect, test } from './fixtures';

test('la rampe et ses plateformes texturées se dessinent et la caméra tourne', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/terrain.html');
  const canvas = page.locator('#game[data-engine]');
  await expect(canvas).toBeVisible();
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.width / 2, box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.width / 2 + 100, box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  expect(errors).toEqual([]);
});

test('lit un relevé local et signale un fichier invalide', async ({ page }) => {
  await page.goto('/terrain.html');
  const picker = page.locator('#terrain-file');
  const file = (rows: unknown) => ({
    name: 'practice-terrain.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'practice-terrain-v1', rows }),
    ),
  });
  await picker.setInputFiles(file([[]]));
  await expect(page.locator('#terrain-status')).toHaveText(
    'Largeur de grille invalide.',
  );
  await picker.setInputFiles(
    file([
      [
        [16384, 16384, 16382, 16382],
        [0, 0, 0, 0],
      ],
    ]),
  );
  await expect(page.locator('#terrain-status')).toContainText(
    'Arcade terrain excerpt',
  );
  await expect(page.locator('#game[data-engine]')).toBeVisible();
});

test('superpose une capture locale au cadrage arcade et conserve la vue libre', async ({
  page,
}) => {
  await page.goto('/terrain.html');
  const camera = page.locator('#terrain-camera');
  await expect(camera).toBeDisabled();
  await page.locator('#terrain-file').setInputFiles({
    name: 'survey.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'practice-terrain-v1',
        rows: [[[16384, 16384, 16384, 16384]]],
      }),
    ),
  });
  await expect(camera).toBeEnabled();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 336;
    canvas.height = 240;
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.locator('#terrain-reference-file').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  const overlay = page.locator('#terrain-reference');
  await expect(camera).toHaveValue('arcade');
  await expect(overlay).toBeVisible();
  await page.locator('#terrain-opacity').fill('70');
  await expect(overlay).toHaveCSS('opacity', '0.7');
  await camera.selectOption('orbit');
  await expect(overlay).toBeHidden();
  await camera.selectOption('arcade');
  await expect(overlay).toBeVisible();
});

test('charge Intermediate Race et déplace son cadrage arcade', async ({
  page,
}) => {
  await page.route('**/__local-roms/intermediate-terrain-pipes.json', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto('/terrain.html');
  const rows = Array.from({ length: 130 }, (_, z) =>
    Array.from({ length: 130 }, (_, x) =>
      Array<number>(4).fill(
        x >= 22 && x <= 29 && z >= 11 && z <= 18 ? 16378 : 0,
      ),
    ),
  );
  await page.locator('#terrain-file').setInputFiles({
    name: 'intermediate-terrain.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'intermediate-terrain-v1',
        rows,
        pipes: {
          positions: [0, 0, 0, 0, 1, 0, 1, 0, 0],
          shell: [0, 1, 2],
          interior: [0, 2, 1],
        },
      }),
    ),
  });
  await expect(page.locator('#terrain-status')).toContainText(
    'Intermediate Race · Survey & pipes',
  );
  await expect(page.locator('#terrain-camera')).toHaveValue('arcade');
  const canvas = page.locator('#game');
  await canvas.screenshot();
  const before = await canvas.screenshot();
  await page.locator('#terrain-scroll').fill('218');
  await expect(page.locator('#terrain-scroll-value')).toHaveText('218 px');
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  for (const view of ['bridge', 'pipes', 'ice']) {
    await page.locator('#terrain-camera').selectOption(view);
    await expect(page.locator('#terrain-camera')).toHaveValue(view);
    await expect(page.locator('#terrain-scroll')).toBeHidden();
  }
  await page.locator('#terrain-camera').selectOption('orbit');
  await expect(page.locator('#terrain-scroll')).toBeHidden();
});

test('précharge les archives locales dans la page d’étude et ouvre le jeu avec F2', async ({
  page,
}) => {
  const rows = Array.from({ length: 130 }, (_, z) =>
    Array.from({ length: 130 }, (_, x) =>
      Array<number>(4).fill(x === 27 && z === 13 ? 16378 : 0),
    ),
  );
  await page.route('**/__local-roms/intermediate-terrain-pipes.json', (route) =>
    route.fulfill({ json: { format: 'intermediate-terrain-v1', rows } }),
  );
  await page.route('**/__local-roms/status', (route) =>
    route.fulfill({ json: { game: true, bios: true } }),
  );
  await page.route('**/__local-roms/*.zip', (route) =>
    route.fulfill({ body: Buffer.from([1, 2, 3]) }),
  );
  const requests = ['marble.zip', 'atarisy1.zip'].map((name) =>
    page.waitForRequest((request) =>
      request.url().endsWith('/__local-roms/' + name),
    ),
  );
  await page.goto('/terrain.html');
  await Promise.all(requests);
  await expect(page.locator('#terrain-status')).toContainText(
    'Intermediate Race',
  );
  await expect(page.locator('#terrain-player')).toBeHidden();
  await page.keyboard.press('F2');
  await expect(page.locator('#terrain-player')).toBeVisible();
  await expect(page.locator('#game')).toBeHidden();
  await expect(
    page.frameLocator('#terrain-player').locator('#local-rom-status'),
  ).toContainText('Préchargé depuis roms/');
});

test('le grand mur jaune garde sa palette ambrée et son ombre arcade', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1120, height: 840 });
  const rows = Array.from({ length: 130 }, (_, z) =>
    Array.from({ length: 130 }, (_, x) =>
      Array<number>(4).fill(x >= 87 && x < 90 && z >= 72 && z < 90 ? 16228 : 0),
    ),
  );
  await page.route('**/__local-roms/intermediate-terrain-pipes.json', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route('**/__local-roms/level4-terrain.json', (route) =>
    route.fulfill({ json: { format: 'level4-terrain-v1', rows } }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('/terrain.html');
  await page.locator('#terrain-load-level4').click();
  await page.locator('#terrain-camera').selectOption('arcade');
  await page.locator('#terrain-scroll').fill('784');
  await page
    .locator('.terrain-controls')
    .evaluate((element) => (element.style.visibility = 'hidden'));
  const canvas = page.locator('#game');
  const sample = async () => {
    const png = await canvas.screenshot();
    return page.evaluate(async (bytes) => {
      const bitmap = await createImageBitmap(
        new Blob([Uint8Array.from(bytes)], { type: 'image/png' }),
      );
      const image = document.createElement('canvas');
      image.width = bitmap.width;
      image.height = bitmap.height;
      const context = image.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return [
        [160, 160],
        [300, 20],
      ].map(([x, y]) =>
        Array.from(context.getImageData(x!, y!, 1, 1).data).slice(0, 3),
      );
    }, Array.from(png));
  };
  await expect
    .poll(
      async () => {
        const [shaded, lit] = await sample();
        return (
          shaded !== undefined &&
          lit !== undefined &&
          [221, 136, 0].every((v, i) => Math.abs(shaded[i]! - v) <= 6) &&
          [255, 187, 0].every((v, i) => Math.abs(lit[i]! - v) <= 6)
        );
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

for (const {
  level,
  format,
  size,
  x,
  z,
  pixel,
  color,
  wallPixel,
  wallColor,
} of [
  {
    level: 1,
    format: 'practice-terrain-v2',
    size: 91,
    x: 36,
    z: 36,
    pixel: [530, 700],
    wallPixel: [570, 749],
    wallColor: [170, 51, 0],
    color: [180, 180, 180],
  },
  {
    level: 2,
    format: 'intermediate-terrain-v1',
    size: 130,
    x: 27,
    z: 13,
    pixel: [157, 280],
    wallPixel: [197, 329],
    wallColor: [0, 54, 90],
    color: [180, 180, 180],
  },
  {
    level: 3,
    format: 'level3-terrain-v1',
    size: 118,
    x: 30,
    z: 30,
    pixel: [530, 644],
    wallPixel: [570, 693],
    // This dark-facing sample now receives its projected/self-occlusion shadow.
    wallColor: [15, 15, 15],
    color: [210, 182, 140],
  },
]) {
  test(`la pierre du niveau ${level} utilise sa palette native sans surexposition`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1120, height: 840 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /shader/i.test(message.text()))
        errors.push(message.text());
    });
    const rows = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, column) =>
        Array<number>(4).fill(
          column >= x - 1 && column < x + 2 && row >= z - 1 && row < z + 2
            ? 16384
            : 0,
        ),
      ),
    );
    await page.route(
      '**/__local-roms/intermediate-terrain-pipes.json',
      (route) => route.fulfill({ status: 404 }),
    );
    await page.goto('/terrain.html');
    await page.locator('#terrain-file').setInputFiles({
      name: 'palette.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format, rows })),
    });
    await page.locator('#terrain-camera').selectOption('arcade');
    await page
      .locator('.terrain-controls')
      .evaluate((element) => (element.style.visibility = 'hidden'));
    const sample = async () => {
      const png = await page.locator('#game').screenshot();
      return page.evaluate(
        async ({ bytes, pixel, wallPixel }) => {
          const bitmap = await createImageBitmap(
            new Blob([Uint8Array.from(bytes)], { type: 'image/png' }),
          );
          const image = document.createElement('canvas');
          image.width = bitmap.width;
          image.height = bitmap.height;
          const context = image.getContext('2d')!;
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          return [pixel, wallPixel].map(([x, y]) =>
            Array.from(context.getImageData(x!, y!, 1, 1).data).slice(0, 3),
          );
        },
        { bytes: Array.from(png), pixel, wallPixel },
      );
    };
    await expect
      .poll(
        async () => {
          const [top, wall] = await sample();
          return (
            top !== undefined &&
            wall !== undefined &&
            color.every((v, i) => Math.abs(top[i]! - v) <= 6) &&
            wallColor.every((v, i) => Math.abs(wall[i]! - v) <= 6)
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    if (level === 1) {
      await page.evaluate(async () => {
        const engineEntry = performance
          .getEntriesByType('resource')
          .find((entry) => entry.name.includes('/engineStore-'))!;
        const module = await import(/* @vite-ignore */ engineEntry.name);
        const store = Object.values(module).find(
          (value) =>
            value && typeof value === 'function' && 'LastCreatedScene' in value,
        ) as { LastCreatedScene: Scene };
        const scene = store.LastCreatedScene;
        const floor = scene.getMeshByName('terrain-surface')!;
        for (const mesh of scene.meshes) mesh.setEnabled(mesh === floor);
        const { createPracticeSurfaceMaterial } = await import(
          /* @vite-ignore */ '/src/rendering/' +
            'createPracticeSurfaceMaterial.ts'
        );
        floor.material = createPracticeSurfaceMaterial(scene, 'wall');
        const uvs = Array.from({ length: floor.getTotalVertices() }, () => [
          0.5,
          68 / 256,
        ]).flat();
        floor.setVerticesData('uv', uvs);
        await scene.whenReadyAsync();
      });
      // Transparent atlas pixels must reveal the background, not the dark joint tint.
      await expect
        .poll(async () => Math.max(...(await sample())[0]!))
        .toBeLessThan(5);
    }
    expect(errors).toEqual([]);
  });
}

test('Silly Race défile vers le haut et reste explorable en vue libre', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('/terrain.html');
  const rows = Array.from({ length: 141 }, (_, z) =>
    Array.from({ length: 141 }, (_, x) =>
      Array(4).fill(x >= 124 && x < 129 && z >= 123 && z < 128 ? 16168 : 0),
    ),
  );
  await page.locator('#terrain-file').setInputFiles({
    name: 'silly.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'level5-terrain-v1', rows })),
  });
  await expect(page.locator('#terrain-status')).toContainText('Silly Race');
  await page.locator('#terrain-camera').selectOption('arcade');
  await expect(page.locator('#terrain-scroll-control')).toBeVisible();
  const before = await page.locator('#game').screenshot();
  await page.locator('#terrain-scroll').fill('180');
  await page.locator('#terrain-scroll').dispatchEvent('input');
  await expect(page.locator('#terrain-scroll-value')).toHaveText('180 px');
  await expect
    .poll(async () => (await page.locator('#game').screenshot()).equals(before))
    .toBe(false);
  await page.locator('#terrain-camera').selectOption('orbit');
  await expect(page.locator('#terrain-orbit-help')).toBeVisible();
  expect(errors).toEqual([]);
});
