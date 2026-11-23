import type { Material } from '@babylonjs/core/Materials/material';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';

export interface GuardrailPost {
  readonly base: Vector3;
  readonly top: Vector3;
}

/** Build a guardrail from ordered mounting points in BabylonJS coordinates. */
export function createPracticeGuardrail(
  scene: Scene,
  name: string,
  posts: readonly GuardrailPost[],
  material: Material,
) {
  const root = new TransformNode(name, scene);

  function pipe(id: string, start: Vector3, end: Vector3, diameter: number) {
    const direction = end.subtract(start);
    const mesh = CreateCylinder(
      `${name}-${id}`,
      { height: direction.length(), diameter, tessellation: 10 },
      scene,
    );
    mesh.position.copyFrom(start.add(end).scaleInPlace(0.5));
    const orientation = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(
      Vector3.UpReadOnly,
      direction.normalize(),
      orientation,
    );
    mesh.rotationQuaternion = orientation;
    mesh.material = material;
    mesh.parent = root;
  }

  for (const [index, post] of posts.entries()) {
    pipe(`post-${index}`, post.base, post.top, 0.36);
    const joint = CreateSphere(
      `${name}-joint-${index}`,
      { diameter: 0.38, segments: 10 },
      scene,
    );
    joint.position.copyFrom(post.top);
    joint.material = material;
    joint.parent = root;
    const previous = posts[index - 1];
    if (previous) pipe(`beam-${index}`, previous.top, post.top, 0.38);
  }
  return root;
}
