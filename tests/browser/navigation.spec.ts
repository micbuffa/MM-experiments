import { expect, test } from './fixtures';
import type { mountVideoComparison as ComparisonMount } from '../../src/ui/videoComparison';
import type { PracticePose } from '../../src/emulation/practicePose';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const p = '/src/ui/playControls.ts',
      v = '/src/ui/videoComparison.ts',
      presentation = '/src/ui/gamePresentation.ts';
    const { mountPlayControls } = await import(/* @vite-ignore */ p),
      { mountVideoComparison } = await import(/* @vite-ignore */ v),
      { mountGamePresentation } = await import(/* @vite-ignore */ presentation);
    const canvas = document.createElement('canvas');
    canvas.id = 'test-arcade-canvas';
    canvas.width = 400;
    canvas.height = 300;
    document.getElementById('emulator')!.appendChild(canvas);
    const gl = canvas.getContext('webgl2')!,
      listeners = new Set<() => void>(),
      motions = new Set<(x: number, y: number) => void>(),
      calls: string[] = [],
      poses: unknown[] = [];
    let paused = false,
      captured = false;
    let practicePose: PracticePose | null = null;
    const session = {
      canvas,
      started: true,
      failed: false,
      get paused() {
        return paused;
      },
      get diagnostics() {
        return {};
      },
      pause() {
        paused = true;
        captured = false;
        calls.push('pause');
      },
      resume() {
        paused = false;
        calls.push('resume');
      },
      setCaptured(value: boolean) {
        captured = value;
        calls.push(`captured:${value}`);
      },
      setBoost(value: boolean) {
        calls.push(`boost:${value}`);
      },
      resetMetrics() {},
      setGain(value: number) {
        calls.push(`gain:${value}`);
      },
      setVolume() {},
      pulse(button: number, player = 0) {
        calls.push(`pulse:${button}:${player}`);
      },
      dispose() {
        calls.push('dispose');
      },
      subscribeMotion(fn: (x: number, y: number) => void) {
        motions.add(fn);
        return () => motions.delete(fn);
      },
      setSpatialListener(pose: unknown) {
        poses.push(pose ? { ...Object(pose) } : null);
      },
    };
    const controls = mountPlayControls(session, {
      beforeCapture: () => comparison?.enterGame(),
      isExploring: () => comparison?.isExploring ?? false,
      interrupted: () => comparison?.stopExploration(),
    });
    const comparison: ReturnType<typeof ComparisonMount> = mountVideoComparison(
      {
        canvas,
        geometry: { width: 400, height: 300, aspect: 4 / 3 },
        practicePose: () => practicePose,
        subscribe(fn: () => void) {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
      },
      session,
    );
    const fullscreen = mountGamePresentation();
    Object.assign(window, {
      navFixture: {
        calls,
        poses,
        session,
        comparison,
        get captured() {
          return captured;
        },
        paint() {
          gl.clearColor(0.8, 0.15, 0.1, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          for (const fn of listeners) fn();
        },
        setPracticePose(value: PracticePose | null) {
          practicePose = value;
        },
        videoCount: () => listeners.size,
        motion(x: number, y: number) {
          for (const fn of motions) fn(x, y);
        },
        dispose() {
          fullscreen();
          comparison?.dispose();
          controls();
        },
        motionCount: () => motions.size,
      },
    });
  });
  await page.locator('#video-mode').selectOption('stage');
  await expect(page.locator('#explore-bar')).toBeEnabled();
  await page.evaluate(() => Reflect.get(window, 'navFixture').paint());
});

