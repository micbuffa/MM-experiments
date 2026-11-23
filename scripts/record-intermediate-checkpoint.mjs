import console from 'node:console';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Local developer replay. The only commands sent to the game are credit,
// start and trackball input. RAM is read to steer and spot the next race.
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    let constructor;
    Object.defineProperty(window, 'EmulatorJS', {
      configurable: true,
      get: () => constructor,
      set: (original) => {
        constructor = new Proxy(original, {
          construct: (target, args) => {
            window.localEmulator = Reflect.construct(target, args);
            return window.localEmulator;
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
  await page.waitForFunction(() => !document.querySelector('#credit').disabled);
  await page.evaluate(async () => {
    const {
      encodeIntermediateCheckpoint,
      readCheckpointPorts,
      readCheckpointHardware,
    } = await import('/src/emulation/intermediateCheckpoint.ts');
    const { Module: core, gameManager } = window.localEmulator;
    const ram = new DataView(core.HEAPU8.buffer, 0x1d99478);
    const word = (offset) => ram.getUint16(offset, true);
    const coordinate = (offset) =>
      ram.getInt16(offset, true) + word(offset + 2) / 65536;
    const route = [
      [280, 140],
      [300, 196],
      [310, 228],
      [315, 288],
      [332, 360],
      [376, 390],
      [402, 438],
      [481, 439],
      [487, 526],
      [590, 527],
      [591, 580],
    ];
    let step = 0;
    const steer = (distance, speed) =>
      Math.round(Math.max(-30, Math.min(30, distance * 1.3 - speed * 12)));
    const before = core.marbleBeforeIteration;
    core.marbleBeforeIteration = () => {
      before();
      const frame = gameManager.functions.getFrameNum();
      if (frame === 700 || frame === 708)
        gameManager.simulateInput(0, 2, Number(frame === 700));
      if (frame === 710 || frame === 718)
        gameManager.simulateInput(0, 3, Number(frame === 710));
      const descriptor = word(0x474) * 65536 + word(0x476);
      const mode = word(0x390);
      if (descriptor === 0x2c54c && mode === 0 && frame > 1100) {
        window.intermediateCheckpoint = encodeIntermediateCheckpoint(
          gameManager.getState(),
          readCheckpointPorts(core.HEAPU8),
          readCheckpointHardware(core.HEAPU8),
        );
        core.marbleBeforeIteration = before;
        return;
      }
      if (
        descriptor !== 0x2bee2 ||
        mode !== 0 ||
        ram.getUint8(0x33) !== 0 ||
        frame < 1200 ||
        frame % 2 !== 0
      )
        return;
      const x = coordinate(0x24);
      const z = coordinate(0x28);
      let mark = route[step];
      if (mark && Math.hypot(x - mark[0], z - mark[1]) < 12)
        mark = route[++step];
      if (!mark) return;
      const dx = steer(mark[0] - x, coordinate(0x18));
      const dz = steer(mark[1] - z, coordinate(0x1c));
      core.marbleNativeInput.setPending(
        Math.round((dz - dx) / 0.6),
        Math.round((dx + dz) / 0.6),
      );
    };
  });
  await page.waitForFunction(() => window.intermediateCheckpoint, null, {
    timeout: 60000,
  });
  const bytes = await page.evaluate(() =>
    Array.from(window.intermediateCheckpoint),
  );
  await mkdir('local-roms', { recursive: true });
  await writeFile('local-roms/intermediate-web.state', Buffer.from(bytes));
  console.log(
    'Point de reprise vérifié et écrit dans local-roms/intermediate-web.state.',
  );
} finally {
  await browser.close();
}
