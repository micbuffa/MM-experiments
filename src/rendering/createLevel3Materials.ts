import { ArcadeTerrainPaint } from './arcadeTerrainPaint';
import { widenLevel3Pipe } from './widenLevel3Pipe';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { practiceFloorTone } from './createPracticeSurfaceMaterial';

const surveyDiagonal = 21;
export const level3Goal = { x: 92, z: 101, width: 4, length: 10 };
export const waveRegion = { x: 81, z: 76, width: 4, length: 22 };
const level3Height = (arcade: number) =>
  ((arcade - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
const waveBaseY = level3Height(16148);
const waveMaxHeight = level3Height(16148 + 30) - waveBaseY;
const towerTopY = level3Height(16408);
const archProfile = [24, 22, 17, 8, -1, -6, -8].map((d) =>
  level3Height(16384 + d),
);

/** Warm sandy-tan stone paving matching Arcade Level 3. */
export function createLevel3FloorMaterial(scene: Scene) {
  const size = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tone = practiceFloorTone(x, y);
      const offset = (y * size + x) * 4;
      const grain = Math.min(255, Math.round((Math.max(70, tone) * 255) / 188));
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = grain;
      pixels[offset + 3] = 255;
    }
  }
  const material = new StandardMaterial('level3-floor', scene);
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    size,
    size,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  material.diffuseTexture = texture;
  material.specularColor.set(0, 0, 0);
  new ArcadeTerrainPaint(material, 'level3', 'floor');
  return material;
}

