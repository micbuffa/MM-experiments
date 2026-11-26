/**
 * ROM-faithful YM2151 + POKEY sound-cue backend (layer b).
 *
 * Renders backend-agnostic cues (`soundCues.ts`) by replaying the register
 * streams the original 6502 sound program produces for the matching ROM
 * command, with the driver's own per-channel priority and restart rules.
 * The audio-thread side lives in `opm-pokey-worklet.js` (`sfxStreams`).
 */
import {
  commandKey,
  selectCueCommand,
  splitCommandBySlot,
  type RomSfxBankV1,
  type SlotStream,
} from './romSfxBank';
import type { SoundCueBackend, SoundCueId, SoundCueTrigger } from './soundCues';

/** Where accepted streams go (the AudioWorklet port in the browser, a spy in tests). */
export interface RomSfxSink {
  playStreams(streams: readonly SlotStream[], tickSeconds: number): void;
  stopSlots(slots: readonly number[]): void;
}

interface SlotOwner {
  readonly command: number;
  readonly priority: number;
  readonly until: number;
  readonly cue: SoundCueId | null;
  readonly player: 1 | 2 | null;
}

export interface RomSfxBackend extends SoundCueBackend {
  /** Starts one ROM command directly; returns the hardware slots it took. */
  playCommand(
    command: number,
    owner?: { cue: SoundCueId | null; player: 1 | 2 | null },
  ): number[];
  /** Commands bound to a cue (for diagnostics / docs). */
  commandsForCue(cue: SoundCueId): readonly number[];
}

export function createRomSfxBackend(
  bank: RomSfxBankV1,
  sink: RomSfxSink,
  nowSeconds: () => number,
): RomSfxBackend {
  const slots: (SlotOwner | null)[] = new Array<SlotOwner | null>(12).fill(
    null,
  );
  const splitCache = new Map<number, SlotStream[]>();
  const counters = new Map<SoundCueId, number>();

  function streamsOf(command: number): SlotStream[] | null {
    const cached = splitCache.get(command);
    if (cached) return cached;
    const entry = bank.commands[commandKey(command)];
    if (!entry) return null;
    const split = splitCommandBySlot(entry);
    splitCache.set(command, split);
    return split;
  }

  function busy(slot: SlotOwner | null, now: number): slot is SlotOwner {
    return slot !== null && slot.until > now;
  }

  function playCommand(
    command: number,
    owner: { cue: SoundCueId | null; player: 1 | 2 | null } = {
      cue: null,
      player: null,
    },
  ): number[] {
    const entry = bank.commands[commandKey(command)];
    const streams = streamsOf(command);
    if (!entry || !streams) return [];
    const now = nowSeconds();
    if (
      !entry.restartIfPlaying &&
      slots.some((s) => busy(s, now) && s.command === command)
    ) {
      return [];
    }
    // Driver rule (0x8508): a track only takes a busy channel with >= priority.
    const accepted = streams.filter((stream) => {
      const current = slots[stream.slot] ?? null;
      return !busy(current, now) || stream.priority >= current.priority;
    });
    if (accepted.length === 0) return [];
    const until =
      entry.endTick === null
        ? Number.POSITIVE_INFINITY
        : now + entry.endTick * bank.tickSeconds;
    for (const stream of accepted) {
      slots[stream.slot] = {
        command,
        priority: stream.priority,
        until,
        cue: owner.cue,
        player: owner.player,
      };
    }
    sink.playStreams(accepted, bank.tickSeconds);
    return accepted.map((s) => s.slot);
  }

  function stopCue(cue: SoundCueId, player: 1 | 2 | null) {
    const now = nowSeconds();
    const freed: number[] = [];
    slots.forEach((s, slot) => {
      if (
        busy(s, now) &&
        s.cue === cue &&
        (player === null || s.player === null || s.player === player)
      ) {
        freed.push(slot);
        slots[slot] = null;
      }
    });
    if (freed.length === 0) return;
    sink.stopSlots(freed);
    // ROM stop sequences that are themselves sounds (e.g. 0x3B LFO reset).
    for (const stop of bank.cues[cue]?.stopCommands ?? []) {
      if (bank.commands[commandKey(stop)])
        playCommand(stop, { cue: null, player });
    }
  }

  return {
    playCommand,
    commandsForCue(cue) {
      return bank.cues[cue]?.commands ?? [];
    },
    playCue(trigger: SoundCueTrigger) {
      const binding = bank.cues[trigger.cue];
      if (!binding) return; // Arcade has no sound for this cue: stay silent.
      const perPlayer =
        trigger.player !== null
          ? binding.playerCommands?.[String(trigger.player)]
          : undefined;
      const counter = counters.get(trigger.cue) ?? 0;
      counters.set(trigger.cue, counter + 1);
      const command =
        perPlayer?.[0] ?? selectCueCommand(binding, trigger.intensity, counter);
      playCommand(command, { cue: trigger.cue, player: trigger.player });
    },
    stopCue,
    stopAll() {
      const freed: number[] = [];
      slots.forEach((s, slot) => {
        if (s) freed.push(slot);
        slots[slot] = null;
      });
      if (freed.length > 0) sink.stopSlots(freed);
    },
  };
}
