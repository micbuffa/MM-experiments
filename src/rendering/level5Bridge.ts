import type { ArchBridgeSpan } from './archBridgeGeometry';
import type { terrainCliffs } from '../game/modern/terrainCliffs';

export const level5BridgeSpan: ArchBridgeSpan = {
  alongAxis: 'x',
  alongStart: 30,
  alongSpan: 3.5,
  sideMin: 21,
  sideMax: 24,
  thickness: 3,
  deckArcade: [16416, 16416],
  crownArcade: 16408,
  springArcade: 16376,
};

/** Monument Valley Escher arch: a true 3-tile-deep barrel vault from Z=21..24,
 * clipped along the isometric seam H = 16368 + 8 * (X - 29) so the cantilevered
 * bridge meets the lower floor seamlessly in arcade projection without any
 * yellow wall underneath the marble's approach path.
 */
export function level5BridgeGeometry(columns: number, rows: number) {
  const scaleY = Math.sqrt(2 / 3);
  const yFloor = ((16368 - 16384) * scaleY) / 8;
  const yDeck = ((16416 - 16384) * scaleY) / 8 - 0.015;
  const ySpring = ((level5BridgeSpan.springArcade - 16384) * scaleY) / 8;
  const yCrown = ((level5BridgeSpan.crownArcade - 16384) * scaleY) / 8;
  const escherCutY = (gx: number) =>
    Math.min(yDeck, yFloor + Math.max(0, gx - 29) * scaleY);
  const archY = (gx: number) => {
    const t = Math.max(
      0,
      Math.min(
        1,
        (gx - level5BridgeSpan.alongStart) / level5BridgeSpan.alongSpan,
      ),
    );
    const curve = ySpring + (yCrown - ySpring) * Math.sin(Math.PI * t);
    return Math.max(curve, escherCutY(gx));
  };
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  const pushQuad = (
    p0: readonly [number, number, number],
    p1: readonly [number, number, number],
    p2: readonly [number, number, number],
    p3: readonly [number, number, number],
  ) => {
    const start = positions.length / 3;
    for (const p of [p0, p1, p2, p3]) {
      positions.push(...p);
      uvs.push(0, 0);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };
  const z0 = level5BridgeSpan.sideMin - rows / 2;
  const z1 = level5BridgeSpan.sideMax - rows / 2;
  const segments = 24;
  for (let s = 0; s < segments; s++) {
    const gx0 =
      level5BridgeSpan.alongStart + (s / segments) * level5BridgeSpan.alongSpan;
    const gx1 =
      level5BridgeSpan.alongStart +
      ((s + 1) / segments) * level5BridgeSpan.alongSpan;
    const x0 = gx0 - columns / 2;
    const x1 = gx1 - columns / 2;
    const ay0 = archY(gx0);
    const ay1 = archY(gx1);
    // Front face (+Z at z1)
    pushQuad([x1, yDeck, z1], [x0, yDeck, z1], [x0, ay0, z1], [x1, ay1, z1]);
    // Back face (-Z at z0)
    pushQuad([x0, yDeck, z0], [x1, yDeck, z0], [x1, ay1, z0], [x0, ay0, z0]);
    // Curved barrel-vault ceiling (intrados) connecting Z=21 to Z=24
    pushQuad([x0, ay0, z1], [x0, ay0, z0], [x1, ay1, z0], [x1, ay1, z1]);
  }
  // Flanking spandrel panels from X=29..30 and X=33.5..35, clipped to the Escher seam.
  for (const [left, right] of [
    [29, level5BridgeSpan.alongStart],
    [level5BridgeSpan.alongStart + level5BridgeSpan.alongSpan, 35],
  ]) {
    const x0 = left! - columns / 2;
    const x1 = right! - columns / 2;
    const y0Left = escherCutY(left!);
    const y0Right = escherCutY(right!);
    pushQuad(
      [x1, yDeck, z1],
      [x0, yDeck, z1],
      [x0, y0Left, z1],
      [x1, y0Right, z1],
    );
    pushQuad(
      [x0, yDeck, z0],
      [x1, yDeck, z0],
      [x1, y0Right, z0],
      [x0, y0Left, z0],
    );
  }
  return { positions, indices, uvs };
}

/** Open the sides and X=35 Escher seam below the crossing deck, retaining unrelated walls. */
export function openLevel5Bridge(
  walls: ReturnType<typeof terrainCliffs>,
  columns: number,
  rows: number,
) {
  const deck = ((16416 - 16384) * Math.sqrt(2 / 3)) / 8;
  const indices: number[] = [];
  for (let i = 0; i < walls.indices.length; i += 3) {
    const tri = walls.indices.slice(i, i + 3);
    const x = tri.map((v) => walls.positions[v * 3]! + columns / 2);
    const z = tri.map((v) => walls.positions[v * 3 + 2]! + rows / 2);
    const y = tri.map((v) => walls.positions[v * 3 + 1]!);
    const side = [21, 24].some((side) =>
      z.every((v) => Math.abs(v - side) < 1e-7),
    );
    const seamEnd =
      x.every((v) => Math.abs(v - 35) < 1e-7) &&
      Math.min(...z) >= 21 - 1e-7 &&
      Math.max(...z) <= 24 + 1e-7;
    if (
      ((side && Math.min(...x) >= 29 && Math.max(...x) <= 35) || seamEnd) &&
      Math.max(...y) <= deck + 1e-7
    )
      continue;
    indices.push(...tri);
  }
  return { ...walls, indices };
}

/** Lower walkway continues underneath the deck instead of ending at its sides. */
export function level5PassageFloor(columns: number, rows: number) {
  const y = ((16368 - 16384) * Math.sqrt(2 / 3)) / 8;
  return {
    positions: [
      29 - columns / 2,
      y,
      21 - rows / 2,
      35 - columns / 2,
      y,
      21 - rows / 2,
      35 - columns / 2,
      y,
      24 - rows / 2,
      29 - columns / 2,
      y,
      24 - rows / 2,
    ],
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [29, 21, 35, 21, 35, 24, 29, 24],
  };
}
