import { expect, test } from './fixtures';

test('copie uniquement les diagnostics affichés, à la demande', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          Reflect.set(window, 'copiedDiagnostic', text);
        },
      },
      configurable: true,
    });
  });
  await page.goto('/');
  await expect(page.locator('#reset-metrics')).toBeDisabled();
  await page.locator('#copy-diagnostics').click();
  await expect(page.locator('#diagnostic-action-status')).toContainText(
    'Diagnostics copiés',
  );
  expect(
    await page.evaluate(() => Reflect.get(window, 'copiedDiagnostic')),
  ).toBe(await page.locator('#diagnostics').innerText());
});

test('une copie refusée propose une copie manuelle sans bloquer la page', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () => Promise.reject(new Error('Clipboard disabled')),
      },
      configurable: true,
    });
  });
  await page.goto('/');
  await page.locator('#copy-diagnostics').click();
  await expect(page.locator('#diagnostic-action-status')).toContainText(
    'copier manuellement',
  );
  await expect(page.locator('#prepare')).toBeEnabled();
});
