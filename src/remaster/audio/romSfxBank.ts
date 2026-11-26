/**
 * ROM-faithful SFX data (layer b, YM2151 + POKEY backend only).
 *
 * `public/assets/audio/rom-sfx.json` is derived from the Marble Madness 6502
 * sound program (136033.421/.422): every "start sound" command captured as a
 * tick-quantized YM2151/POKEY register-write stream, plus the bindings from
 * backend-agnostic sound cues (see `soundCues.ts`) to ROM command numbers.
 * Nothing in here is required by game code; a future backend replaces this file.
 */

/** One register write: [tick, chip (0 = YM2151, 1 = POKEY), register, value]. */
export type RomRegisterWrite = readonly [number, 0 | 1, number, number];

export interface RomSfxTrack {
  /** Sound-driver channel: 0..3 = POKEY channel 1..4, 4..11 = YM2151 channel 0..7. */
  readonly driverChannel: number;
  /** Driver priority (0x9cb1 table): a new track only steals a busy channel with >= priority. */
  readonly priority: number;
  readonly scriptAddr: number;
}

export interface RomSfxCommand {
  readonly command: number;
  readonly name: string;
  /** Driver `restartIfPlaying` flag (0x9c6a table): false = ignore while already playing. */
  readonly restartIfPlaying: boolean;
  readonly tracks: readonly RomSfxTrack[];
  /** Tick at which every voice was released, or null when the sound loops until stopped. */
  readonly endTick: number | null;
  readonly writes: readonly RomRegisterWrite[];
}

/** Cue → ROM command binding. `commands` with several entries is an intensity ladder (soft → hard). */
export interface RomCueBinding {
  readonly commands: readonly number[];
  /** Per-player override (e.g. goal: P1 0x2F, P2 0x30), keyed "1" / "2". */
  readonly playerCommands?: Readonly<Record<string, readonly number[]>>;
  /**
   * ROM commands the 68010 sends to stop the cue. Type-4 "stop" commands are
   * documentation only (the backend silences the slots itself); entries that
   * are sounds in `commands` (e.g. 0x3B) are played after the stop.
   */
  readonly stopCommands?: readonly number[];
  /** Round-robin through `commands` instead of selecting by intensity. */
  readonly roundRobin?: boolean;
  readonly note?: string;
}

export interface RomSfxBankV1 {
  readonly format: 'marble-rom-sfx-v1';
  /** Seconds per sound-driver tick (YM2151 timer A, 7168 CPU cycles @ 1.789772 MHz). */
  readonly tickSeconds: number;
  readonly commands: Readonly<Record<string, RomSfxCommand>>;
  readonly cues: Readonly<Record<string, RomCueBinding>>;
}

/** Hardware slot of a driver channel in the SFX chips (0..7 YM2151, 8..11 POKEY). */
export function slotForDriverChannel(driverChannel: number): number {
  if (driverChannel >= 4 && driverChannel <= 11) return driverChannel - 4;
  if (driverChannel >= 0 && driverChannel <= 3) return 8 + driverChannel;
  throw new Error(`Invalid sound-driver channel ${driverChannel}`);
}

/** YM2151 global registers (test/LFO reset, noise, LFO frequency/depth, CT/waveform). */
const OPM_GLOBAL_REGS = new Set([0x01, 0x0f, 0x18, 0x19, 0x1b]);

/**
 * Returns the hardware slot a write belongs to, `'global'` for shared chip
 * registers, or null for writes that must not be forwarded (timer registers).
 * POKEY AUDF of a 16-bit join partner is attributed to the low channel; the
 * caller keeps it for the owning stream.
 */
export function slotOfWrite(write: RomRegisterWrite): number | 'global' | null {
  const [, chip, reg, val] = write;
  if (chip === 0) {
    if (reg === 0x08) return val & 7;
    if (reg >= 0x20) return reg & 7;
    if (OPM_GLOBAL_REGS.has(reg)) return 'global';
    return null;
  }
  if (reg < 8) return 8 + (reg >> 1);
  if (reg === 8) return 'global';
  return null;
}

export interface SlotStream {
  readonly slot: number;
  readonly priority: number;
  /** Flattened [tick, chip, reg, val]* ready to transfer to the worklet. */
  readonly writes: Uint16Array;
  readonly lastTick: number;
}

/**
 * Splits a command capture into one stream per owned hardware slot. Writes the
 * driver made to slots the command does not own (its periodic POKEY refresh of
 * idle channels) are dropped so concurrent cues do not stomp each other; global
 * writes travel with the first owned slot of the matching chip.
 */
