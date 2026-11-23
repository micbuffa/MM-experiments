import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// Tests UI déterministes sans ROM. Les API du vrai adaptateur sont vérifiées
// séparément par le test de runtime et par les essais locaux documentés.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const source = '/src/ui/playControls.ts';
    const { mountPlayControls } = await import(/* @vite-ignore */ source);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 250;
    document.querySelector('#emulator')!.appendChild(canvas);
    const calls: string[] = [];
    let paused = false;
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
        calls.push('pause');
      },
      resume() {
        paused = false;
        calls.push('resume');
      },
      setCaptured(value: boolean) {
        calls.push(`captured:${value}`);
      },
      setBoost(value: boolean) {
        calls.push(`boost:${value}`);
      },
      setPlayer2Direction(direction: string, pressed: boolean) {
        calls.push(`p2:${direction}:${pressed}`);
      },
      resetMetrics() {
        calls.push('resetMetrics');
      },
      setGain(value: number) {
        calls.push(`gain:${value}`);
      },
      setVolume(value: number) {
        calls.push(`volume:${value}`);
      },
      pulse(button: number, player = 0) {
        calls.push(
          player === 0 ? `pulse:${button}` : `pulse:${button}:player:${player}`,
        );
      },
      dispose() {
        calls.push('dispose');
      },
    };
    const dispose = mountPlayControls(session);
    Object.assign(window, { controlFixture: { session, calls, dispose } });
  });
});

test('J2 utilise le clavier capturé, mémorise les touches et les libère à la pause', async ({
  page,
}) => {
  const calls = () =>
    page.evaluate(() =>
      (Reflect.get(window, 'controlFixture').calls as string[]).filter((call) =>
        call.startsWith('p2:'),
      ),
    );
  await page.keyboard.press('z');
  expect(await calls()).toEqual([]);
  await page.locator('#player2-layout').selectOption('qwerty');
  await page.locator('[data-direction="up"]').click();
  await page.keyboard.press('i');
  await expect(page.locator('#player2-layout')).toHaveValue('custom');
  await expect(page.locator('[data-direction="up"]')).toHaveText('Haut · I');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('marble.player2Keyboard')!).keys,
    ),
  ).toEqual(['i', 'a', 's', 'd']);
  await page.locator('#capture').click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  await page.keyboard.press('w');
  await page.keyboard.down('i');
  await page.keyboard.down('i');
  await page.keyboard.down('a');
  expect(await calls()).toEqual(['p2:up:true', 'p2:left:true']);
  await page.keyboard.press('Escape');
  expect(await calls()).toEqual([
    'p2:up:true',
    'p2:left:true',
    'p2:up:false',
    'p2:left:false',
  ]);
  await page.keyboard.up('i');
  await page.keyboard.up('a');
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('marble.player2Keyboard')!).layout,
    ),
  ).toBe('custom');
});

test('crédit et Start explicites, interruption sans reprise automatique, nettoyage des listeners', async ({
  page,
}) => {
  await page.locator('#credit').click();
  await page.locator('#start-player').click();
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toContain('pulse:2');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toContain('pulse:3');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#credit')).toBeEnabled();
  await expect(page.locator('#start-player')).toBeEnabled();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  await page.locator('#resume').click();
  await expect(page.locator('#credit')).toBeEnabled();
  await page.evaluate(() => Reflect.get(window, 'controlFixture').dispose());
  const count = await page.evaluate(
    () => Reflect.get(window, 'controlFixture').calls.length,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').calls.length,
    ),
  ).toBe(count);
});

test('capture réelle du pointeur, puis Échap met en pause et libère', async ({
  page,
}) => {
  await page.locator('#capture').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toContain('captured:true');
  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
  await expect(page.locator('#credit')).toBeEnabled();
  await expect(page.locator('#start-player')).toBeEnabled();
  await expect(page.locator('#control-status')).toContainText('En pause');
});

test('capture refusée : pause et possibilité de réessayer', async ({
  page,
}) => {
  await page.evaluate(() => {
    const canvas = Reflect.get(window, 'controlFixture').session
      .canvas as HTMLCanvasElement;
    canvas.requestPointerLock = () =>
      Promise.reject(new DOMException('Refus de test', 'NotAllowedError'));
  });
  await page.locator('#capture').click();
  await expect(page.locator('#control-status')).toContainText(
    'Capture impossible',
  );
  await expect(page.locator('#capture')).toBeEnabled();
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
});