test('explorer isole les entrées, E entre dans la borne, la boule suit les commandes et retour/pause nettoient tout', async ({
  page,
}) => {
  await page.locator('#explore-bar').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('babylon-video');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, 'navFixture').comparison.diagnostics.exploration
            .active,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').session.paused),
  ).toBe(false);
  const before = await page.evaluate(
    () =>
      Reflect.get(window, 'navFixture').comparison.diagnostics.exploration.z,
  );
  await page.keyboard.down('w');
  await page.waitForTimeout(200);
  await page.keyboard.up('w');
  const after = await page.evaluate(
    () =>
      Reflect.get(window, 'navFixture').comparison.diagnostics.exploration.z,
  );
  expect(after).toBeGreaterThan(before);
  await page.keyboard.press('5');
  await page.keyboard.press('1');
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'navFixture').calls.filter(
        (value: string) => value.startsWith('pulse:') || value === 'boost:true',
      ),
    ),
  ).toEqual([]);
  await page.keyboard.press('e');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('test-arcade-canvas');
  await expect(page.locator('#camera-view')).toHaveValue('front');
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').captured),
  ).toBe(true);
  const readRoll = () =>
    page.evaluate(async () => {
      const path = '/tests/browser/cabinetHarness.ts';
      const { trackballOrientation } = await import(/* @vite-ignore */ path);
      return trackballOrientation();
    });
  const initial = await readRoll();
  await page.evaluate(() => {
    Reflect.get(window, 'navFixture').motion(100, 50);
    Reflect.get(window, 'navFixture').paint();
  });
  expect(initial).toEqual([0, 0, 0, 1]);
  const [pitch, , roll] = await readRoll();
  expect(pitch).toBeLessThan(0);
  expect(roll).toBeLessThan(0);
  await page.keyboard.press('Escape');
  await page.locator('#leave-cabinet').click();
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').session.paused),
  ).toBe(true);
  await page.locator('#explore-bar').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('babylon-video');
  await page.keyboard.down('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('d');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').session.paused),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, 'navFixture').comparison.diagnostics.exploration
          .held,
    ),
  ).toEqual([]);
  await page.evaluate(() => Reflect.get(window, 'navFixture').dispose());
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').motionCount()),
  ).toBe(0);
});

test('C parcourt cinq cadrages pendant la partie et conserve la capture et le boost', async ({
  page,
}) => {
  await page.locator('#camera-view').selectOption('front');
  await page.locator('#enter-game').click();
  const hud = page.locator('#game-camera');
  await expect(hud).toHaveValue('front');
  await page.keyboard.press('c');
  await expect(hud).toHaveValue('front');
  await page.locator('[data-command="capture"]').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('test-arcade-canvas');
  const sessionState = () =>
    page.evaluate(() => {
      const fixture = Reflect.get(window, 'navFixture');
      return {
        captured: fixture.captured,
        paused: fixture.session.paused,
        calls: [...fixture.calls],
      };
    });
  await page.keyboard.down('Space');
  const playing = await sessionState();
  expect(playing.captured).toBe(true);
  expect(playing.paused).toBe(false);
  expect(playing.calls).toContain('boost:true');
  await page.keyboard.press('Control+c');
  await expect(hud).toHaveValue('front');

  await page.keyboard.down('c');
  await expect(hud).toHaveValue('monitor');
  await page.keyboard.down('c'); // Auto-repeat.
  await expect(hud).toHaveValue('monitor');
  await page.keyboard.up('c');
  await expect(page.locator('#camera-view')).toHaveValue('monitor');
  await page.keyboard.press('c');
  await expect(page.locator('#camera-view')).toHaveValue('controls');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, 'navFixture').comparison.diagnostics
            .transitioning,
      ),
    )
    .toBe(false);
  const centers = await page.evaluate(async () => {
    const path = '/tests/browser/cabinetHarness.ts';
    const { projectCabinetMesh } = await import(/* @vite-ignore */ path);
    return [
      'arcade-video',
      'cabinet-trackball',
      'cabinet-trackball-p2',
      'cabinet-button-start1',
    ].map((name) => {
      const { x, y, width, height } = projectCabinetMesh(name);
      return { x, y, width, height };
    });
  });
  for (const { x, y, width, height } of centers) {
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(width);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(height);
  }
  for (const preset of ['perspective', 'bar', 'front']) {
    await page.keyboard.press('c');
    await expect(hud).toHaveValue(preset);
    await expect(page.locator('#camera-view')).toHaveValue(preset);
  }
  expect(await page.evaluate(() => document.pointerLockElement?.id)).toBe(
    'test-arcade-canvas',
  );
  expect(await sessionState()).toEqual(playing);
  await page.keyboard.up('Space');
  await page.locator('#video-mode').evaluate((select: HTMLSelectElement) => {
    select.value = 'direct';
    select.dispatchEvent(new Event('change'));
  });
  await expect(hud).toBeDisabled();
  await page.keyboard.press('c');
  await expect(hud).toHaveValue('front');
});

test('refus de capture exploration conserve la pause et permet un nouveau geste', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#babylon-video')!.requestPointerLock =
      async () => {
        throw Error('denied');
      };
  });
  await page.locator('#explore-bar').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, 'navFixture').comparison.isExploring,
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').session.paused),
  ).toBe(true);
  await expect(page.locator('#explore-bar')).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
});

