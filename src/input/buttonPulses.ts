export type ArcadePlayer = 0 | 1;
export type ArcadeButton = 2 | 3; // SELECT/crédit et START, vérifiés dans EmulatorJS/RetroArch.

export function createButtonPulses(
  send: (button: ArcadeButton, down: 0 | 1) => void,
) {
  const timers = new Map<ArcadeButton, ReturnType<typeof setTimeout>>();
  return {
    pulse(button: ArcadeButton) {
      if (timers.has(button)) return;
      send(button, 1);
      timers.set(
        button,
        setTimeout(() => {
          send(button, 0);
          timers.delete(button);
        }, 120),
      );
    },
    releaseAll() {
      for (const [button, timer] of timers) {
        clearTimeout(timer);
        send(button, 0);
      }
      timers.clear();
    },
    get held() {
      return [...timers.keys()];
    },
  };
}