test('gain et volume mémorisés, réglage pendant la pause sans reprise implicite', async ({
  page,
}) => {
  await page.locator('#pause').click();
  await page.locator('#gain').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#gain-value')).toHaveText('4.00×');
  expect(await page.evaluate(() => localStorage.getItem('marble.gain'))).toBe(
    '4',
  );
  await page.locator('#gain-reset').click();
  expect(await page.evaluate(() => localStorage.getItem('marble.gain'))).toBe(
    '1.7',
  );
  await page.locator('#volume').focus();
  await page.keyboard.press('Home');
  expect(await page.evaluate(() => localStorage.getItem('marble.volume'))).toBe(
    '0',
  );
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
});

test('une interruption annule une capture encore en attente', async ({
  page,
}) => {
  await page.evaluate(() => {
    const canvas = Reflect.get(window, 'controlFixture').session
      .canvas as HTMLCanvasElement;
    canvas.requestPointerLock = () =>
      new Promise<void>((resolve) =>
        Reflect.set(window, 'finishCaptureRequest', resolve),
      );
  });
  await page.locator('#capture').click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => Reflect.get(window, 'finishCaptureRequest')());
  await expect(page.locator('#control-status')).toContainText('En pause');
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).not.toContain('captured:true');
});

test('Échap après capture laisse Crédit et Start accessibles et un clic reprend avant la pression', async ({
  page,
}) => {
  await page.locator('#capture').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  await page.keyboard.press('Escape');
  await expect(page.locator('#control-status')).toContainText('En pause');
  await page.evaluate(() => {
    Reflect.get(window, 'controlFixture').calls.length = 0;
  });
  await page.locator('#credit').click();
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter(
        (call: string) => call !== 'pause',
      ),
    ),
  ).toEqual(['resume', 'pulse:2']);
  await page.locator('#start-player').click();
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter(
        (call: string) => call !== 'pause',
      ),
    ),
  ).toEqual(['resume', 'pulse:2', 'pulse:3']);
  await page.locator('#pause').click();
  await page.evaluate(() => {
    Reflect.get(window, 'controlFixture').calls.length = 0;
  });
  await page.locator('#start-player').click();
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter(
        (call: string) => call !== 'pause',
      ),
    ),
  ).toEqual(['resume', 'pulse:3']);
});

test('contrôle normal restaure 1,70× sans reprendre la partie', async ({
  page,
}) => {
  await page.locator('#pause').click();
  await page.locator('#gain').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '0.85';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#gain-reset').click();
  await expect(page.locator('#gain-value')).toHaveText('1.70×');
  expect(await page.evaluate(() => localStorage.getItem('marble.gain'))).toBe(
    '1.7',
  );
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
});

test('Espace exige une capture, reste sans répétition, et se libère sur relâchement, Échap et perte de focus', async ({
  page,
}) => {
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).not.toContain('boost:true');
  await page.locator('#capture').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter(
        (s: string) => s === 'boost:true',
      ),
    ),
  ).toHaveLength(1);
  await page.keyboard.up('Space');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toContain('boost:false');
  await page.locator('#gain').focus();
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter(
        (s: string) => s === 'boost:true',
      ),
    ),
  ).toHaveLength(1);
  await page.locator('#emulator canvas').focus();
  await page.keyboard.down('Space');
  await page.keyboard.press('Escape');
  await expect(page.locator('#control-status')).toContainText('En pause');
  await expect(page.locator('#boost-status')).toContainText('Boost prêt');
  await page.keyboard.up('Space');
  await page.evaluate(() => {
    Reflect.get(window, 'controlFixture').calls.length = 0;
  });
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).not.toContain('resume');
  await page.locator('#capture').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  await page.keyboard.down('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#boost-status')).toContainText('Boost prêt');
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  await page.keyboard.up('Space');
});

async function mountPresentation(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/ui/gamePresentation.ts';
    const { mountGamePresentation } = await import(/* @vite-ignore */ path);
    Object.assign(window, { disposePresentation: mountGamePresentation() });
  });
}

