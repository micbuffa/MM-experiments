import { describe, expect, it, vi } from 'vitest';
import type { RemasterEvent } from '../engine/remasterSimulation';
import {
  createSoundCueDispatcher,
  cuesForEvent,
  DEFAULT_SOUND_CUE_RULES,
  SOUND_CUE_IDS,
  type SoundCueBackend,
} from './soundCues';

function spyBackend() {
  const calls: string[] = [];
  const backend: SoundCueBackend = {
    playCue: vi.fn((t) => {
      calls.push(`play ${t.cue} p${t.player ?? 0} ${t.intensity}`);
    }),
    stopCue: vi.fn((cue, player) => {
      calls.push(`stop ${cue} p${player ?? 0}`);
    }),
    stopAll: vi.fn(),
  };
  return { backend, calls };
}

describe('cuesForEvent', () => {
  it('maps every simulation event type to backend-agnostic cues', () => {
    const cases: [RemasterEvent, string[]][] = [
      [{ type: 'start' }, ['race.start']],
      [
        { type: 'bump', player: 1, target: 'wall', intensity: 0.4 },
        ['marble.wallBump'],
      ],
      [
        { type: 'bump', player: 2, target: 'marble', intensity: 0.4 },
        ['marble.marbleBump'],
      ],
      [{ type: 'airborne', player: 1 }, ['marble.airborne']],
      [{ type: 'land', player: 1, intensity: 0.3 }, ['marble.landing']],
      [{ type: 'shatter', player: 1 }, ['marble.landing', 'marble.shatter']],
      [{ type: 'fall', player: 2 }, ['marble.lostOffEdge']],
      [{ type: 'respawn', player: 1 }, ['marble.respawn']],
      [{ type: 'catchUp', player: 2, penaltySeconds: 5 }, ['race.catchUp']],
      [{ type: 'goal', player: 2, timeBonus: 0 }, ['goal.arrive']],
      [{ type: 'countdownTick', remainingSeconds: 3 }, ['timer.lowTimeTick']],
      [{ type: 'gameOver' }, ['race.gameOver']],
      [{ type: 'impact', player: 1, intensity: 0.5 }, []],
    ];
    for (const [event, cues] of cases) {
      expect(cuesForEvent(event).map((t) => t.cue)).toEqual(cues);
    }
    expect(
      cuesForEvent({ type: 'bump', player: 2, target: 'wall', intensity: 0.7 }),
    ).toEqual([{ cue: 'marble.wallBump', player: 2, intensity: 0.7 }]);
  });

  it('has one rule per cue id, each naming its trigger', () => {
    expect(Object.keys(DEFAULT_SOUND_CUE_RULES).sort()).toEqual(
      [...SOUND_CUE_IDS].sort(),
    );
    for (const id of SOUND_CUE_IDS) {
      expect(DEFAULT_SOUND_CUE_RULES[id].trigger.length).toBeGreaterThan(0);
    }
  });
});

describe('createSoundCueDispatcher', () => {
  it('enforces cooldowns per player and intensity floors', () => {
    const { backend } = spyBackend();
    const d = createSoundCueDispatcher(backend);
    const bump = (player: 1 | 2, intensity: number) => ({
      cue: 'marble.wallBump' as const,
      player,
      intensity,
    });
    expect(d.dispatch([bump(1, 0.5)], 0)).toHaveLength(1);
    // Same player inside the cooldown: dropped; other player: accepted.
    expect(d.dispatch([bump(1, 0.5), bump(2, 0.5)], 0.05)).toEqual([
      bump(2, 0.5),
    ]);
    expect(d.dispatch([bump(1, 0.5)], 0.2)).toHaveLength(1);
    // Below the floor: ignored without consuming the cooldown.
    expect(d.dispatch([bump(1, 0.01)], 1)).toHaveLength(0);
    expect(d.dispatch([bump(1, 0.5)], 1)).toHaveLength(1);
    d.reset();
    expect(d.dispatch([bump(1, 0.5)], 1.01)).toHaveLength(1);
  });

  it('applies global cooldowns to non per-player cues and sorts by priority', () => {
    const { backend } = spyBackend();
    const d = createSoundCueDispatcher(backend);
    const out = d.dispatch(
      [
        { cue: 'marble.marbleBump', player: 1, intensity: 1 },
        { cue: 'race.gameOver', player: null, intensity: 1 },
        { cue: 'marble.marbleBump', player: 2, intensity: 1 },
      ],
      0,
    );
    expect(out.map((t) => t.cue)).toEqual([
      'race.gameOver',
      'marble.marbleBump',
    ]);
  });

  it('stops superseded cues before playing (landing ends the fall sound)', () => {
    const { backend, calls } = spyBackend();
    const d = createSoundCueDispatcher(backend);
    d.handleEvents([{ type: 'airborne', player: 1 }], 0);
    d.handleEvents([{ type: 'land', player: 1, intensity: 0.25 }], 1);
    expect(calls).toEqual([
      'play marble.airborne p1 1',
      'stop marble.airborne p1',
      'play marble.landing p1 0.25',
    ]);
  });
});