/** Warm brown-slate vertical striped cliff walls matching Arcade Level 3. */
export function createLevel3CliffMaterial(scene: Scene) {
  const pixels = new Uint8Array(8 * 4);
  for (let x = 0; x < 8; x++) {
    pixels.set(
      x === 0 || x === 7 ? [0, 0, 0, 255] : [255, 255, 255, 255],
      x * 4,
    );
  }
  const material = new StandardMaterial('level3-cliffs', scene);
  new ArcadeTerrainPaint(material, 'level3', 'wall');
  material.twoSidedLighting = true;
  material.diffuseTexture = RawTexture.CreateRGBATexture(
    pixels,
    8,
    1,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  material.specularColor.set(0, 0, 0);
  material.emissiveColor.set(0.025, 0.021, 0.016);
  material.backFaceCulling = false;
  return material;
}

/**
 * Clean Level 3 rim cells where the collision survey sampled a single corner of a
 * deep trench below a raised rim, and clip the outer ±21 survey diagonals.
 */
export function level3DisplayTerrain(
  cells: readonly (readonly TerrainCell[])[],
): TerrainCell[][] {
  return cells.map((row, z) =>
    row.map((cell, x): TerrainCell => {
      if (!cell) return null;
      // Opening left tower top (x=20..23, z=7..10) and right tower top (x=6..9, z=21..24).
      if (
        (x >= 20 && x <= 23 && z >= 7 && z <= 10) ||
        (x >= 6 && x <= 9 && z >= 21 && z <= 24)
      ) {
        return [towerTopY, towerTopY, towerTopY, towerTopY];
      }
      // Opening right arched ramp (x=10..15, z=22..23): restore smooth planar steps matching left ramp.
      if (x >= 10 && x <= 15 && (z === 22 || z === 23)) {
        const a = archProfile[x - 10]!;
        const b = archProfile[x - 9]!;
        return [a, b, b, a];
      }
      // Opening left arched ramp (x=21..22, z=11..16): ensure clean planar steps.
      if ((x === 21 || x === 22) && z >= 11 && z <= 16) {
        const a = archProfile[z - 11]!;
        const b = archProfile[z - 10]!;
        return [a, a, b, b];
      }
      // Two asymmetrical chamfered bumps on the amoeba terrace (matching MarbleMadness_Level3.png):
      // Bump 1: x=63..68, z=61..66 with 2-tile diagonal cut on NE corner (gx - gz <= 4)
      // Bump 2: x=66..71, z=72..77 with 2-tile diagonal cut on SW corner (gz - gx <= 8)
      if (x >= 63 && x <= 68 && z >= 61 && z <= 66) {
        const hBase = level3Height(16320);
        const hTop = level3Height(16326);
        const corner = (gx: number, gz: number) =>
          gx > 63 && gx < 69 && gz > 61 && gz < 67 && gx - gz <= 4
            ? hTop
            : hBase;
        return [
          corner(x, z),
          corner(x + 1, z),
          corner(x + 1, z + 1),
          corner(x, z + 1),
        ];
      }
      if (x >= 66 && x <= 71 && z >= 72 && z <= 77) {
        const hBase = level3Height(16320);
        const hTop = level3Height(16326);
        const corner = (gx: number, gz: number) =>
          gx > 66 && gx < 72 && gz > 72 && gz < 78 && gz - gx <= 8
            ? hTop
            : hBase;
        return [
          corner(x, z),
          corner(x + 1, z),
          corner(x + 1, z + 1),
          corner(x, z + 1),
        ];
      }
      // Move the three-row spur one tile toward +Z, along with the copper pipe.
      // The approach now has seven tiles before the spur. Its far rim at Z=83
      // touches the existing right terrace instead of leaving a one-tile gap.
      if (x >= 76 && x <= 78 && z >= 75 && z <= 82) {
        const y = level3Height(z >= 76 && z <= 78 ? 16320 : 16196);
        return [y, y, y, y];
      }
      // Right mini-worm steep ramp (x=30..35, z=43..44): keep both lanes planar along X.
      if (x >= 30 && x <= 35 && (z === 43 || z === 44)) {
        const [nw, ne] = cell;
        if (nw !== null && ne !== null) return [nw, ne, ne, nw];
      }
      // Final turquoise wavy curbs along X (z=85, x=96..101 and z=92, x=89..98):
      // their SW corner sampled the lower chute beside them; keep each curb tile planar along X.
      if (
        (z === 85 && x >= 96 && x <= 101) ||
        (z === 92 && x >= 89 && x <= 98)
      ) {
        const [nw, ne] = cell;
        if (nw !== null && ne !== null) return [nw, ne, ne, nw];
      }
      // Central V-junction cap base (99, 92): flatten to 16124 so no corner protrudes past the pyramid cap.
      if (x === 99 && z === 92) {
        const h = level3Height(16124);
        return [h, h, h, h];
      }
      // Chute entry and lane cells along X: their SW corner sampled the adjacent curb or lower step;
      // keep each chute slope cell smoothly planar along X ([nw, ne, ne, nw]).
      if (
        (x === 92 && z === 94) ||
        (x === 99 && z === 87) ||
        (z === 86 && x >= 96 && x <= 99) ||
        (z === 93 && ((x >= 89 && x <= 92) || (x >= 95 && x <= 98)))
      ) {
        const [nw, ne] = cell;
        if (nw !== null && ne !== null) return [nw, ne, ne, nw];
      }
      let [nw, ne, se, sw] = cell;
      // The early labyrinth has a low corridor beside the 16384 plateau.
      // SW sometimes samples that plateau instead of the corridor. Restore
      // the plane from its three coherent low samples, not a wall-height ramp.
      if (
        x >= 16 &&
        x <= 42 &&
        z >= 18 &&
        z <= 44 &&
        nw !== null &&
        ne !== null &&
        se !== null &&
        sw !== null &&
        Math.abs(sw - level3Height(16384)) < 0.001 &&
        Math.max(nw, ne, se) < level3Height(16384) - 0.5 &&
        Math.max(nw, ne, se) - Math.min(nw, ne, se) < 0.3
      )
        sw = nw + (se - ne);

      if (Math.abs(x - z) < surveyDiagonal) {
        // Restore missing SW corner on rectilinear +Z cliff rims to eliminate sawtooth walls.
        if (nw !== null && ne !== null && se !== null && sw === null) {
          sw = nw + (se - ne);
        }
        // Unbend steep X-sloping ramp cells where the survey sampled SW at the lower NE height
        // (threshold > 0.5 preserves gentle 6-unit bumps on the amoeba terrace).
        if (
          nw !== null &&
          ne !== null &&
          se !== null &&
          sw !== null &&
          Math.abs(ne - se) < 0.001 &&
          Math.abs(sw - ne) < 0.001 &&
          Math.abs(nw - ne) > 0.5
        ) {
          sw = nw;
        }
      }
      if (nw !== null && ne !== null && se !== null && sw !== null) {
        const heights = [nw, ne, se, sw] as const;
        const maxH = Math.max(nw, ne, se, sw);
        const lowIndices: number[] = [];
        const highValues: number[] = [];
        for (let i = 0; i < 4; i++) {
          if (maxH - heights[i]! > 0.55) lowIndices.push(i);
          else highValues.push(heights[i]!);
        }
        // Only flatten a single outlier corner when the other 3 corners form a coherent rim.
        if (
          lowIndices.length === 1 &&
          Math.max(...highValues) - Math.min(...highValues) <= 0.35
        ) {
          const avg =
            highValues.reduce((sum, v) => sum + v, 0) / highValues.length;
          if (lowIndices[0] === 0) nw = avg;
          else if (lowIndices[0] === 1) ne = avg;
          else if (lowIndices[0] === 2) se = avg;
          else sw = avg;
        }
      }
      if (x - z === surveyDiagonal) return [nw, null, se, sw];
      if (z - x === surveyDiagonal) return [nw, ne, se, null];
      return [nw, ne, se, sw];
    }),
  );
}

/** Remove raw full-depth cliffs under the two opening towers and arched ramps. */
export function stripLevel3OpeningCliffs(
  walls: { positions: number[]; indices: number[]; uvs: number[] },
  columns: number,
  rows: number,
) {
  const xOff = columns / 2;
  const zOff = rows / 2;
  const out = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
  };
  for (let i = 0; i < walls.positions.length; i += 12) {
    const mx = (walls.positions[i]! + walls.positions[i + 3]!) / 2 + xOff;
    const mz = (walls.positions[i + 2]! + walls.positions[i + 5]!) / 2 + zOff;
    const inLeftTower = mx >= 19.9 && mx <= 24.1 && mz >= 6.9 && mz <= 11.1;
    const inLeftRamp = mx >= 20.9 && mx <= 23.1 && mz >= 10.9 && mz <= 17.05;
    const inRightTower = mx >= 5.9 && mx <= 10.1 && mz >= 20.9 && mz <= 25.1;
    const inRightRamp = mx >= 9.9 && mx <= 16.05 && mz >= 21.9 && mz <= 24.1;
    if (inLeftTower || inLeftRamp || inRightTower || inRightRamp) continue;
    const start = out.positions.length / 3;
    const srcVertex = i / 3;
    for (let k = 0; k < 12; k++) out.positions.push(walls.positions[i + k]!);
    for (let k = 0; k < 8; k++) out.uvs.push(walls.uvs[srcVertex * 2 + k]!);
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return out;
}

/** Medieval stone tower trim texture: warm slate shaft with sandy-tan outer pilasters and corbel flutes. */
function createLevel3TowerMaterial(scene: Scene) {
  const width = 64;
  const height = 128;
  const pixels = new Uint8Array(width * height * 4);
  const slate = [82, 76, 66, 255] as const;
  const trim = [142, 126, 94, 255] as const;
  const seam = [26, 22, 16, 255] as const;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x < 3 || x >= width - 3;
      const centerPilaster = Math.abs(x - width / 2) < 2;
      const corbelBand = y < 6 || (y >= 26 && y < 30);
      const flute = y < 26 && x % 12 < 3;
      const darkLine =
        x === 3 ||
        x === width - 4 ||
        x === width / 2 - 2 ||
        x === width / 2 + 2;
      const color =
        edge || centerPilaster || corbelBand || flute
          ? trim
          : darkLine
            ? seam
            : slate;
      pixels.set(color, (y * width + x) * 4);
    }
  }
  const material = new StandardMaterial('level3-tower-stone', scene);
  new ArcadeTerrainPaint(material, 'level3', 'tower');
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    width,
    height,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  material.diffuseTexture = texture;
  material.emissiveColor.set(0.14, 0.135, 0.115);
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  return material;
}

/** Curved stone arch texture: dark slate with 1 sandy-tan voussoir joint per tile and curved lower rim. */
function createLevel3ArchMaterial(scene: Scene) {
  const width = 32;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  const slate = [78, 72, 62, 255] as const;
  const trim = [142, 126, 94, 255] as const;
  const seam = [24, 20, 14, 255] as const;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const joint = x < 3;
      const rim = y >= height - 5;
      const dark = x === 3 || y === height - 6;
      const color = joint || rim ? trim : dark ? seam : slate;
      pixels.set(color, (y * width + x) * 4);
    }
  }
  const material = new StandardMaterial('level3-arch-stone', scene);
  new ArcadeTerrainPaint(material, 'level3', 'tower');
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    width,
    height,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  material.diffuseTexture = texture;
  material.emissiveColor.set(0.14, 0.135, 0.115);
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  return material;
}

