import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticePose } from '../emulation/practicePose';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import type { RollingActors } from '../emulation/rollingActors';
import { practiceWorldPoint } from '../game/modern/practiceProjection';
import { createRollingActor } from './createRollingActor';

/** Spiky 3D arcade-yellow starburst for bird wall-collision flashes and explosions. */
function createYellowBirdSpark(
  scene: Scene,
  name: string,
  material: StandardMaterial,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const inner = 0.14;
  const outer = 0.42;
  const spikes: readonly (readonly [number, number, number])[] = [
    [outer, 0, 0],
    [-outer, 0, 0],
    [0, outer, 0],
    [0, -outer, 0],
    [0, 0, outer],
    [0, 0, -outer],
    [outer * 0.68, outer * 0.68, outer * 0.68],
    [-outer * 0.68, outer * 0.68, outer * 0.68],
    [outer * 0.68, outer * 0.68, -outer * 0.68],
    [-outer * 0.68, outer * 0.68, -outer * 0.68],
  ];
  for (const [sx, sy, sz] of spikes) {
    const len = Math.hypot(sx, sy, sz);
    const nx = sx / len,
      ny = sy / len,
      nz = sz / len;
    const ax = Math.abs(ny) < 0.9 ? 0 : 1;
    const ay = Math.abs(ny) < 0.9 ? 1 : 0;
    const ux = ny * 0 - nz * ay;
    const uy = nz * ax - nx * 0;
    const uz = nx * ay - ny * ax;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    const tx = (ux / uLen) * inner,
      ty = (uy / uLen) * inner,
      tz = (uz / uLen) * inner;
    const bx = ny * tz - nz * ty,
      by = nz * tx - nx * tz,
      bz = nx * ty - ny * tx;
    const s = positions.length / 3;
    positions.push(
      sx,
      sy,
      sz,
      tx,
      ty,
      tz,
      bx,
      by,
      bz,
      -tx,
      -ty,
      -tz,
      -bx,
      -by,
      -bz,
    );
    indices.push(
      s,
      s + 1,
      s + 2,
      s,
      s + 2,
      s + 3,
      s,
      s + 3,
      s + 4,
      s,
      s + 4,
      s + 1,
    );
  }
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  mesh.convertToFlatShadedMesh();
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

/** Native positions, visibility and sprite timer; no autonomous motion loop. */
export function createLevel5Actors(
  scene: Scene,
  terrain: PracticeTerrain,
  library: RollingActors,
) {
  const actors = Array.from({ length: 19 }, (_, i) =>
    createRollingActor(scene, `level5-actor-${i}`, library),
  );
  const sparkMaterial = new StandardMaterial('level5-bird-spark', scene);
  sparkMaterial.diffuseColor.set(1, 0.93, 0.08);
  sparkMaterial.emissiveColor.set(0.95, 0.85, 0.05);
  sparkMaterial.specularColor.set(0, 0, 0);
  sparkMaterial.backFaceCulling = false;
  const birdSparks = Array.from({ length: 10 }, (_, i) =>
    createYellowBirdSpark(scene, `level5-bird-spark-${i}`, sparkMaterial),
  );
  return (pose: PracticePose | null) => {
    for (const actor of actors) actor.hide();
    for (const spark of birdSparks) spark.setEnabled(false);
    for (const native of pose?.level5Actors ?? []) {
      const actor = actors[native.id];
      const point = practiceWorldPoint(
        native.x,
        native.z,
        native.height,
        terrain.cells[0]!.length,
        terrain.cells.length,
        terrain.origin,
        6,
        0x200,
      );
      if (!actor || !point) continue;
      if (native.kind === 'bird' && native.birdSpark !== undefined) {
        const spark = birdSparks[native.id - 9];
        if (spark) {
          spark.position.set(point.x, point.y + 0.35, point.z);
          if (native.birdSpark === 'flash') {
            const pulse = Math.floor(native.phase * 25) % 2 === 0 ? 0.62 : 0.44;
            spark.scaling.setAll(pulse);
            spark.rotation.set(0.3, native.phase * Math.PI * 6, 0.2);
          } else {
            const s = 0.65 + native.birdSpark * 0.55;
            spark.scaling.setAll(s);
            spark.rotation.set(0.25, native.birdSpark * Math.PI, 0.15);
          }
          spark.setEnabled(true);
        }
        if (typeof native.birdSpark === 'number') continue;
      }
      const key =
        native.kind === 'bird'
          ? native.state === 2
            ? 'bird_expl'
            : native.fast
              ? 'bird_fast'
              : 'bird'
          : native.kind === 'black'
            ? native.state === 2 && (native.squash ?? 1) >= 1
              ? 'blacky_squashed_mini'
              : 'blacky_mini'
            : native.kind === 'worm'
              ? native.state === 2
                ? 'stick_squashed_mini'
                : 'stick_idle_mini'
              : native.state === 2
                ? 'amoeba_squashed_mini'
                : 'amoeba_stretch_mini';
      const count = library.models[key]?.poses.length ?? 1;
      actor.update(
        key,
        native.kind === 'bird' && native.state === 2
          ? Math.min(count - 1, native.phase * count)
          : (native.phase % 1) * count,
        point,
        native.heading + (native.kind === 'bird' ? Math.PI : 0),
        0,
        undefined,
        native.kind === 'black' &&
          native.state === 2 &&
          (native.squash ?? 1) < 1
          ? 1 - (native.squash ?? 0) * 0.8
          : 1,
        native.kind !== 'bird' && native.state === 2 ? 1.35 : 1,
        native.kind !== 'bird' && native.state === 2,
      );
    }
  };
}
