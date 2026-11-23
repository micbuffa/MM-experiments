import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { terrainMesh } from '../game/modern/terrainMesh';
import { terrainCliffs } from '../game/modern/terrainCliffs';

/** Raised U-shaped rim continuous with the striped cliff beneath the launcher. */
export function createCatapultMasonry(
  scene: Scene,
  columns: number,
  rows: number,
  floor: number,
  bottom: number,
) {
  // One untextured stone cap, shared by every rim block and owned by the scene.
  const cap = new StandardMaterial('level4-catapult-rim-top', scene);
  cap.diffuseColor.set(0.55, 0.55, 0.55);
  cap.specularColor.set(0, 0, 0);
  const thickness = 0.38;
  const top = floor + 0.65;
  const blocks = [
    { x: 62, z: 66.9, width: 1, length: thickness },
    { x: 63, z: 66.9, width: 1, length: thickness },
    { x: 62, z: 66.9 + thickness, width: thickness, length: 0.8 },
    { x: 62, z: 66.9 + thickness + 0.8, width: thickness, length: 0.8 },
    { x: 64 - thickness, z: 66.9 + thickness, width: thickness, length: 0.8 },
    {
      x: 64 - thickness,
      z: 66.9 + thickness + 0.8,
      width: thickness,
      length: 0.8,
    },
  ];
  const meshes: Mesh[] = [];
  for (const [index, block] of blocks.entries()) {
    // Construct a single rectangle, then stretch its grid to the measured rim.
    const cell: TerrainCell = [top, top, top, top];
    const surface = terrainMesh([[cell]]);
    for (let i = 0; i < surface.positions.length; i += 3) {
      const x = surface.positions[i]! + 0.5;
      const z = surface.positions[i + 2]! + 0.5;
      surface.positions[i] = block.x + x * block.width - columns / 2;
      surface.positions[i + 2] = block.z + z * block.length - rows / 2;
      surface.uvs[(i / 3) * 2] = x;
      surface.uvs[(i / 3) * 2 + 1] = z;
    }
    const walls = terrainCliffs(surface, columns, rows, bottom);
    // The existing cliff already owns the outer face at X=62.
    // Keep just the new rim above its top, eliminating coplanar overlap below.
    for (let i = 0; i < walls.positions.length; i += 12) {
      const faceX = walls.positions[i]! + columns / 2;
      const otherX = walls.positions[i + 3]! + columns / 2;
      if (Math.abs(faceX - 62) < 0.001 && Math.abs(otherX - 62) < 0.001) {
        walls.positions[i + 7] = floor + 0.002;
        walls.positions[i + 10] = floor + 0.002;
      }
    }
    // Align vertical stripes with the world grid on both orientations.
    for (let i = 0; i < walls.positions.length; i += 12) {
      const alongX =
        Math.abs(walls.positions[i]! - walls.positions[i + 3]!) > 0.01;
      for (let corner = 0; corner < 4; corner++) {
        const vertex = i / 3 + corner;
        walls.uvs[vertex * 2] = alongX
          ? walls.positions[vertex * 3]! + columns / 2
          : walls.positions[vertex * 3 + 2]! + rows / 2;
      }
    }
    for (const [kind, geometry] of [
      ['top', surface],
      ['wall', walls],
    ] as const) {
      const mesh = new Mesh(`level4-catapult-masonry-${index}-${kind}`, scene);
      const data = new VertexData();
      Object.assign(data, geometry);
      data.normals = [];
      VertexData.ComputeNormals(
        geometry.positions,
        geometry.indices,
        data.normals,
      );
      if (kind === 'wall')
        data.colors = Array.from(
          { length: geometry.positions.length / 3 },
          () => [0.88, 0.28, 0.08, 1],
        ).flat();
      data.applyToMesh(mesh);
      mesh.material =
        kind === 'top' ? cap : scene.getMaterialByName('level4-cliffs');
      mesh.receiveShadows = true;
      meshes.push(mesh);
    }
  }
  return meshes;
}