const level3NicheRows = [
  // Left zigzag wall (+X face)
  { axis: 'x' as const, coord: 50, min: 35.9, max: 50.1, parity: 1 },
  // Right zigzag wall (+Z face)
  { axis: 'z' as const, coord: 60, min: 43.9, max: 58.1, parity: 0 },
  // Left amoeba terrace wall (+X face, extends right up to the corner)
  { axis: 'x' as const, coord: 73, min: 55.9, max: 67.1, parity: 0 },
  // Left pipe approach wall (+X face)
  { axis: 'x' as const, coord: 76, min: 67.9, max: 74.1, parity: 0 },
  // Right amoeba terrace wall (+Z face, full row up to the pipe pillar)
  { axis: 'z' as const, coord: 82, min: 61.9, max: 72.1, parity: 0 },
  // Right pipe pillar wall (+Z face, full row to the outer edge)
  { axis: 'z' as const, coord: 86, min: 72.9, max: 78.1, parity: 0 },
];

/** Carve recessed medieval colonnade niches into the tall Level 3 cliff walls (matching MarbleMadness_Level3.png). */
export function carveLevel3WallNiches(
  walls: { positions: number[]; indices: number[]; uvs: number[] },
  columns: number,
  rows: number,
) {
  const xOff = columns / 2;
  const zOff = rows / 2;
  const topY = level3Height(16320);
  const lintelY = topY - 0.14;
  const sillY = topY - 3.6;
  const depth = 0.78;
  const out = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
  };
  function pushWall(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    y0: number,
    y1: number,
    uSpan: number,
  ) {
    const start = out.positions.length / 3;
    out.positions.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az);
    out.uvs.push(uSpan, y0 - y1, 0, y0 - y1, 0, 0, uSpan, 0);
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  function pushSill(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    x3: number,
    z3: number,
  ) {
    const start = out.positions.length / 3;
    out.positions.push(
      x0,
      sillY,
      z0,
      x1,
      sillY,
      z1,
      x2,
      sillY,
      z2,
      x3,
      sillY,
      z3,
    );
    out.uvs.push(0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0);
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  for (let i = 0; i < walls.positions.length; i += 12) {
    const ax = walls.positions[i]!;
    const y0 = walls.positions[i + 1]!;
    const az = walls.positions[i + 2]!;
    const bx = walls.positions[i + 3]!;
    const bz = walls.positions[i + 5]!;
    const y1 = walls.positions[i + 7]!;
    let carved = false;
    if (y0 > lintelY && y1 < sillY) {
      const minX = Math.min(ax, bx) + xOff;
      const maxX = Math.max(ax, bx) + xOff;
      const minZ = Math.min(az, bz) + zOff;
      const maxZ = Math.max(az, bz) + zOff;
      for (const row of level3NicheRows) {
        if (
          row.axis === 'x' &&
          Math.abs(ax - (row.coord - xOff)) < 0.05 &&
          Math.abs(bx - (row.coord - xOff)) < 0.05 &&
          minZ >= row.min &&
          maxZ <= row.max &&
          Math.floor(minZ + 0.1) % 2 === row.parity
        ) {
          pushWall(ax, az, bx, bz, y0, lintelY, 1);
          pushWall(ax, az, bx, bz, sillY, y1, 1);
          pushWall(ax - depth, az, bx - depth, bz, lintelY, sillY, 1);
          pushWall(
            ax - depth,
            minZ - zOff,
            ax,
            minZ - zOff,
            lintelY,
            sillY,
            depth,
          );
          pushWall(
            ax,
            maxZ - zOff,
            ax - depth,
            maxZ - zOff,
            lintelY,
            sillY,
            depth,
          );
          pushSill(
            ax - depth,
            minZ - zOff,
            ax,
            minZ - zOff,
            ax,
            maxZ - zOff,
            ax - depth,
            maxZ - zOff,
          );
          carved = true;
          break;
        }
        if (
          row.axis === 'z' &&
          Math.abs(az - (row.coord - zOff)) < 0.05 &&
          Math.abs(bz - (row.coord - zOff)) < 0.05 &&
          minX >= row.min &&
          maxX <= row.max &&
          Math.floor(minX + 0.1) % 2 === row.parity
        ) {
          pushWall(ax, az, bx, bz, y0, lintelY, 1);
          pushWall(ax, az, bx, bz, sillY, y1, 1);
          pushWall(ax, az - depth, bx, bz - depth, lintelY, sillY, 1);
          pushWall(
            minX - xOff,
            az,
            minX - xOff,
            az - depth,
            lintelY,
            sillY,
            depth,
          );
          pushWall(
            maxX - xOff,
            az - depth,
            maxX - xOff,
            az,
            lintelY,
            sillY,
            depth,
          );
          pushSill(
            minX - xOff,
            az - depth,
            maxX - xOff,
            az - depth,
            maxX - xOff,
            az,
            minX - xOff,
            az,
          );
          carved = true;
          break;
        }
      }
    }
    if (carved) continue;
    const start = out.positions.length / 3;
    const srcVertex = i / 3;
    for (let k = 0; k < 12; k++) out.positions.push(walls.positions[i + k]!);
    for (let k = 0; k < 8; k++) out.uvs.push(walls.uvs[srcVertex * 2 + k]!);
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return out;
}

/** Build the two flared medieval stone towers with arrow-slit windows and open arched bridges. */
export function createLevel3OpeningTowers(
  scene: Scene,
  columns: number,
  rows: number,
  base: number,
) {
  const towerMaterial = createLevel3TowerMaterial(scene);
  const archMaterial = createLevel3ArchMaterial(scene);
  const xOff = columns / 2;
  const zOff = rows / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const archPositions: number[] = [];
  const archIndices: number[] = [];
  const archUvs: number[] = [];
  const framePositions: number[] = [];
  const frameIndices: number[] = [];
  const windowPositions: number[] = [];
  const windowIndices: number[] = [];

  function pushQuad(
    p: number[],
    idx: number[],
    uv: number[] | null,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
    vTop = 0,
    vBot = 1,
  ) {
    const start = p.length / 3;
    p.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
    if (uv) uv.push(0, vTop, 1, vTop, 1, vBot, 0, vBot);
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  // Two flared 4x4 -> 2.6x2.6 towers with Gothic arrow-slit windows.
  const towers = [
    { cx: 22 - xOff, cz: 9 - zOff },
    { cx: 8 - xOff, cz: 23 - zOff },
  ];
  const corbelSteps = [
    { dy: 0, half: 2.0 },
    { dy: 0.55, half: 1.72 },
    { dy: 1.25, half: 1.46 },
    { dy: 2.1, half: 1.3 },
  ];
  for (const { cx, cz } of towers) {
    // Flared capital / corbel
    for (let s = 0; s < corbelSteps.length - 1; s++) {
      const top = corbelSteps[s]!;
      const bot = corbelSteps[s + 1]!;
      const y0 = towerTopY - top.dy;
      const y1 = towerTopY - bot.dy;
      const h0 = top.half;
      const h1 = bot.half;
      const faces = [
        [
          cx - h0,
          cz + h0,
          cx + h0,
          cz + h0,
          cx + h1,
          cz + h1,
          cx - h1,
          cz + h1,
        ],
        [
          cx + h0,
          cz + h0,
          cx + h0,
          cz - h0,
          cx + h1,
          cz - h1,
          cx + h1,
          cz + h1,
        ],
        [
          cx + h0,
          cz - h0,
          cx - h0,
          cz - h0,
          cx - h1,
          cz - h1,
          cx + h1,
          cz - h1,
        ],
        [
          cx - h0,
          cz - h0,
          cx - h0,
          cz + h0,
          cx - h1,
          cz + h1,
          cx - h1,
          cz - h1,
        ],
      ] as const;
      for (const f of faces) {
        pushQuad(
          positions,
          indices,
          uvs,
          f[0],
          y0,
          f[1],
          f[2],
          y0,
          f[3],
          f[4],
          y1,
          f[5],
          f[6],
          y1,
          f[7],
          (top.dy / 2.1) * 0.234,
          (bot.dy / 2.1) * 0.234,
        );
      }
    }
    // Tall 2.6x2.6 shaft down to base
    const sh = 1.3;
    const shaftTop = towerTopY - 2.1;
    const shaftFaces = [
      [cx - sh, cz + sh, cx + sh, cz + sh],
      [cx + sh, cz + sh, cx + sh, cz - sh],
      [cx + sh, cz - sh, cx - sh, cz - sh],
      [cx - sh, cz - sh, cx - sh, cz + sh],
    ] as const;
    for (const [ax, az, bx, bz] of shaftFaces) {
      pushQuad(
        positions,
        indices,
        uvs,
        ax,
        shaftTop,
        az,
        bx,
        shaftTop,
        bz,
        bx,
        base,
        bz,
        ax,
        base,
        az,
        0.234,
        1,
      );
    }
    // Tapered Gothic lancet arrow-slit windows with lighter sandy-tan stone border frames (matching ad590346.png).
    const wTop = shaftTop - 1.3;
    const wMid = shaftTop - 2.0;
    const wBot = shaftTop - 3.3;
    const wHalf = 0.25;
    const wTopHalf = 0.1;
    const fPad = 0.13;
    const fTop = wTop + 0.15;
    const fMid = wMid + 0.05;
    const fBot = wBot - 0.15;
    const fHalf = wHalf + fPad;
    const fTopHalf = wTopHalf + fPad * 0.85;
    const isLeftTower = cx > cz;
    if (isLeftTower) {
      // +X outer face: sandy-tan border frame (0.015) + dark lancet slit (0.028)
      pushQuad(
        framePositions,
        frameIndices,
        null,
        cx + sh + 0.015,
        fMid,
        cz + fHalf,
        cx + sh + 0.015,
        fMid,
        cz - fHalf,
        cx + sh + 0.015,
        fBot,
        cz - fHalf,
        cx + sh + 0.015,
        fBot,
        cz + fHalf,
      );
      pushQuad(
        framePositions,
        frameIndices,
        null,
        cx + sh + 0.015,
        fTop,
        cz + fTopHalf,
        cx + sh + 0.015,
        fTop,
        cz - fTopHalf,
        cx + sh + 0.015,
        fMid,
        cz - fHalf,
        cx + sh + 0.015,
        fMid,
        cz + fHalf,
      );
      pushQuad(
        windowPositions,
        windowIndices,
        null,
        cx + sh + 0.028,
        wMid,
        cz + wHalf,
        cx + sh + 0.028,
        wMid,
        cz - wHalf,
        cx + sh + 0.028,
        wBot,
        cz - wHalf,
        cx + sh + 0.028,
        wBot,
        cz + wHalf,
      );
      pushQuad(
        windowPositions,
        windowIndices,
        null,
        cx + sh + 0.028,
        wTop,
        cz + wTopHalf,
        cx + sh + 0.028,
        wTop,
        cz - wTopHalf,
        cx + sh + 0.028,
        wMid,
        cz - wHalf,
        cx + sh + 0.028,
        wMid,
        cz + wHalf,
      );
    } else {
      // +Z outer face: sandy-tan border frame (0.015) + dark lancet slit (0.028)
      pushQuad(
        framePositions,
        frameIndices,
        null,
        cx - fHalf,
        fMid,
        cz + sh + 0.015,
        cx + fHalf,
        fMid,
        cz + sh + 0.015,
        cx + fHalf,
        fBot,
        cz + sh + 0.015,
        cx - fHalf,
        fBot,
        cz + sh + 0.015,
      );
      pushQuad(
        framePositions,
        frameIndices,
        null,
        cx - fTopHalf,
        fTop,
        cz + sh + 0.015,
        cx + fTopHalf,
        fTop,
        cz + sh + 0.015,
        cx + fHalf,
        fMid,
        cz + sh + 0.015,
        cx - fHalf,
        fMid,
        cz + sh + 0.015,
      );
      pushQuad(
        windowPositions,
        windowIndices,
        null,
        cx - wHalf,
        wMid,
        cz + sh + 0.028,
        cx + wHalf,
        wMid,
        cz + sh + 0.028,
        cx + wHalf,
        wBot,
        cz + sh + 0.028,
        cx - wHalf,
        wBot,
        cz + sh + 0.028,
      );
      pushQuad(
        windowPositions,
        windowIndices,
        null,
        cx - wTopHalf,
        wTop,
        cz + sh + 0.028,
        cx + wTopHalf,
        wTop,
        cz + sh + 0.028,
        cx + wHalf,
        wMid,
        cz + sh + 0.028,
        cx - wHalf,
        wMid,
        cz + sh + 0.028,
      );
    }
  }

  // Curved Gothic stone buttress arches under the two opening ramps:
  // wide open parabolic vault over the first 4 tiles, then a solid stone pier at the foot.
  const archDrop = [0.95, 0.65, 0.72, 1.15, 3.6, 12.0, 22.0] as const;
  const archBotY = (i: number) =>
    Math.max(base, archProfile[i]! - archDrop[i]!);
  // Left ramp: x = 21..23, z = 11..17
  for (let i = 0; i < archProfile.length - 1; i++) {
    const y0 = archProfile[i]!;
    const y1 = archProfile[i + 1]!;
    const b0 = archBotY(i);
    const b1 = archBotY(i + 1);
    const z0 = 11 + i - zOff;
    const z1 = 12 + i - zOff;
    const xL = 21 - xOff;
    const xR = 23 - xOff;
    // +X side face
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      xR,
      y0,
      z0,
      xR,
      y1,
      z1,
      xR,
      b1,
      z1,
      xR,
      b0,
      z0,
      0,
      1,
    );
    // -X side face
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      xL,
      y1,
      z1,
      xL,
      y0,
      z0,
      xL,
      b0,
      z0,
      xL,
      b1,
      z1,
      0,
      1,
    );
    // Underside soffit
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      xL,
      b0,
      z0,
      xR,
      b0,
      z0,
      xR,
      b1,
      z1,
      xL,
      b1,
      z1,
      0,
      0.2,
    );
  }
  // Right ramp: x = 10..16, z = 22..24
  for (let i = 0; i < archProfile.length - 1; i++) {
    const y0 = archProfile[i]!;
    const y1 = archProfile[i + 1]!;
    const b0 = archBotY(i);
    const b1 = archBotY(i + 1);
    const x0 = 10 + i - xOff;
    const x1 = 11 + i - xOff;
    const zB = 22 - zOff;
    const zF = 24 - zOff;
    // +Z side face
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      x0,
      y0,
      zF,
      x1,
      y1,
      zF,
      x1,
      b1,
      zF,
      x0,
      b0,
      zF,
      0,
      1,
    );
    // -Z side face
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      x1,
      y1,
      zB,
      x0,
      y0,
      zB,
      x0,
      b0,
      zB,
      x1,
      b1,
      zB,
      0,
      1,
    );
    // Underside soffit
    pushQuad(
      archPositions,
      archIndices,
      archUvs,
      x0,
      b0,
      zB,
      x0,
      b0,
      zF,
      x1,
      b1,
      zF,
      x1,
      b1,
      zB,
      0,
      0.2,
    );
  }
  // Small framed dark arched openings near the foot of both buttress piers (matching ad590346.png).
  const footYApex = level3Height(16384 - 8.5);
  const footYShoulder = level3Height(16384 - 12);
  const footYBot = level3Height(16384 - 24);
  const footPad = 0.12;
  // Left arch foot (+X face at x=23, z=15.0..16.0): sandy-tan frame + dark opening
  pushQuad(
    framePositions,
    frameIndices,
    null,
    23 - xOff + 0.015,
    footYShoulder + 0.06,
    16.0 + footPad - zOff,
    23 - xOff + 0.015,
    footYShoulder + 0.06,
    15.0 - footPad - zOff,
    23 - xOff + 0.015,
    footYBot,
    15.0 - footPad - zOff,
    23 - xOff + 0.015,
    footYBot,
    16.0 + footPad - zOff,
  );
  pushQuad(
    framePositions,
    frameIndices,
    null,
    23 - xOff + 0.015,
    footYApex + 0.14,
    15.78 - zOff,
    23 - xOff + 0.015,
    footYApex + 0.14,
    15.22 - zOff,
    23 - xOff + 0.015,
    footYShoulder + 0.06,
    15.0 - footPad - zOff,
    23 - xOff + 0.015,
    footYShoulder + 0.06,
    16.0 + footPad - zOff,
  );
  pushQuad(
    windowPositions,
    windowIndices,
    null,
    23 - xOff + 0.028,
    footYShoulder,
    16.0 - zOff,
    23 - xOff + 0.028,
    footYShoulder,
    15.0 - zOff,
    23 - xOff + 0.028,
    footYBot,
    15.0 - zOff,
    23 - xOff + 0.028,
    footYBot,
    16.0 - zOff,
  );
  pushQuad(
    windowPositions,
    windowIndices,
    null,
    23 - xOff + 0.028,
    footYApex,
    15.72 - zOff,
    23 - xOff + 0.028,
    footYApex,
    15.28 - zOff,
    23 - xOff + 0.028,
    footYShoulder,
    15.0 - zOff,
    23 - xOff + 0.028,
    footYShoulder,
    16.0 - zOff,
  );
  // Right arch foot (+Z face at z=24, x=14.0..15.0): sandy-tan frame + dark opening
  pushQuad(
    framePositions,
    frameIndices,
    null,
    14.0 - footPad - xOff,
    footYShoulder + 0.06,
    24 - zOff + 0.015,
    15.0 + footPad - xOff,
    footYShoulder + 0.06,
    24 - zOff + 0.015,
    15.0 + footPad - xOff,
    footYBot,
    24 - zOff + 0.015,
    14.0 - footPad - xOff,
    footYBot,
    24 - zOff + 0.015,
  );
  pushQuad(
    framePositions,
    frameIndices,
    null,
    14.22 - xOff,
    footYApex + 0.14,
    24 - zOff + 0.015,
    14.78 - xOff,
    footYApex + 0.14,
    24 - zOff + 0.015,
    15.0 + footPad - xOff,
    footYShoulder + 0.06,
    24 - zOff + 0.015,
    14.0 - footPad - xOff,
    footYShoulder + 0.06,
    24 - zOff + 0.015,
  );
  pushQuad(
    windowPositions,
    windowIndices,
    null,
    14.0 - xOff,
    footYShoulder,
    24 - zOff + 0.028,
    15.0 - xOff,
    footYShoulder,
    24 - zOff + 0.028,
    15.0 - xOff,
    footYBot,
    24 - zOff + 0.028,
    14.0 - xOff,
    footYBot,
    24 - zOff + 0.028,
  );
  pushQuad(
    windowPositions,
    windowIndices,
    null,
    14.28 - xOff,
    footYApex,
    24 - zOff + 0.028,
    14.72 - xOff,
    footYApex,
    24 - zOff + 0.028,
    15.0 - xOff,
    footYShoulder,
    24 - zOff + 0.028,
    14.0 - xOff,
    footYShoulder,
    24 - zOff + 0.028,
  );

  const towersMesh = new Mesh('level3-opening-towers', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = uvs;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(towersMesh);
  towersMesh.material = towerMaterial;
  towersMesh.receiveShadows = true;

  const archesMesh = new Mesh('level3-opening-arches', scene);
  const archData = new VertexData();
  archData.positions = archPositions;
  archData.indices = archIndices;
  archData.uvs = archUvs;
  archData.normals = [];
  VertexData.ComputeNormals(archPositions, archIndices, archData.normals);
  archData.applyToMesh(archesMesh);
  archesMesh.material = archMaterial;
  archesMesh.receiveShadows = true;
  archesMesh.parent = towersMesh;

  const framesMesh = new Mesh('level3-tower-frames', scene);
  const frameData = new VertexData();
  frameData.positions = framePositions;
  frameData.indices = frameIndices;
  frameData.normals = [];
  VertexData.ComputeNormals(framePositions, frameIndices, frameData.normals);
  frameData.applyToMesh(framesMesh);
  const framePaint = new StandardMaterial('level3-tower-frame', scene);
  framePaint.diffuseColor.set(0.42, 0.38, 0.28);
  framePaint.emissiveColor.set(0.12, 0.11, 0.085);
  framePaint.specularColor.set(0, 0, 0);
  framePaint.backFaceCulling = false;
  framesMesh.material = framePaint;
  framesMesh.receiveShadows = true;
  framesMesh.parent = towersMesh;

  const windowsMesh = new Mesh('level3-tower-windows', scene);
  const winData = new VertexData();
  winData.positions = windowPositions;
  winData.indices = windowIndices;
  winData.normals = [];
  VertexData.ComputeNormals(windowPositions, windowIndices, winData.normals);
  winData.applyToMesh(windowsMesh);
  const darkWindow = new StandardMaterial('level3-tower-window', scene);
  darkWindow.diffuseColor.set(0.03, 0.03, 0.03);
  darkWindow.emissiveColor.set(0.01, 0.01, 0.01);
  darkWindow.specularColor.set(0, 0, 0);
  darkWindow.backFaceCulling = false;
  windowsMesh.material = darkWindow;

  return towersMesh;
}

