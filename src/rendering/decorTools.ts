import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';

/** Original procedural decor. Scene owns meshes, materials and generated labels. */
export function decorTools(scene: Scene, root: TransformNode) {
  function material(name: string, hex: string, emission = 0) {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(hex);
    result.specularColor.set(0.18, 0.2, 0.23);
    result.specularPower = 48;
    result.emissiveColor = result.diffuseColor.scale(emission);
    return result;
  }
  function box(
    name: string,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    mat: StandardMaterial,
  ) {
    const mesh = CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      scene,
    );
    mesh.parent = root;
    mesh.position.set(...at);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }
  function cylinder(
    name: string,
    diameter: number,
    height: number,
    at: readonly [number, number, number],
    mat: StandardMaterial,
  ) {
    const mesh = CreateCylinder(
      name,
      { diameter, height, tessellation: 24 },
      scene,
    );
    mesh.parent = root;
    mesh.position.set(...at);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }
  function sphere(
    name: string,
    diameter: number,
    at: readonly [number, number, number],
    mat: StandardMaterial,
  ) {
    const mesh = CreateSphere(name, { diameter, segments: 16 }, scene);
    mesh.parent = root;
    mesh.position.set(...at);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }
  function label(
    name: string,
    text: string,
    width: number,
    height: number,
    at: readonly [number, number, number],
    ink = '#f2e7d6',
    background = '#101b24',
  ) {
    const mat = material(`${name}-material`, '#ffffff');
    mat.disableLighting = true;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = ink;
      ctx.font = 'bold 96px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 512, 132, 970);
      const texture = new DynamicTexture(`${name}-label`, canvas, scene, false);
      texture.update(true);
      mat.emissiveTexture = texture;
    } else mat.emissiveColor.set(0.3, 0.5, 0.5);
    const plane = CreatePlane(name, { width, height }, scene);
    plane.parent = root;
    plane.position.set(...at);
    plane.material = mat;
    plane.isPickable = false;
    return plane;
  }
  function grain(
    mat: StandardMaterial,
    kind: 'wood' | 'paint' | 'metal',
    density = 32,
  ) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d4d4d4';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < density; i++) {
      const shade =
        kind === 'wood' ? 130 + ((i * 37) % 90) : 185 + ((i * 17) % 45);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = kind === 'wood' ? 1.5 : 0.6;
      ctx.beginPath();
      ctx.moveTo((i * 29) % 128, 0);
      ctx.bezierCurveTo(
        (i * 19) % 128,
        80,
        (i * 31) % 128,
        190,
        (i * 29) % 128,
        256,
      );
      ctx.stroke();
    }
    const texture = new DynamicTexture(
      `${mat.name}-grain`,
      canvas,
      scene,
      true,
    );
    texture.update(true);
    mat.diffuseTexture = texture;
  }
  return { material, box, cylinder, sphere, label, grain };
}
