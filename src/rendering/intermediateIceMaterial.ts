import { ArcadeTerrainPaint } from './arcadeTerrainPaint';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { intermediateIce } from './intermediateFinish';

// Basin center (99, 101) in local intermediateIce coordinates (origin 90, 95).
// The visual hexagonal rim sits at radius 5, leaving a 1-tile flat cyan margin all around.
const basinCenterX = 9;
const basinCenterZ = 6;
const basinRadius = 5;

export function intermediateIceHeight(
  cell: TerrainCell | undefined,
  s: number,
  t: number,
) {
  const flat = 16116;
  if (!cell) return flat;
  const [nw, ne, se, sw] = cell;
  const a = nw ?? se;
  const c = se ?? nw;
  const b = s >= t ? ne : sw;
  if (a == null || b == null || c == null) return flat;
  // The rendered triangles share the north-west to south-east diagonal.
  const y =
    s >= t
      ? (1 - s) * a + (s - t) * b + t * c
      : (1 - t) * a + (t - s) * b + s * c;
  return arcadeGroundHeight + (y * arcadeCellUnits) / arcadeHeightScale;
}

function joint(n: number) {
  return Math.abs(n - Math.round(n));
}

export function intermediateIcePixel(
  x: number,
  z: number,
  height: number,
  checker: number,
) {
  const dx = x - basinCenterX;
  const dz = z - basinCenterZ;
  const radius = Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx - dz));
  const inBasin = radius < basinRadius - 0.02;
  const upperSlope = height > 16116.5;
  const seam = Math.min(joint(x), joint(z)) < 0.065;
  // Vertical cliff seams visible through the translucent flat ice align with constant (z - x).
  const verticalRib = !inBasin && !upperSlope && joint(z - x) < 0.11;

  // Shade strictly inside the 6-sided hexagonal basin so its silhouette reads as a crisp regular hexagon.
  const leftHalf = inBasin && dx > dz;
  const deepLeft = leftHalf && dx > -0.2 && dz < 0.6 && radius > 0.8;
  const rightHalf = inBasin && dx <= dz;
  const brightWall =
    rightHalf &&
    radius > 1.0 &&
    radius < 4.35 &&
    dz > 0.2 &&
    dx < 0.4 &&
    dz - dx > 1.0;
  const rightRimFlash =
    inBasin && Math.abs(dz - dx - (basinRadius - 0.14)) < 0.14;
  const diagonalGlint =
    rightHalf &&
    radius > 0.9 &&
    radius < 4.1 &&
    dx < -0.3 &&
    dz < 0.4 &&
    Math.abs(((dx + dz * 1.1) % 1.25) + 1.25) % 1.25 < 0.12;

  let glaze = 0;
  if (leftHalf) {
    glaze = deepLeft ? -128 : -80;
  } else if (rightHalf) {
    glaze = dz > 0 && dx < 0 ? 34 : 18;
  } else if (upperSlope) {
    glaze = 28;
  }

  const detail =
    (seam ? -56 : verticalRib ? -46 : 0) +
    checker * (leftHalf ? 14 : upperSlope ? 18 : 8);

  if (
    !seam &&
    ((brightWall && checker) || rightRimFlash || (diagonalGlint && !checker))
  ) {
    return [222, 248, 248, 255];
  }

  return [
    leftHalf ? 2 : upperSlope ? 18 : 6,
    Math.max(12, Math.min(255, 192 + glaze + detail)),
    Math.max(16, Math.min(255, 198 + glaze + detail)),
    255,
  ];
}

const size = 512;
export function createIntermediateIceMaterial(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
) {
  const pixels = new Uint8Array(size * size * 4);
  const region = intermediateIce;
  for (let row = 0; row < size; row++) {
    const z = ((row + 0.5) * region.length) / size;
    for (let column = 0; column < size; column++) {
      const x = ((column + 0.5) * region.width) / size;
      const tileX = Math.floor(x);
      const tileZ = Math.floor(z);
      const height = intermediateIceHeight(
        cells[region.z + tileZ]?.[region.x + tileX],
        x - tileX,
        z - tileZ,
      );
      const checker = (Math.floor(x * 12) ^ Math.floor(z * 12)) & 1;
      pixels.set(
        intermediateIcePixel(x, z, height, checker),
        (row * size + column) * 4,
      );
    }
  }
  const ice = new StandardMaterial('intermediate-ice', scene);
  new ArcadeTerrainPaint(ice, 'intermediate', 'ice');
  const atlas = RawTexture.CreateRGBATexture(
    pixels,
    size,
    size,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  atlas.wrapU = atlas.wrapV = Texture.CLAMP_ADDRESSMODE;
  ice.diffuseTexture = atlas;
  ice.emissiveTexture = atlas;
  ice.emissiveColor.set(0.21, 0.29, 0.3);
  ice.diffuseColor.set(0.31, 0.38, 0.41);
  ice.specularColor.set(0, 0, 0);
  ice.specularPower = 64;
  return ice;
}

export function createIntermediateIceWallMaterial(scene: Scene) {
  const ice = new StandardMaterial('intermediate-ice-lip', scene);
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const seam = x < 2 || x > 29;
      const vein = (x === 9 || x === 10 || x === 23) && y > (x === 23 ? 9 : 4);
      const light = ((x ^ y) & 1) * 5;
      pixels.set(
        y > 29
          ? [14, 171, 169, 255]
          : seam
            ? [2, 62, 67, 255]
            : vein
              ? [9, 184 - y, 179 - y, 255]
              : [8, 147 - y + light, 147 - y + light, 255],
        (y * 32 + x) * 4,
      );
    }
  }
  ice.diffuseTexture = RawTexture.CreateRGBATexture(
    pixels,
    32,
    32,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  ice.emissiveTexture = ice.diffuseTexture;
  ice.emissiveColor.set(0, 0.12, 0.12);
  ice.diffuseColor.set(0, 0.65, 0.65);
  ice.specularColor.set(0, 0, 0);
  ice.backFaceCulling = false;
  return ice;
}
