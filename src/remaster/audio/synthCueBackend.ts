/**
 * Hand-designed FM "remaster synth" cue backend (layer b alternative).
 *
 * The original remaster sound design from `sfx-bank.json` (FM patches + note
 * macros + POKEY shatter noise), rendered on the same YM2151/POKEY core but
 * not derived from the ROM. Kept as a fallback when `rom-sfx.json` cannot be
 * loaded and as a second implementation of `SoundCueBackend`, proving that a
 * backend can be swapped without touching the cue layer or game code.
 */
import type { FmChannelPatch, SfxBankV1 } from './sfxBank';
import type { SoundCueBackend, SoundCueTrigger } from './soundCues';

/** [chip, reg, val]: chip 0 = SFX YM2151, 1 = SFX POKEY. */
export type ChipOp = readonly [0 | 1, number, number];

export interface SynthCueSink {
  write(ops: readonly ChipOp[]): void;
  /** Schedules `fn` after `ms` milliseconds; returns a cancel handle. */
  schedule(fn: () => void, ms: number): () => void;
}

// YM2151 Key Code helper: MIDI note (e.g. 60 = C4) -> OPM KC byte.
const MIDI_TO_OPM_NOTE = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] as const;

export function midiToKc(midi: number): number {
  const clamped = Math.max(12, Math.min(107, Math.round(midi)));
  const octave = Math.max(0, Math.min(7, Math.floor((clamped - 12) / 12)));
  const note = MIDI_TO_OPM_NOTE[(clamped - 12) % 12]!;
  return (octave << 4) | note;
}

export function loadFmPatch(patch: FmChannelPatch): ChipOp[] {
  const ch = patch.channel & 7;
  const batch: ChipOp[] = [
    [0, 0x20 + ch, (0b11 << 6) | ((patch.fb & 7) << 3) | (patch.alg & 7)],
  ];
  const slotOffsets = [0x00, 0x10, 0x08, 0x18] as const; // M1, C1, M2, C2
  for (let i = 0; i < 4; i++) {
    const o = patch.ops[i]!;
    const s = slotOffsets[i]! + ch;
    batch.push(
      [0, 0x40 + s, o.mul & 0x0f],
      [0, 0x60 + s, o.tl & 0x7f],
      [0, 0x80 + s, o.ar & 0x1f],
      [0, 0xa0 + s, o.d1r & 0x1f],
      [0, 0xc0 + s, 0],
      [0, 0xe0 + s, ((o.d1l & 0x0f) << 4) | (o.rr & 0x0f)],
    );
  }
  return batch;
}

export interface SynthCueBackend extends SoundCueBackend {
  /** (Re)loads the FM patches, e.g. after another backend used the channels. */
  activate(): void;
}

export function createSynthCueBackend(
  bank: SfxBankV1,
  sink: SynthCueSink,
): SynthCueBackend {
  const pending = new Set<() => void>();

  function later(fn: () => void, ms: number) {
    const cancel = sink.schedule(() => {
      pending.delete(cancel);
      fn();
    }, ms);
    pending.add(cancel);
  }

  function note(ch: number, midi: number, durationMs: number) {
    sink.write([
      [0, 0x08, ch],
      [0, 0x28 + ch, midiToKc(midi)],
      [0, 0x08, 0x78 | ch],
    ]);
    later(() => sink.write([[0, 0x08, ch]]), durationMs);
  }

  function sequence(
    ch: number,
    notes: readonly number[],
    stepMs: number,
    durationMs: number,
  ) {
    notes.forEach((n, idx) =>
      later(() => note(ch, n, durationMs), idx * stepMs),
    );
  }

  function playCue(trigger: SoundCueTrigger) {
    const cfg = bank.events;
    switch (trigger.cue) {
      case 'marble.wallBump':
      case 'marble.marbleBump':
      case 'marble.landing':
        note(
          cfg.impact.channel,
          cfg.impact.baseMidi +
            Math.round(trigger.intensity * cfg.impact.intensitySpan),
          cfg.impact.durationMs,
        );
        return;
      case 'marble.shatter':
        sink.write([
          [1, 0x02, cfg.shatter.pokeyAudf],
          [1, 0x03, cfg.shatter.pokeyAudc],
        ]);
        note(
          cfg.shatter.fmChannel,
          cfg.shatter.fmMidi,
          cfg.shatter.fmDurationMs,
        );
        later(() => sink.write([[1, 0x03, 0x00]]), cfg.shatter.pokeyDurationMs);
        return;
      case 'marble.lostOffEdge':
        sequence(
          cfg.fall.channel,
          cfg.fall.notes,
          cfg.fall.stepMs,
          cfg.fall.durationMs,
        );
        return;
      case 'marble.respawn':
        sequence(
          cfg.respawn.channel,
          cfg.respawn.notes,
          cfg.respawn.stepMs,
          cfg.respawn.durationMs,
        );
        return;
      case 'race.catchUp':
        sequence(5, [72, 66, 60], 80, 95);
        return;
      case 'timer.lowTimeTick':
        note(
          cfg.countdownTick.channel,
          cfg.countdownTick.midi,
          cfg.countdownTick.durationMs,
        );
        return;
      default:
        return; // No synth design for this cue yet.
    }
  }

  return {
    activate() {
      sink.write([
        ...loadFmPatch(bank.patches.impact),
        ...loadFmPatch(bank.patches.chime),
        ...loadFmPatch(bank.patches.fall),
      ]);
    },
    playCue,
    stopCue() {
      // Synth cues are short one-shots; nothing to stop.
    },
    stopAll() {
      for (const cancel of pending) cancel();
      pending.clear();
      sink.write([
        [0, 0x08, 4],
        [0, 0x08, 5],
        [0, 0x08, 6],
        [1, 0x03, 0x00],
      ]);
    },
  };
}
