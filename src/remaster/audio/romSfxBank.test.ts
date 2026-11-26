import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  commandKey,
  parseRomSfxBank,
  selectCueCommand,
  slotForDriverChannel,
  slotOfWrite,
  splitCommandBySlot,
  type RomSfxCommand,
} from './romSfxBank';
import { SOUND_CUE_IDS } from './soundCues';

const shipped = () =>
  readFileSync(
    resolve(process.cwd(), 'public/assets/audio/rom-sfx.json'),
    'utf8',
  );

function minimalBank(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: 'marble-rom-sfx-v1',
    tickSeconds: 0.004,
    commands: {
      '34': {
        command: 0x34,
        name: 'wall bump',
        restartIfPlaying: true,
        tracks: [{ driverChannel: 10, priority: 9, scriptAddr: 0xa376 }],
        endTick: 10,
        writes: [[1, 0, 0x08, 0x06]],
      },
    },
    cues: { 'marble.wallBump': { commands: [0x34] } },
    ...overrides,
  });
}

describe('rom-sfx.json (shipped)', () => {
  const bank = parseRomSfxBank(shipped());

  it('binds the core gameplay cues to the ROM commands found in the 68010', () => {
    const cmd = (cue: string) => bank.cues[cue]?.commands;
    expect(cmd('marble.wallBump')).toEqual([0x34]);
    expect(cmd('marble.marbleBump')).toEqual([0x37]);
    expect(cmd('marble.enemyMarbleBump')).toEqual([0x32]);
    expect(cmd('marble.airborne')).toEqual([0x45]);
    expect(cmd('marble.landing')).toEqual([0x5d]);
    expect(cmd('marble.shatter')).toEqual([0x38]);
    expect(cmd('marble.acidMelt')).toEqual([0x5e]);
    expect(cmd('marble.lostOffEdge')).toEqual([0x3d]);
    expect(cmd('pipe.enter')).toEqual([0x35, 0x36]);
    expect(bank.cues['goal.arrive']?.playerCommands).toEqual({
      '1': [0x2f],
      '2': [0x30],
    });
    expect(cmd('race.gameOver')).toEqual([0x3f]);
  });

  it('only binds cue ids the backend-agnostic layer knows', () => {
    const known = new Set<string>(SOUND_CUE_IDS);
    for (const cue of Object.keys(bank.cues)) expect(known.has(cue)).toBe(true);
    // Cues the arcade leaves silent stay unbound on purpose.
    expect(bank.cues['timer.lowTimeTick']).toBeUndefined();
    expect(bank.cues['marble.respawn']).toBeUndefined();
  });

  it('keeps every captured stream ordered, on owned slots and in byte range', () => {
    for (const entry of Object.values(bank.commands)) {
      let lastTick = 0;
      for (const [tick] of entry.writes) {
        expect(tick).toBeGreaterThanOrEqual(lastTick);
        lastTick = tick;
      }
      for (const stream of splitCommandBySlot(entry)) {
        expect(stream.writes.length % 4).toBe(0);
        expect(stream.writes.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('romSfxBank helpers', () => {
  it('maps driver channels to SFX chip slots', () => {
    expect(slotForDriverChannel(4)).toBe(0);
    expect(slotForDriverChannel(11)).toBe(7);
    expect(slotForDriverChannel(0)).toBe(8);
    expect(slotForDriverChannel(3)).toBe(11);
    expect(() => slotForDriverChannel(12)).toThrow();
  });

  it('attributes register writes to slots', () => {
    expect(slotOfWrite([0, 0, 0x08, 0x7e])).toBe(6);
    expect(slotOfWrite([0, 0, 0x2e, 0x15])).toBe(6);
    expect(slotOfWrite([0, 0, 0x18, 0xca])).toBe('global');
    expect(slotOfWrite([0, 0, 0x14, 0x15])).toBeNull();
    expect(slotOfWrite([0, 1, 0x07, 0x8a])).toBe(11);
    expect(slotOfWrite([0, 1, 0x08, 0x50])).toBe('global');
    expect(slotOfWrite([0, 1, 0x0f, 0x00])).toBeNull();
  });

  it('drops writes to channels the command does not own', () => {
    const cmd: RomSfxCommand = {
      command: 0x60,
      name: 'test',
      restartIfPlaying: true,
      tracks: [{ driverChannel: 3, priority: 8, scriptAddr: 0 }],
      endTick: 4,
      writes: [
        [0, 1, 0x00, 0x11], // AUDF1: not owned
        [0, 1, 0x04, 0x22], // AUDF3: join partner of channel 4
        [0, 1, 0x05, 0x33], // AUDC3: not owned (only AUDF of partner kept)
        [0, 1, 0x06, 0x44], // AUDF4: owned
        [0, 1, 0x08, 0x58], // AUDCTL: global -> first POKEY slot
        [1, 0, 0x18, 0xca], // YM global without an owned YM slot: dropped
        [2, 1, 0x07, 0x8a], // AUDC4: owned
      ],
    };
    const [stream] = splitCommandBySlot(cmd);
    expect(stream!.slot).toBe(11);
    expect(Array.from(stream!.writes)).toEqual([
      0, 1, 0x04, 0x22, 0, 1, 0x06, 0x44, 0, 1, 0x08, 0x58, 2, 1, 0x07, 0x8a,
    ]);
    expect(stream!.lastTick).toBe(2);
  });

  it('selects commands by intensity ladder or round robin', () => {
    const ladder = { commands: [1, 2, 3] };
    expect(selectCueCommand(ladder, 0, 0)).toBe(1);
    expect(selectCueCommand(ladder, 0.5, 0)).toBe(2);
    expect(selectCueCommand(ladder, 1, 0)).toBe(3);
    expect(selectCueCommand(ladder, Number.NaN, 0)).toBe(1);
    const rr = { commands: [7, 8], roundRobin: true };
    expect([0, 1, 2].map((n) => selectCueCommand(rr, 1, n))).toEqual([7, 8, 7]);
    expect(() => selectCueCommand({ commands: [] }, 0, 0)).toThrow();
    expect(commandKey(0x5)).toBe('05');
  });

  it('rejects malformed banks with precise errors', () => {
    expect(() => parseRomSfxBank('{"format":"x"}')).toThrow(/format/);
    expect(() => parseRomSfxBank(minimalBank({ tickSeconds: 0 }))).toThrow(
      /tickSeconds/,
    );
    expect(() => parseRomSfxBank(minimalBank({ cues: null }))).toThrow(
      /missing/,
    );
    expect(() =>
      parseRomSfxBank(
        minimalBank({ cues: { 'marble.wallBump': { commands: [0x99] } } }),
      ),
    ).toThrow(/missing command 99/);
    expect(() =>
      parseRomSfxBank(
        minimalBank({
          cues: {
            'goal.arrive': { commands: [0x34], playerCommands: { 1: [] } },
          },
        }),
      ),
    ).toThrow(/playerCommands/);
    expect(() =>
      parseRomSfxBank(
        minimalBank({
          commands: {
            '34': {
              command: 0x34,
              tracks: [{ driverChannel: 10 }],
              writes: [[0, 2, 0, 0]],
            },
          },
        }),
      ),
    ).toThrow(/invalid write/);
    expect(() =>
      parseRomSfxBank(
        minimalBank({
          commands: { '34': { command: 0x34, tracks: [], writes: 3 } },
        }),
      ),
    ).toThrow(/no writes/);
    expect(() =>
      parseRomSfxBank(
        minimalBank({
          commands: { '34': { command: 0x34, tracks: [{}], writes: [] } },
        }),
      ),
    ).toThrow(/invalid track/);
    expect(() =>
      parseRomSfxBank(minimalBank({ commands: { '34': { command: 300 } } })),
    ).toThrow(/invalid command/);
    expect(() =>
      parseRomSfxBank(
        minimalBank({ cues: { 'marble.wallBump': { commands: ['x'] } } }),
      ),
    ).toThrow(/invalid command ref/);
    expect(() =>
      parseRomSfxBank(minimalBank({ cues: { 'marble.wallBump': {} } })),
    ).toThrow(/invalid binding/);
  });
});
