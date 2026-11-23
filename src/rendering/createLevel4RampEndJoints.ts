import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

/** Scene-owned mortar outlines on the exposed faces of both terminal ramp tiles. */
export function createLevel4RampEndJoints(
  scene: Scene,
  columns: number,
  rows: number,
  deck: number,
  lip: number,
) {
  const positions: number[] = [],
    indices: number[] = [];
  const width = 0.085;
  // Offset the outlines toward the open air to avoid coplanar surfaces.
  const faces = [
    [22, 27.003, 23, 27.003],
    [21.997, 26, 21.997, 27],
    [23.003, 26, 23.003, 27],
    [28.003, 23, 28.003, 24],
    [27, 22.997, 28, 22.997],
    [27, 24.003, 28, 24.003],
  ] as const;
  for (const [x0, z0, x1, z1] of faces) {
    for (const [a, b, low, high] of [
      [0, 1, deck - width, deck],
      [0, 1, lip, lip + width],
      [0, width, lip + width, deck - width],
      [1 - width, 1, lip + width, deck - width],
    ] as const) {
      const start = positions.length / 3;
      for (const [t, y] of [
        [a, high],
        [b, high],
        [b, low],
        [a, low],
      ] as const)
        positions.push(
          x0 + (x1 - x0) * t - columns / 2,
          y,
          z0 + (z1 - z0) * t - rows / 2,
        );
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  const mesh = new Mesh('level4-jump-ramp-end-joints', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  const material = new StandardMaterial('level4-jump-ramp-end-mortar', scene);
  material.disableLighting = true;
  material.emissiveColor.setAll(102 / 255);
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}
