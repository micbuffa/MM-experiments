export function mountGameHelp(options: AddEventListenerOptions) {
  const button =
    document.querySelector<HTMLButtonElement>('#toggle-game-help')!;
  const panel = document.getElementById('game-help')!;
  const player2 = document.getElementById('game-help-player2')!;
  const directions = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '#player-inputs [data-direction]',
    ),
  );
  function setVisible(visible: boolean) {
    if (visible) {
      player2.textContent =
        directions
          .map((direction) =>
            (direction.dataset.key ?? '')
              .replace('ArrowUp', '↑')
              .replace('ArrowLeft', '←')
              .replace('ArrowDown', '↓')
              .replace('ArrowRight', '→')
              .toUpperCase(),
          )
          .filter(Boolean)
          .join(' / ') || 'Clavier désactivé';
    }
    panel.hidden = !visible;
    button.setAttribute('aria-expanded', String(visible));
  }
  button.disabled = false;
  button.addEventListener(
    'click',
    () => setVisible(panel.hidden === true),
    options,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key.toLowerCase() !== 'h' ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.isComposing ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, textarea, select, [contenteditable], [data-direction]',
          ))
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) setVisible(panel.hidden === true);
    },
    { ...options, capture: true },
  );
  return () => {
    setVisible(false);
    button.disabled = true;
  };
}
