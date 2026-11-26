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

  // Unlock audio (YM2151/POKEY worklet + rom-sfx.json) and switch the
  // gameplay SFX backend ROM <-> synth without console errors.
  await expect(page.locator('#btn-sfx')).toContainText('Arcade ROM');
  await page.locator('#btn-sfx').click();
  await expect(page.locator('#btn-sfx')).toContainText('Remaster synth');
  await page.keyboard.press('KeyB');
  await expect(page.locator('#btn-sfx')).toContainText('Arcade ROM');
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});