test('glisser sur la boule rouge anime J2 sans reprendre la partie', async ({
  page,
}) => {
  await page.locator('#pause').click();
  await page.locator('#camera-view').selectOption('controls');
  const inspect = () =>
    page.evaluate(async () => {
      const path = '/tests/browser/cabinetHarness.ts';
      const { projectCabinetMesh, trackballOrientation } = await import(
        /* @vite-ignore */ path
      );
      const name = 'cabinet-trackball-p2';
      return {
        point: projectCabinetMesh(name),
        red: trackballOrientation(name),
        blue: trackballOrientation(),
      };
    });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, 'navFixture').comparison.diagnostics
            .transitioning,
      ),
    )
    .toBe(false);
  const canvas = page.locator('#babylon-video');
  await canvas.scrollIntoViewIfNeeded();
  const before = await inspect();
  const box = (await canvas.boundingBox())!;
  const { x, y, width, height } = before.point;
  const clientX = box.x + (x * box.width) / width;
  const clientY = box.y + (y * box.height) / height;
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
  await page.mouse.move(clientX + 75, clientY - 25, { steps: 6 });
  await page.mouse.up();
  const after = await inspect();
  expect(after.red).not.toEqual(before.red);
  expect(after.blue).toEqual(before.blue);
  expect(
    await page.evaluate(() => Reflect.get(window, 'navFixture').session.paused),
  ).toBe(true);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
});

test.describe('Retina', () => {
  test.use({ deviceScaleFactor: 2 });
  test('qualités explicites règlent la résolution sans toucher aux commandes', async ({
    page,
  }) => {
    const width = () =>
      page.evaluate(
        () =>
          Reflect.get(window, 'navFixture').comparison.diagnostics.rendering
            .width,
      );
    const css = (await page.locator('#babylon-video').boundingBox())!.width;
    expect(await width()).toBeCloseTo(css * 1.5, 0);
    const before = await page.evaluate(() => [
      ...Reflect.get(window, 'navFixture').calls,
    ]);
    await page.locator('#render-quality').selectOption('retina');
    expect(await width()).toBeCloseTo(css * 2, 0);
    await page.locator('#render-quality').selectOption('eco');
    expect(await width()).toBeCloseTo(css, 0);
    expect(
      await page.evaluate(() => Reflect.get(window, 'navFixture').calls),
    ).toEqual(before);
    const metrics = await page.evaluate(
      () => Reflect.get(window, 'navFixture').comparison.diagnostics.rendering,
    );
    expect(metrics.frames).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            Reflect.get(window, 'navFixture').comparison.diagnostics.rendering
              .drawCalls,
        ),
      )
      .toBeGreaterThan(0);
    expect(['unsupported', 'pending', 'available']).toContain(
      metrics.gpuStatus,
    );
  });
});

