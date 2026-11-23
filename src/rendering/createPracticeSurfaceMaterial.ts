import {
  ArcadeTerrainPaint,
  type ArcadePaintLevel,
} from './arcadeTerrainPaint';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { terrainMesh } from '../game/modern/terrainMesh';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  projectPracticePoint,
} from '../game/modern/practiceProjection';

type Surface = 'floor' | 'wall' | 'point';
const floorTexels = 16;
const floorDither = [0, 2, 3, 1] as const;
const wallBands = [
  [254, 237, 0, 255],
  [237, 118, 0, 255],
  [169, 50, 0, 255],
  [244, 156, 13, 255],
] as const;
const wallJoint = [26, 20, 15, 255] as const;

// Side pits use the same projected columns, displaced 24 cells apart.
const sidePits = [
  { minX: 25, maxX: 28, minZ: 12, maxZ: 16, pivot: -12, rowStart: 64 },
  { minX: 13, maxX: 16, minZ: 24, maxZ: 28, pivot: 12, rowStart: 160 },
] as const;
const pitTop = 48;
const pitSpan = 112;
const pitRows = 96;
const wallTextureHeight = 256;
const wallY = 0.125;
const transitionStart = 36;
const transitionEnd = 59;

function pitWallTop(column: number) {
  return 66 + Math.abs(column) * 0.69;
}

function pitWallPixel(column: number, y: number, right: boolean) {
  // The visible trapezoid and highlights were measured in the opening frame.
  const top = pitWallTop(column);
  const bottom = right
    ? Math.min(97 + column * 0.67, 103 - column * 0.68)
    : Math.min(102 + column * 0.67, 98 - column * 0.72);
  if (y < top || y > bottom) return [0, 0, 0, 0];
  if (((column % 8) + 8) % 8 < 1.5) return wallJoint;
  if (column < 0) return wallBands[2];
  const yellow =
    right && column >= 8 && column < 16
      ? y > 75 + (column - 8) * 1.5 && y < 83 + (column - 8) * 1.3
      : column >= (right ? 16 : 8) || y < 66 + 2.05 * column;
  return wallBands[yellow ? 0 : 1];
}

/** Mark the joints between the two courses and between the stones of the skirt. */
export function practiceTowerStone(u: number, v: number) {
  if (v < 0.5) {
    const edge = Math.min(u, 1 - u, (v - 0.035) * 2, (0.465 - v) * 2);
    if (edge < 0.03) return 105;
    if (edge < 0.095) return 174;
  } else {
    const halfWidth = Math.max(0, (0.98 - v) / 0.92);
    const contour = halfWidth - Math.abs(u - 0.5);
    const seam = Math.abs(u - (0.5 - 0.36 * halfWidth));
    if (v < 0.55 || contour < 0.028 || seam < 0.026) return 153;
    if (contour < 0.055 || seam < 0.049) return 199;
  }
  return 244;
}

export function practiceWallBandColor(x: number) {
  const column = x % 16;
  if (column < 2 || column >= 14) return wallJoint;
  // Practice Race cliffs are uniform bright yellow; shadows and light angle produce orange and brown.
  return wallBands[0];
}

export function practiceFloorTone(x: number, y: number) {
  const edge = Math.min(x, y, floorTexels - 1 - x, floorTexels - 1 - y);
  if (edge === 0) return 46;
  if (edge === 1) {
    const along = x === 1 || x === floorTexels - 2 ? y : x;
    const facingLight = x === 1 || y === 1;
    const chip = (along >> 1) % 4 === 2;
    return facingLight ? (chip ? 110 : 150) : chip ? 74 : 105;
  }
  const dither = floorDither[((y & 1) << 1) | (x & 1)]!;
  return 188 + dither * 3;
}

