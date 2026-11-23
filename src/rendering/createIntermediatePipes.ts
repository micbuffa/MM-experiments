import { fitIntermediatePipeHoods } from './fitIntermediatePipeHoods';
import { IntermediatePipePaint } from './intermediatePipePaint';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';
import { intermediatePipeSeamGeometry } from './intermediatePipeSurfaces';

export function createIntermediatePipes(
  scene: Scene,
  geometry: IntermediatePipeGeometry,
  floor?: { positions: number[]; indices: number[] },
) {
  const fitted = fitIntermediatePipeHoods(geometry);
  const fittedPositions = fitted.positions;
  const fittedNormals: number[] = [];
  VertexData.ComputeNormals(fittedPositions, fitted.shell, fittedNormals);
  if (fitted.normals)
    for (let i = 0; i < fitted.normals.length; i++)
      fittedNormals[i] = fitted.normals[i]!;
  function surface(
    name: string,
    indices: number[],
    positions = fittedPositions,
    normals?: number[],
    paint = new StandardMaterial(`intermediate-pipes-${name}`, scene),
  ) {
    const mesh = new Mesh(`intermediate-pipes-${name}`, scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals ?? [];
    if (!normals) VertexData.ComputeNormals(positions, indices, data.normals);
    data.applyToMesh(mesh);
    paint.backFaceCulling = false;
    mesh.material = paint;
    return { mesh, paint };
  }

  const shell = surface('shell', fitted.shell, fittedPositions, fittedNormals);
  new IntermediatePipePaint(shell.paint);
  shell.paint.diffuseColor.set(0.15, 0.25, 0.58);
  shell.paint.emissiveColor.set(0.07, 0.105, 0.19);
  shell.paint.specularColor.set(0, 0, 0);
  shell.paint.specularPower = 76;

  const interior = surface(
    'interior',
    fitted.interior,
    fittedPositions,
    undefined,
  );
  interior.paint.diffuseColor.set(0.26, 0.26, 0.28);
  interior.paint.emissiveColor.set(0.05, 0.05, 0.06);
  interior.mesh.receiveShadows = true;
  interior.paint.specularColor.set(0, 0, 0);
  if (floor?.indices.length)
    surface(
      'floor',
      floor.indices,
      floor.positions,
      undefined,
      interior.paint,
    ).mesh.receiveShadows = true;

  const bands = intermediatePipeSeamGeometry(fittedPositions, fitted.shell);
  if (bands.indices.length) {
    const seam = surface('seams', bands.indices, bands.positions);
    seam.paint.diffuseColor.set(0.1, 0.045, 0.3);
    seam.paint.emissiveColor.set(0.055, 0.025, 0.17);
    seam.paint.specularColor.set(0, 0, 0);
  }
  return [shell.mesh, interior.mesh] as const;
}