test('V bascule en capture et la comparaison garde les deux rendus sur une seule session', async ({
  page,
}) => {
  const mode = page.locator('#video-mode');
  const stage = page.locator('#video-stage');
  const hud = page.locator('#game-video-mode');
  const canvas = page.locator('#babylon-video');
  await expect(mode.locator('option[value="modern-compare"]')).toBeDisabled();
  const cells = Array.from({ length: 14 }, () =>
    Array.from({ length: 20 }, () => Array<number>(4).fill(0x4000)),
  );
  await page.locator('#live-terrain-file').setInputFiles({
    name: 'practice.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'practice-terrain-v1', rows: cells }),
    ),
  });
  await mode.selectOption('modern-compare');
  await expect(page.locator('#modern-unavailable')).toBeVisible();
  await expect(canvas).toBeHidden();

  await page.locator('#enter-game').click();
  await expect(hud).toHaveValue('modern-compare');
  const sample = (pose: PracticePose | null) =>
    page.evaluate((pose) => {
      const fixture = Reflect.get(window, 'navFixture');
      fixture.setPracticePose(pose);
      fixture.paint();
    }, pose);
  const pose: PracticePose = {
    marble: 'visible',
    x: 140,
    z: 140,
    height: 0x4000,
    scroll: -16144,
  };
  await sample(pose);
  await expect(canvas).toBeVisible();
  const original = page.locator('.source-view');
  await expect(original).toBeVisible();
  expect((await original.boundingBox())!.x).toBeLessThan(
    (await canvas.boundingBox())!.x,
  );
  await sample(null);
  await expect(canvas).toBeHidden();
  await expect(original).toBeVisible();
  await expect(stage).toHaveAttribute('data-mode', 'modern-compare');
  await sample(pose);

  await hud.selectOption('direct');
  await expect(mode).toHaveValue('direct');
  await page.keyboard.press('v');
  await expect(hud).toHaveValue('direct');
  await page.locator('[data-command="capture"]').click();
  const sessionState = () =>
    page.evaluate(() => {
      const fixture = Reflect.get(window, 'navFixture');
      return {
        lock: document.pointerLockElement?.id,
        paused: fixture.session.paused,
        calls: [...fixture.calls],
        videoCount: fixture.videoCount(),
      };
    });
  await expect
    .poll(async () => (await sessionState()).lock)
    .toBe('test-arcade-canvas');
  await page.keyboard.down('Space');
  const playing = await sessionState();
  expect(playing.calls).toContain('boost:true');
  await page.keyboard.press('h');
  await expect(page.locator('#game-help')).toBeVisible();
  await expect(page.locator('#game-help-player2')).toHaveText('Z / Q / S / D');
  await page.keyboard.press('h');
  await expect(page.locator('#game-help')).toBeHidden();
  expect(await sessionState()).toEqual(playing);
  await page.keyboard.press('Control+v');
  await expect(hud).toHaveValue('direct');
  await page.keyboard.down('v');
  await expect(hud).toHaveValue('modern');
  await expect(stage).toHaveAttribute('data-mode', 'babylon');
  await page.keyboard.down('v');
  await expect(hud).toHaveValue('modern');
  await page.keyboard.up('v');
  const practiceCamera = () =>
    page.evaluate(
      () =>
        Reflect.get(window, 'navFixture').comparison.diagnostics.practiceCamera,
    );
  const modernCamera = page.locator('#game-practice-view');
  const modernFov = page.locator('#game-practice-fov');
  await sample({ ...pose, opening: 0.25 });
  expect(await practiceCamera()).toMatchObject({
    active: 'opening',
    opening: 0.25,
  });
  await page.keyboard.press('c');
  await expect(modernCamera).toHaveValue('follow');
  expect(await practiceCamera()).toMatchObject({ active: 'follow', fov: 55 });
  await page.keyboard.press('=');
  await expect(modernFov).toHaveValue('60');
  await page.keyboard.press('-');
  await expect(modernFov).toHaveValue('55');
  await page.keyboard.press('c');
  await expect(modernCamera).toHaveValue('overhead');
  await sample(pose);
  expect(await practiceCamera()).toMatchObject({
    active: 'overhead',
    opening: null,
  });
  await page.keyboard.press('c');
  await expect(modernCamera).toHaveValue('chase');
  expect(await practiceCamera()).toMatchObject({ active: 'chase' });
  await page.keyboard.press('v');
  await expect(hud).toHaveValue('modern-compare');
  await page.keyboard.press('v');
  await expect(hud).toHaveValue('direct');
  await page.keyboard.press('Shift+v');
  await expect(hud).toHaveValue('modern-compare');
  await expect(original).toBeVisible();
  await expect(canvas).toBeVisible();
  await page.keyboard.press('Shift+v');
  await expect(hud).toHaveValue('direct');
  expect(await sessionState()).toEqual(playing);
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await sessionState()).paused).toBe(true);
  await hud.selectOption('modern-compare');
  await expect(canvas).toBeVisible();
  await expect(modernCamera).toHaveValue('chase');
  await modernCamera.selectOption('arcade');
  expect(await practiceCamera()).toMatchObject({ active: 'arcade' });
  await expect(page.locator('#practice-view')).toHaveValue('arcade');
  const shadows = page.locator('#game-practice-marble-shadows');
  await expect(shadows).not.toBeChecked();
  await shadows.check();
  await expect(page.locator('#practice-marble-shadows')).toBeChecked();
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, 'navFixture').comparison.diagnostics
          .practiceMarbleShadows,
    ),
  ).toBe(true);
  await shadows.uncheck();
  expect(await sessionState()).toMatchObject({ paused: true, videoCount: 1 });
});

test('le panneau H suit les commandes remappées et laisse la saisie intacte', async ({
  page,
}) => {
  const layout = page.locator('#player2-layout');
  const help = page.locator('#game-help');
  await layout.selectOption('arrows');
  await layout.press('h');
  await expect(help).toBeHidden();
  await page.locator('#toggle-game-help').click();
  await expect(help).toBeVisible();
  await expect(page.locator('#game-help-player2')).toHaveText('↑ / ← / ↓ / →');
  await expect(page.locator('#toggle-game-help')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.keyboard.press('h');
  await expect(help).toBeHidden();
});
