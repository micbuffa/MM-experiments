/** États du frontend, indépendants des états internes du programme arcade. */
export type SessionStatus =
  'idle' | 'loading' | 'ready' | 'captured' | 'paused' | 'error';
export type SessionEvent =
  'load' | 'loaded' | 'capture' | 'interrupt' | 'fail' | 'clear';

/** Réducteur de référence non branché : aucun effet sur un cœur ou Pointer Lock. */
export function transitionSession(
  status: SessionStatus,
  event: SessionEvent,
): SessionStatus {
  if (event === 'clear') return 'idle';
  if (event === 'fail') return 'error';
  switch (event) {
    case 'load':
      return status === 'idle' || status === 'error' ? 'loading' : status;
    case 'loaded':
      return status === 'loading' ? 'ready' : status;
    case 'capture':
      return status === 'ready' || status === 'paused' ? 'captured' : status;
    case 'interrupt':
      return status === 'captured' || status === 'ready' ? 'paused' : status;
  }
}
