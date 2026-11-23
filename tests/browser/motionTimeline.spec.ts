import { expect, test } from './fixtures';

test('le raccord arme un geste, observe les événements capturés et conserve le relevé après pause', async ({
  page,
}) => {
  // Faux runtime sans ROM : ce test vérifie le raccord de l'adaptateur, pas MAME.
  await page.route('**/emulator.min.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
      window.EJS_DUMMYSTORAGE = {};
      window.EJS_GameManager = class {};
      window.EmulatorJS = class {
        started = true; paused = false; failedToStart = false;
        Module = {};
        canvas = document.createElement('canvas');
        frame = 10;
        native = {pendingX:0,pendingY:0,polledX:0,polledY:0,buttons:0};
        gameManager = {
          functions: {setKeyboardEnabled() {}, getFrameNum: () => this.frame},
          simulateInput() {}, getVideoDimensions() {return 240;}
        };
        constructor() {
          document.querySelector('#emulator').appendChild(this.canvas);
          this.Module.marbleNativeInput = {
            state: () => ({...this.native}),
            clear: () => {this.native.pendingX = this.native.pendingY = 0;}
          };
          this.canvas.addEventListener('mousemove', event => {
            const result = this.Module.marbleMouseTransform?.(event, this.native);
            if (result) {this.native.pendingX += result[0]; this.native.pendingY += result[1];}
          });
          window.timelineRuntime = this;
        }
        on(name, callback) {if (name === 'start') this.startCallback = callback;}
        pause() {this.paused = true;}
        play() {this.paused = false;}
        setVolume() {}
      };
    `,
    }),
  );
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/emulation/emulatorjs.ts';
    const { prepareEmulator } = await import(/* @vite-ignore */ path);
    const session = await prepareEmulator(
      new File(['synthetic'], 'fixture.zip'),
      () => {},
    );
    const runtime = Reflect.get(window, 'timelineRuntime');
    runtime.startCallback();
    session.setGain(1.7);
    session.pause();
    // No manual measurement reset: capture must arm it automatically.
    session.resume();
    Reflect.set(window, 'timelineSession', session);
    const button = document.createElement('button');
    button.textContent = 'Capture fixture';
    button.onclick = () => {
      void session.canvas.requestPointerLock();
    };
    document.body.appendChild(button);
  });
  await page.getByRole('button', { name: 'Capture fixture' }).click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  await page.evaluate(() =>
    Reflect.get(window, 'timelineSession').setCaptured(true),
  );
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'timelineSession').diagnostics.motionTimeline,
    ),
  ).toMatchObject({ status: 'armed', gain: 1.7 });
  await page.mouse.move(20, 10);
  const firstPeak = await page.evaluate(() => {
    const runtime = Reflect.get(window, 'timelineRuntime');
    runtime.native.polledX = runtime.native.pendingX;
    runtime.native.polledY = runtime.native.pendingY;
    runtime.frame++;
    runtime.Module.marbleAfterIteration();
    return Reflect.get(window, 'timelineSession').diagnostics.motionTimeline
      .selection.peakL1;
  });
  await page.waitForTimeout(220);
  await page.evaluate(() => {
    const runtime = Reflect.get(window, 'timelineRuntime');
    runtime.native.pendingX =
      runtime.native.pendingY =
      runtime.native.polledX =
      runtime.native.polledY =
        0;
    runtime.frame++;
    runtime.Module.marbleAfterIteration();
  });
  await page.mouse.move(5000, 5000);
  const trace = await page.evaluate(() => {
    const runtime = Reflect.get(window, 'timelineRuntime');
    runtime.native.polledX = runtime.native.pendingX;
    runtime.native.polledY = runtime.native.pendingY;
    runtime.frame++;
    runtime.Module.marbleAfterIteration();
    const session = Reflect.get(window, 'timelineSession');
    session.pause();
    return session.diagnostics.motionTimeline;
  });
  expect(trace).toMatchObject({
    status: 'complete',
    reason: 'interrupted',
    gain: 1.7,
  });
  expect(trace.summary.events).toBeGreaterThan(0);
  expect(trace.selection.selectedSegment).toBe(2);
  expect(trace.selection.peakL1).toBeGreaterThan(firstPeak);
  expect(trace.rows).toHaveLength(1);
  expect(trace.rows[0].sentX).toBe(trace.rows[0].polledX);
  expect(trace.rows[0].sentY).toBe(trace.rows[0].polledY);
  await page.evaluate(() => {
    const session = Reflect.get(window, 'timelineSession');
    session.resetMetrics();
    session.setGain(2);
  });
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'timelineSession').diagnostics.motionTimeline,
    ),
  ).toMatchObject({ status: 'complete', reason: 'gain-change', rows: [] });
  await page.evaluate(() => {
    const session = Reflect.get(window, 'timelineSession');
    session.resume();
    session.setCaptured(true);
  });
  const recaptured = await page.evaluate(
    () => Reflect.get(window, 'timelineSession').diagnostics,
  );
  expect(recaptured.motionTimeline).toMatchObject({
    status: 'armed',
    gain: 2,
    rows: [],
    selection: { segmentsSeen: 0 },
  });
  expect(recaptured.events).toBe(0);
  expect(recaptured.nativeSampling.iterations).toBe(0);
  await page.evaluate(() => {
    Reflect.get(window, 'timelineSession').dispose();
    document.exitPointerLock();
  });
});
