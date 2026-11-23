import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainCorners, type TerrainCell } from '../game/modern/terrainMesh';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  practiceWorldPoint,
} from '../game/modern/practiceProjection';

import { createPracticeGuardrail } from './createPracticeGuardrail';
import { createPracticeSurfaceMaterial } from './createPracticeSurfaceMaterial';
import {
  practiceChannelSpikes,
  practiceChannelTerrain,
} from './practiceChannelTerrain';
import {
  createPracticeTower,
  createPracticeSpike,
  practiceTowerPlatform,
} from './createPracticeTower';

const rails = [
  [
    [25, 13, 16381],
    [25, 17, 16375],
    [29, 17, 16372],
  ],
  [
    [13, 25, 16381],
    [17, 25, 16375],
    [17, 29, 16372],
  ],
  [
    [28, 25, 16366],
    [25, 25, 16370],
    [25, 28, 16366],
  ],
  [
    [35, 25, 16359],
    [31, 25, 16366],
  ],
  [
    [25, 31, 16366],
    [25, 35, 16359],
  ],
  [
    [52.8, 37.35, 16348],
    [52.8, 42.6, 16348],
    [52.8, 47.9, 16348],
  ],
  [
    [37.55, 51.8, 16348],
    [42.55, 51.8, 16348],
    [47.15, 51.8, 16348],
  ],
] as const;

export const practiceLandmarkRoot = 'practice-landmarks';
const peaks = [
  [29, 26],
  [26, 29],
] as const;

const upperTreads = [
  [31, 27],
  [31, 28],
  [30, 28],
  [27, 31],
  [28, 31],
  [28, 30],
] as const;