/** Render the copper/bronze vertical funnel pipe of Level 3. */
export function createLevel3Pipe(
  scene: Scene,
  source: IntermediatePipeGeometry,
) {
  const geometry = widenLevel3Pipe(source);
  function build(
    name: string,
    indices: number[],
    paint: StandardMaterial,
    receiveShadows: boolean,
  ) {
    const mesh = new Mesh(name, scene);
    const data = new VertexData();
    data.positions = geometry.positions;
    data.indices = indices;
    data.normals = geometry.normals ?? [];
    if (!geometry.normals)
      VertexData.ComputeNormals(geometry.positions, indices, data.normals);
    data.applyToMesh(mesh);
    mesh.material = paint;
    mesh.receiveShadows = receiveShadows;
    return mesh;
  }

  const copper = new StandardMaterial('level3-pipe-copper', scene);
  copper.diffuseColor.set(0.55, 0.27, 0.11);
  copper.emissiveColor.set(0.08, 0.035, 0.015);
  copper.specularColor.set(0.04, 0.025, 0.01);
  copper.specularPower = 40;
  copper.backFaceCulling = true;

  const lining = new StandardMaterial('level3-pipe-lining', scene);
  lining.diffuseColor.set(0.24, 0.18, 0.14);
  lining.emissiveColor.set(0.05, 0.04, 0.03);
  lining.specularColor.set(0, 0, 0);
  lining.backFaceCulling = false;

  const shell = build('level3-pipe-shell', geometry.shell, copper, false);
  const interior = build(
    'level3-pipe-interior',
    geometry.interior,
    lining,
    true,
  );
  // Lift 4 arcade units so the copper funnel rim sits flush with the 16320 upper terrace.
  const liftY = (4 * arcadeHeightScale) / arcadeCellUnits;
  shell.position.y = liftY;
  interior.position.y = liftY;
  // One terrain tile toward screen-right; keep shell and lining coincident.
  shell.position.z = interior.position.z = 1;
  return [shell, interior] as const;
}

