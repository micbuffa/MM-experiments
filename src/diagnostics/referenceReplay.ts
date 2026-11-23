export interface ReplayRead {
  frame: number;
  offset: number;
  value: number;
}

/** Only validated integers enter the generated Lua, never document/source text. */
export function serializeReplay(
  reads: readonly ReplayRead[],
  shift: number,
): string {
  if (![-1, 0, 1, 2].includes(shift) || reads.length !== 64) {
    throw new Error('Unexpected replay protocol');
  }
  const frames = new Map<number, Map<number, number>>();
  for (const { frame, offset, value } of reads) {
    if (
      !Number.isInteger(frame) ||
      frame < 1198 ||
      frame > 1213 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 3 ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 255
    )
      throw new Error('Invalid port sample');
    const ports = frames.get(frame) ?? new Map<number, number>();
    if (ports.has(offset)) throw new Error('Duplicate port sample');
    ports.set(offset, value);
    frames.set(frame, ports);
  }
  // The 64 unique samples in this bounded domain cover all sixteen frames/ports.
  return `local phaseShift=${shift}\nlocal sequence={\n${[...frames]
    .sort(([a], [b]) => a - b)
    .map(
      ([frame, ports]) =>
        `[${frame}]={${[...ports]
          .sort(([a], [b]) => a - b)
          .map(([port, value]) => `[${port}]=${value}`)
          .join(',')}},`,
    )
    .join('\n')}\n}\n`;
}

export interface ReferencePosition {
  frame: number;
  width: number;
  height: number;
  x: number;
  y: number;
  pixels: number;
  bounds: number[];
}

export function parseReferenceOutput(output: string): ReferencePosition[] {
  if (!/^REF_COMPLETE 0\.271 64 64$/m.test(output)) {
    throw new Error('Incomplete or unverified reference replay');
  }
  const samples = output
    .split('\n')
    .filter((line) => line.startsWith('REF_POSITION '))
    .map((line) => {
      const values = line.trim().split(/\s+/).slice(1).map(Number);
      const [frame, width, height, x, y, pixels, ...bounds] = values;
      if (
        values.length !== 10 ||
        !values.every(Number.isFinite) ||
        frame === undefined ||
        width !== 336 ||
        height !== 240 ||
        x === undefined ||
        y === undefined ||
        pixels === undefined ||
        pixels <= 0 ||
        x < 0 ||
        x >= width ||
        y < 0 ||
        y >= height
      ) {
        throw new Error('Invalid reference position');
      }
      return { frame, width, height, x, y, pixels, bounds };
    });
  if (samples.map(({ frame }) => frame).join(',') !== '1199,1206,1212') {
    throw new Error('Missing or unordered reference positions');
  }
  return samples;
}
