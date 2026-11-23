import { expect, test } from './fixtures';
import { zipSync } from 'fflate';

test('précharge jeu et BIOS synthétiques sans ouvrir de sélecteur', async ({
  page,
}) => {
  await page.unroute('**/__local-roms/**');
  await page.route('**/__local-roms/status', (route) =>
    route.fulfill({ json: { game: true, bios: true } }),
  );
  const bytes = Buffer.from(
    zipSync({ 'synthetic.txt': new Uint8Array([1, 2, 3]) }),
  );
  await page.route('**/__local-roms/*.zip', (route) =>
    route.fulfill({ contentType: 'application/zip', body: bytes }),
  );
  await page.goto('/');
  await expect(page.locator('#local-rom-status')).toContainText(
    'marble.zip et atarisy1.zip',
  );
  await page.locator('#prepare').click();
  // Le validateur métier reçoit effectivement les ZIP préchargés, pas de fausses ROMs.
  await expect(page.locator('#status')).toContainText('ROMs manquantes');
  await expect(page.locator('#status')).not.toContainText(
    'Sélectionner une archive',
  );
});

test('un préchargement échoué laisse la sélection manuelle disponible', async ({
  page,
}) => {
  await page.unroute('**/__local-roms/**');
  await page.route('**/__local-roms/status', (route) =>
    route.fulfill({ json: { game: true, bios: false } }),
  );
  await page.route('**/__local-roms/marble.zip', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto('/');
  await expect(page.locator('#local-rom-status')).toContainText(
    'Préchargement local indisponible',
  );
  await expect(page.locator('#prepare')).toBeEnabled();
  await expect(page.locator('#archive')).toBeEnabled();
});