export function splitCommandBySlot(cmd: RomSfxCommand): SlotStream[] {
  const owned = new Map<number, number>();
  for (const t of cmd.tracks) {
    owned.set(slotForDriverChannel(t.driverChannel), t.priority);
  }
  const slots = [...owned.keys()].sort((a, b) => a - b);
  const firstOpm = slots.find((s) => s < 8);
  const firstPokey = slots.find((s) => s >= 8);
  // POKEY 16-bit joins: AUDF of the low partner belongs to the high channel's stream.
  const pokeyPartner = new Map<number, number>();
  for (const s of slots) {
    if (s === 9 && !owned.has(8)) pokeyPartner.set(8, 9);
    if (s === 11 && !owned.has(10)) pokeyPartner.set(10, 11);
  }
  const buckets = new Map<number, number[]>();
  for (const s of slots) buckets.set(s, []);
  for (const w of cmd.writes) {
    const raw = slotOfWrite(w);
    if (raw === null) continue;
    let target: number | undefined;
    if (raw === 'global') {
      target = w[1] === 0 ? firstOpm : firstPokey;
    } else if (owned.has(raw)) {
      target = raw;
    } else if (w[1] === 1 && (w[2] & 1) === 0) {
      // Only the AUDF (even register) of a 16-bit join partner is meaningful.
      target = pokeyPartner.get(raw);
    }
    if (target === undefined) continue;
    buckets.get(target)!.push(w[0], w[1], w[2], w[3]);
  }
  return slots.map((slot) => {
    const flat = buckets.get(slot)!;
    return {
      slot,
      priority: owned.get(slot)!,
      writes: Uint16Array.from(flat),
      lastTick: flat.length > 0 ? flat[flat.length - 4]! : 0,
    };
  });
}

/** Picks the command for a cue: intensity ladder (0..1) or round-robin counter. */
export function selectCueCommand(
  binding: RomCueBinding,
  intensity: number,
  counter: number,
): number {
  const list = binding.commands;
  if (list.length === 0) throw new Error('Cue binding without commands');
  if (binding.roundRobin) return list[Math.abs(counter) % list.length]!;
  const clamped = Math.max(
    0,
    Math.min(1, Number.isFinite(intensity) ? intensity : 0),
  );
  const index = Math.min(list.length - 1, Math.floor(clamped * list.length));
  return list[index]!;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isByte(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xff;
}

/** Validates the shipped JSON; throws with a precise message on malformed data. */
export function parseRomSfxBank(json: string): RomSfxBankV1 {
  const data: unknown = JSON.parse(json);
  if (!isRecord(data) || data.format !== 'marble-rom-sfx-v1') {
    throw new Error('rom-sfx.json: unknown format');
  }
  if (typeof data.tickSeconds !== 'number' || !(data.tickSeconds > 0)) {
    throw new Error('rom-sfx.json: invalid tickSeconds');
  }
  if (!isRecord(data.commands) || !isRecord(data.cues)) {
    throw new Error('rom-sfx.json: missing commands or cues');
  }
  for (const [key, raw] of Object.entries(data.commands)) {
    if (!isRecord(raw) || !isByte(raw.command) || !Array.isArray(raw.tracks)) {
      throw new Error(`rom-sfx.json: invalid command ${key}`);
    }
    if (!Array.isArray(raw.writes)) {
      throw new Error(`rom-sfx.json: command ${key} has no writes`);
    }
    for (const t of raw.tracks) {
      if (!isRecord(t) || !Number.isInteger(t.driverChannel)) {
        throw new Error(`rom-sfx.json: invalid track in ${key}`);
      }
      slotForDriverChannel(t.driverChannel as number);
    }
    for (const w of raw.writes) {
      if (
        !Array.isArray(w) ||
        w.length !== 4 ||
        !Number.isInteger(w[0]) ||
        (w[1] !== 0 && w[1] !== 1) ||
        !isByte(w[2]) ||
        !isByte(w[3])
      ) {
        throw new Error(`rom-sfx.json: invalid write in ${key}`);
      }
    }
  }
  for (const [cue, raw] of Object.entries(data.cues)) {
    if (
      !isRecord(raw) ||
      !Array.isArray(raw.commands) ||
      raw.commands.length === 0
    ) {
      throw new Error(`rom-sfx.json: invalid binding for ${cue}`);
    }
    const perPlayer = isRecord(raw.playerCommands)
      ? Object.values(raw.playerCommands)
      : [];
    const refs = [
      ...(raw.commands as unknown[]),
      ...(Array.isArray(raw.stopCommands)
        ? (raw.stopCommands as unknown[])
        : []),
    ];
    for (const list of perPlayer) {
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`rom-sfx.json: invalid playerCommands in ${cue}`);
      }
      refs.push(...(list as unknown[]));
    }
    for (const c of refs) {
      if (!isByte(c))
        throw new Error(`rom-sfx.json: invalid command ref in ${cue}`);
    }
    for (const c of [
      ...(raw.commands as number[]),
      ...perPlayer.flat(),
    ] as number[]) {
      if (!(commandKey(c) in data.commands)) {
        throw new Error(
          `rom-sfx.json: ${cue} references missing command ${commandKey(c)}`,
        );
      }
    }
  }
  return data as unknown as RomSfxBankV1;
}

export function commandKey(command: number): string {
  return command.toString(16).padStart(2, '0');
}
