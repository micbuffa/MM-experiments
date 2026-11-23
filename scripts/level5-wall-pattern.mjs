import { inflateSync, deflateSync } from 'node:zlib';

/** Local full-map PNG -> pigment mask, with no baked joints, light or terrain. */
export function level5WallPattern(png) {
  let width, height, channels, palette;
  const packed = [];
  for (let at = 8; at < png.length;) {
    const size = png.readUInt32BE(at),
      type = png.toString('ascii', at + 4, at + 8),
      bytes = png.subarray(at + 8, at + 8 + size);
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(0);
      height = bytes.readUInt32BE(4);
      if (bytes[8] !== 8 || ![2, 3, 6].includes(bytes[9]))
        throw new Error('Format PNG de référence incompatible.');
      channels = bytes[9] === 3 ? 1 : bytes[9] === 2 ? 3 : 4;
    }
    if (type === 'PLTE') palette = bytes;
    if (type === 'IDAT') packed.push(bytes);
    at += size + 12;
  }
  if (width !== 576 || height !== 2286)
    throw new Error('Dimensions du niveau 5 inattendues.');
  const stride = width * channels,
    raw = inflateSync(Buffer.concat(packed));
  const mask = Buffer.alloc(height * (width * 4 + 1));
  const mortar = Buffer.alloc(width * height);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)],
      row = Buffer.from(
        raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
      );
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0,
        b = previous[x],
        c = x >= channels ? previous[x - channels] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const prediction =
        filter === 0
          ? 0
          : filter === 1
            ? a
            : filter === 2
              ? b
              : filter === 3
                ? Math.floor((a + b) / 2)
                : pa <= pb && pa <= pc
                  ? a
                  : pb <= pc
                    ? b
                    : c;
      row[x] = (row[x] + prediction) & 255;
    }
    for (let x = 0; x < width; x++) {
      const offset = channels === 1 ? row[x] * 3 : x * channels;
      const source = channels === 1 ? palette : row;
      const r = source[offset],
        g = source[offset + 1],
        b = source[offset + 2];
      mortar[y * width + x] = r === g && g === b && r > 0 && r < 220 ? 1 : 0;
      const pink =
        (r === 204 && g === 102 && b === 204) ||
        (r === 85 && g === 0 && b === 51);
      const orange =
        (r === 204 && g === 85 && b === 0) ||
        (r === 119 && g === 34 && b === 34);
      const at = y * (width * 4 + 1) + 1 + x * 4;
      mask[at] = 255;
      mask[at + 1] = pink || orange ? 0 : 255;
      mask[at + 2] = pink ? 255 : 0;
      mask[at + 3] = 255;
    }
    previous = row;
  }
  // The reference mortar interrupts a circle in screen space. Reconnect its
  // pigment across that narrow gap; the 3D wall applies its own grey mortar.
  for (let y = 0; y < height; y++)
    for (let x = 1; x < width - 1; x++) {
      const at = y * (width * 4 + 1) + 1 + x * 4;
      if (mask[at + 1] !== 255 || mask[at - 3] !== 0) continue;
      let end = x;
      while (
        end < width &&
        end - x < 8 &&
        mask[y * (width * 4 + 1) + 1 + end * 4 + 1] === 255 &&
        mortar[y * width + end] === 1
      )
        end++;
      const right = y * (width * 4 + 1) + 1 + end * 4;
      if (
        end >= width ||
        mask[right + 1] !== 0 ||
        mask[right + 2] !== mask[at - 2]
      )
        continue;
      for (let fill = x; fill < end; fill++) {
        const index = y * (width * 4 + 1) + 1 + fill * 4;
        mask[index + 1] = 0;
        mask[index + 2] = mask[right + 2];
      }
      x = end;
    }
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (name, bytes) => {
    const out = Buffer.alloc(bytes.length + 12);
    out.writeUInt32BE(bytes.length);
    out.write(name, 4);
    bytes.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    png.subarray(0, 8),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(mask)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
