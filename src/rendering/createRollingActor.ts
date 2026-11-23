import { splitBirdBeak, fitBirdPoses } from './birdParts';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { createMarbleMaterial } from './createMarbleMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { RollingActors } from '../emulation/rollingActors';

const broomScale = 0.84;
const marbleFloorModelY = -5.67;

/** Ground and slightly slim the broom sub-mesh without moving marble debris. */
function adjustBroomPoses(
  poses: readonly { readonly positions: readonly number[] }[],
  indices: readonly number[],
): Float32Array[] {
  const vertices = new Set(indices);
  let lowestSweepY = Infinity;
  for (const pose of poses) {
    let minY = Infinity,
      maxY = -Infinity;
    for (const v of vertices) {
      const y = pose.positions[v * 3 + 1]!;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxY - minY > 5 && minY < lowestSweepY) lowestSweepY = minY;
  }
  const referenceY = Number.isFinite(lowestSweepY) ? lowestSweepY : 0;
  return poses.map((pose) => {
    const out = Float32Array.from(pose.positions);
    if (!Number.isFinite(lowestSweepY)) return out;
    let sumX = 0,
      sumZ = 0;
    for (const v of vertices) {
      sumX += pose.positions[v * 3]!;
      sumZ += pose.positions[v * 3 + 2]!;
    }
    const cx = sumX / Math.max(1, vertices.size);
    const cz = sumZ / Math.max(1, vertices.size);
    for (const v of vertices) {
      const i = v * 3;
      out[i] = cx + (pose.positions[i]! - cx) * broomScale;
      out[i + 1] =
        marbleFloorModelY + (pose.positions[i + 1]! - referenceY) * broomScale;
      out[i + 2] = cz + (pose.positions[i + 2]! - cz) * broomScale;
    }
    return out;
  });
}

/** Center each amoeba_stretch pose along Z so stretching deforms in place without double-translating. */
function centerAmoebaPoses(
  poses: readonly { readonly positions: readonly number[] }[],
): Float32Array[] {
  return poses.map((pose) => {
    const out = Float32Array.from(pose.positions);
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 2; i < out.length; i += 3) {
      const z = out[i]!;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const centerZ = Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0;
    for (let i = 2; i < out.length; i += 3) out[i] = out[i]! - centerZ;
    return out;
  });
}