test('plein écran et HUD commandent la même session, Échap et retour gardent la pause', async ({
  page,
}) => {
  await mountPresentation(page);
  await page.locator('#enter-game').click();
  const player = page.locator('#game-player');
  await expect(player).toHaveAttribute('data-playing', 'true');
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.id))
    .toBe('game-player');
  await expect(page.locator('#video-mode')).toHaveValue('stage');
  await expect(page.locator('#game-control-status')).toContainText('En pause');
  await player.locator('[data-command="credit"]').click();
  await player.locator('[data-command="start-player"]').click();
  const calls = await page.evaluate(
    () => Reflect.get(window, 'controlFixture').calls,
  );
  expect(calls.filter((call: string) => call === 'pulse:2')).toHaveLength(1);
  expect(calls.filter((call: string) => call === 'pulse:3')).toHaveLength(1);
  await player.locator('[data-command="capture"]').click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe('CANVAS');
  await page.keyboard.down('Space');
  await page.keyboard.press('Escape');
  await page.keyboard.up('Space');
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, 'controlFixture').session.paused),
    )
    .toBe(true);
  // Browser automation may forward Escape to JS without exiting native fullscreen.
  if (await page.evaluate(() => document.fullscreenElement !== null))
    await page.evaluate(() => document.exitFullscreen());
  await expect(player).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('#credit')).toBeEnabled();
  await page.locator('#enter-game').click();
  await page.locator('#leave-game').click();
  await expect(player).toHaveAttribute('data-playing', 'false');
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  await expect(page.locator('#enter-game')).toBeFocused();
});

test('refus du plein écran garde une vue immersive utilisable et démontage sans listeners résiduels', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#game-player')!.requestFullscreen =
      async () => {
        throw new Error('denied');
      };
  });
  await mountPresentation(page);
  await page.locator('#enter-game').click();
  await expect(page.locator('#game-note')).toContainText(
    'vue immersive dans la fenêtre',
  );
  await expect(page.locator('#game-player')).toHaveAttribute(
    'data-playing',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(page.locator('#leave-game')).toBeInViewport();
  await expect(page.locator('[data-command="credit"]')).toBeInViewport();
  await page.locator('[data-command="pause"]').click();
  await expect(page.locator('#game-control-status')).toContainText('En pause');
  await page.evaluate(() => Reflect.get(window, 'disposePresentation')());
  await expect(page.locator('#game-player')).toHaveAttribute(
    'data-playing',
    'false',
  );
  await expect(page.locator('#enter-game')).toBeDisabled();
  const count = await page.evaluate(
    () => Reflect.get(window, 'controlFixture').calls.length,
  );
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[data-command="credit"]')!
      .click();
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').calls.length,
    ),
  ).toBe(count);
});

test('changer la caméra ne transmet aucune commande et ne reprend pas la pause', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const path = '/src/ui/videoComparison.ts';
    const { mountVideoComparison } = await import(/* @vite-ignore */ path);
    const canvas =
      document.querySelector<HTMLCanvasElement>('#emulator canvas')!;
    const comparison = mountVideoComparison({
      canvas,
      geometry: { width: 400, height: 250, aspect: 1.6 },
      subscribe: () => () => {},
    });
    Object.assign(window, { disposeComparison: () => comparison.dispose() });
  });
  await page.locator('#video-mode').selectOption('stage');
  await page.locator('#pause').click();
  const before = await page.evaluate(() => [
    ...Reflect.get(window, 'controlFixture').calls,
  ]);
  await page.locator('#camera-view').selectOption('front');
  await page.locator('#camera-view').selectOption('perspective');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toEqual(before);
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  await page.locator('#resume').click();
  const running = await page.evaluate(() => [
    ...Reflect.get(window, 'controlFixture').calls,
  ]);
  await page.locator('#camera-view').selectOption('front');
  expect(
    await page.evaluate(() => Reflect.get(window, 'controlFixture').calls),
  ).toEqual(running);
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(false);
  await page.evaluate(() => Reflect.get(window, 'disposeComparison')());
});

