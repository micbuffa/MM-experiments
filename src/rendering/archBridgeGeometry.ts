export interface ArchBridgeSpan {
  readonly alongAxis: 'x' | 'z';
  readonly alongStart: number;
  readonly alongSpan: number;
  readonly sideMin: number;
  readonly sideMax: number;
  readonly thickness: number;
  readonly deckArcade: readonly [number, number];
  readonly crownArcade: number;
  readonly springArcade: number;
}

/** Shared Level 4 intrados profile, thin side rims and closed upper/inner skins. */
export function archBridgeGeometry(
  span: ArchBridgeSpan,
  columns: number,
  rows: number,
) {
  const toY = (arcade: number) => ((arcade - 16384) * Math.sqrt(2 / 3)) / 8;
  const spring = toY(span.springArcade);
  const crown = toY(span.crownArcade);
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  for (const [sideIndex, side] of [
    span.sideMin,
    span.sideMax - span.thickness,
  ].entries()) {
    const deck = toY(span.deckArcade[sideIndex]!);
    for (let segment = 0; segment < 24; segment++) {
      const a = segment / 24,
        b = (segment + 1) / 24;
      const start = positions.length / 3;
      for (const [across, t, upper] of [
        [side, a, true],
        [side, b, true],
        [side, b, false],
        [side, a, false],
        [side + span.thickness, a, true],
        [side + span.thickness, a, false],
        [side + span.thickness, b, false],
        [side + span.thickness, b, true],
        [side, a, false],
        [side, b, false],
        [side + span.thickness, b, false],
        [side + span.thickness, a, false],
        [side, a, true],
        [side + span.thickness, a, true],
        [side + span.thickness, b, true],
        [side, b, true],
      ] as const) {
        const along = span.alongStart + t * span.alongSpan;
        const y = upper
          ? deck - (span.alongAxis === 'z' ? 0.015 : 0)
          : spring + (crown - spring) * Math.sin(Math.PI * t);
        const gx = span.alongAxis === 'x' ? along : across;
        const gz = span.alongAxis === 'x' ? across : along;
        positions.push(gx - columns / 2, y, gz - rows / 2);
        uvs.push(along, y);
      }
      for (const offset of [0, 4, 8, 12])
        indices.push(
          start + offset,
          start + offset + 1,
          start + offset + 2,
          start + offset,
          start + offset + 2,
          start + offset + 3,
        );
    }
  }
  // Swapping the two horizontal axes reverses handedness. Keep outward
  // normals on the X-oriented bridge too, including its front arch and top.
  if (span.alongAxis === 'x') {
    for (let i = 0; i < indices.length; i += 3) {
      const second = indices[i + 1]!;
      indices[i + 1] = indices[i + 2]!;
      indices[i + 2] = second;
    }
  }
  return { positions, indices, uvs };
}
