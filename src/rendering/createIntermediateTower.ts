import type { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import { ArcadeTerrainPaint } from './arcadeTerrainPaint';

const verticalScale = arcadeHeightScale / arcadeCellUnits;
// Smooth ogival / tapered dome profile from the 2-tile-cut hexagonal plinth
// up to the horizontal stone course (h = 16) and softly rounded crown (h = 26).
const lowerRings = [
  [0, 1.0],
  [5.5, 0.84],
  [11, 0.68],
  [16, 0.52],
] as const;
const upperRings = [
  [16, 0.52],
  [19.5, 0.39],
  [22.5, 0.27],
  [24.5, 0.16],
  [25.5, 0.085],
] as const;
const tipHeight = 26;
const stoneTexels = 64;

function outline(radius: number, cut: number) {
  return [
    [-radius, -radius],
    [radius - cut, -radius],
    [radius, -radius + cut],
    [radius, radius],
    [-radius + cut, radius],
    [-radius, radius - cut],
  ] as const;
}

/** Procedural masonry tone for Intermediate Race domed towers with bold joints. */
export function intermediateTowerStone(u: number, v: number) {
  if (v < 0.5) {
    const t = v / 0.5;
    const edgeU = Math.min(u, 1 - u);
    const jointU = 0.052 + 0.015 * t;
    const bevelU = jointU + 0.036;
    if (v < 0.038 || v > 0.466 || edgeU < jointU) return 102;
    if (v < 0.068 || v > 0.442 || edgeU < bevelU) return 172;
    return 248;
  }
  const t = (v - 0.5) / 0.5;
  const edgeU = Math.min(u, 1 - u);
  const jointU = 0.058 + 0.028 * Math.min(t, 0.72);
  const bevelU = jointU + 0.038;
  if (v < 0.534) return 102;
  if (v < 0.562) return 172;
  if (t < 0.78 && edgeU < jointU) return 108;
  if (t < 0.84 && edgeU < bevelU) return 176;
  return 248;
}

export function createIntermediateTowerMaterial(scene: Scene) {
  const material = new StandardMaterial('intermediate-tower-stone', scene);
  material.specularColor.set(0, 0, 0);
  new ArcadeTerrainPaint(material, 'intermediate', 'floor');
  const pixels = new Uint8Array(stoneTexels * stoneTexels * 4);
  for (let y = 0; y < stoneTexels; y++) {
    for (let x = 0; x < stoneTexels; x++) {
      const offset = 4 * (y * stoneTexels + x);
      const tone = intermediateTowerStone(
        (x + 0.5) / stoneTexels,
        (y + 0.5) / stoneTexels,
      );
      const noise =
        ((Math.imul(x + 39, y + 95) ^ Math.imul(x + 7, x + y + 13)) & 7) - 3;
      const value = Math.max(0, Math.min(255, tone + noise));
      pixels.fill(value, offset, offset + 3);
      pixels[offset + 3] = 255;
    }
  }
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    stoneTexels,
    stoneTexels,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  material.diffuseTexture = texture;
  return material;
}

function appendPanelStrip(
  positions: number[],
  indices: number[],
  uvs: number[],
  rings: readonly (readonly [number, number])[],
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  vStart: number,
  vEnd: number,
  capTip?: number,
) {
  const start = positions.length / 3;
  const hStart = rings[0]![0];
  const hEnd = capTip ?? rings[rings.length - 1]![0];
  const hSpan = Math.max(1e-6, hEnd - hStart);
  for (const [ring, [height, scale]] of rings.entries()) {
    const y = height * verticalScale;
    const v = vStart + ((height - hStart) / hSpan) * (vEnd - vStart);
    positions.push(x0 * scale, y, z0 * scale, x1 * scale, y, z1 * scale);
    uvs.push(0, v, 1, v);
    if (ring > 0) {
      const i = start + (ring - 1) * 2;
      indices.push(i, i + 1, i + 3, i, i + 3, i + 2);
    }
  }
  if (capTip !== undefined) {
    const last = start + (rings.length - 1) * 2;
    positions.push(0, capTip * verticalScale, 0);
    uvs.push(0.5, vEnd);
    indices.push(last, last + 1, last + 2);
  }
}

export function createIntermediateTower(
  scene: Scene,
  name: string,
  stone: Material,
) {
  const base = outline(2, 2);
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (const [side, [x, z]] of base.entries()) {
    const next = (side + 1) % base.length;
    const [endX, endZ] = base[next]!;
    const panels = side === 1 || side === 4 ? 1 : 2;
    for (let panel = 0; panel < panels; panel++) {
      const from = panel / panels;
      const to = (panel + 1) / panels;
      const x0 = x + (endX - x) * from;
      const z0 = z + (endZ - z) * from;
      const x1 = x + (endX - x) * to;
      const z1 = z + (endZ - z) * to;
      appendPanelStrip(
        positions,
        indices,
        uvs,
        lowerRings,
        x0,
        z0,
        x1,
        z1,
        0,
        0.5,
      );
      appendPanelStrip(
        positions,
        indices,
        uvs,
        upperRings,
        x0,
        z0,
        x1,
        z1,
        0.5,
        1,
        tipHeight,
      );
    }
  }

  const tower = new Mesh(name, scene);
  const geometry = new VertexData();
  geometry.positions = positions;
  geometry.indices = indices;
  geometry.uvs = uvs;
  geometry.normals = [];
  VertexData.ComputeNormals(positions, indices, geometry.normals);
  geometry.applyToMesh(tower);
  tower.material = stone;
  return tower;
}