export function createPracticeSurfaceMaterial(
  scene: Scene,
  surface: Surface,
  level: ArcadePaintLevel = 'practice',
) {
  const material = new StandardMaterial(`practice-${surface}`, scene);
  material.specularColor.set(0, 0, 0);
  new ArcadeTerrainPaint(
    material,
    level,
    surface === 'wall' ? 'wall' : 'floor',
  );
  const width = surface === 'floor' ? floorTexels : 64;
  const height = surface === 'wall' ? wallTextureHeight : width;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = 4 * (y * width + x);
      if (surface === 'wall') {
        const pit = y >= sidePits[1].rowStart ? sidePits[1] : sidePits[0];
        const rgba =
          y < sidePits[0].rowStart
            ? practiceWallBandColor(x)
            : pitWallPixel(
                x - 32,
                pitTop + ((y - pit.rowStart + 0.5) * pitSpan) / pitRows,
                pit === sidePits[1],
              );
        pixels.set(rgba, offset);
        continue;
      }
      const grey =
        surface === 'floor'
          ? practiceFloorTone(x, y)
          : practiceTowerStone(x / width, y / height) +
            (((Math.imul(x + 39, y + 95) ^ Math.imul(x + 7, x + y + 13)) & 7) -
              3);
      const grain = Math.min(255, Math.round((Math.max(70, grey) * 255) / 188));
      pixels.fill(grain, offset, offset + 3);
      pixels[offset + 3] = 255;
    }
  }
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    width,
    height,
    scene,
    true,
    false,
    surface === 'floor'
      ? Texture.NEAREST_NEAREST_MIPLINEAR
      : Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = texture.wrapV =
    surface === 'point' ? Texture.CLAMP_ADDRESSMODE : Texture.WRAP_ADDRESSMODE;
  if (surface === 'wall') {
    material.emissiveColor.set(0.36, 0.1, 0.0);
    material.backFaceCulling = false;
    texture.hasAlpha = true;
    // Babylon 9 tests the final alpha; include the atlas cutout alpha in it.
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
  }

  material.diffuseTexture = texture;
  return material;
}

function centralWallBand(x: number, z: number, axis: number) {
  if (axis === 2 && x === 31 && z > 25 && z < 28) return z < 26 ? 1 : 0;
  if (z >= 24.5 && z <= 26.25 && x >= 30 && x < 36)
    return x < 31.4 ? 0 : x < 32.4 ? 1 : 2;
  if (x >= 24.5 && x <= 26.5 && z >= 30 && z < 36)
    return z < 32.5 ? 2 : z < 34 ? 1 : 0;
  if (Math.min(x, z) >= 24.5 && Math.min(x, z) < 26 && Math.max(x, z) < 29)
    return x >= z ? 2 : z < 27 ? 1 : 0;
  if (x >= 25 && x < 34 && z >= 25 && z < 34) return axis === 0 ? 2 : 0;
  return undefined;
}

/** Keep the colored wall courses aligned when a face crosses a cell boundary. */
export function stylePracticeWalls(
  positions: readonly number[],
  uvs: number[],
  xOrigin: number,
  zOrigin: number,
) {
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 12) {
    const dx = positions[i + 3]! - positions[i]!;
    const dz = positions[i + 5]! - positions[i + 2]!;
    const axis = Math.abs(dx) > Math.abs(dz) ? 0 : 2;
    const phase = axis === 0 ? xOrigin + 1 : zOrigin;
    const pit = sidePitAtEdge(positions, i, xOrigin, zOrigin);
    const midX = (positions[i]! + positions[i + 3]!) / 2 + xOrigin;
    const midZ = (positions[i + 2]! + positions[i + 5]!) / 2 + zOrigin;
    const rightCliff = dz === 0 && midZ === 40 && midX >= 18 && midX < 37;
    const leftCliff = dx === 0 && midX === 40 && midZ >= 18 && midZ < 37;
    const leftLip = dz === 0 && midZ === 25 && midX >= 31 && midX < 34;
    const leftReturn = dx === 0 && midX === 31 && midZ > 25 && midZ < 26;
    const fixedBand =
      rightCliff || leftLip
        ? 2
        : leftCliff
          ? 0
          : centralWallBand(midX, midZ, axis);
    const edgeCell = Math.floor(axis === 0 ? midX : midZ);
    // The backlit lip retains the saturated arcade orange under the measured sun.
    const reflectance = leftLip ? 2.35 : 1;
    for (let corner = 0; corner < 4; corner++) {
      colors.push(reflectance, reflectance, reflectance, 1);
      const vertex = i + corner * 3;
      const uv = (i / 3 + corner) * 2;
      if (pit) {
        const x = (positions[vertex]! + xOrigin) * arcadeCellUnits;
        const z = (positions[vertex + 2]! + zOrigin) * arcadeCellUnits;
        const height =
          arcadeGroundHeight +
          (positions[vertex + 1]! * arcadeCellUnits) / arcadeHeightScale;
        const projection = projectPracticePoint(x, z, height);
        const relative = (z - x) / arcadeCellUnits - pit.pivot;
        uvs[uv] = (relative + 4) / 8;
        const row = Math.min(
          pitRows - 1.5,
          Math.max(1.5, ((projection.y - pitTop) * pitRows) / pitSpan),
        );
        uvs[uv + 1] = (pit.rowStart + row) / wallTextureHeight;
      } else {
        const along = positions[vertex + axis]!;
        const band =
          fixedBand === undefined
            ? along + phase
            : fixedBand + along + (axis === 0 ? xOrigin : zOrigin) - edgeCell;
        uvs[uv] = band / 4;
        uvs[uv + 1] = leftReturn
          ? (corner < 2 ? transitionEnd : transitionStart) / wallTextureHeight
          : wallY;
      }
    }
  }
  return colors;
}

