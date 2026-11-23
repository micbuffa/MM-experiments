import { expect, it } from 'vitest';
import {
  level5BridgeGeometry,
  level5BridgeSpan,
  openLevel5Bridge,
} from './level5Bridge';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';

it('clips the cantilevered Escher arch along the isometric seam H = 16368 + 8 * (X - 29)', () => {
  const bridge = level5BridgeGeometry(141, 141);
  const scaleY = Math.sqrt(2 / 3);
  const yFloor = ((16368 - 16384) * scaleY) / 8;
  const yDeck = ((16416 - 16384) * scaleY) / 8;
  expect(level5BridgeSpan.alongStart).toBe(30);
  for (let i = 0; i < bridge.positions.length; i += 3) {
    const gx = bridge.positions[i]! + 70.5;
    const y = bridge.positions[i + 1]!;
    const seamY = Math.min(
      yDeck - 0.015,
      yFloor + Math.max(0, gx - 29) * scaleY,
    );
    expect(y).toBeGreaterThanOrEqual(seamY - 1e-6);
    expect(y).toBeLessThanOrEqual(yDeck);
  }
});

it('opens the intrados and the X=35 Escher seam while retaining unrelated walls', () => {
  const cells = Array.from({ length: 45 }, () =>
    Array<TerrainCell>(45).fill(null),
  );
  for (let z = 21; z < 24; z++)
    for (let x = 29; x < 35; x++) cells[z]![x] = [3, 3, 3, 3];
  cells[10]![10] = [0, 0, 0, 0];
  const walls = terrainCliffs(terrainMesh(cells), 45, 45, -20),
    opened = openLevel5Bridge(walls, 45, 45);
  expect(opened.indices.length).toBeLessThan(walls.indices.length);
  const vertices = opened.indices.map((v) => [
    opened.positions[v * 3]! + 22.5,
    opened.positions[v * 3 + 2]! + 22.5,
  ]);
  expect(vertices.some(([x, z]) => x === 10 && z === 10)).toBe(true);
  expect(vertices.some(([x, z]) => x === 29 && z === 21)).toBe(true);
  expect(vertices.some(([x, z]) => x === 35 && z === 22)).toBe(false);
});
