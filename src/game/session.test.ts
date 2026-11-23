import { describe, expect, it } from 'vitest';
import { transitionSession } from './session';
import type { SessionStatus, SessionEvent } from './session';

describe('états du frontend', () => {
  it('charge puis capture après une action explicite', () => {
    const loading = transitionSession('idle', 'load');
    expect(loading).toBe('loading');
    const ready = transitionSession(loading, 'loaded');
    expect(ready).toBe('ready');
    expect(transitionSession(ready, 'capture')).toBe('captured');
  });
  it('suspend de façon idempotente, sans reprise automatique', () => {
    expect(transitionSession('captured', 'interrupt')).toBe('paused');
    expect(transitionSession('ready', 'interrupt')).toBe('paused');
    expect(transitionSession('paused', 'interrupt')).toBe('paused');
    expect(transitionSession('paused', 'capture')).toBe('captured');
  });
  it.each(['idle', 'loading', 'ready', 'captured', 'paused', 'error'] as const)(
    'permet erreur et nettoyage depuis %s',
    (status) => {
      expect(transitionSession(status, 'fail')).toBe('error');
      expect(transitionSession(status, 'clear')).toBe('idle');
    },
  );
  it('autorise un nouvel essai après erreur', () => {
    expect(transitionSession('error', 'load')).toBe('loading');
  });
  it.each<[SessionStatus, SessionEvent]>([
    ['loading', 'load'],
    ['captured', 'load'],
    ['idle', 'loaded'],
    ['idle', 'capture'],
    ['loading', 'capture'],
    ['idle', 'interrupt'],
  ])('ignore la transition invalide %s → %s', (status, event) => {
    expect(transitionSession(status, event)).toBe(status);
  });
});
