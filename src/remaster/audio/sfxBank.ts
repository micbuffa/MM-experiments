export interface FmOpPatch {
  readonly mul: number;
  readonly tl: number;
  readonly ar: number;
  readonly d1r: number;
  readonly d1l: number;
  readonly rr: number;
}

export interface FmChannelPatch {
  readonly channel: number;
  readonly alg: number;
  readonly fb: number;
  readonly ops: readonly [FmOpPatch, FmOpPatch, FmOpPatch, FmOpPatch];
}

export interface RomSfxMappingEntry {
  readonly file: string;
  readonly romCommand?: string;
  readonly romCallSite?: string;
  readonly description?: string;
}

export interface SfxBankV1 {
  readonly format: 'remaster-sfx-bank-v1';
  readonly romSfx?: Readonly<Record<string, RomSfxMappingEntry>>;
  readonly patches: {
    readonly impact: FmChannelPatch;
    readonly chime: FmChannelPatch;
    readonly fall: FmChannelPatch;
    readonly wallBounce?: FmChannelPatch;
    readonly marbleClack?: FmChannelPatch;
  };
  readonly rolling: {
    readonly speedThreshold: number;
    readonly volumeSlope: number;
    readonly maxVolume: number;
    readonly baseAudf: number;
    readonly audfSlope: number;
    readonly minAudf: number;
    readonly maxAudf: number;
  };
  readonly events: {
    readonly impact: {
      readonly channel: number;
      readonly baseMidi: number;
      readonly intensitySpan: number;
      readonly durationMs: number;
    };
    readonly wallBounce?: {
      readonly channel: number;
      readonly baseMidi: number;
      readonly intensitySpan: number;
      readonly durationMs: number;
    };
    readonly marbleClack?: {
      readonly channel: number;
      readonly baseMidi: number;
      readonly intensitySpan: number;
      readonly durationMs: number;
    };
    readonly shatter: {
      readonly pokeyAudf: number;
      readonly pokeyAudc: number;
      readonly pokeyDurationMs: number;
      readonly fmChannel: number;
      readonly fmMidi: number;
      readonly fmDurationMs: number;
    };
    readonly broomSweep?: {
      readonly strokes: readonly number[];
      readonly pokeyAudc: number;
      readonly delayMs: number;
      readonly stepMs: number;
      readonly strokeMs: number;
    };
    readonly dizzy?: {
      readonly channel: number;
      readonly notes: readonly number[];
      readonly stepMs: number;
      readonly durationMs: number;
    };
    readonly fall: {
      readonly channel: number;
      readonly notes: readonly number[];
      readonly stepMs: number;
      readonly durationMs: number;
    };
    readonly respawn: {
      readonly channel: number;
      readonly notes: readonly number[];
      readonly stepMs: number;
      readonly durationMs: number;
    };
    readonly countdownTick: {
      readonly channel: number;
      readonly midi: number;
      readonly durationMs: number;
    };
  };
}

export const DEFAULT_SFX_BANK: SfxBankV1 = {
  format: 'remaster-sfx-bank-v1',
  patches: {
    impact: {
      channel: 4,
      alg: 4,
      fb: 4,
      ops: [
        { mul: 4, tl: 18, ar: 31, d1r: 22, d1l: 12, rr: 14 },
        { mul: 1, tl: 14, ar: 31, d1r: 18, d1l: 12, rr: 14 },
        { mul: 2, tl: 32, ar: 31, d1r: 20, d1l: 12, rr: 14 },
        { mul: 1, tl: 18, ar: 31, d1r: 18, d1l: 12, rr: 14 },
      ],
    },
    chime: {
      channel: 5,
      alg: 5,
      fb: 1,
      ops: [
        { mul: 4, tl: 28, ar: 31, d1r: 12, d1l: 6, rr: 9 },
        { mul: 1, tl: 12, ar: 31, d1r: 10, d1l: 4, rr: 8 },
        { mul: 2, tl: 20, ar: 31, d1r: 12, d1l: 6, rr: 8 },
        { mul: 3, tl: 26, ar: 31, d1r: 14, d1l: 8, rr: 8 },
      ],
    },
    fall: {
      channel: 6,
      alg: 4,
      fb: 0,
      ops: [
        { mul: 2, tl: 44, ar: 28, d1r: 8, d1l: 4, rr: 8 },
        { mul: 1, tl: 16, ar: 28, d1r: 6, d1l: 3, rr: 8 },
        { mul: 1, tl: 50, ar: 28, d1r: 8, d1l: 4, rr: 8 },
        { mul: 1, tl: 20, ar: 28, d1r: 6, d1l: 3, rr: 8 },
      ],
    },
    wallBounce: {
      channel: 7,
      alg: 4,
      fb: 5,
      ops: [
        { mul: 3, tl: 16, ar: 31, d1r: 26, d1l: 14, rr: 15 },
        { mul: 1, tl: 10, ar: 31, d1r: 22, d1l: 13, rr: 15 },
        { mul: 5, tl: 28, ar: 31, d1r: 28, d1l: 14, rr: 15 },
        { mul: 2, tl: 18, ar: 31, d1r: 24, d1l: 14, rr: 15 },
      ],
    },
    marbleClack: {
      channel: 3,
      alg: 2,
      fb: 3,
      ops: [
        { mul: 7, tl: 14, ar: 31, d1r: 28, d1l: 15, rr: 15 },
        { mul: 3, tl: 18, ar: 31, d1r: 26, d1l: 14, rr: 15 },
        { mul: 5, tl: 22, ar: 31, d1r: 25, d1l: 14, rr: 15 },
        { mul: 1, tl: 8, ar: 31, d1r: 23, d1l: 14, rr: 15 },
      ],
    },
  },
  rolling: {
    speedThreshold: 0.4,
    volumeSlope: 0.65,
    maxVolume: 10,
    baseAudf: 230,
    audfSlope: 8,
    minAudf: 100,
    maxAudf: 240,
  },
  events: {
    impact: { channel: 4, baseMidi: 38, intensitySpan: 14, durationMs: 90 },
    wallBounce: { channel: 7, baseMidi: 46, intensitySpan: 12, durationMs: 65 },
    marbleClack: {
      channel: 3,
      baseMidi: 72,
      intensitySpan: 10,
      durationMs: 60,
    },
    shatter: {
      pokeyAudf: 24,
      pokeyAudc: 143,
      pokeyDurationMs: 320,
      fmChannel: 4,
      fmMidi: 32,
      fmDurationMs: 260,
    },
    broomSweep: {
      strokes: [64, 48, 58],
      pokeyAudc: 139,
      delayMs: 360,
      stepMs: 320,
      strokeMs: 170,
    },
    dizzy: {
      channel: 5,
      notes: [82, 87, 82, 87, 80, 85],
      stepMs: 65,
      durationMs: 70,
    },
    fall: {
      channel: 6,
      notes: [81, 77, 73, 69, 65, 61, 57, 53],
      stepMs: 70,
      durationMs: 85,
    },
    respawn: { channel: 5, notes: [64, 76], stepMs: 90, durationMs: 120 },
    countdownTick: { channel: 5, midi: 84, durationMs: 70 },
  },
};

export function parseSfxBank(json: string): SfxBankV1 {
  const data: unknown = JSON.parse(json);
  if (
    !data ||
    typeof data !== 'object' ||
    !('format' in data) ||
    data.format !== 'remaster-sfx-bank-v1' ||
    !('patches' in data) ||
    !('rolling' in data) ||
    !('events' in data)
  ) {
    throw new Error('Format sfx-bank.json invalide.');
  }
  return data as SfxBankV1;
}
