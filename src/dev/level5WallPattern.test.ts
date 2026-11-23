import { expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import { deflateSync, inflateSync } from 'node:zlib';
import { level5WallPattern } from '../../scripts/level5-wall-pattern.mjs';

it('fills original grey mortar inside pigment while preserving yellow gaps between separate circles', () => {
  const width = 576,
    height = 2286,
    rowBytes = width * 3 + 1,
    raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = y * rowBytes + 1 + x * 3;
      raw[at] = raw[at + 1] = 255;
    }
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const at = y * rowBytes + 1 + x * 3;
    raw[at] = r;
    raw[at + 1] = g;
    raw[at + 2] = b;
  };
  for (const y of [100, 101]) for (const x of [100, 105]) put(x, y, 204, 85, 0);
  for (let x = 101; x < 105; x++) put(x, 100, 102, 102, 102);
  const chunk = (type: string, data: Buffer) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length);
    out.write(type, 4);
    data.copy(out, 8);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const input = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const result = level5WallPattern(input),
    parts: Buffer[] = [];
  for (let at = 8; at < result.length;) {
    const n = result.readUInt32BE(at);
    if (result.toString('ascii', at + 4, at + 8) === 'IDAT')
      parts.push(result.subarray(at + 8, at + 8 + n));
    at += n + 12;
  }
  const mask = inflateSync(Buffer.concat(parts));
  const pixel = (x: number, y: number) => [
    ...mask.subarray(
      y * (width * 4 + 1) + 1 + x * 4,
      y * (width * 4 + 1) + 1 + x * 4 + 3,
    ),
  ];
  expect(pixel(103, 100)).toEqual([255, 0, 0]);
  expect(pixel(103, 101)).toEqual([255, 255, 0]);
});
