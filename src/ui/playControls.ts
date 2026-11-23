import { requestPointerCapture } from '../input/requestPointerCapture';
import type { ProbeSession } from '../emulation/emulatorjs';
import {
  DEFAULT_GAIN,
  MIN_GAIN,
  MAX_GAIN,
  restorePlayableGain,
} from '../input/relativeMotion';
import { readPreference, savePreference } from '../input/preferences';
import { arcadeShortcut } from '../input/arcadeShortcuts';
import { sendArcadeCommand } from '../input/arcadeCommand';
import { mountPlayer2Controls } from './player2Controls';

/** Entrées UI et interruptions ; les deltas sont consommés par le driver natif. */
export function mountPlayControls(
  session: ProbeSession,
  integration: {
    beforeCapture?(): void;
    isExploring?(): boolean;
    interrupted?(): void;
  } = {},
): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const status = document.querySelector<HTMLElement>('#control-status')!;
  const capture = document.querySelector<HTMLButtonElement>('#capture')!;
  const resume = document.querySelector<HTMLButtonElement>('#resume')!;
  const pause = document.querySelector<HTMLButtonElement>('#pause')!;
  const credit = document.querySelector<HTMLButtonElement>('#credit')!;
  const start = document.querySelector<HTMLButtonElement>('#start-player')!;
  const start2 = document.querySelector<HTMLButtonElement>('#start-player2')!;
  const gain = document.querySelector<HTMLInputElement>('#gain')!;
  const volume = document.querySelector<HTMLInputElement>('#volume')!;
  const gainReset = document.querySelector<HTMLButtonElement>('#gain-reset')!;
  const boostStatus = document.querySelector<HTMLElement>('#boost-status')!;
  let spaceHeld = false;
  let disposed = false;
  let requesting = false;
  let captureEpoch = 0;
  // Accéder au stockage peut lui-même être interdit par le navigateur.
  const storage = {
    getItem(key: string) {
      return window.localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      window.localStorage.setItem(key, value);
    },
  };
  const player2 = mountPlayer2Controls(storage, options, (direction, pressed) =>
    session.setPlayer2Direction(direction, pressed),
  );
  const storedGain = readPreference(
    storage,
    'gain',
    DEFAULT_GAIN,
    MIN_GAIN,
    MAX_GAIN,
  );
  const normalGain = restorePlayableGain(storedGain);
  gain.value = String(normalGain);
  if (normalGain !== storedGain) savePreference(storage, 'gain', normalGain);
  volume.value = String(readPreference(storage, 'volume', 0.5, 0, 1));
  session.setGain(Number(gain.value));
  session.setVolume(Number(volume.value));
  function update(message: string) {
    status.textContent = message;
    // Ces gestes explicites peuvent reprendre la session avant la pression.
    credit.disabled = start.disabled = start2.disabled = false;
    resume.disabled = false;
    capture.disabled = document.pointerLockElement === session.canvas;
    document.querySelector<HTMLOutputElement>('#gain-value')!.value =
      `${Number(gain.value).toFixed(2)}×`;
    document.querySelector<HTMLOutputElement>('#volume-value')!.value =
      `${Math.round(Number(volume.value) * 100)} %`;
  }
  function releaseBoost() {
    if (!spaceHeld) return;
    spaceHeld = false;
    session.setBoost(false);
    boostStatus.textContent =
      'Boost prêt : maintenir Espace et guider au trackpad pendant le jeu.';
  }
  function interrupt() {
    if (disposed) return;
    captureEpoch++;
    releaseBoost();
    player2.release();
    session.pause();
    integration.interrupted?.();
    if (
      document.pointerLockElement === session.canvas ||
      document.pointerLockElement === document.querySelector('#babylon-video')
    )
      document.exitPointerLock();
    update(
      'En pause, son coupé et entrées vidées. Crédit, Start ou Reprendre relancent explicitement ; capturer ensuite pour jouer.',
    );
  }
  async function requestCapture() {
    if (disposed || requesting) return;
    requesting = true;
    const epoch = captureEpoch;
    try {
      if (!session.canvas.requestPointerLock)
        throw new Error('Pointer Lock indisponible dans ce navigateur.');
      // Geste utilisateur : réactiver immédiatement le contexte audio avant toute attente.
      integration.beforeCapture?.();
      session.resume();
      session.canvas.scrollIntoView({ block: 'center' });
      await requestPointerCapture(session.canvas);
      if (
        disposed ||
        epoch !== captureEpoch ||
        document.hidden ||
        !document.hasFocus()
      ) {
        if (document.pointerLockElement === session.canvas)
          document.exitPointerLock();
        return;
      }
      if (document.pointerLockElement !== session.canvas)
        throw new Error(
          'Capture refusée. Réessayer en cliquant sur le bouton.',
        );
      session.canvas.tabIndex = 0;
      session.canvas.focus({ preventScroll: true });
      if (document.activeElement === capture) capture.blur();
      session.setCaptured(true);
      update(
        'Trackpad capturé. 5/( : Crédit · 1/& : Start J1 · 2/é : Start J2 · Espace : boost · Échap : pause.',
      );
    } catch (error) {
      interrupt();
      if (!disposed) update(`Capture impossible : ${String(error)}`);
    } finally {
      requesting = false;
    }
  }
  document.querySelector('#video-stage')!.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      const stage = event.currentTarget as HTMLElement;
      if (
        !(event instanceof MouseEvent) ||
        event.button !== 0 ||
        !(target instanceof Element) ||
        !target.closest('canvas') ||
        stage.dataset.mode === 'stage' ||
        integration.isExploring?.() ||
        document.pointerLockElement ||
        capture.disabled
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void requestCapture();
    },
    { ...options, capture: true },
  );
  capture.addEventListener(
    'click',
    () => {
      void requestCapture();
    },
    options,
  );
  resume.addEventListener(
    'click',
    () => {
      session.resume();
      update(
        'Émulation et son activés. Capturer le trackpad pour contrôler la bille.',
      );
    },
    options,
  );
  pause.addEventListener('click', interrupt, options);
  credit.addEventListener(
    'click',
    () => {
      sendArcadeCommand(session, 2);
      update(
        'Crédit envoyé. Cliquer sur Start joueur 1, puis capturer le trackpad.',
      );
    },
    options,
  );
  start.addEventListener(
    'click',
    () => {
      sendArcadeCommand(session, 3);
      update('Start envoyé. Capturer le trackpad pour contrôler la bille.');
    },
    options,
  );
  start2.addEventListener(
    'click',
    () => {
      if (session.paused) session.resume();
      session.pulse(3, 1);
      update(
        'Start joueur 2 envoyé. Capturer pour jouer au trackpad et au clavier.',
      );
    },
    options,
  );
  function applyGain(value: number, message: string) {
    releaseBoost();
    gain.value = String(value);
    session.setGain(value);
    savePreference(storage, 'gain', value);
    update(message);
  }
  gain.addEventListener(
    'input',
    () => {
      applyGain(
        Number(gain.value),
        session.paused
          ? 'Réglage modifié ; session toujours en pause.'
          : 'Gain expérimental modifié.',
      );
    },
    options,
  );
  gainReset.addEventListener(
    'click',
    () => {
      applyGain(
        DEFAULT_GAIN,
        'Contrôle normal remis à 1,70×. Maintenir Espace pendant le jeu pour le boost.',
      );
    },
    options,
  );
  volume.addEventListener(
    'input',
    () => {
      session.setVolume(Number(volume.value));
      savePreference(storage, 'volume', Number(volume.value));
      update(
        session.paused
          ? 'Volume mémorisé ; session toujours en pause.'
          : 'Volume appliqué ; 0 % coupe le son.',
      );
    },
    options,
  );
  window.addEventListener('blur', interrupt, options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) interrupt();
    },
    options,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        player2.keyDown(
          event,
          !session.paused && document.pointerLockElement === session.canvas,
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.key === 'Escape') interrupt();
      const shortcut = arcadeShortcut(event);
      if (
        shortcut &&
        !session.paused &&
        document.pointerLockElement === session.canvas &&
        !(
          event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable]')
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) session.pulse(shortcut.button, shortcut.player);
        return;
      }
      if (event.code !== 'Space') return;
      if (session.paused || document.pointerLockElement !== session.canvas) {
        if (event.target === session.canvas || event.target === document.body)
          event.preventDefault();
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (spaceHeld || event.repeat) return;
      spaceHeld = true;
      session.setBoost(true);
      boostStatus.textContent =
        'Boost maintenu : guider au trackpad ; relâcher Espace pour le contrôle normal.';
    },
    { ...options, capture: true },
  );
  document.addEventListener(
    'keyup',
    (event) => {
      if (player2.keyUp(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.code !== 'Space' || !spaceHeld) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      releaseBoost();
    },
    { ...options, capture: true },
  );
  document.addEventListener(
    'pointerlockchange',
    () => {
      if (
        integration.isExploring?.() &&
        document.pointerLockElement === document.querySelector('#babylon-video')
      )
        return;
      if (!requesting && document.pointerLockElement !== session.canvas)
        interrupt();
    },
    options,
  );
  document.addEventListener(
    'pointerlockerror',
    () => {
      if (!requesting) interrupt();
    },
    options,
  );
  // La molette et le tactile ne parviennent pas au driver de commandes arcade.
  for (const name of [
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
  ] as const) {
    session.canvas.addEventListener(
      name,
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { ...options, capture: true, passive: false },
    );
  }
  // Bloquer les raccourcis natifs : seules nos pressions/relâchements explicites
  // contrôlent crédit et Start, aucune direction clavier ou touche restant enfoncée.
  const host = document.querySelector<HTMLElement>('#emulator')!;
  for (const name of ['keydown', 'keyup']) {
    host.addEventListener(
      name,
      (event) => {
        event.stopImmediatePropagation();
      },
      { ...options, capture: true },
    );
  }
  for (const input of [
    capture,
    resume,
    pause,
    credit,
    start,
    start2,
    gain,
    volume,
    gainReset,
  ])
    input.disabled = false;
  update(
    'Attendre l’écran titre ou le mode démo, puis Crédit → Start joueur 1 → Capturer le trackpad.',
  );
  return () => {
    interrupt();
    player2.dispose();
    disposed = true;
    controller.abort();
    session.dispose();
  };
}