function sidePitAtEdge(
  positions: readonly number[],
  offset: number,
  xOrigin: number,
  zOrigin: number,
) {
  const x = (positions[offset]! + positions[offset + 3]!) / 2 + xOrigin;
  const z = (positions[offset + 2]! + positions[offset + 5]!) / 2 + zOrigin;
  return sidePits.find(
    ({ minX, maxX, minZ, maxZ }) =>
      x >= minX && x <= maxX && z >= minZ && z <= maxZ,
  );
}

/** Separate baked side-pit cutouts from shadow-receiving Practice Race cliffs. */
export function splitPracticePitWalls(
  walls: ReturnType<typeof terrainMesh>,
  colors: readonly number[],
  xOrigin: number,
  zOrigin: number,
) {
  const cliffs = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
    colors: [] as number[],
  };
  const pits = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
    colors: [] as number[],
  };
  for (let i = 0; i < walls.positions.length; i += 12) {
    const target = sidePitAtEdge(walls.positions, i, xOrigin, zOrigin)
      ? pits
      : cliffs;
    const baseVertex = target.positions.length / 3;
    const srcVertex = i / 3;
    for (let k = 0; k < 12; k++) target.positions.push(walls.positions[i + k]!);
    for (let k = 0; k < 8; k++) target.uvs.push(walls.uvs[srcVertex * 2 + k]!);
    for (let k = 0; k < 16; k++) target.colors.push(colors[srcVertex * 4 + k]!);
    target.indices.push(
      baseVertex,
      baseVertex + 1,
      baseVertex + 2,
      baseVertex,
      baseVertex + 2,
      baseVertex + 3,
    );
  }
  return { cliffs, pits };
}

/** Continue the paving to the cutout edge on the visible side of each pit. */
export function extendPracticePitRims(
  surface: ReturnType<typeof terrainMesh>,
  walls: readonly number[],
  origin: { x: number; z: number },
  columns: number,
  rows: number,
  base: number,
) {
  const xOrigin = origin.x + columns / 2;
  const zOrigin = origin.z + rows / 2;
  for (let i = 0; i < walls.length; i += 12) {
    if (walls[i + 7] !== base || walls[i + 10] !== base) continue;
    const pit = sidePitAtEdge(walls, i, xOrigin, zOrigin);
    if (!pit) continue;
    const dx = walls[i + 3]! - walls[i]!;
    const dz = walls[i + 5]! - walls[i + 2]!;
    if (dx <= dz) continue;
    const points = [i, i + 3].map((offset) => {
      const x = walls[offset]! + xOrigin;
      const y = walls[offset + 1]!;
      const z = walls[offset + 2]! + zOrigin;
      const projectedY = projectPracticePoint(
        x * arcadeCellUnits,
        z * arcadeCellUnits,
        arcadeGroundHeight + (y * arcadeCellUnits) / arcadeHeightScale,
      ).y;
      const column = (z - x - pit.pivot) * arcadeCellUnits;
      const reach =
        Math.max(0, pitWallTop(column) - projectedY) / arcadeCellUnits;
      return { x, y, z, reach };
    });
    const b = points[0]!;
    const a = points[1]!;
    if (a.reach === 0 && b.reach === 0) continue;
    const start = surface.positions.length / 3;
    for (const [point, reach] of [
      [b, 0],
      [a, 0],
      [a, a.reach],
      [b, b.reach],
    ] as const) {
      surface.positions.push(
        point.x + reach - xOrigin,
        point.y,
        point.z + reach - zOrigin,
      );
      surface.uvs.push(point.x + reach - origin.x, point.z + reach - origin.z);
    }
    if (a.reach > 0) surface.indices.push(start, start + 1, start + 2);
    if (b.reach > 0) surface.indices.push(start, start + 2, start + 3);
  }
}
