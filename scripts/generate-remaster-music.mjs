import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Generates original 1984 Atari System 1-style Yamaha YM2151 (OPM) + POKEY .vgm files
// for Marble Madness Remaster. Standard VGM 1.50 format (playable in VGMPlay and
// importable/editable in Furnace Tracker).
// Uses YM2151 channels 0..3 (Music bus) and POKEY channel 2 (hi-hat pulse), leaving
// YM2151 channels 4..7 and POKEY channels 0..1 completely free for real-time SFX.

const MIDI_TO_OPM_NOTE = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];

function midiToKc(midi) {
  const clamped = Math.max(12, Math.min(107, Math.round(midi)));
  const octave = Math.max(0, Math.min(7, Math.floor((clamped - 12) / 12)));
  const note = MIDI_TO_OPM_NOTE[(clamped - 12) % 12];
  return (octave << 4) | note;
}

class VgmBuilder {
  constructor() {
    this.data = [];
    this.totalSamples = 0;
    this.loopOffset = -1;
  }

  opm(reg, val) {
    this.data.push(0x54, reg & 0xff, val & 0xff);
  }

  pokey(reg, val) {
    this.data.push(0xbb, reg & 0x0f, val & 0xff);
  }

  wait(samples) {
    let rem = Math.round(samples);
    this.totalSamples += rem;
    while (rem > 0) {
      if (rem === 735) {
        this.data.push(0x62);
        return;
      }
      if (rem === 882) {
        this.data.push(0x63);
        return;
      }
      const chunk = Math.min(65535, rem);
      this.data.push(0x61, chunk & 0xff, (chunk >> 8) & 0xff);
      rem -= chunk;
    }
  }

  markLoop() {
    this.loopOffset = this.data.length;
  }

  loadPatch(ch, alg, fb, pan, ops) {
    this.opm(0x20 + ch, ((pan & 3) << 6) | ((fb & 7) << 3) | (alg & 7));
    const slotOffsets = [0x00, 0x10, 0x08, 0x18]; // M1, C1, M2, C2
    for (let i = 0; i < 4; i++) {
      const o = ops[i];
      const s = slotOffsets[i] + ch;
      this.opm(0x40 + s, ((o.dt1 ?? 0) << 4) | (o.mul & 0x0f));
      this.opm(0x60 + s, o.tl & 0x7f);
      this.opm(0x80 + s, o.ar & 0x1f);
      this.opm(0xa0 + s, o.d1r & 0x1f);
      this.opm(0xc0 + s, o.d2r ?? 0);
      this.opm(0xe0 + s, ((o.d1l & 0x0f) << 4) | (o.rr & 0x0f));
    }
  }

  noteOn(ch, midi) {
    this.opm(0x08, ch & 7);
    this.opm(0x28 + (ch & 7), midiToKc(midi));
    this.opm(0x08, 0x78 | (ch & 7));
  }

  noteOff(ch) {
    this.opm(0x08, ch & 7);
  }

  build() {
    this.data.push(0x66); // End of sound data
    const headerSize = 0x40;
    const totalLength = headerSize + this.data.length;
    const buf = new Uint8Array(totalLength);
    const view = new DataView(buf.buffer);

    // "Vgm " magic
    buf.set([0x56, 0x67, 0x6d, 0x20], 0x00);
    view.setUint32(0x04, totalLength - 4, true); // EOF offset relative to 0x04
    view.setUint32(0x08, 0x00000150, true); // VGM 1.50
    view.setUint32(0x18, this.totalSamples, true);
    if (this.loopOffset >= 0) {
      const absLoop = headerSize + this.loopOffset;
      view.setUint32(0x1c, absLoop - 0x1c, true);
      view.setUint32(0x20, this.totalSamples, true);
    }
    view.setUint32(0x24, 60, true); // 60 Hz rate
    view.setUint32(0x30, 3579545, true); // YM2151 clock (Atari System 1)
    view.setUint32(0x34, headerSize - 0x34, true); // Data offset relative to 0x34

    buf.set(this.data, headerSize);
    return buf;
  }
}

