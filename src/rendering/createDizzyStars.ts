import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

export function createDizzyStars(scene: Scene, name: string) {
  const material = new StandardMaterial(name + '-star-paint', scene);
  material.diffuseColor.set(1, 0.85, 0.05);
  material.emissiveColor.set(0.8, 0.55, 0);
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  const positions = [0, 0, 0];
  const indices: number[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.09 : 0.23;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    indices.push(0, i + 1, ((i + 1) % 10) + 1);
  }
  const stars = Array.from({ length: 3 }, (_, i) => {
    const star = new Mesh(name + '-star-' + i, scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = Array(positions.length).fill(0);
    VertexData.ComputeNormals(positions, indices, data.normals);
    data.applyToMesh(star);
    star.material = material;
    star.billboardMode = Mesh.BILLBOARDMODE_ALL;
    star.setEnabled(false);
    return star;
  });
  return (position: { x: number; y: number; z: number } | null, frames = 0) => {
    for (const [i, star] of stars.entries()) {
      star.setEnabled(position !== null);
      if (!position) continue;
      const angle = (i * Math.PI * 2) / stars.length + frames * 0.09;
      star.position.set(
        position.x + Math.cos(angle) * 0.85,
        position.y + 1.55 + Math.sin(angle * 2) * 0.08,
        position.z + Math.sin(angle) * 0.85,
      );
    }
  };
}
