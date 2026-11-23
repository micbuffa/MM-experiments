export interface PresentationHost {
  pause(): void;
  setActive(active: boolean): void;
  requestFullscreen?: () => Promise<void>;
  exitFullscreen(): void;
  report(message: string): void;
}

export function isModernView(mode: string) {
  return mode === 'modern' || mode === 'modern-compare';
}

export function togglePracticeView(mode: string, compare: boolean) {
  if (compare) return mode === 'modern-compare' ? 'direct' : 'modern-compare';
  if (mode === 'modern') return 'modern-compare';
  return mode === 'modern-compare' ? 'direct' : 'modern';
}

/** Owns presentation transitions; fullscreen never resumes the arcade session. */
export function createGamePresentation(host: PresentationHost) {
  let active = false;
  let native = false;
  let disposed = false;
  let epoch = 0;
  function leave() {
    if (!active) return;
    epoch++;
    active = native = false;
    host.pause();
    host.setActive(false);
    host.exitFullscreen();
  }
  return {
    async enter() {
      if (disposed || active) return;
      active = true;
      const attempt = ++epoch;
      host.pause();
      host.setActive(true);
      if (!host.requestFullscreen) {
        host.report(
          'Safari : vue immersive dans la fenêtre pour permettre la capture. Crédit → Start → Capturer.',
        );
        return;
      }
      host.report('Crédit → Start → Capturer. Espace : boost · Échap : pause.');
      try {
        await host.requestFullscreen();
        if (attempt !== epoch && !active) host.exitFullscreen();
      } catch {
        if (attempt === epoch)
          host.report(
            'Plein écran indisponible : vue immersive dans la fenêtre. Crédit → Start → Capturer.',
          );
      }
    },
    fullscreenChanged(owned: boolean) {
      if (!active || disposed) return;
      if (owned) native = true;
      else if (native) leave();
    },
    leave,
    dispose() {
      leave();
      disposed = true;
    },
  };
}
