import console from 'node:console';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Local developer checkpoint recorder for Level 3 (Black / Intermediate 2).
// Starts from the verified Level 2 checkpoint and transitions natively to Level 3.
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    let constructor;
    Object.defineProperty(globalThis, 'EmulatorJS', {
      configurable: true,
      get: () => constructor,
      set: (original) => {
        constructor = new Proxy(original, {
          construct: (target, args) => {
            globalThis.localEmulator = Reflect.construct(target, args);
            return globalThis.localEmulator;
          },
        });
      },
    });
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#archive').setInputFiles('roms/marble.zip');
  await page.locator('#bios').setInputFiles('roms/atarisy1.zip');
  await page.locator('#prepare').click();
  await page.getByText('Démarrer l’émulation', { exact: true }).click();
  await page.waitForSelector('#start-intermediate:not([hidden])', {
    timeout: 30000,
  });
  await page.locator('#start-intermediate').click();
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    const {
      encodeIntermediateCheckpoint,
      readCheckpointPorts,
      readCheckpointHardware,
    } = await import('/src/emulation/intermediateCheckpoint.ts');
    const { Module: core, gameManager } = globalThis.localEmulator;
    const ram = new DataView(core.HEAPU8.buffer, 0x1d99478);
    const word = (offset) => ram.getUint16(offset, true);
    let reachedGoal = false;
    let level3StartFrame = -1;
    const before = core.marbleBeforeIteration;
    core.marbleBeforeIteration = () => {
      before();
      const frame = gameManager.functions.getFrameNum();
      const descriptor = word(0x474) * 65536 + word(0x476);
      const mode = word(0x390);
      if (frame % 60 === 0) {
        console.log(
          `f=${frame} desc=0x${descriptor.toString(16)} mode=${mode} anim=${ram.getUint8(0x33)} pos=(${ram.getInt16(0x24, true)},${ram.getInt16(0x28, true)},${word(0x2c)}) scroll=${ram.getInt16(0x97e, true)}`,
        );
      }
      if (descriptor === 0x2c54c && mode === 0 && !reachedGoal) {
        // Trigger native Level 2 finish state (animation=6, finisher=0) so the arcade ROM
        // performs its real Level 2 -> Level 3 transition and initializes Level 3 cleanly.
        ram.setUint8(0x33, 6);
        ram.setUint8(0x3a5, 0);
        reachedGoal = true;
        return;
      }
      if (descriptor === 0x2cd9e && mode === 0) {
        if (level3StartFrame < 0) level3StartFrame = frame;
        // Wait 20 frames into Level 3 mode 0 so the start marble is settled and visible.
        if (frame >= level3StartFrame + 20) {
          globalThis.level3Checkpoint = encodeIntermediateCheckpoint(
            gameManager.getState(),
            readCheckpointPorts(core.HEAPU8),
            readCheckpointHardware(core.HEAPU8),
          );
          core.marbleBeforeIteration = before;
        }
      }
    };
  });
  await page.locator('#resume').click();
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  await page.waitForFunction(() => globalThis.level3Checkpoint, null, {
    timeout: 60000,
  });
  const bytes = await page.evaluate(() =>
    Array.from(globalThis.level3Checkpoint),
  );
  await mkdir('local-roms', { recursive: true });
  await writeFile('local-roms/level3-web.state', Buffer.from(bytes));
  console.log(
    'Point de reprise Niveau 3 vérifié et écrit dans local-roms/level3-web.state.',
  );
} finally {
  await browser.close();
}