/** Push a native arcade wave profile (18 samples along Z from RAM 0x706..0x74c) to the Level 3 wave. */
export function setLevel3WaveProfile(
  scene: Scene,
  profile: readonly number[] | undefined,
) {
  const updater = (
    scene.metadata as {
      setLevel3WaveProfile?: (next: readonly number[] | undefined) => void;
    } | null
  )?.setLevel3WaveProfile;
  updater?.(profile);
}

/** Animated turquoise undulating wave rolling across the lower Level 3 terrace. */
export function createLevel3Wave(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
  live = false,
) {
  if (!cells[waveRegion.z + 1]?.[waveRegion.x + 1]) return undefined;
  const cols = waveRegion.width;
  const segsZ = waveRegion.length * 2;
  const xStart = waveRegion.x - cells[0]!.length / 2;
  const zStart = waveRegion.z - cells.length / 2;

  // Top undulating ribbon
  const topPositions: number[] = [];
  const topIndices: number[] = [];
  const topUvs: number[] = [];
  for (let iz = 0; iz <= segsZ; iz++) {
    const vz = iz / segsZ;
    const wz = zStart + vz * waveRegion.length;
    for (let ix = 0; ix <= cols; ix++) {
      const vx = ix / cols;
      topPositions.push(xStart + vx * waveRegion.width, waveBaseY + 0.03, wz);
      topUvs.push(vx * cols, vz * waveRegion.length);
    }
  }
  const stride = cols + 1;
  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iz * stride + ix;
      topIndices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const topNormals = Array<number>(topPositions.length).fill(0);
  const topColors = new Float32Array((topPositions.length / 3) * 4);
  for (let i = 0; i < topColors.length; i += 4) {
    topColors[i] = 0.86;
    topColors[i + 1] = 0.96;
    topColors[i + 2] = 0.92;
    topColors[i + 3] = 1;
  }
  const mesh = new Mesh('level3-wave', scene);
  const topData = new VertexData();
  topData.positions = topPositions;
  topData.indices = topIndices;
  topData.uvs = topUvs;
  VertexData.ComputeNormals(topPositions, topIndices, topNormals);
  topData.normals = topNormals;
  topData.colors = topColors;
  topData.applyToMesh(mesh, true);

  const paint = new StandardMaterial('level3-wave-material', scene);
  new ArcadeTerrainPaint(paint, 'level3', 'wave');
  paint.diffuseColor.set(0.32, 0.9, 0.72);
  paint.emissiveColor.set(0.09, 0.26, 0.21);
  paint.specularColor.set(0, 0, 0);
  paint.specularPower = 32;
  paint.backFaceCulling = false;
  mesh.material = paint;
  mesh.receiveShadows = false;

  // Vertical side skirts (+X front and -X back) with dark vertical tile joints matching MarbleMadness_Level3.png.
  const sidePositions: number[] = [];
  const sideIndices: number[] = [];
  const sideUvs: number[] = [];
  for (const sideX of [xStart + waveRegion.width, xStart]) {
    const baseVertex = sidePositions.length / 3;
    const isFront = sideX > xStart;
    for (let iz = 0; iz <= segsZ; iz++) {
      const zCell = (iz / segsZ) * waveRegion.length;
      const wz = zStart + zCell;
      sidePositions.push(sideX, waveBaseY + 0.03, wz);
      sidePositions.push(sideX, waveBaseY, wz);
      sideUvs.push(zCell, 1, zCell, 0);
    }
    for (let iz = 0; iz < segsZ; iz++) {
      const a = baseVertex + iz * 2;
      if (isFront) sideIndices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      else sideIndices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  // Vertical end caps (+Z and -Z) with matching dark vertical tile joints so the wave is never hollow.
  const endCapBase = sidePositions.length / 3;
  const zEnd = zStart + waveRegion.length;
  sidePositions.push(
    xStart,
    waveBaseY + 0.03,
    zEnd,
    xStart,
    waveBaseY,
    zEnd,
    xStart + waveRegion.width,
    waveBaseY + 0.03,
    zEnd,
    xStart + waveRegion.width,
    waveBaseY,
    zEnd,
  );
  sideUvs.push(0, 1, 0, 0, waveRegion.width, 1, waveRegion.width, 0);
  sideIndices.push(
    endCapBase,
    endCapBase + 2,
    endCapBase + 1,
    endCapBase + 2,
    endCapBase + 3,
    endCapBase + 1,
  );
  const startCapBase = sidePositions.length / 3;
  sidePositions.push(
    xStart,
    waveBaseY + 0.03,
    zStart,
    xStart,
    waveBaseY,
    zStart,
    xStart + waveRegion.width,
    waveBaseY + 0.03,
    zStart,
    xStart + waveRegion.width,
    waveBaseY,
    zStart,
  );
  sideUvs.push(0, 1, 0, 0, waveRegion.width, 1, waveRegion.width, 0);
  sideIndices.push(
    startCapBase,
    startCapBase + 1,
    startCapBase + 2,
    startCapBase + 2,
    startCapBase + 1,
    startCapBase + 3,
  );
  const sideNormals = Array<number>(sidePositions.length).fill(0);
  const sidesMesh = new Mesh('level3-wave-sides', scene);
  const sideData = new VertexData();
  sideData.positions = sidePositions;
  sideData.indices = sideIndices;
  sideData.uvs = sideUvs;
  VertexData.ComputeNormals(sidePositions, sideIndices, sideNormals);
  sideData.normals = sideNormals;
  sideData.applyToMesh(sidesMesh, true);
  sidesMesh.parent = mesh;

  const sidePixels = new Uint8Array(8 * 4);
  for (let x = 0; x < 8; x++) {
    sidePixels.set(x === 0 ? [12, 42, 34, 255] : [48, 178, 144, 255], x * 4);
  }
  const sidePaint = new StandardMaterial('level3-wave-sides-material', scene);
  new ArcadeTerrainPaint(sidePaint, 'level3', 'wave');
  const sideTex = RawTexture.CreateRGBATexture(
    sidePixels,
    8,
    1,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  sideTex.wrapU = sideTex.wrapV = Texture.WRAP_ADDRESSMODE;
  sidePaint.diffuseTexture = sideTex;
  sidePaint.emissiveColor.set(0.05, 0.16, 0.13);
  sidePaint.specularColor.set(0, 0, 0);
  sidePaint.backFaceCulling = false;
  sidesMesh.material = sidePaint;
  sidesMesh.receiveShadows = false;

  const currentHeights = new Float32Array(segsZ + 1);
  const targetHeights = new Float32Array(segsZ + 1);
  let hasLiveProfile = false;
  let profileChanged = false;

  function applyHeights() {
    for (let iz = 0; iz <= segsZ; iz++) {
      const y = waveBaseY + 0.03 + currentHeights[iz]!;
      for (let ix = 0; ix <= cols; ix++) {
        topPositions[(iz * stride + ix) * 3 + 1] = y;
      }
      // Update top vertices of both side skirts (front + back)
      sidePositions[iz * 2 * 3 + 1] = y;
      sidePositions[(segsZ + 1 + iz) * 2 * 3 + 1] = y;
    }
    const yEnd = waveBaseY + 0.03 + currentHeights[segsZ]!;
    sidePositions[endCapBase * 3 + 1] = yEnd;
    sidePositions[(endCapBase + 2) * 3 + 1] = yEnd;
    const yStart = waveBaseY + 0.03 + currentHeights[0]!;
    sidePositions[startCapBase * 3 + 1] = yStart;
    sidePositions[(startCapBase + 2) * 3 + 1] = yStart;
    VertexData.ComputeNormals(topPositions, topIndices, topNormals);
    // Strong arcade wave relief: bright cyan-turquoise on flat/sunlit crest, deep pine-green on shadowed slope.
    for (let v = 0; v < topPositions.length / 3; v++) {
      const nz = topNormals[v * 3 + 2]!;
      const c = v * 4;
      if (nz > 0.08) {
        const dark = Math.min(1, nz * 1.85);
        topColors[c] = 0.92 - dark * 0.82;
        topColors[c + 1] = 1 - dark * 0.76;
        topColors[c + 2] = 0.96 - dark * 0.78;
      } else if (nz < -0.08) {
        const bright = Math.min(1, -nz * 1.5);
        topColors[c] = 0.92 + bright * 0.26;
        topColors[c + 1] = 1 + bright * 0.22;
        topColors[c + 2] = 0.96 + bright * 0.22;
      } else {
        topColors[c] = 0.92;
        topColors[c + 1] = 1;
        topColors[c + 2] = 0.96;
      }
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, topPositions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, topNormals);
    mesh.updateVerticesData(VertexBuffer.ColorKind, topColors);
    VertexData.ComputeNormals(sidePositions, sideIndices, sideNormals);
    sidesMesh.updateVerticesData(VertexBuffer.PositionKind, sidePositions);
    sidesMesh.updateVerticesData(VertexBuffer.NormalKind, sideNormals);
  }

  function sampleAutonomous(time: number) {
    for (let iz = 0; iz <= segsZ; iz++) {
      const zLocal = (iz / segsZ) * waveRegion.length;
      const phase = (((zLocal - time * 3.8) % 12) + 12) % 12;
      const dist = Math.abs(phase - 6);
      const crest = dist < 2.2 ? Math.cos((dist / 2.2) * (Math.PI / 2)) : 0;
      currentHeights[iz] = crest * crest * 2.15;
    }
  }

  function applyLiveProfile(profile: readonly number[] | undefined) {
    if (!profile || profile.length < 2) return;
    hasLiveProfile = true;
    const n = profile.length;
    for (let iz = 0; iz <= segsZ; iz++) {
      const t = (iz / segsZ) * (n - 1);
      const i0 = Math.floor(t);
      const i1 = Math.min(n - 1, i0 + 1);
      const frac = t - i0;
      const h = profile[i0]! + (profile[i1]! - profile[i0]!) * frac;
      const next = Math.fround(h * waveMaxHeight);
      if (targetHeights[iz] !== next) profileChanged = true;
      targetHeights[iz] = next;
    }
  }

  scene.metadata = {
    ...((scene.metadata as Record<string, unknown> | null) ?? {}),
    setLevel3WaveProfile: applyLiveProfile,
  };

  let seconds = 0;
  if (!live) {
    sampleAutonomous(0);
    applyHeights();
  } else {
    applyHeights();
  }
  scene.onBeforeRenderObservable.add(() => {
    if (live) {
      if (!hasLiveProfile || !profileChanged) return;
      profileChanged = false;
      for (let iz = 0; iz <= segsZ; iz++) {
        currentHeights[iz] = targetHeights[iz]!;
      }
      applyHeights();
      return;
    }
    seconds += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    sampleAutonomous(seconds);
    applyHeights();
  });
  return mesh;
}

/** Cells belonging to the glossy turquoise wavy curbs flanking the final Level 3 chutes. */
export function isLevel3TurquoiseCurb(x: number, z: number) {
  return (
    ((z === 84 || z === 85) && x >= 95 && x <= 101) ||
    (x === 99 && z >= 88 && z <= 92) ||
    ((z === 91 || z === 92) && x >= 89 && x <= 98) ||
    (x === 92 && z >= 95 && z <= 100) ||
    (x === 95 && z >= 98 && z <= 100)
  );
}

/** Matte-satin turquoise tile material for the final Level 3 wavy curbs (no white specular blowout). */
export function createLevel3TurquoiseCurbMaterial(scene: Scene) {
  const size = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const border = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const offset = (y * size + x) * 4;
      pixels.set(border ? [22, 82, 68, 255] : [58, 186, 152, 255], offset);
    }
  }
  const material = new StandardMaterial('level3-curb-turquoise', scene);
  new ArcadeTerrainPaint(material, 'level3', 'green');
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    size,
    size,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  material.diffuseTexture = texture;
  material.emissiveColor.set(0.03, 0.1, 0.08);
  material.specularColor.set(0, 0, 0);
  material.specularPower = 36;
  return material;
}

/** Directional slope shading for Level 3 turquoise curbs: soft mint sheen vs deep pine-teal shadow. */
export function level3CurbColors(normals: ArrayLike<number>) {
  const colors: number[] = [];
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i]!;
    const nz = normals[i + 2]!;
    const shade = Math.max(0.42, Math.min(1.18, 0.88 - nx * 0.42 - nz * 0.34));
    colors.push(shade, shade, shade, 1);
  }
  return colors;
}

