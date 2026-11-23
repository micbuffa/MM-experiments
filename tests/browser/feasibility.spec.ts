import { expect, test } from './fixtures';
import { zipSync } from 'fflate';

test('explique l’absence de ROM et autorise un nouvel essai après une archive incorrecte', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Arcade Lounge',
  );
  await page.getByRole('button', { name: 'Vérifier et préparer' }).click();
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
  await page.getByRole('button', { name: 'Vérifier et préparer' }).click();
  await expect(page.locator('#status')).toContainText(
    'ROMs manquantes : 136032.205',
  );
  await expect(
    page.getByRole('button', { name: 'Vérifier et préparer' }),
  ).toBeEnabled();
  await expect(page.locator('#archive')).toBeEnabled();
  await expect(page.locator('#emulator canvas')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(async () => (await indexedDB.databases()).length))
    .toBe(0);
});

test('signale un BIOS invalide et permet de le remplacer sans perdre le jeu', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#archive').setInputFiles({
    name: 'game.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(
      zipSync({ 'synthetic.txt': new Uint8Array([1, 2, 3]) }),
    ),
  });
  await page.locator('#bios').setInputFiles({
    name: 'wrong.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([1]),
  });
  await page.getByRole('button', { name: 'Vérifier et préparer' }).click();
  await expect(page.locator('#status')).toContainText(
    'Le BIOS doit être une archive ZIP',
  );
  await expect(page.locator('#bios')).toBeEnabled();
  await page.locator('#bios').setInputFiles({
    name: 'bios.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from([1]),
  });
  await page.getByRole('button', { name: 'Vérifier et préparer' }).click();
  await expect(page.locator('#status')).toContainText('ZIP illisible');
  await expect(page.locator('#archive')).toBeEnabled();
  await expect(page.locator('#bios')).toBeEnabled();
  expect(
    await page
      .locator('#archive')
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe('game.zip');
});

test('charge le vrai runtime MAME local puis signale l’échec attendu sans ROM', async ({
  page,
  browser,
}) => {
  // ZIP synthétique sans ROM : test du vrai runtime et de son échec, jamais du jeu.
  const requests: string[] = [];
  const messages: string[] = [`Chrome : ${browser.version()}`];
  page.on('request', (request) => requests.push(request.url()));
  page.on('console', (message) => messages.push(message.text()));
  page.on('pageerror', (error) =>
    messages.push(`PAGE ERROR: ${error.message}`),
  );
  try {
    await page.goto('/');
    await page.evaluate(
      async (bytes) => {
        const source = '/src/emulation/emulatorjs.ts';
        const { prepareEmulator } = await import(/* @vite-ignore */ source);
        Object.assign(window, { EJS_DEBUG_XX: true });
        await prepareEmulator(
          new File([new Uint8Array(bytes)], 'marble.zip'),
          () => {},
        );
      },
      Array.from(zipSync({ 'synthetic.txt': new Uint8Array([1, 2, 3]) })),
    );
    const coreResponse = page.waitForResponse((response) =>
      response.url().includes('/cores/mame2003_plus-wasm.data'),
    );
    await page.getByText('Démarrer l’émulation', { exact: true }).click();
    expect((await coreResponse).status()).toBe(200);
    await expect
      .poll(() => messages.join('\n'), { timeout: 30_000 })
      .toMatch(
        /Failed to start game|Failed to load content|Échec au démarrage|136032.205.*NOT FOUND/i,
      );
    expect(
      requests.some((url) => url.includes('/compression/extract7z.js')),
    ).toBe(true);
    expect(messages.join('\n')).toContain('Matched game driver: marble');
    expect(messages.join('\n')).toContain('Git Version  3a72dae');
    expect(messages.join('\n')).toContain('RetroArch 1.21.0 (Git 6dd4353)');
    expect(
      requests
        .filter((url) => /^https?:/.test(url))
        .every((url) => url.startsWith('http://127.0.0.1:5173/')),
    ).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(async () => (await indexedDB.databases()).length),
      )
      .toBe(0);
  } finally {
    await test.info().attach('runtime-console', {
      body: messages.join('\n'),
      contentType: 'text/plain',
    });
  }
});
