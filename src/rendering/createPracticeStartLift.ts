import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticeStartLiftPhase } from '../emulation/practicePose';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainCorners, terrainMesh } from '../game/modern/terrainMesh';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  createPracticeSurfaceMaterial,
  stylePracticeWalls,
} from './createPracticeSurfaceMaterial';

// The measured rises along X, extended across the three tiles of the lift.
// A one-tile ring around the patch supplies the base of the exposed faces.
const profiles = [
  [2, 0, 0, 0],
  [5, 0, 0, 0],
  [10, 0, 0, 0],
  [14, 4, 0, 0],
  [16, 6, 2, 0],
] as const;
const firstCell = 15;
const patchSize = 5;

export function createPracticeStartLift(
  scene: Scene,
  terrain: PracticeTerrain,
  shadows?: ShadowGenerator,
) {
  const localX = firstCell - terrain.origin.x;
  const localZ = firstCell - terrain.origin.z;
  const columns = terrain.cells[0]!.length;
  const rows = terrain.cells.length;
  if (
    localX < 0 ||
    localZ < 0 ||
    localX + patchSize > columns ||
    localZ + patchSize > rows
  )
    return;
  const patch = terrain.cells
    .slice(localZ, localZ + patchSize)
    .map((row) => row.slice(localX, localX + patchSize));
  if (
    patch.some((row) =>
      row.some((tile) => !tile || tile.some((height) => height === null)),
    )
  )
    return;

  const floor = scene.getMeshByName('terrain-surface')!;
  const wallMaterial =
    scene.getMeshByName('terrain-cliffs')?.material ??
    createPracticeSurfaceMaterial(scene, 'wall');
  const shiftX = localX + (patchSize - columns) / 2;
  const shiftZ = localZ + (patchSize - rows) / 2;
  const heightScale = arcadeHeightScale / arcadeCellUnits;

  function meshFor(name: string, geometry: ReturnType<typeof terrainMesh>) {
    const mesh = new Mesh(name, scene);
    const data = new VertexData();
    Object.assign(data, geometry);
    data.normals = [];
    VertexData.ComputeNormals(
      geometry.positions,
      geometry.indices,
      data.normals,
    );
    data.applyToMesh(mesh);
    mesh.position.set(shiftX, 0, shiftZ);
    mesh.setEnabled(false);
    return mesh;
  }

  const stages = profiles.map((profile, index) => {
    const exposed: TerrainCell[][] = patch.map((row) => row.map(() => null));
    const raised = patch.map((row, z) =>
      row.map((tile, x): TerrainCell => {
        if (!tile || z < 1 || z > 3 || x < 1 || x > 3 || !profile[x - 1])
          return tile;
        const lifted = terrainCorners.map(
          ([dx], corner) => tile[corner]! + profile[x - 1 + dx]! * heightScale,
        ) as [number, number, number, number];
        exposed[z]![x] = lifted;
        return lifted;
      }),
    );

    const surface = terrainMesh(exposed);
    for (let i = 0; i < surface.uvs.length; i += 2) {
      surface.uvs[i]! += localX;
      surface.uvs[i + 1]! += localZ;
    }
    const top = meshFor(`practice-start-lift-${index + 1}`, surface);
    top.material = floor.material;
    top.receiveShadows = true;
    shadows?.addShadowCaster(top, false);
    const walls = terrainCliffs(terrainMesh(raised), patchSize, patchSize, 0);
    const colors = stylePracticeWalls(
      walls.positions,
      walls.uvs,
      firstCell + patchSize / 2,
      firstCell + patchSize / 2,
    );
    const sides = meshFor(`practice-start-lift-walls-${index + 1}`, walls);
    sides.material = wallMaterial;
    sides.setVerticesData(VertexBuffer.ColorKind, colors);
    return [top, sides];
  });
  let current: PracticeStartLiftPhase | undefined;
  return (phase: PracticeStartLiftPhase | undefined) => {
    if (phase === current) return;
    if (current)
      for (const mesh of stages[current - 1]!) mesh.setEnabled(false);
    current = phase;
    if (phase) for (const mesh of stages[phase - 1]!) mesh.setEnabled(true);
  };
}