function loadPracticePatches(vgm) {
  // Ch 0: Playful bright FM marimba / xylophone lead (Atari System 1 feel)
  vgm.loadPatch(0, 4, 3, 3, [
    { mul: 4, tl: 26, ar: 31, d1r: 18, d1l: 10, rr: 10 },
    { mul: 1, tl: 14, ar: 31, d1r: 14, d1l: 8, rr: 9 },
    { mul: 3, tl: 36, ar: 31, d1r: 16, d1l: 9, rr: 10 },
    { mul: 1, tl: 18, ar: 31, d1r: 14, d1l: 8, rr: 9 },
  ]);
  // Ch 1: Bouncy rubbery FM synth bass
  vgm.loadPatch(1, 0, 5, 3, [
    { mul: 1, tl: 24, ar: 31, d1r: 16, d1l: 6, rr: 11 },
    { mul: 2, tl: 34, ar: 31, d1r: 14, d1l: 5, rr: 11 },
    { mul: 1, tl: 30, ar: 31, d1r: 12, d1l: 4, rr: 11 },
    { mul: 1, tl: 14, ar: 31, d1r: 10, d1l: 3, rr: 11 },
  ]);
  // Ch 2: Sparkling FM accompaniment bell / chord pluck (panned slightly left/right)
  vgm.loadPatch(2, 5, 1, 3, [
    { mul: 2, tl: 36, ar: 31, d1r: 15, d1l: 8, rr: 10 },
    { mul: 1, tl: 24, ar: 31, d1r: 14, d1l: 7, rr: 10 },
    { mul: 3, tl: 32, ar: 31, d1r: 16, d1l: 8, rr: 10 },
    { mul: 2, tl: 28, ar: 31, d1r: 14, d1l: 7, rr: 10 },
  ]);
  // Ch 3: Crisp FM woodblock / rim percussion accent
  vgm.loadPatch(3, 4, 6, 3, [
    { mul: 7, tl: 18, ar: 31, d1r: 26, d1l: 14, rr: 15 },
    { mul: 2, tl: 22, ar: 31, d1r: 24, d1l: 14, rr: 15 },
    { mul: 5, tl: 24, ar: 31, d1r: 26, d1l: 14, rr: 15 },
    { mul: 1, tl: 26, ar: 31, d1r: 24, d1l: 14, rr: 15 },
  ]);
}

// 1. Original Practice-Race-inspired upbeat FM theme (138 BPM, 16th-note grid = 4793 samples @ 44.1kHz)
function buildLevel1Practice() {
  const vgm = new VgmBuilder();
  loadPracticePatches(vgm);
  vgm.markLoop();

  const step = 4793; // ~138 BPM 16th note at 44100 Hz
  const _ = null;

  // 64-step (4-bar) quirky, bouncy melody in D major / Mixolydian
  const lead = [
    // Bar 1 (D major bounce)
    74,
    _,
    78,
    _,
    81,
    78,
    74,
    _,
    76,
    _,
    74,
    71,
    69,
    _,
    _,
    _,
    // Bar 2 (G -> A playful leap)
    71,
    _,
    74,
    _,
    79,
    76,
    74,
    _,
    73,
    _,
    76,
    _,
    81,
    _,
    _,
    _,
    // Bar 3 (Syncopated tumbling run)
    86,
    _,
    83,
    81,
    78,
    _,
    74,
    _,
    79,
    _,
    76,
    74,
    71,
    _,
    74,
    _,
    // Bar 4 (Turnaround climb)
    73,
    74,
    76,
    _,
    78,
    _,
    81,
    _,
    83,
    _,
    81,
    78,
    76,
    _,
    _,
    _,
  ];

  const bass = [
    // Bar 1
    50,
    _,
    _,
    50,
    57,
    _,
    54,
    _,
    50,
    _,
    52,
    _,
    54,
    _,
    57,
    _,
    // Bar 2
    55,
    _,
    _,
    55,
    59,
    _,
    55,
    _,
    57,
    _,
    _,
    57,
    61,
    _,
    57,
    _,
    // Bar 3
    50,
    _,
    54,
    _,
    57,
    _,
    54,
    _,
    55,
    _,
    59,
    _,
    62,
    _,
    59,
    _,
    // Bar 4
    57,
    _,
    52,
    _,
    55,
    _,
    57,
    _,
    59,
    _,
    57,
    _,
    55,
    _,
    52,
    _,
  ];

  const harmony = [
    // Bar 1
    66,
    _,
    _,
    _,
    69,
    _,
    _,
    _,
    67,
    _,
    _,
    _,
    66,
    _,
    _,
    _,
    // Bar 2
    67,
    _,
    _,
    _,
    71,
    _,
    _,
    _,
    69,
    _,
    _,
    _,
    73,
    _,
    _,
    _,
    // Bar 3
    74,
    _,
    _,
    _,
    69,
    _,
    _,
    _,
    71,
    _,
    _,
    _,
    67,
    _,
    _,
    _,
    // Bar 4
    69,
    _,
    _,
    _,
    73,
    _,
    _,
    _,
    76,
    _,
    _,
    _,
    73,
    _,
    _,
    _,
  ];

  for (let i = 0; i < lead.length; i++) {
    if (lead[i] !== null) vgm.noteOn(0, lead[i]);
    if (bass[i] !== null) vgm.noteOn(1, bass[i]);
    if (harmony[i] !== null) vgm.noteOn(2, harmony[i]);
    // Off-beat woodblock / hi-hat pulse
    if (i % 4 === 2) {
      vgm.noteOn(3, 72);
    } else if (i % 2 === 1) {
      vgm.pokey(0x04, 18);
      vgm.pokey(0x05, 0x82); // Soft POKEY ch2 hi-hat tick
    }

    vgm.wait(Math.round(step * 0.7));
    vgm.pokey(0x05, 0x00);
    if (lead[i] !== null) vgm.noteOff(0);
    if (bass[i] !== null) vgm.noteOff(1);
    if (harmony[i] !== null) vgm.noteOff(2);
    if (i % 4 === 2) vgm.noteOff(3);
    vgm.wait(Math.round(step * 0.3));
  }

  return vgm.build();
}

