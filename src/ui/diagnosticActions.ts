/** Actions locales : les mesures ne sont envoyées à aucun serveur. */
export function bindDiagnosticActions(
  read: () => string,
  reset: () => boolean,
  signal: AbortSignal,
): void {
  const feedback = document.querySelector<HTMLElement>(
    '#diagnostic-action-status',
  )!;
  document
    .querySelector<HTMLButtonElement>('#copy-diagnostics')!
    .addEventListener(
      'click',
      () => {
        void (async () => {
          try {
            await navigator.clipboard.writeText(read());
            if (!signal.aborted)
              feedback.textContent =
                'Diagnostics copiés. Vous pouvez les coller dans la discussion.';
          } catch {
            if (!signal.aborted)
              feedback.textContent =
                'Copie indisponible : sélectionner et copier manuellement le texte des diagnostics ci-dessous.';
          }
        })();
      },
      { signal },
    );
  document.querySelector<HTMLButtonElement>('#reset-metrics')!.addEventListener(
    'click',
    () => {
      if (reset())
        feedback.textContent =
          'Essai prêt : Capturer → faire une accélération → Échap → Copier les diagnostics. Le mouvement le plus fort sera conservé. Gain et partie inchangés.';
    },
    { signal },
  );
}
