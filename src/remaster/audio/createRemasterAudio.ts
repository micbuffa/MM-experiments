import type { RemasterEvent } from '../engine/remasterSimulation';
import { parseVgm, type ParsedVgm } from './vgmParser';

// YM2151 Key Code helper: MIDI note (e.g. 60 = C4) -> OPM KC byte.
const MIDI_TO_OPM_NOTE = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] as const;

function midiToKc(midi: number): number {
  const clamped = Math.max(12, Math.min(107, Math.round(midi)));
  const octave = Math.max(0, Math.min(7, Math.floor((clamped - 12) / 12)));
  const note = MIDI_TO_OPM_NOTE[(clamped - 12) % 12]!;
  return (octave << 4) | note;
}

type ChipOp = readonly [0 | 1, number, number]; // 0=OPM, 1=POKEY

function loadFmPatch(
  ch: number,
  alg: number,
  fb: number,
  ops: readonly [
    {
      mul: number;
      tl: number;
      ar: number;
      d1r: number;
      d1l: number;
      rr: number;
    },
    {
      mul: number;
      tl: number;
      ar: number;
      d1r: number;
      d1l: number;
      rr: number;
    },
    {
      mul: number;
      tl: number;
      ar: number;
      d1r: number;
      d1l: number;
      rr: number;
    },
    {
      mul: number;
      tl: number;
      ar: number;
      d1r: number;
      d1l: number;
      rr: number;
    },
  ],
): ChipOp[] {
  const batch: ChipOp[] = [
    [0, 0x20 + ch, (0b11 << 6) | ((fb & 7) << 3) | (alg & 7)],
  ];
  const slotOffsets = [0x00, 0x10, 0x08, 0x18] as const; // M1, C1, M2, C2
  for (let i = 0; i < 4; i++) {
    const o = ops[i]!;
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

export interface RemasterAudioController {
  unlock(): Promise<void>;
  setMuted(muted: boolean): void;
  setMix(music: number, sfx: number): void;
  setMusicEnabled(enabled: boolean): void;
  loadVgm(bytes: Uint8Array): ParsedVgm;
  clearVgm(): void;
  updateRolling(speed: number, grounded: boolean): void;
  handleEvents(events: readonly RemasterEvent[]): void;
  dispose(): void;
}

/**
 * Autonomous WebAudio controller for the Yamaha YM2151 (OPM) + Atari POKEY WASM worklet.
 * Channels 0..3: Music (built-in original FM theme or user-loaded .vgm/.vgz).
 * Channels 4..7: Real-time FM SFX (wall bounce, fall whistle, respawn, countdown, GOAL fanfare).
 * POKEY 0..1: Continuous rolling marble rumble + shatter noise burst.
 */
export function createRemasterAudio(baseUrl = '/'): RemasterAudioController {
  let ctx: AudioContext | undefined;
  let node: AudioWorkletNode | undefined;
  let ready = false;
  let muted = false;
  let musicGain = 0.75;
  let sfxGain = 1.0;
  let musicEnabled = true;
  let customVgmActive = false;
  let disposed = false;
  let musicTimer: number | undefined;
  let stepIndex = 0;
  let lastRollReg = -1;
  let shatterTimeout: number | undefined;

  function post(msg: unknown) {
    if (ready && node && !disposed) node.port.postMessage(msg);
  }

  function configureDefaultPatches() {
    const ops: ChipOp[] = [
      // Ch 0: Bright FM marimba/bell lead
      ...loadFmPatch(0, 4, 2, [
        { mul: 3, tl: 34, ar: 31, d1r: 14, d1l: 6, rr: 9 },
        { mul: 1, tl: 18, ar: 31, d1r: 10, d1l: 5, rr: 8 },
        { mul: 2, tl: 42, ar: 31, d1r: 12, d1l: 8, rr: 8 },
        { mul: 1, tl: 22, ar: 31, d1r: 12, d1l: 6, rr: 8 },
      ]),
      // Ch 1: Punchy FM synth bass
      ...loadFmPatch(1, 0, 5, [
        { mul: 1, tl: 28, ar: 31, d1r: 16, d1l: 6, rr: 10 },
        { mul: 2, tl: 36, ar: 31, d1r: 12, d1l: 4, rr: 10 },
        { mul: 1, tl: 32, ar: 31, d1r: 10, d1l: 4, rr: 10 },
        { mul: 1, tl: 16, ar: 31, d1r: 8, d1l: 2, rr: 10 },
      ]),
      // Ch 4: Wall bounce percussive FM thud
      ...loadFmPatch(4, 4, 4, [
        { mul: 4, tl: 18, ar: 31, d1r: 22, d1l: 12, rr: 14 },
        { mul: 1, tl: 14, ar: 31, d1r: 18, d1l: 12, rr: 14 },
        { mul: 2, tl: 32, ar: 31, d1r: 20, d1l: 12, rr: 14 },
        { mul: 1, tl: 18, ar: 31, d1r: 18, d1l: 12, rr: 14 },
      ]),
      // Ch 5: Chime / GOAL fanfare / countdown tick
      ...loadFmPatch(5, 5, 1, [
        { mul: 4, tl: 28, ar: 31, d1r: 12, d1l: 6, rr: 9 },
        { mul: 1, tl: 12, ar: 31, d1r: 10, d1l: 4, rr: 8 },
        { mul: 2, tl: 20, ar: 31, d1r: 12, d1l: 6, rr: 8 },
        { mul: 3, tl: 26, ar: 31, d1r: 14, d1l: 8, rr: 8 },
      ]),
      // Ch 6: Fall descending whistle
      ...loadFmPatch(6, 4, 0, [
        { mul: 2, tl: 44, ar: 28, d1r: 8, d1l: 4, rr: 8 },
        { mul: 1, tl: 16, ar: 28, d1r: 6, d1l: 3, rr: 8 },
        { mul: 1, tl: 50, ar: 28, d1r: 8, d1l: 4, rr: 8 },
        { mul: 1, tl: 20, ar: 28, d1r: 6, d1l: 3, rr: 8 },
      ]),
    ];
    post({ type: 'batch', ops });
  }

  // Original upbeat 80s FM arcade pattern (Dorian groove) played directly on YM2151 ch 0-1.
  const leadPattern = [
    62, 65, 69, 72, 74, 72, 69, 67, 65, 69, 72, 76, 74, 72, 69, 65,
  ];
  const bassPattern = [
    38, 38, 45, 38, 41, 41, 45, 43, 38, 38, 45, 38, 43, 43, 45, 48,
  ];

  function startBuiltinSequencer() {
    if (musicTimer !== undefined) return;
    musicTimer = window.setInterval(() => {
      if (!ready || muted || !musicEnabled || customVgmActive) return;
      const lead = leadPattern[stepIndex % leadPattern.length]!;
      const bass = bassPattern[stepIndex % bassPattern.length]!;
      stepIndex++;
      post({
        type: 'batch',
        ops: [
          [0, 0x08, 0x00],
          [0, 0x28, midiToKc(lead)],
          [0, 0x08, 0x78],
          [0, 0x08, 0x01],
          [0, 0x29, midiToKc(bass)],
          [0, 0x08, 0x79],
        ],
      });
    }, 150);
  }

  function triggerNote(ch: number, midi: number, durationMs = 140) {
    post({
      type: 'batch',
      ops: [
        [0, 0x08, ch],
        [0, 0x28 + ch, midiToKc(midi)],
        [0, 0x08, 0x78 | ch],
      ],
    });
    window.setTimeout(() => {
      post({ type: 'opm', reg: 0x08, val: ch });
    }, durationMs);
  }

  return {
    async unlock() {
      if (disposed) return;
      if (ctx) {
        if (ctx.state === 'suspended') await ctx.resume();
        return;
      }
      ctx = new AudioContext();
      const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      await ctx.audioWorklet.addModule(
        `${prefix}assets/audio/opm-pokey-worklet.js`,
      );
      const wasmResponse = await fetch(`${prefix}assets/audio/opm-pokey.wasm`);
      const wasmBytes = await wasmResponse.arrayBuffer();
      if (disposed) return;
      node = new AudioWorkletNode(ctx, 'opm-pokey-worklet', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      node.connect(ctx.destination);
      await new Promise<void>((resolve, reject) => {
        if (!node) return reject(new Error('AudioWorkletNode indisponible'));
        node.port.onmessage = (event) => {
          if (event.data?.type === 'ready') {
            ready = true;
            resolve();
          } else if (event.data?.type === 'error') {
            reject(new Error(String(event.data.error)));
          }
        };
        node.port.postMessage({ type: 'init', wasmBytes }, [wasmBytes]);
      });
      configureDefaultPatches();
      post({ type: 'mute', muted });
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
      startBuiltinSequencer();
    },

    setMuted(value: boolean) {
      muted = value;
      post({ type: 'mute', muted });
    },

    setMix(music: number, sfx: number) {
      musicGain = Math.max(0, Math.min(2, music));
      sfxGain = Math.max(0, Math.min(2, sfx));
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
    },

    setMusicEnabled(enabled: boolean) {
      musicEnabled = enabled;
      if (!enabled) {
        post({
          type: 'batch',
          ops: [
            [0, 0x08, 0x00],
            [0, 0x08, 0x01],
          ],
        });
      }
    },

    loadVgm(bytes: Uint8Array): ParsedVgm {
      const parsed = parseVgm(bytes);
      customVgmActive = true;
      post({ type: 'vgm', vgm: parsed });
      return parsed;
    },

    clearVgm() {
      customVgmActive = false;
      post({ type: 'vgm', vgm: null });
      configureDefaultPatches();
    },

    updateRolling(speed: number, grounded: boolean) {
      if (!ready || muted) return;
      // POKEY channel 0: low-passed 17-bit rumble scaled gently by marble speed.
      const effective = grounded && speed > 0.8 ? speed - 0.8 : 0;
      const vol = Math.min(4, Math.floor(effective * 0.3));
      const audf = Math.max(
        130,
        Math.min(245, Math.round(240 - effective * 7)),
      );
      const packed = (audf << 8) | vol;
      if (packed === lastRollReg) return;
      lastRollReg = packed;
      post({
        type: 'batch',
        ops: [
          [1, 0x00, audf],
          [1, 0x01, vol > 0 ? 0x80 | vol : 0x00],
        ],
      });
    },

    handleEvents(events: readonly RemasterEvent[]) {
      if (!ready || muted) return;
      for (const ev of events) {
        if (ev.type === 'impact') {
          const midi = 38 + Math.round(ev.intensity * 14);
          triggerNote(4, midi, 90);
        } else if (ev.type === 'shatter') {
          // POKEY channel 1: 17-bit explosion burst + FM crash
          post({
            type: 'batch',
            ops: [
              [1, 0x02, 42],
              [1, 0x03, 0x8d],
            ],
          });
          triggerNote(4, 34, 240);
          window.clearTimeout(shatterTimeout);
          shatterTimeout = window.setTimeout(() => {
            post({ type: 'pokey', reg: 0x03, val: 0x00 });
          }, 260);
        } else if (ev.type === 'fall') {
          const notes = [76, 71, 66, 61, 56, 51];
          notes.forEach((n, idx) => {
            window.setTimeout(() => triggerNote(6, n, 85), idx * 75);
          });
        } else if (ev.type === 'respawn') {
          triggerNote(5, 64, 90);
          window.setTimeout(() => triggerNote(5, 76, 140), 90);
        } else if (ev.type === 'countdownTick') {
          triggerNote(5, 84, 70);
        } else if (ev.type === 'goal') {
          const fanfare = [62, 66, 69, 74, 78, 81];
          fanfare.forEach((n, idx) => {
            window.setTimeout(() => triggerNote(5, n, 180), idx * 95);
          });
        }
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      window.clearInterval(musicTimer);
      window.clearTimeout(shatterTimeout);
      node?.disconnect();
      void ctx?.close();
    },
  };
}