/** Single turquoise pyramid cap at the front V-junction of the central final curb (x=99, z=92). */
export function createLevel3TurquoiseSpike(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
) {
  if (!cells[92]?.[99]) return undefined;
  const xOff = cells[0]!.length / 2;
  const zOff = cells.length / 2;
  const cx = 99.5 - xOff;
  const cz = 92.5 - zOff;
  const baseY = level3Height(16124);
  const tipY = baseY + level3Height(16384 + 16);
  const h = 0.48;
  // Four independent outward-facing triangles (left-handed winding) for crisp flat-shaded pyramid facets.
  const c0 = [cx - h, baseY, cz - h] as const;
  const c1 = [cx + h, baseY, cz - h] as const;
  const c2 = [cx + h, baseY, cz + h] as const;
  const c3 = [cx - h, baseY, cz + h] as const;
  const tip = [cx, tipY, cz] as const;
  const positions = [
    ...c1,
    ...tip,
    ...c0,
    ...c2,
    ...tip,
    ...c1,
    ...c3,
    ...tip,
    ...c2,
    ...c0,
    ...tip,
    ...c3,
  ];
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const mesh = new Mesh('level3-turquoise-spike', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  // Clamp facet brightness via vertex colors so the sunlit facet stays matte mint-teal, never neon cyan.
  data.colors = level3CurbColors(data.normals);
  data.applyToMesh(mesh);
  const paint = new StandardMaterial('level3-spike-turquoise', scene);
  new ArcadeTerrainPaint(paint, 'level3', 'green');
  paint.diffuseColor.set(0.18, 0.58, 0.48);
  paint.emissiveColor.set(0.02, 0.08, 0.06);
  paint.specularColor.set(0, 0, 0);
  mesh.material = paint;
  mesh.receiveShadows = true;
  return mesh;
}
