import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import type { Scene } from '@babylonjs/core/scene';

export function intermediateBridgeSidePixel(x: number, y: number) {
  const edge = Math.min(x, 63 - x, y, 15 - y);
  if (edge === 0) return [23, 109, 128, 255];
  if (edge <= 2) return y < 8 ? [119, 218, 224, 255] : [34, 151, 167, 255];
  const bolt = x > 8 && x < 56 && Math.abs((x % 16) - 8) >= 7;
  if (bolt && y === 7) return [145, 216, 217, 255];
  if (bolt && y === 8) return [45, 132, 145, 255];
  return y === 3 ? [67, 194, 202, 255] : [58, 153, 161, 255];
}

export function createIntermediateBridgeSide(scene: Scene) {
  const paint = new StandardMaterial('intermediate-bridge-turquoise', scene);
  const pixels = new Uint8Array(64 * 16 * 4);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 64; x++)
      pixels.set(intermediateBridgeSidePixel(x, y), (y * 64 + x) * 4);
  const fascia = RawTexture.CreateRGBATexture(
    pixels,
    64,
    16,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  // On the long sides of the box, V follows the length of the bridge.
  fascia.wAng = Math.PI / 2;
  fascia.wrapU = fascia.wrapV = Texture.CLAMP_ADDRESSMODE;
  paint.diffuseColor.set(0.14, 0.28, 0.3);
  paint.emissiveTexture = fascia;
  paint.emissiveColor.set(0.68, 0.72, 0.72);
  paint.specularColor.set(0.14, 0.16, 0.18);
  return paint;
}

