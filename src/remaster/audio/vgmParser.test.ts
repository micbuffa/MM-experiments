import { describe, expect, it } from 'vitest';
import { gzipSync } from 'fflate';
import { parseVgm } from './vgmParser';

describe('parseVgm', () => {
  it('parses YM2151, POKEY, wait commands, loop offset and gzipped .vgz streams', () => {
    const buf = new Uint8Array(0x40 + 11);
    buf.set([0x56, 0x67, 0x6d, 0x20], 0); // "Vgm "
    const view = new DataView(buf.buffer);
    view.setUint32(0x08, 0x150, true);
    view.setUint32(0x18, 735 + 100, true);
    view.setUint32(0x1c, 0x40 - 0x1c + 3, true); // Loop points to POKEY command
    view.setUint32(0x34, 0x0c, true); // Data starts at 0x40

    let p = 0x40;
    buf[p++] = 0x54;
    buf[p++] = 0x28;
    buf[p++] = 0x4a; // YM2151 KC
    buf[p++] = 0xbb;
    buf[p++] = 0x01;
    buf[p++] = 0x8f; // POKEY AUDC1
    buf[p++] = 0x62; // wait 735
    buf[p++] = 0x61;
    buf[p++] = 100;
    buf[p++] = 0; // wait 100
    buf[p] = 0x66; // EOF

    const parsed = parseVgm(buf);
    expect(parsed.version).toBe(0x150);
    expect(parsed.loopCommandIndex).toBe(1);
    expect(parsed.commands).toEqual([
      { type: 'opm', reg: 0x28, val: 0x4a },
      { type: 'pokey', reg: 0x01, val: 0x8f },
      { type: 'wait', samples: 735 },
      { type: 'wait', samples: 100 },
    ]);

    // Also accepts gzipped .vgz
    const vgz = gzipSync(buf);
    expect(parseVgm(vgz).commands).toHaveLength(4);
  });

  it('rejects invalid headers', () => {
    expect(() => parseVgm(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});
