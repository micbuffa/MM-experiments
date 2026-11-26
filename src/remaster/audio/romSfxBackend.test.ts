import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRomSfxBackend, type RomSfxSink } from './romSfxBackend';
import {
  parseRomSfxBank,
  type RomSfxBankV1,
  type SlotStream,
} from './romSfxBank';
import { DEFAULT_SOUND_CUE_RULES } from './soundCues';

function makeBank(): RomSfxBankV1 {
  const cmd = (
    command: number,
    driverChannel: number,
    priority: number,
    restartIfPlaying = true,
    endTick: number | null = 10,
  ) => ({
    command,
    name: `cmd ${command}`,
    restartIfPlaying,
    tracks: [{ driverChannel, priority, scriptAddr: 0 }],
    endTick,
    writes: [
      [
        0,
        driverChannel >= 4 ? 0 : 1,
        driverChannel >= 4 ? 0x08 : 1,
        driverChannel >= 4 ? driverChannel - 4 : 0,
      ],
    ] as [number, 0 | 1, number, number][],
  });
  return parseRomSfxBank(
    JSON.stringify({
      format: 'marble-rom-sfx-v1',
      tickSeconds: 0.01,
      commands: {
        '34': cmd(0x34, 10, 9),
        '37': cmd(0x37, 10, 7),
        '38': cmd(0x38, 10, 9),
        '2f': cmd(0x2f, 9, 13, false),
        '30': cmd(0x30, 9, 13, false),
        '39': cmd(0x39, 9, 5, true, null),
        '3b': cmd(0x3b, 9, 6, false, 4),
        '5d': cmd(0x5d, 0, 8),
      },
      cues: {
        'marble.wallBump': { commands: [0x34] },
        'marble.marbleBump': { commands: [0x37] },
        'marble.shatter': { commands: [0x38] },
        'marble.landing': { commands: [0x5d] },
        'goal.arrive': {
          commands: [0x2f],
          playerCommands: { '1': [0x2f], '2': [0x30] },
        },
        'marble.dazed': { commands: [0x39], stopCommands: [0x3a, 0x3b] },
      },
    }),
  );
}

function makeSink() {
  const played: { slots: number[]; tick: number }[] = [];
  const stopped: number[][] = [];
  const sink: RomSfxSink = {
    playStreams(streams: readonly SlotStream[], tick: number) {
      played.push({ slots: streams.map((s) => s.slot), tick });
    },
    stopSlots(slots) {
      stopped.push([...slots]);
    },
  };
  return { sink, played, stopped };
}

const rule = DEFAULT_SOUND_CUE_RULES['marble.wallBump'];

describe('createRomSfxBackend', () => {
  it('lets a track steal a busy channel only with >= driver priority', () => {
    let now = 0;
    const { sink, played } = makeSink();
    const be = createRomSfxBackend(makeBank(), sink, () => now);
    expect(be.playCommand(0x34)).toEqual([6]);
    now = 0.05;
    expect(be.playCommand(0x37)).toEqual([]); // priority 7 < 9
    expect(be.playCommand(0x38)).toEqual([6]); // priority 9 >= 9
    now = 1; // channel free again (endTick 10 * 0.01 s)
    expect(be.playCommand(0x37)).toEqual([6]);
    expect(played.map((p) => p.tick)).toEqual([0.01, 0.01, 0.01]);
  });

  it('honours the driver restart flag and per-player cue commands', () => {
    let now = 0;
    const { sink, played } = makeSink();
    const be = createRomSfxBackend(makeBank(), sink, () => now);
    be.playCue({ cue: 'goal.arrive', player: 1, intensity: 1 }, rule);
    be.playCue({ cue: 'goal.arrive', player: 1, intensity: 1 }, rule);
    expect(played).toHaveLength(1); // 0x2F does not restart while playing
    now = 0.2;
    be.playCue({ cue: 'goal.arrive', player: 2, intensity: 1 }, rule);
    expect(played).toHaveLength(2); // 0x30, same channel, same priority
    expect(be.commandsForCue('goal.arrive')).toEqual([0x2f]);
    expect(be.commandsForCue('pipe.exit')).toEqual([]);
  });

  it('stays silent for cues the arcade does not voice', () => {
    const { sink, played } = makeSink();
    const be = createRomSfxBackend(makeBank(), sink, () => 0);
    be.playCue({ cue: 'timer.lowTimeTick', player: null, intensity: 1 }, rule);
    expect(played).toHaveLength(0);
    expect(be.playCommand(0x99)).toEqual([]);
  });

  it('stops a looping cue, then plays its ROM clean-up sound', () => {
    const { sink, played, stopped } = makeSink();
    const be = createRomSfxBackend(makeBank(), sink, () => 0);
    be.playCue({ cue: 'marble.dazed', player: 1, intensity: 1 }, rule);
    be.stopCue('marble.wallBump', 1); // nothing owned: no-op
    expect(stopped).toEqual([]);
    be.stopCue('marble.dazed', 2); // other player's cue on a shared channel
    expect(stopped).toEqual([]);
    be.stopCue('marble.dazed', 1);
    expect(stopped).toEqual([[5]]);
    // 0x3A is a type-4 stop (not a stream); 0x3B is played as clean-up.
    expect(played.map((p) => p.slots)).toEqual([[5], [5]]);
  });

  it('stopAll silences every slot it owns', () => {
    const { sink, stopped } = makeSink();
    const be = createRomSfxBackend(makeBank(), sink, () => 0);
    be.stopAll();
    expect(stopped).toEqual([]);
    be.playCommand(0x34);
    be.playCommand(0x5d);
    be.stopAll();
    expect(stopped).toEqual([[6, 8]]);
  });

  it('plays every shipped cue binding without errors', () => {
    const bank = parseRomSfxBank(
      readFileSync(
        resolve(process.cwd(), 'public/assets/audio/rom-sfx.json'),
        'utf8',
      ),
    );
    let now = 0;
    const { sink, played } = makeSink();
    const be = createRomSfxBackend(bank, sink, () => now);
    for (const cue of Object.keys(bank.cues)) {
      now += 100;
      be.playCue(
        {
          cue: cue as keyof typeof DEFAULT_SOUND_CUE_RULES,
          player: 1,
          intensity: 0.5,
        },
        rule,
      );
    }
    expect(played.length).toBe(Object.keys(bank.cues).length);
    expect(played.every((p) => p.slots.length > 0)).toBe(true);
  });
});
