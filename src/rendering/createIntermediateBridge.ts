import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';

import {
  createIntermediateBridgeMechanism,
  createIntermediateBridgeSide,
} from './createIntermediateBridgeMechanism';

const scale = arcadeHeightScale / arcadeCellUnits;
const platformY = (16264 - arcadeGroundHeight) * scale;
const recessY = platformY - 44 * scale;
const left = 61;
const back = 56;
const width = 4;
const maxRise = 16;
export const intermediateBridgeThickness = 0.55;

export function hasIntermediateBridge(terrain: PracticeTerrain) {
  return terrain.cells[back]?.[left]?.[0] != null;
}

export function intermediateBridgeCell(
  x: number,
  z: number,
): TerrainCell | undefined {
  if (z >= back && z < back + width) {
    if (x >= left - 1 && x < left + width) return null;
    if (x === left + width) return [recessY, recessY, recessY, recessY];
  }
  if (z === back - 1 && x >= left - 1 && x < left + width)
    return [platformY, platformY, platformY, platformY];
  return undefined;
}

/** 144 arcade frames, with a rise of 16 height units at the free edge. */
export function intermediateBridgeRise(seconds: number) {
  const frame = (seconds * 60) % 144;
  return (
    Math.max(
      0,
      Math.min(
        maxRise,
        ((frame - 60) * maxRise) / 25,
        ((141 - frame) * maxRise) / 25,
      ),
    ) * scale
  );
}

/** Native RAM bridge height: 7 discrete steps (0..6) from flat to 16 arcade units. */
export function intermediateBridgeStepRise(step: number) {
  return (Math.max(0, Math.min(6, step)) / 6) * maxRise * scale;
}

const bridgeControllers = new WeakMap<Scene, (step: number) => void>();

export function setIntermediateBridgeStep(scene: Scene, step: number) {
  bridgeControllers.get(scene)?.(step);
}

export function createIntermediateBridge(
  scene: Scene,
  terrain: PracticeTerrain,
  paving: StandardMaterial,
  live = false,
) {
  const x = left + width / 2 - terrain.cells[0]!.length / 2;
  const z = back + width / 2 - terrain.cells.length / 2;
  const flat = [0, 0, 0, 0] as const;
  const geometry = terrainMesh(
    Array.from({ length: width }, () => Array<TerrainCell>(width).fill(flat)),
  );
  const deck = new Mesh('intermediate-bridge-deck', scene);
  const data = new VertexData();
  Object.assign(data, geometry);
  const normals: number[] = [];
  VertexData.ComputeNormals(geometry.positions, geometry.indices, normals);
  data.normals = normals;
  data.applyToMesh(deck, true);
  deck.position.set(x, platformY, z);
  // Use the full motion envelope so vertex updates do not reset world bounds.
  const half = width / 2;
  deck.setBoundingInfo(
    new BoundingInfo(
      new Vector3(-half, 0, -half),
      new Vector3(half, maxRise * scale, half),
    ),
  );
  const grate = new StandardMaterial('intermediate-bridge-grate', scene);
  grate.diffuseTexture = paving.diffuseTexture;
  grate.diffuseColor.set(0.52, 0.52, 0.52);
  grate.specularColor.set(0, 0, 0);
  grate.backFaceCulling = false;
  deck.material = grate;

  const metal = createIntermediateBridgeSide(scene);
  const underside = new StandardMaterial(
    'intermediate-bridge-underside',
    scene,
  );
  underside.diffuseColor.set(0.12, 0.18, 0.21);
  underside.emissiveColor.set(0.07, 0.09, 0.11);
  const fasciaWidth = 0.12;
  const slab = CreateBox(
    'intermediate-bridge-slab',
    {
      width: width - 2 * fasciaWidth,
      height: intermediateBridgeThickness,
      depth: width,
    },
    scene,
  );
  slab.position.set(x, platformY, z);
  slab.material = underside;
  const edges = [-1, 1].map((side) => {
    const edge = CreateBox(
      'intermediate-bridge-edge',
      { width: fasciaWidth, height: intermediateBridgeThickness, depth: width },
      scene,
    );
    edge.position.set(x + side * (half - fasciaWidth / 2), platformY, z);
    edge.material = metal;
    return edge;
  });

  const updateMechanism = createIntermediateBridgeMechanism(
    scene,
    x,
    recessY,
    z,
  );
  const movingParts = [slab, ...edges];

  let previousRise = -1;
  function applyRise(rise: number) {
    if (rise === previousRise) return;
    previousRise = rise;
    for (let i = 0; i < geometry.positions.length; i += 3)
      geometry.positions[i + 1] =
        rise * (0.5 - geometry.positions[i + 2]! / width);
    VertexData.ComputeNormals(geometry.positions, geometry.indices, normals);
    deck.updateVerticesData(VertexBuffer.PositionKind, geometry.positions);
    deck.updateVerticesData(VertexBuffer.NormalKind, normals);
    const angle = Math.atan2(rise, width);
    const depth = Math.hypot(width, rise) / width;
    const offset = intermediateBridgeThickness / 2 + 0.02;
    for (const part of movingParts) {
      part.position.y = platformY + rise / 2 - offset * Math.cos(angle);
      part.position.z = z - offset * Math.sin(angle);
      part.rotation.x = angle;
      part.scaling.z = depth;
    }
    const lift = platformY - recessY - intermediateBridgeThickness + rise * 0.5;
    updateMechanism(lift, rise);
  }
  bridgeControllers.set(scene, (step: number) =>
    applyRise(intermediateBridgeStepRise(step)),
  );
  if (live) {
    applyRise(0);
    return deck;
  }
  let seconds = 0;
  applyRise(intermediateBridgeRise(seconds));
  scene.onBeforeRenderObservable.add(() => {
    seconds += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    applyRise(intermediateBridgeRise(seconds));
  });
  return deck;
}
