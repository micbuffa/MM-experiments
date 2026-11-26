import { describe, expect, it } from 'vitest';
import { DEFAULT_SFX_BANK } from './sfxBank';
import { DEFAULT_SOUND_CUE_RULES } from './soundCues';
import {
  createSynthCueBackend,
  midiToKc,
  type ChipOp,
} from './synthCueBackend';

function fakeSink() {
  const writes: ChipOp[][] = [];
  const queue: { at: number; fn: () => void; cancelled: boolean }[] = [];
  let now = 0;
  return {
    writes,
    sink: {
      write(ops: readonly ChipOp[]) {
        writes.push([...ops]);
      },
      schedule(fn: () => void, ms: number) {
        const job = { at: now + ms, fn, cancelled: false };
        queue.push(job);
        return () => {
          job.cancelled = true;
        };
      },
    },
    advance(ms: number) {
      now += ms;
      for (const job of [...queue]) {
        if (!job.cancelled && job.at <= now) {
          job.cancelled = true;
          job.fn();
        }
      }
    },
  };
}

const rule = DEFAULT_SOUND_CUE_RULES['marble.wallBump'];

describe('createSynthCueBackend', () => {
  it('loads the FM patches on activate', () => {
    const f = fakeSink();
    createSynthCueBackend(DEFAULT_SFX_BANK, f.sink).activate();
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0]!.length).toBe(3 * 25);
  });

  it('renders bumps as a pitched FM hit and releases it later', () => {
    const f = fakeSink();
    const be = createSynthCueBackend(DEFAULT_SFX_BANK, f.sink);
    be.playCue({ cue: 'marble.wallBump', player: 1, intensity: 1 }, rule);
    const cfg = DEFAULT_SFX_BANK.events.impact;
    expect(f.writes[0]).toEqual([
      [0, 0x08, cfg.channel],
      [0, 0x28 + cfg.channel, midiToKc(cfg.baseMidi + cfg.intensitySpan)],
      [0, 0x08, 0x78 | cfg.channel],
    ]);
    f.advance(cfg.durationMs);
    expect(f.writes.at(-1)).toEqual([[0, 0x08, cfg.channel]]);
  });

  it('covers shatter, fall, respawn, catch-up and countdown cues', () => {
    const f = fakeSink();
    const be = createSynthCueBackend(DEFAULT_SFX_BANK, f.sink);
    for (const cue of [
      'marble.shatter',
      'marble.lostOffEdge',
      'marble.respawn',
      'race.catchUp',
      'timer.lowTimeTick',
      'pipe.enter',
    ] as const) {
      be.playCue({ cue, player: 1, intensity: 1 }, rule);
    }
    for (let t = 0; t < 2000; t += 10) f.advance(10);
    const flat = f.writes.flat();
    expect(flat).toContainEqual([
      1,
      0x03,
      DEFAULT_SFX_BANK.events.shatter.pokeyAudc,
    ]);
    expect(flat).toContainEqual([1, 0x03, 0x00]);
    expect(f.writes.length).toBeGreaterThan(20);
    be.stopCue('marble.shatter', 1);
  });

  it('stopAll cancels pending notes and silences its channels', () => {
    const f = fakeSink();
    const be = createSynthCueBackend(DEFAULT_SFX_BANK, f.sink);
    be.playCue({ cue: 'marble.lostOffEdge', player: 1, intensity: 1 }, rule);
    const before = f.writes.length;
    be.stopAll();
    f.advance(5000);
    expect(f.writes.length).toBe(before + 1);
    expect(midiToKc(0)).toBe(midiToKc(12));
  });
});