// 2. Joyous GOAL Fanfare (one-shot, ~2.2 seconds)
function buildGoalFanfare() {
  const vgm = new VgmBuilder();
  loadPracticePatches(vgm);

  // Bright brassy FM patch on ch 0 & 2 for the victory fanfare
  vgm.loadPatch(0, 4, 4, 3, [
    { mul: 1, tl: 22, ar: 31, d1r: 8, d1l: 3, rr: 8 },
    { mul: 1, tl: 10, ar: 31, d1r: 6, d1l: 2, rr: 7 },
    { mul: 2, tl: 28, ar: 31, d1r: 10, d1l: 4, rr: 8 },
    { mul: 1, tl: 14, ar: 31, d1r: 6, d1l: 2, rr: 7 },
  ]);

  const beat = 5200; // crisp celebratory tempo
  const phrase = [
    { l: 74, h: 69, b: 50, dur: 1 },
    { l: 78, h: 74, b: 54, dur: 1 },
    { l: 81, h: 78, b: 57, dur: 1 },
    { l: 86, h: 81, b: 62, dur: 2 },
    { l: 83, h: 79, b: 59, dur: 1 },
    { l: 86, h: 81, b: 62, dur: 1 },
    { l: 88, h: 83, b: 64, dur: 1 },
    { l: 90, h: 86, b: 62, dur: 5 },
  ];

  for (const n of phrase) {
    vgm.noteOn(0, n.l);
    vgm.noteOn(1, n.b);
    vgm.noteOn(2, n.h);
    vgm.wait(Math.round(beat * n.dur * 0.85));
    vgm.noteOff(0);
    vgm.noteOff(1);
    vgm.noteOff(2);
    vgm.wait(Math.round(beat * n.dur * 0.15));
  }
  vgm.wait(12000);
  return vgm.build();
}

const outDir = resolve(process.cwd(), 'public/assets/audio');
mkdirSync(outDir, { recursive: true });

const files = [
  ['level1-practice.vgm', buildLevel1Practice()],
  ['goal-fanfare.vgm', buildGoalFanfare()],
];

for (const [name, bytes] of files) {
  const path = resolve(outDir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  process.stdout.write(`Generated ${path} (${bytes.byteLength} bytes)\n`);
}