// Reconstruct the visible treads and the straight outer rim from collision samples.
export function practiceDisplayTerrain(terrain: PracticeTerrain) {
  const { offset, size, height } = practiceTowerPlatform;
  const scale = (raw: number) =>
    ((raw - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
  const baseHeight = scale(height);
  const upperTreadHeight = scale(16360);
  const cells = terrain.cells.map((row, z) =>
    row.map((cell, x) => {
      const worldX = x + terrain.origin.x;
      const worldZ = z + terrain.origin.z;
      if (!cell) return cell;
      const [nw, ne, se, sw] = cell;
      if (
        worldZ === 24 &&
        worldX >= 28 &&
        worldX < 31 &&
        nw !== null &&
        ne !== null &&
        se !== null &&
        sw !== null &&
        sw > nw + se - ne + 0.001
      ) {
        // The SW samples touch the tower collision profile. Continue the
        // surrounding paving plane instead of emitting three raised wedges.
        return [nw, ne, se, nw + se - ne] as const;
      }

      if (
        ((worldZ === 39 && worldX >= 18 && worldX < 37) ||
          (worldZ === 12 && worldX >= 25 && worldX < 28) ||
          (worldZ === 24 &&
            ((worldX >= 13 && worldX < 16) ||
              (worldX >= 25 && worldX < 28) ||
              (worldX >= 31 && worldX < 34)))) &&
        nw !== null &&
        ne !== null &&
        se !== null &&
        sw === null
      ) {
        // Continue the slab to the guardrail or cliff across its full width.
        return [nw, ne, se, nw + se - ne] as const;
      }
      const onTowerPlatform = peaks.some(
        ([px, pz]) =>
          worldX >= px + offset &&
          worldX < px + offset + size &&
          worldZ >= pz + offset &&
          worldZ < pz + offset + size,
      );
      // In the survey of the right tower, two support tiles are missing a
      // corner. Complete the same flat landing used under the left tower.
      if (onTowerPlatform && cell.some((corner) => corner !== null))
        return [baseHeight, baseHeight, baseHeight, baseHeight] as const;
      const center = worldX >= 25 && worldX < 34 && worldZ >= 25 && worldZ < 34;
      if (!center) return cell;
      const solid = cell
        .filter((height): height is number => height !== null)
        .sort((a, b) => a - b);
      if (solid.length < 3) return cell;
      // The lower treads stay discrete below each tower platform.
      const stepHeight = solid[Math.floor(solid.length / 2)]!;
      const belowTower = upperTreads.some(
        ([tx, tz]) => tx === worldX && tz === worldZ,
      );
      const displayHeight = belowTower
        ? Math.min(stepHeight, upperTreadHeight)
        : stepHeight;
      if (belowTower) {
        // Complete all four corners of the upper treads (e.g. X=27, Z=31 whose SW samples void).
        return [
          displayHeight,
          displayHeight,
          displayHeight,
          displayHeight,
        ] as const;
      }
      return [
        nw === null ? null : displayHeight,
        ne === null ? null : displayHeight,
        se === null ? null : displayHeight,
        sw === null ? null : displayHeight,
      ] as const;
    }),
  );
  return practiceChannelTerrain({ ...terrain, cells });
}

export function createPracticeLandmarks(
  scene: Scene,
  terrain: PracticeTerrain,
  displayCells: readonly (readonly TerrainCell[])[] = terrain.cells,
) {
  const root = new TransformNode(practiceLandmarkRoot, scene);
  const columns = terrain.cells[0]!.length;
  const rows = terrain.cells.length;
  const world = (x: number, z: number, height: number) =>
    practiceWorldPoint(
      x * arcadeCellUnits,
      z * arcadeCellUnits,
      height,
      columns,
      rows,
      terrain.origin,
    );
  const paint = new StandardMaterial('practice-painted-steel', scene);
  paint.diffuseColor.set(0.65, 0.045, 0.04);
  paint.specularColor.set(0.76, 0.47, 0.44);
  paint.specularPower = 29;
  const stone = createPracticeSurfaceMaterial(scene, 'point');
  stone.diffuseColor.set(0.96, 0.96, 0.96);
  const railHeight = 0.78;

  function surfaceHeight(x: number, z: number) {
    const cellX = Math.floor(x);
    const cellZ = Math.floor(z);
    const cell = displayCells[cellZ]?.[cellX];
    if (!cell) return undefined;
    const solid = terrainCorners.flatMap(([u, v], corner) => {
      const y = cell[corner];
      return y == null ? [] : [{ u, v, y }];
    });
    if (solid.length < 3) return undefined;
    const u = x - cellX;
    const v = z - cellZ;
    const [a, b, c] =
      solid.length === 4 && v > u
        ? [solid[0]!, solid[2]!, solid[3]!]
        : [solid[0]!, solid[1]!, solid[2]!];
    const area = (b.u - a.u) * (c.v - a.v) - (c.u - a.u) * (b.v - a.v);
    const wb = ((u - a.u) * (c.v - a.v) - (v - a.v) * (c.u - a.u)) / area;
    const wc = ((b.u - a.u) * (v - a.v) - (b.v - a.v) * (u - a.u)) / area;
    const wa = 1 - wb - wc;
    if (Math.min(wa, wb, wc) < -1e-8) return undefined;
    return wa * a.y + wb * b.y + wc * c.y;
  }

  function postContact(x: number, z: number, height: number) {
    const localX = x - terrain.origin.x;
    const localZ = z - terrain.origin.z;
    const center = surfaceHeight(localX, localZ);
    if (center !== undefined && Math.abs(center - height) < 0.43) return center;
    const offsets = [-0.095, 0.095];
    const nearby = offsets.flatMap((dx) =>
      offsets.map((dz) => surfaceHeight(localX + dx, localZ + dz)),
    );
    const support = nearby.filter(
      (y): y is number => y !== undefined && Math.abs(y - height) < 0.43,
    );
    return support.length ? Math.max(...support) : height;
  }

  for (const [index, rail] of rails.entries()) {
    const anchors = rail.map(([x, z, height]) => world(x, z, height));
    // Smaller surveys may end partway through a guardrail.
    if (anchors.some((point) => point === null)) continue;
    const posts = anchors.map((anchor, number) => {
      const { x, y, z } = anchor!;
      const [gridX, gridZ] = rail[number]!;
      const leftUpperPost = index === 3 && number === 1;
      // At the upper end the nearby tower tread is above the rail's landing.
      const contact = postContact(gridX, gridZ, y);
      const base = new Vector3(x, contact - 0.012, z);
      const reference = leftUpperPost ? y : Math.max(contact, y);
      const top = new Vector3(
        x,
        reference + (leftUpperPost ? 0.62 : railHeight),
        z,
      );
      return { base, top };
    });
    const guardrail = createPracticeGuardrail(
      scene,
      `practice-rail-${index}`,
      posts,
      paint,
    );
    guardrail.parent = root;
  }

  for (const [index, [x, z]] of peaks.entries()) {
    const point = world(x, z, practiceTowerPlatform.height);
    if (!point) continue;
    const mesh = createPracticeTower(scene, `practice-point-${index}`, stone);
    mesh.position.set(point.x, point.y, point.z);
    mesh.parent = root;
  }
  for (const [index, [x, z]] of practiceChannelSpikes.entries()) {
    const point = world(x, z, 16348);
    if (!point) continue;
    const mesh = createPracticeSpike(
      scene,
      `practice-channel-spike-${index}`,
      stone,
    );
    mesh.position.set(point.x, point.y, point.z);
    mesh.parent = root;
  }
  return root;
}