test('raccourcis Crédit et Start J1/J2 uniquement en capture, sans répétition, modificateurs ou saisie', async ({
  page,
}) => {
  const commands = async () =>
    page.evaluate(() =>
      Reflect.get(window, 'controlFixture').calls.filter((call: string) =>
        call.startsWith('pulse:'),
      ),
    );
  await page.keyboard.press('5');
  expect(await commands()).toEqual([]);
  await page.locator('#capture').click();
  await page.keyboard.down('5');
  await page.keyboard.down('5');
  await page.keyboard.up('5');
  expect(await commands()).toEqual(['pulse:2']);
  for (const key of ['(', '1', '&', '2']) await page.keyboard.press(key);
  const cdp = await page.context().newCDPSession(page);
  for (const type of ['keyDown', 'keyUp'] as const)
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      key: 'é',
      code: 'Digit2',
      windowsVirtualKeyCode: 50,
    });
  expect(await commands()).toEqual([
    'pulse:2',
    'pulse:2',
    'pulse:3',
    'pulse:3',
    'pulse:3:player:1',
    'pulse:3:player:1',
  ]);
  const before = await commands();
  await page.keyboard.press('Control+5');
  await page.keyboard.press('Alt+1');
  await page.keyboard.press('Meta+2');
  await page.locator('#gain').focus();
  await page.keyboard.press('5');
  expect(await commands()).toEqual(before);
  await page.keyboard.press('Escape');
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  expect(await commands()).toEqual(before);
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(true);
  await page.evaluate(() => Reflect.get(window, 'controlFixture').dispose());
  await page.keyboard.press('5');
  expect(await commands()).toEqual(before);
});

test('Start J2 explicite reprend puis envoie le port2 sans réinitialiser les commandes suivantes', async ({
  page,
}) => {
  await page.locator('#pause').click();
  await page.locator('#start-player2').click();
  const calls = await page.evaluate(
    () => Reflect.get(window, 'controlFixture').calls,
  );
  expect(calls.slice(-2)).toEqual(['resume', 'pulse:3:player:1']);
  await page.locator('#start-player2').click();
  expect(
    (
      await page.evaluate(() => Reflect.get(window, 'controlFixture').calls)
    ).slice(-2),
  ).toEqual(['pulse:3:player:1', 'pulse:3:player:1']);
});

test('le bouton attend la confirmation asynchrone du verrouillage sans promesse', async ({
  page,
}) => {
  await page.evaluate(() => {
    const canvas = Reflect.get(window, 'controlFixture').session
      .canvas as HTMLCanvasElement;
    Object.defineProperty(canvas, 'requestPointerLock', {
      value() {
        Reflect.set(window, 'confirmLegacyLock', () => {
          Object.defineProperty(document, 'pointerLockElement', {
            configurable: true,
            value: canvas,
          });
          document.dispatchEvent(new Event('pointerlockchange'));
        });
      },
    });
  });
  await page.locator('#capture').click();
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'controlFixture').session.paused,
    ),
  ).toBe(false);
  await page.evaluate(() => Reflect.get(window, 'confirmLegacyLock')());
  await expect(page.locator('#control-status')).toContainText(
    'Trackpad capturé',
  );
});

test('Safari 17 conserve la capture et le HUD dans la vue immersive', async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 AppleWebKit/605.1.15 Version/17.4.1 Safari/605.1.15',
    });
    document.querySelector<HTMLElement>('#game-player')!.requestFullscreen =
      async () => {
        Reflect.set(window, 'nativeFullscreenRequested', true);
      };
  });
  await mountPresentation(page);
  await page.locator('#enter-game').click();
  const player = page.locator('#game-player');
  await expect(player).toHaveAttribute('data-playing', 'true');
  await expect(page.locator('#game-note')).toContainText('vue immersive');
  await player.locator('[data-command="capture"]').click();
  await expect(page.locator('#game-control-status')).toContainText(
    'Trackpad capturé',
  );
  expect(
    await page.evaluate(() => ({
      requested: Boolean(Reflect.get(window, 'nativeFullscreenRequested')),
      native: document.fullscreenElement !== null,
      paused: Reflect.get(window, 'controlFixture').session.paused,
    })),
  ).toEqual({ requested: false, native: false, paused: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-control-status')).toContainText('En pause');
});

test('cliquer sur les images 2D et 3D reprend la capture après Échap', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#video-stage')!.dataset.mode =
      'compare';
  });
  const source = page.locator('#emulator canvas');
  await source.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.pointerLockElement ===
          Reflect.get(window, 'controlFixture').session.canvas,
      ),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
  await page.locator('#babylon-video').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.pointerLockElement ===
          Reflect.get(window, 'controlFixture').session.canvas,
      ),
    )
    .toBe(true);
  const calls = await page.evaluate(
    () => Reflect.get(window, 'controlFixture').calls as string[],
  );
  expect(calls.filter((call) => call === 'captured:true')).toHaveLength(2);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
  await page.locator('#pause').click();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.evaluate(() => Reflect.get(window, 'controlFixture').dispose());
  await source.click();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
});