export function createIntermediateBridgeMechanism(
  scene: Scene,
  x: number,
  y: number,
  z: number,
) {
  const machinery = new TransformNode(
    'intermediate-bridge-moving-machinery',
    scene,
  );
  machinery.position.set(0.5, 0, 0.15);
  let upperPart = false;
  const painted = new StandardMaterial('intermediate-bridge-machinery', scene);
  painted.diffuseColor.set(0.22, 0.2, 0.4);
  painted.emissiveColor.set(0.065, 0.058, 0.13);
  const steel = new StandardMaterial('intermediate-bridge-piston-steel', scene);
  steel.diffuseColor.set(0.42, 0.4, 0.62);
  steel.emissiveColor.set(0.11, 0.1, 0.19);
  steel.specularColor.set(0.65, 0.65, 0.82);
  steel.specularPower = 48;

  function box(
    name: string,
    width: number,
    height: number,
    depth: number,
    dx: number,
    dy: number,
    dz: number,
    paint = painted,
  ) {
    const part = CreateBox(
      `intermediate-bridge-${name}`,
      { width, height, depth },
      scene,
    );
    if (upperPart) part.parent = machinery;
    part.position.set(x + dx, y + dy, z + dz);
    part.material = paint;
    return part;
  }
  function cylinder(
    name: string,
    diameter: number,
    height: number,
    dx: number,
    dy: number,
    dz: number,
    paint = steel,
  ) {
    const part = CreateCylinder(
      `intermediate-bridge-${name}`,
      { diameter, height, tessellation: 24 },
      scene,
    );
    if (upperPart) part.parent = machinery;
    part.position.set(x + dx, y + dy, z + dz);
    part.material = paint;
    return part;
  }

  box('housing', 4.4, 0.33, 3.8, -0.35, 0, 0);
  box('base-lip', 0.1, 0.1, 3.7, -2.55, 0.1, 0, steel);
  for (const dx of [-2.15, 1.35]) {
    box('guide-track', 0.11, 0.12, 3.5, dx, 0.2, 0, steel);
    for (const dz of [-1.5, 1.5])
      cylinder('fastener', 0.18, 0.12, dx, 0.27, dz);
  }
  for (const dz of [-1.8, 1.8])
    box('cross-rail', 4.1, 0.12, 0.12, -0.35, 0.2, dz, steel);

  upperPart = true;
  const pistonX = -0.35;
  const pistonZ = 0;
  cylinder('piston-foot', 1.35, 0.22, pistonX, 0.26, pistonZ);
  cylinder('lower-sleeve', 1.16, 0.58, pistonX, 0.58, pistonZ, painted);
  cylinder('sleeve-rim', 1.19, 0.09, pistonX, 0.89, pistonZ);
  cylinder('cylinder', 1.01, 1.43, pistonX, 1.58, pistonZ, painted);
  cylinder('piston-collar', 1.1, 0.16, pistonX, 2.27, pistonZ);
  const piston = cylinder('piston', 0.77, 1, pistonX, 0, pistonZ);
  const clevis = cylinder('piston-head', 0.94, 0.16, pistonX, 0, pistonZ);
  cylinder('auxiliary-housing', 0.89, 0.64, 0.98, 0.48, 1.11, painted);
  const auxPlunger = cylinder('auxiliary-plunger', 0.44, 0.5, 0.98, 0.72, 1.11);
  const auxCap = cylinder('auxiliary-cap', 0.71, 0.14, 0.98, 0.98, 1.11);
  let pumpSeconds = 0;
  scene.onBeforeRenderObservable.add(() => {
    pumpSeconds += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    const stroke = Math.sin(pumpSeconds * Math.PI * 2 * 4.5) * 0.16;
    auxPlunger.position.y = y + 0.72 + stroke;
    auxCap.position.y = y + 0.98 + stroke;
  });
  const pipe = CreateTube(
    'intermediate-bridge-hydraulic-line',
    {
      path: [
        new Vector3(x + 1.13, y + 0.84, z + 1.11),
        new Vector3(x + 1.13, y + 1.15, z + 1.11),
        new Vector3(x + 1.08, y + 1.22, z + 1.06),
        new Vector3(x + 0.16, y + 1.22, z + 0.17),
      ],
      radius: 0.045,
      tessellation: 10,
    },
    scene,
  );
  pipe.parent = machinery;
  pipe.material = steel;

  // Place the spoked wheel on the left of the piston, parallel to the slope (+X face).
  const wheelX = 0.88;
  const wheelZ = -0.78;
  const wheelHub = new TransformNode('intermediate-bridge-wheel-hub', scene);
  wheelHub.parent = machinery;
  wheelHub.position.set(x + wheelX, y + 1.02, z + wheelZ);
  wheelHub.rotation.set(0, 0, Math.PI / 2);
  const wheel = CreateTorus(
    'intermediate-bridge-wheel',
    { diameter: 0.84, thickness: 0.12, tessellation: 20 },
    scene,
  );
  wheel.parent = wheelHub;
  wheel.material = steel;
  const axle = CreateCylinder(
    'intermediate-bridge-wheel-axle',
    { diameter: 0.22, height: 0.2, tessellation: 14 },
    scene,
  );
  axle.parent = wheel;
  axle.material = painted;
  cylinder('wheel-post', 0.26, 0.82, wheelX - 0.08, 0.56, wheelZ, painted);
  for (const angle of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    const spoke = CreateBox(
      'intermediate-bridge-wheel-spoke',
      { width: 0.07, height: 0.055, depth: 0.72 },
      scene,
    );
    spoke.parent = wheel;
    spoke.rotation.y = angle;
    spoke.material = steel;
  }

  const linkage = cylinder('linkage', 0.13, 1, 0, 0, 0);
  const anchor = new Vector3(x + 0.92, y + 0.45, z + 1.53);
  const head = new Vector3(x + pistonX + 0.18, y, z + pistonZ + 0.41);
  const direction = new Vector3();
  return (lift: number, rise: number) => {
    piston.scaling.y = lift;
    piston.position.y = y + lift / 2;
    clevis.position.y = y + lift - 0.06;
    wheel.rotation.y = rise * 3.5;
    head.y = y + 1.65 + rise * 0.42;
    head.subtractToRef(anchor, direction);
    linkage.scaling.y = direction.length();
    linkage.position.set(
      (head.x + anchor.x) / 2,
      (head.y + anchor.y) / 2,
      (head.z + anchor.z) / 2,
    );
    linkage.rotation.set(
      Math.atan2(direction.z, direction.y),
      0,
      -Math.atan2(direction.x, Math.hypot(direction.y, direction.z)),
    );
  };
}
