import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRomSfxBank, splitCommandBySlot } from './romSfxBank';

interface CoreExports {
  readonly memory: WebAssembly.Memory;
  _initialize?(): void;
  audio_init(sampleRate: number): void;
  audio_set_mix(music: number, sfx: number): void;
  opm_write(reg: number, val: number): void;
  pokey_write(reg: number, val: number): void;
  audio_render(frames: number): void;
  audio_left_ptr(): number;
}

const SAMPLE_RATE = 48000;

async function loadCore(): Promise<CoreExports> {
  const bytes = readFileSync(
    resolve(process.cwd(), 'public/assets/audio/opm-pokey.wasm'),
  );
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const core = instance.exports as unknown as CoreExports;
  core._initialize?.();
  core.audio_init(SAMPLE_RATE);
  core.audio_set_mix(0, 1);
  return core;
}

function render(core: CoreExports, seconds: number): Float32Array {
  const total = Math.round(seconds * SAMPLE_RATE);
  const out = new Float32Array(total);
  for (let pos = 0; pos < total; pos += 128) {
    const n = Math.min(128, total - pos);
    core.audio_render(n);
    out.set(
      new Float32Array(core.memory.buffer, core.audio_left_ptr(), n),
      pos,
    );
  }
  return out;
}

/** Fundamental estimate from rising zero crossings (after the DC blocker settles). */
function estimateHz(samples: Float32Array): number {
  const start = Math.floor(samples.length / 2);
  let mean = 0;
  for (let i = start; i < samples.length; i++) mean += samples[i]!;
  mean /= samples.length - start;
  let crossings = 0;
  for (let i = start + 1; i < samples.length; i++) {
    if (samples[i - 1]! < mean && samples[i]! >= mean) crossings++;
  }
  return crossings / ((samples.length - start) / SAMPLE_RATE);
}

function rms(samples: Float32Array): number {
  let acc = 0;
  for (const v of samples) acc += v * v;
  return Math.sqrt(acc / samples.length);
}

describe('opm-pokey.wasm POKEY core', () => {
  it('stays silent when every channel volume is zero', async () => {
    const core = await loadCore();
    core.pokey_write(0x08, 0x78);
    expect(rms(render(core, 0.1))).toBeLessThan(1e-4);
  });

  it('plays an AUDC pure tone at 64 kHz / (2 * (AUDF + 1))', async () => {
    const core = await loadCore();
    core.pokey_write(0x08, 0x00);
    core.pokey_write(0x04, 0x7c); // AUDF3
    core.pokey_write(0x05, 0xa8); // AUDC3: pure tone, volume 8
    const hz = estimateHz(render(core, 0.5));
    const expected = 1789772.5 / 28 / (2 * (0x7c + 1));
    expect(hz).toBeGreaterThan(expected * 0.95);
    expect(hz).toBeLessThan(expected * 1.05);
  });

  it('honours AUDCTL 16-bit joins clocked at 1.79 MHz', async () => {
    const core = await loadCore();
    core.pokey_write(0x08, 0x50); // ch1 fast clock + join 1+2
    core.pokey_write(0x00, 0x00); // low byte
    core.pokey_write(0x02, 0x0e); // high byte -> period 0x0e00
    core.pokey_write(0x03, 0xaf); // AUDC2: pure tone, volume 15
    const hz = estimateHz(render(core, 0.5));
    const expected = 1789772.5 / (2 * (0x0e00 + 7));
    expect(hz).toBeGreaterThan(expected * 0.95);
    expect(hz).toBeLessThan(expected * 1.05);
  });

  it('produces poly noise for distortion 100 (17-bit poly)', async () => {
    const core = await loadCore();
    core.pokey_write(0x08, 0x00);
    core.pokey_write(0x06, 0x00);
    core.pokey_write(0x07, 0x8a); // AUDC4: 17-bit poly, volume 10
    const out = render(core, 0.2);
    expect(rms(out)).toBeGreaterThan(0.01);
    // Noise has far more zero crossings than a 32 kHz square would hint at its period.
    expect(estimateHz(out)).toBeGreaterThan(1000);
  });
});

describe('opm-pokey.wasm YM2151 (ymfm) with ROM streams', () => {
  const bank = parseRomSfxBank(
    readFileSync(
      resolve(process.cwd(), 'public/assets/audio/rom-sfx.json'),
      'utf8',
    ),
  );

  function renderCommand(core: CoreExports, key: string, seconds: number) {
    const entry = bank.commands[key]!;
    const writes = splitCommandBySlot(entry).flatMap((s) => {
      const out: number[][] = [];
      for (let i = 0; i < s.writes.length; i += 4) {
        out.push(Array.from(s.writes.subarray(i, i + 4)));
      }
      return out;
    });
    writes.sort((a, b) => a[0]! - b[0]!);
    const total = Math.round(seconds * SAMPLE_RATE);
    const out = new Float32Array(total);
    let wi = 0;
    for (let pos = 0; pos < total; pos += 128) {
      while (
        wi < writes.length &&
        writes[wi]![0]! * bank.tickSeconds <= pos / SAMPLE_RATE
      ) {
        const [, chip, reg, val] = writes[wi++]!;
        if (chip === 0) core.opm_write(reg!, val!);
        else core.pokey_write(reg!, val!);
      }
      const n = Math.min(128, total - pos);
      core.audio_render(n);
      out.set(
        new Float32Array(core.memory.buffer, core.audio_left_ptr(), n),
        pos,
      );
    }
    return out;
  }

  it('renders the wall bump (0x34) as an audible, decaying FM hit', async () => {
    const core = await loadCore();
    const out = renderCommand(core, '34', 1.5);
    const quarter = Math.floor(SAMPLE_RATE / 4);
    const early = rms(out.subarray(0, quarter));
    const late = rms(out.subarray(out.length - quarter));
    expect(early).toBeGreaterThan(0.05);
    expect(late).toBeLessThan(early);
  });

  it('renders the POKEY landing thud (0x5d)', async () => {
    const core = await loadCore();
    expect(rms(renderCommand(core, '5d', 0.3))).toBeGreaterThan(0.05);
  });
});
