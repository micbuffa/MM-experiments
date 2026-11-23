import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  practiceWorldPoint,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import {
  hasIntermediateBridge,
  intermediateBridgeCell,
} from './createIntermediateBridge';
import {
  createIntermediateTower,
  createIntermediateTowerMaterial,
} from './createIntermediateTower';
import { intermediateSunDirection } from './createPracticeSun';
import {
  intermediateFinishCell,
  intermediatePlatformCell,
  intermediateRimCell,
  intermediateWaveCell,
} from './intermediateRims';

const towers = [
  [45, 45],
  [54, 43],
  [43, 54],
] as const;
const floor = 16264;
const plinth = floor + 8;
const floorY =
  ((floor - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
const plinthY =
  ((plinth - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
// Each row gives the first and last tile along X, relative to the apex.
const plinthRows = [
  [-2, 0],
  [-2, 1],
  [-2, 1],
  [-1, 1],
] as const;

function bridgeRise(x: number) {
  if (x < 34) return 40 + (34 - x) * 4;
  if (x <= 37) return 40;
  return (47 - x) * 4;
}

export function intermediateDisplayTerrain(terrain: PracticeTerrain) {
  const bridgePresent = hasIntermediateBridge(terrain);
  return terrain.cells.map((row, z) =>
    row.map((sample, x): TerrainCell => {
      if (z >= 34 && z <= 36 && x >= 23 && x < 47) {
        // The three paved lanes share the same height profile across the bridge.
        const left =
          floorY + (bridgeRise(x) * arcadeHeightScale) / arcadeCellUnits;
        const right =
          floorY + (bridgeRise(x + 1) * arcadeHeightScale) / arcadeCellUnits;
        return [left, right, right, left];
      }
      const bridge = bridgePresent ? intermediateBridgeCell(x, z) : undefined;
      if (bridge !== undefined) return bridge;
      // Hide internal collision cells inside the Y-pipe intakes and outlet so the
      // pipe joins the cliff and lower floor flush instead of resting on protruding ledges.
      if (
        terrain.pipes &&
        (((z === 85 || z === 86) &&
          ((x >= 79 && x <= 81) || (x >= 85 && x <= 87))) ||
          (z >= 91 && z <= 94 && x >= 82 && x <= 84))
      )
        return null;
      const cell =
        intermediatePlatformCell(terrain.cells, x, z) ??
        intermediateWaveCell(
          intermediateFinishCell(
            intermediateRimCell(sample, x, z),
            terrain.cells,
            x,
            z,
          ),
          x,
          z,
        );
      const anchor = towers.find(
        ([tx, tz]) => x >= tx - 2 && x <= tx + 1 && z >= tz - 3 && z <= tz + 1,
      );
      if (!anchor || !cell) return cell;
      const dx = x - anchor[0];
      const dz = z - anchor[1];
      const span = plinthRows[dz + 2];
      const onPlinth = span && dx >= span[0] && dx <= span[1];
      if (onPlinth && cell.some((height) => height !== null))
        return [plinthY, plinthY, plinthY, plinthY];
      const [nw, ne, se, sw] = cell;
      return [
        nw === null ? null : floorY,
        ne === null ? null : floorY,
        se === null ? null : floorY,
        sw === null ? null : floorY,
      ];
    }),
  );
}

export function createIntermediateTowers(
  scene: Scene,
  terrain: PracticeTerrain,
) {
  const stone = createIntermediateTowerMaterial(scene);
  return towers.flatMap(([x, z], i) => {
    const point = practiceWorldPoint(
      x * arcadeCellUnits,
      z * arcadeCellUnits,
      plinth,
      terrain.cells[0]!.length,
      terrain.cells.length,
      terrain.origin,
    );
    if (!point) return [];
    const tower = createIntermediateTower(
      scene,
      `intermediate-tower-${i}`,
      stone,
    );
    tower.position.set(point.x, point.y, point.z);
    return [tower];
  });
}

const alcoveX = 88;
const alcoveStartZ = 76;
const alcoveEndZ = 83;
const alcoveDepth = 3;
const alcoveTopY =
  ((16176 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
const alcoveLintelY = alcoveTopY - 2.0;
const alcoveShelfY = alcoveTopY - 10.2;
const alcoveOpenings = [
  [alcoveLintelY, alcoveShelfY],
  [alcoveShelfY - 3.2, alcoveShelfY - 9.0],
] as const;

/** Boost diffuse contrast on Intermediate Race slopes so waves read white-to-charcoal like arcade. */
export function intermediateSlopeColors(normals: ArrayLike<number>) {
  const ray = intermediateSunDirection();
  const lx = -ray.x;
  const lz = -ray.z;
  const colors: number[] = [];
  for (let i = 0; i < normals.length; i += 3) {
    const tilt = normals[i]! * lx + normals[i + 2]! * lz;
    const shade =
      tilt > 0
        ? Math.min(1.45, 0.8 + tilt * 3.6)
        : Math.max(0.46, 0.8 + tilt * 3.4);
    colors.push(shade, shade, shade, 1);
  }
  return colors;
}

function pushWallQuad(
  target: ReturnType<typeof terrainMesh>,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  top: number,
  bottom: number,
  uSpan: number,
) {
  const start = target.positions.length / 3;
  const height = top - bottom;
  target.positions.push(
    ax,
    top,
    az,
    bx,
    top,
    bz,
    bx,
    bottom,
    bz,
    ax,
    bottom,
    az,
  );
  target.uvs.push(uSpan, height, 0, height, 0, 0, uSpan, 0);
  target.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
}

/** Carve the recessed rectangular alcove in the tall blue wall behind the ice basin. */
export function carveIntermediateAlcove(
  walls: ReturnType<typeof terrainMesh>,
  columns: number,
  rows: number,
) {
  const xOrigin = columns / 2;
  const zOrigin = rows / 2;
  const wx = alcoveX - xOrigin;
  const startZ = alcoveStartZ - zOrigin;
  const endZ = alcoveEndZ - zOrigin;
  const out: ReturnType<typeof terrainMesh> = {
    positions: [],
    indices: [],
    uvs: [],
  };
  let carved = false;
  for (let i = 0; i < walls.positions.length; i += 12) {
    const ax = walls.positions[i]!;
    const top = walls.positions[i + 1]!;
    const az = walls.positions[i + 2]!;
    const bx = walls.positions[i + 3]!;
    const bz = walls.positions[i + 5]!;
    const bottom = walls.positions[i + 7]!;
    const minZ = Math.min(az, bz);
    const maxZ = Math.max(az, bz);
    const inAlcove =
      Math.abs(ax - wx) < 0.01 &&
      Math.abs(bx - wx) < 0.01 &&
      minZ >= startZ - 0.01 &&
      maxZ <= endZ + 0.01 &&
      top > alcoveLintelY;
    if (inAlcove) {
      carved = true;
      let frontTop = top;
      for (const [ceiling, shelf] of alcoveOpenings) {
        pushWallQuad(out, ax, az, bx, bz, frontTop, ceiling, 1);
        pushWallQuad(
          out,
          ax - alcoveDepth,
          az,
          bx - alcoveDepth,
          bz,
          ceiling,
          shelf,
          1,
        );
        frontTop = shelf;
      }
      pushWallQuad(out, ax, az, bx, bz, frontTop, bottom, 1);
      continue;
    }
    const start = out.positions.length / 3;
    const srcVertex = i / 3;
    for (let k = 0; k < 12; k++) out.positions.push(walls.positions[i + k]!);
    for (let k = 0; k < 8; k++) out.uvs.push(walls.uvs[srcVertex * 2 + k]!);
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  if (carved)
    for (const [ceiling, shelf] of alcoveOpenings) {
      pushWallQuad(
        out,
        wx - alcoveDepth,
        startZ,
        wx,
        startZ,
        ceiling,
        shelf,
        alcoveDepth,
      );
      pushWallQuad(
        out,
        wx,
        endZ,
        wx - alcoveDepth,
        endZ,
        ceiling,
        shelf,
        alcoveDepth,
      );
    }
  return { cliffs: out, carved };
}

/** Decorative gray tiled shelf seated inside the blue wall alcove behind the ice. */
export function createIntermediateAlcoveShelf(
  scene: Scene,
  paving: StandardMaterial,
  columns: number,
  rows: number,
) {
  return alcoveOpenings.map(([, height], index) => {
    const flat: TerrainCell = [height, height, height, height];
    const shelfCells = Array.from({ length: alcoveEndZ - alcoveStartZ }, () =>
      Array<TerrainCell>(alcoveDepth).fill(flat),
    );
    const geometry = terrainMesh(shelfCells);
    const mesh = new Mesh(
      index === 0
        ? 'intermediate-alcove-shelf'
        : 'intermediate-alcove-shelf-lower',
      scene,
    );
    const data = new VertexData();
    Object.assign(data, geometry);
    data.normals = [];
    VertexData.ComputeNormals(
      geometry.positions,
      geometry.indices,
      data.normals,
    );
    data.applyToMesh(mesh);
    mesh.position.set(
      alcoveX - alcoveDepth / 2 - columns / 2,
      0,
      (alcoveStartZ + alcoveEndZ) / 2 - rows / 2,
    );
    mesh.material = paving;
    mesh.receiveShadows = true;
    return mesh;
  });
}
