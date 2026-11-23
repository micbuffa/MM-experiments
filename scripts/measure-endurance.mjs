import { chromium } from 'playwright';
import { performance } from 'node:perf_hooks';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const target = new URL(process.env.MARBLE_TEST_URL || 'http://127.0.0.1:5173/');
if (
  target.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
)
  throw Error('Serveur HTTP loopback requis.');
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const report = {
  browser: browser.version(),
  method:
    'Local original runtime, trusted automated input; 10 active minutes plus interruptions, not human comfort or listening validation',
  scene: 'prototype-03-explorable-bar',
  localFileSelection: process.argv.includes('--local-files'),
  durationSeconds: 600,
  shortcuts: [],
  samples: [],
  errors: [],
  requestsOutsideLoopback: [],
};
const reportPath = 'test-results/endurance.json';
await mkdir('test-results', { recursive: true });
async function save() {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await context.addInitScript(() => {
    let actual;
    Object.defineProperty(window, 'EmulatorJS', {
      configurable: true,
      get: () => actual,
      set: (Class) => {
        actual = new Proxy(Class, {
          construct(target, args) {
            const instance = Reflect.construct(target, args);
            window.enduranceEmulator = instance;
            return instance;
          },
        });
      },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
      report.requestsOutsideLoopback.push(url.origin);
  });
  await page.goto(target.href);
  if (report.localFileSelection) {
    await page
      .locator('#archive')
      .setInputFiles(
        fileURLToPath(new URL('../roms/marble.zip', import.meta.url)),
      );
    const bios = fileURLToPath(
      new URL('../roms/atarisy1.zip', import.meta.url),
    );
    try {
      await access(bios);
      await page.locator('#bios').setInputFiles(bios);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await page.locator('#prepare').click();
  await page.getByText('Démarrer l’émulation', { exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#credit').disabled);
  await page.waitForFunction(
    () => window.enduranceEmulator.gameManager.functions.getFrameNum() >= 700,
  );
  const read = async () => {
    const text = await page.locator('#diagnostics').textContent();
    const begin = text.indexOf('{');
    if (begin < 0)
      throw Error('No session diagnostics: page may have reloaded');
    return JSON.parse(text.slice(begin));
  };
  const frame = () =>
    page.evaluate(() =>
      window.enduranceEmulator.gameManager.functions.getFrameNum(),
    );
  await page.evaluate(() => {
    const manager = window.enduranceEmulator.gameManager;
    const original = manager.simulateInput.bind(manager);
    window.enduranceInputs = [];
    manager.simulateInput = (player, button, value) => {
      if (window.enduranceInputs.length < 100)
        window.enduranceInputs.push([player, button, value]);
      original(player, button, value);
    };
  });
  await page.locator('#enter-game').click();
  await page.waitForFunction(
    () => document.fullscreenElement?.id === 'game-player',
  );
  await page.locator('#game-explore').click();
  await page.waitForFunction(
    () => document.pointerLockElement?.id === 'babylon-video',
  );
  await page.waitForFunction(() => {
    const text = document.querySelector('#diagnostics').textContent;
    return JSON.parse(text.slice(text.indexOf('{'))).spatialAudio?.routed;
  });
  report.exploration = (await read()).spatialAudio;
  await page.keyboard.press('e');
  await page.waitForFunction(
    () => document.pointerLockElement === window.enduranceEmulator.canvas,
  );
  report.enteredCabinetFromBar = true;
  const cdp = await context.newCDPSession(page);
  for (const key of ['5', '(', '1', '&', '2', 'é']) {
    if (key === 'é') {
      for (const type of ['keyDown', 'keyUp'])
        await cdp.send('Input.dispatchKeyEvent', {
          type,
          key,
          code: 'Digit2',
          windowsVirtualKeyCode: 50,
        });
    } else await page.keyboard.press(key);
    await page.waitForTimeout(180);
  }
  report.shortcuts = await page.evaluate(() => window.enduranceInputs);
  const expected = [
    [0, 2, 1],
    [0, 2, 0],
    [0, 2, 1],
    [0, 2, 0],
    [0, 3, 1],
    [0, 3, 0],
    [0, 3, 1],
    [0, 3, 0],
    [1, 3, 1],
    [1, 3, 0],
    [1, 3, 1],
    [1, 3, 0],
  ];
  if (JSON.stringify(report.shortcuts) !== JSON.stringify(expected))
    throw Error(
      'Shortcut route/release mismatch: ' + JSON.stringify(report.shortcuts),
    );
  await cdp.send('Performance.enable');
  let activeSeconds = 0;
  for (let segment = 0; segment < 10; segment++) {
    const begin = performance.now(),
      startFrame = await frame();
    let tick = 0;
    while (performance.now() - begin < 60_000) {
      if (tick % 5 === 0) {
        await page.mouse.move(tick % 10 ? 400 : 450, 300 + (tick % 4) * 15);
        if (tick % 15 === 0) {
          await page.keyboard.down('Space');
          await page.waitForTimeout(180);
          await page.keyboard.up('Space');
        }
      }
      tick++;
      await page.waitForTimeout(
        Math.max(1, Math.min(1000, 60_000 - (performance.now() - begin))),
      );
    }
    activeSeconds += (performance.now() - begin) / 1000;
    const running = await read();
    if (
      running.paused ||
      (await frame()) <= startFrame ||
      running.videoView.mode !== 'stage'
    )
      throw Error('Runtime stopped during active interval');
    // Exit while boost is held to exercise the same interruption cleanup as play.
    await page.keyboard.down('Space');
    await page.keyboard.press('Escape');
    await page.keyboard.up('Space');
    await page.waitForFunction(() => document.pointerLockElement === null);
    if (await page.evaluate(() => document.fullscreenElement !== null))
      await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(
      () => document.querySelector('#game-player').dataset.playing === 'false',
    );
    const pausedFrame = await frame();
    await page.waitForTimeout(650);
    const paused = await read();
    if (
      pausedFrame !== (await frame()) ||
      !paused.paused ||
      paused.boost.held ||
      paused.native.pendingX ||
      paused.native.pendingY ||
      paused.heldButtons.length ||
      paused.heldPlayer2Buttons.length
    )
      throw Error('Pause/input cleanup failed');
    const metrics = await cdp.send('Performance.getMetrics');
    const memory = Object.fromEntries(
      metrics.metrics
        .filter((metric) =>
          [
            'JSHeapUsedSize',
            'JSHeapTotalSize',
            'Nodes',
            'Documents',
            'JSEventListeners',
          ].includes(metric.name),
        )
        .map((metric) => [metric.name, metric.value]),
    );
    report.samples.push({
      minute: segment + 1,
      activeSeconds,
      startFrame,
      pausedFrame,
      video: paused.videoView,
      audioState: paused.audioState,
      audioSources: paused.audioSources,
      spatialAudio: running.spatialAudio,
      audioRms: running.audioRms,
      gain: paused.gain,
      memory,
      pending: [paused.native.pendingX, paused.native.pendingY],
      held: paused.heldButtons,
      heldPlayer2: paused.heldPlayer2Buttons,
    });
    await save();
    console.log(
      JSON.stringify({
        minute: segment + 1,
        activeSeconds,
        frame: pausedFrame,
        copies: paused.videoView.copies,
        errors: report.errors.length,
        memory,
      }),
    );
    if (segment === 9) break;
    if (segment === 2 || segment === 5) {
      await page
        .locator('#video-mode')
        .selectOption(segment === 2 ? 'compare' : 'direct');
      await page.waitForTimeout(150);
      await page.locator('#video-mode').selectOption('stage');
    }
    await page
      .locator('#camera-view')
      .selectOption(['bar', 'front', 'perspective'][segment % 3]);
    if (segment === 4) await page.setViewportSize({ width: 1100, height: 900 });
    if (segment === 6)
      await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator('#enter-game').click();
    await page.locator('[data-command="capture"]').click();
    await page.waitForFunction(() => document.pointerLockElement !== null);
  }
  if (report.errors.length || report.requestsOutsideLoopback.length)
    throw Error('Browser errors or remote requests');
  report.complete = true;
  await save();
  console.log('Endurance complete: ' + reportPath);
} catch (error) {
  report.failure = String(error);
  await save();
  throw error;
} finally {
  await browser.close();
}
