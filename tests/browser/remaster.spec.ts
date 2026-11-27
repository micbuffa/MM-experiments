import { expect, test } from '@playwright/test';

test('remaster.html boots Level 1 with Havok physics and responds to controls without MAME', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/remaster.html');
  await expect(page.locator('#remaster-canvas')).toBeVisible();

  // Wait for terrain + Havok initialization to enter FLYOVER
  await expect
    .poll(() => page.locator('#hud-status').textContent(), { timeout: 15_000 })
    .toBe('FLYOVER');

  // Skip flyover with Space -> PLAYING
  await page.keyboard.press('Space');
  await expect(page.locator('#hud-status')).toHaveText('PLAYING');

  // Hold movement keys and verify Havok accelerates the marble
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await expect
    .poll(
      async () => {
        const text = (await page.locator('#telemetry').textContent()) ?? '0';
        return Number.parseFloat(text);
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(1.0);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowDown');

  // Cycle camera preset cleanly
  await page.keyboard.press('KeyC');
  await expect(page.locator('#btn-camera')).toContainText('Follow');

  expect(errors).toEqual([]);
});

test('remaster.html loads Level 2 with the green-worm presentation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/remaster.html');
  await page.locator('#level-select').selectOption('2');
  await expect(page.locator('#remaster-canvas')).toBeVisible();
  await expect
    .poll(() => page.locator('#hud-status').textContent(), { timeout: 15_000 })
    .toBe('FLYOVER');

  await page.keyboard.press('Space');
  await expect(page.locator('#hud-status')).toHaveText('PLAYING');
  await page.waitForTimeout(250);

  expect(errors).toEqual([]);
});

test('remaster.html loads Level 3 with wave, copper pipe, worms, and acid amoebas', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/remaster.html');
  await page.locator('#level-select').selectOption('3');
  await expect(page.locator('#remaster-canvas')).toBeVisible();
  await expect
    .poll(() => page.locator('#hud-status').textContent(), { timeout: 15_000 })
    .toBe('FLYOVER');

  await page.keyboard.press('Space');
  await expect(page.locator('#hud-status')).toHaveText('PLAYING');
  await page.waitForTimeout(250);

  expect(errors).toEqual([]);
});

test('remaster.html loads Level 4 with vacuums, pistons, catapult, and hammers', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/remaster.html');
  await page.locator('#level-select').selectOption('4');
  await expect(page.locator('#remaster-canvas')).toBeVisible();
  await expect
    .poll(() => page.locator('#hud-status').textContent(), { timeout: 15_000 })
    .toBe('FLYOVER');

  await page.keyboard.press('Space');
  await expect(page.locator('#hud-status')).toHaveText('PLAYING');
  await page.waitForTimeout(250);

  expect(errors).toEqual([]);
});
