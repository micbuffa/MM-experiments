import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { zipSync } from 'fflate';
import manifest from '../../third_party/emulatorjs-assets.json' with { type: 'json' };

test('le build utilise la sélection locale sans préchargement dev ni réseau externe', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Marble Madness',
  );
  await expect(page.locator('#local-rom-status')).toBeHidden();
  await page.locator('#prepare').click();
  await expect(page.locator('#status')).toContainText(
    'Sélectionner une archive',
  );
  await page.locator('#archive').setInputFiles({
    name: 'synthetic.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(
      zipSync({ 'synthetic.txt': new Uint8Array([1, 2, 3]) }),
    ),
  });
  await page.locator('#prepare').click();
  await expect(page.locator('#status')).toContainText('ROMs manquantes');
  await expect(page.locator('#prepare')).toBeEnabled();
  expect(requests.some((url) => url.includes('/__local-roms/'))).toBe(false);
  expect(
    requests
      .filter((url) => /^https?:/.test(url))
      .every((url) => url.startsWith('http://127.0.0.1:4173/')),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('le build conserve les empreintes des ressources versionnées et les notices', async ({
  request,
}) => {
  const base = `/vendor/emulatorjs/${manifest.frontend}/data/`;
  for (const asset of manifest.assets) {
    const response = await request.get(base + asset.path);
    expect(response.status(), asset.path).toBe(200);
    const bytes = await response.body();
    expect(bytes.byteLength, asset.path).toBe(asset.bytes);
    expect(createHash('sha256').update(bytes).digest('hex'), asset.path).toBe(
      asset.sha256,
    );
  }
  for (const name of ['LICENSE.EmulatorJS.txt', 'LICENSE.MAME2003-Plus.txt']) {
    const response = await request.get(base + name);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(
      await readFile(`third_party/${name}`),
    );
  }
});

test('le build ne livre ni archives de test ni préchargement de développement', async () => {
  const files = await readdir('dist', { recursive: true });
  expect(
    files.filter((name) =>
      /(?:^|[/\\])(?:roms|bios|local-roms)(?:[/\\]|$)|\.(?:zip|rom)$/i.test(
        name,
      ),
    ),
  ).toEqual([]);
  for (const name of files.filter(
    (name) => name.startsWith('assets/') && name.endsWith('.js'),
  )) {
    expect(await readFile(`dist/${name}`, 'utf8'), name).not.toContain(
      '/__local-roms/',
    );
  }
});