/** Scene-owned morph meshes. Poses come from the local remake asset library. */
export function createRollingActor(
  scene: Scene,
  name: string,
  library: RollingActors,
  red = false,
) {
  const models = new Map<
    string,
    {
      parts: {
        image: string;
        mesh: Mesh;
        positions: Float32Array[];
        frame: number;
      }[];
      normals: Float32Array[];
      lowest: number;
    }
  >();
  let selected: string | undefined;
  function model(key: string) {
    const cached = models.get(key);
    if (cached) return cached;
    const source = library.models[key];
    if (!source) return undefined;
    const basePositions = source.poses.map((pose) =>
      Float32Array.from(pose.positions),
    );
    const normals = source.poses.map((pose) => Float32Array.from(pose.normals));
    const bird = key === 'bird' || key === 'bird_fast' || key === 'bird_expl';
    const groups = Object.entries(source.groups)
      .flatMap(([image, indices]): [string, readonly number[]][] => {
        if (!bird) return [[image, indices]];
        const split = splitBirdBeak(indices, source.uvs);
        return [
          [image, split.body],
          ['arcade-bird-beak', split.beak],
        ];
      })
      .filter(([, indices]) => indices.length > 0);
    const birdPositions = bird
      ? fitBirdPoses(
          source.poses,
          groups.find(([image]) => image === 'arcade-bird-beak')?.[1] ?? [],
        )
      : undefined;
    if (birdPositions) {
      const indices = Object.values(source.groups).flatMap((group) => [
        ...group,
      ]);
      for (let i = 0; i < birdPositions.length; i++)
        VertexData.ComputeNormals(birdPositions[i]!, indices, normals[i]!);
    }
    const parts = groups.map(([image, indices]) => {
      const positions =
        key === 'player_broken' && image === 'broom.jpg'
          ? adjustBroomPoses(source.poses, indices)
          : key === 'amoeba_stretch'
            ? centerAmoebaPoses(source.poses)
            : (birdPositions ?? basePositions);
      const mesh = new Mesh(name + '-' + key + '-' + image, scene);
      mesh.setVerticesData(VertexBuffer.PositionKind, positions[0]!, true);
      mesh.setVerticesData(VertexBuffer.NormalKind, normals[0]!, true);
      mesh.setVerticesData(VertexBuffer.UVKind, Float32Array.from(source.uvs));
      mesh.setIndices(Array.from(indices));
      if (image === 'arcade-bird-beak') {
        const material = new StandardMaterial(mesh.name + '-paint', scene);
        material.diffuseColor.set(1, 0.92, 0.03);
        material.emissiveColor.set(0.75, 0.61, 0);
        material.specularColor.set(0, 0, 0);
        mesh.material = material;
      } else if (image === 'player.png')
        mesh.material = createMarbleMaterial(scene, red);
      else if (image === 'amoeba.png') {
        const material = new StandardMaterial(mesh.name + '-paint', scene);
        material.diffuseColor.set(0.05, 0.56, 0.09);
        material.emissiveColor.set(0.02, 0.18, 0.03);
        material.specularColor.set(0.18, 0.45, 0.16);
        material.alpha = key.endsWith('_squashed_mini') ? 1 : 0.62;
        material.disableDepthWrite = !key.endsWith('_squashed_mini');
        if (key.endsWith('_squashed_mini'))
          material.emissiveColor.set(0.06, 0.45, 0.03);
        material.backFaceCulling = false;
        mesh.material = material;
      } else if (key === 'catapult' || key === 'catapult_throw') {
        const material = new StandardMaterial(mesh.name + '-paint', scene);
        material.diffuseTexture = new Texture(
          library.textures[image]!,
          scene,
          false,
          false,
          Texture.TRILINEAR_SAMPLINGMODE,
        );
        // The extracted swatch is pink (255,68,68); the arcade launcher is red.
        material.diffuseColor.set(1, 0, 0);
        material.emissiveColor.set(0.35, 0, 0);
        material.specularColor.set(0.025, 0, 0);
        material.specularPower = 32;
        mesh.material = material;
      } else if (image === 'hammer.png') {
        const material = new StandardMaterial(mesh.name + '-paint', scene);
        material.diffuseTexture = new Texture(
          library.textures[image]!,
          scene,
          false,
          false,
          Texture.TRILINEAR_SAMPLINGMODE,
        );
        material.diffuseColor.set(0.84, 0.4, 0.24);
        material.emissiveColor.set(0.06, 0.015, 0.008);
        material.specularColor.set(0, 0, 0);
        mesh.material = material;
      } else {
        const material = new StandardMaterial(mesh.name + '-paint', scene);
        material.diffuseTexture = new Texture(
          library.textures[image]!,
          scene,
          false,
          false,
          Texture.TRILINEAR_SAMPLINGMODE,
        );
        material.diffuseColor.set(0.95, 0.95, 0.95);
        material.specularColor.set(
          bird ? 0 : 0.2,
          bird ? 0 : 0.2,
          bird ? 0 : 0.2,
        );
        if (bird) {
          material.emissiveTexture = material.diffuseTexture;
          material.emissiveColor.set(0.22, 0.22, 0.22);
        }
        if (key.endsWith('_squashed_mini')) {
          material.emissiveTexture = material.diffuseTexture;
          material.emissiveColor.set(0.35, 0.35, 0.35);
          material.specularColor.set(0, 0, 0);
        }
        mesh.material = material;
      }
      mesh.scaling.setAll(0.119);
      mesh.receiveShadows = !bird;
      if (bird) {
        const shadows = scene.getLightByName('key')?.getShadowGenerator();
        if (shadows && 'addShadowCaster' in shadows)
          (shadows as ShadowGenerator).addShadowCaster(mesh, false);
      }
      mesh.setEnabled(false);
      return { image, mesh, positions, frame: -1 };
    });
    let lowest = 0;
    for (let i = 1; i < basePositions[0]!.length; i += 3)
      lowest = Math.min(lowest, basePositions[0]![i]!);
    const result = { parts, normals, lowest };
    models.set(key, result);
    return result;
  }

  return {
    hide() {
      if (selected)
        for (const part of models.get(selected)!.parts)
          part.mesh.setEnabled(false);
      selected = undefined;
    },
    update(
      key: string,
      frame: number,
      position: { x: number; y: number; z: number },
      heading = 0,
      baseHeight = 0.675,
      groupFrames?: Readonly<Partial<Record<string, number | null>>>,
      verticalScale = 1,
      horizontalScale = 1,
      grounded = false,
    ) {
      const next = model(key);
      if (!next) return false;
      if (selected && selected !== key)
        for (const part of models.get(selected)!.parts)
          part.mesh.setEnabled(false);
      selected = key;
      for (const part of next.parts) {
        const override =
          groupFrames && part.image in groupFrames
            ? groupFrames[part.image]
            : frame;
        if (override === null || override === undefined) {
          part.mesh.setEnabled(false);
          continue;
        }
        const index = Math.max(
          0,
          Math.min(part.positions.length - 1, Math.floor(override)),
        );
        part.mesh.setEnabled(true);
        part.mesh.position.set(
          position.x,
          position.y +
            baseHeight +
            (grounded ? 0.025 - next.lowest * 0.119 * verticalScale : 0),
          position.z,
        );
        part.mesh.rotation.y = heading;
        part.mesh.scaling.set(
          0.119 * horizontalScale,
          0.119 * verticalScale,
          0.119 * horizontalScale,
        );
        if (index !== part.frame) {
          part.mesh.updateVerticesData(
            VertexBuffer.PositionKind,
            part.positions[index]!,
            true,
          );
          part.mesh.updateVerticesData(
            VertexBuffer.NormalKind,
            next.normals[index]!,
          );
          part.frame = index;
        }
      }
      return true;
    },
  };
}
