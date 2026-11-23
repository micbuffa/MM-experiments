import { supportsFullscreenPointerLock } from '../browser/safariVersion';
import { createGamePresentation, isModernView } from '../game/gamePresentation';

/** DOM adapter for the compact HUD; forwards to the existing session controls. */
export function mountGamePresentation() {
  const player = document.querySelector<HTMLElement>('#game-player')!;
  const enter = document.querySelector<HTMLButtonElement>('#enter-game')!;
  const exit = document.querySelector<HTMLButtonElement>('#leave-game')!;
  const note = document.querySelector<HTMLElement>('#game-note')!;
  const state = document.querySelector<HTMLElement>('#game-control-status')!;
  const mode = document.querySelector<HTMLSelectElement>('#video-mode')!;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const pause = document.querySelector<HTMLButtonElement>('#pause')!;
  const controls = [
    ...player.querySelectorAll<HTMLButtonElement>('[data-command]'),
  ].map((button) => ({
    button,
    target: document.getElementById(
      button.dataset.command!,
    ) as HTMLButtonElement,
  }));
  function exitOwnedFullscreen() {
    if (document.fullscreenElement === player)
      void document.exitFullscreen().catch(() => {});
  }
  const presentation = createGamePresentation({
    pause: () => pause.click(),
    setActive(active) {
      player.dataset.playing = String(active);
      if (active) {
        if (!isModernView(mode.value)) mode.value = 'stage';
        mode.dispatchEvent(new Event('change'));
      } else if (document.fullscreenElement !== player)
        enter.focus({ preventScroll: true });
    },
    ...(supportsFullscreenPointerLock(navigator.userAgent)
      ? { requestFullscreen: () => player.requestFullscreen() }
      : {}),
    exitFullscreen: exitOwnedFullscreen,
    report(message) {
      note.textContent = message;
    },
  });
  for (const { button, target } of controls)
    button.addEventListener('click', () => target.click(), options);
  const controlStatus = document.querySelector<HTMLElement>('#control-status')!;
  const boostStatus = document.querySelector<HTMLElement>('#boost-status')!;
  function sync() {
    for (const { button, target } of controls)
      button.disabled = target.disabled;
    state.textContent = `${controlStatus.textContent} ${boostStatus.textContent}`;
  }
  const observer = new MutationObserver(sync);
  for (const { target } of controls)
    observer.observe(target, {
      attributes: true,
      attributeFilter: ['disabled'],
    });
  for (const target of [controlStatus, boostStatus])
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  enter.disabled = false;
  enter.addEventListener(
    'click',
    () => {
      void presentation.enter();
    },
    options,
  );
  exit.addEventListener('click', () => presentation.leave(), options);
  document.addEventListener(
    'fullscreenchange',
    () => {
      presentation.fullscreenChanged(document.fullscreenElement === player);
      if (!document.fullscreenElement && player.dataset.playing === 'false')
        enter.focus({ preventScroll: true });
    },
    options,
  );
  sync();
  return () => {
    presentation.dispose();
    controller.abort();
    observer.disconnect();
    enter.disabled = true;
  };
}
