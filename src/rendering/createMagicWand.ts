import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { PracticeMarblePose } from '../emulation/practicePose';
import { createDizzyStars } from './createDizzyStars';

/** Native magic state owns phase/duration. This effect never changes the timer. */
export function createMagicWand(scene: Scene, name: string) {
  const root = new TransformNode(name, scene);
  const bodyPaint = new StandardMaterial(name + '-body', scene);
  bodyPaint.diffuseColor.set(0.08, 0.08, 0.12);
  bodyPaint.emissiveColor.set(0.03, 0.03, 0.05);
  bodyPaint.specularColor.set(0.35, 0.35, 0.45);
  const tipPaint = new StandardMaterial(name + '-ivory', scene);
  tipPaint.diffuseColor.set(1, 0.98, 0.88);
  tipPaint.emissiveColor.set(0.75, 0.72, 0.55);
  const gold = new StandardMaterial(name + '-gold', scene);
  gold.diffuseColor.set(1, 0.82, 0.12);
  gold.emissiveColor.set(0.85, 0.55, 0.05);

  // Classic magician's wand: glossy black rod with bright ivory tip and golden handle,
  // sized and angled broadside to the isometric Arcade camera for clear silhouette readability.
  const shaft = CreateCylinder(
    name + '-shaft',
    { height: 1.85, diameter: 0.21, tessellation: 12 },
    scene,
  );
  shaft.parent = root;
  shaft.position.y = 1.05;
  shaft.material = bodyPaint;

  const topTip = CreateCylinder(
    name + '-top-tip',
    { height: 0.48, diameter: 0.23, tessellation: 12 },
    scene,
  );
  topTip.parent = root;
  topTip.position.y = 2.15;
  topTip.material = tipPaint;

  const grip = CreateCylinder(
    name + '-grip',
    { height: 0.36, diameter: 0.23, tessellation: 12 },
    scene,
  );
  grip.parent = root;
  grip.position.y = 0.18;
  grip.material = gold;

  const sparks = createDizzyStars(scene, name + '-magic');
  const tip = { x: 0, y: 0, z: 0 };
  root.setEnabled(false);
  return (
    pose: PracticeMarblePose | undefined,
    point: { x: number; y: number; z: number } | null,
  ) => {
    const magic = pose?.magic;
    if (!magic || !point || magic.frame >= 42) {
      root.setEnabled(false);
      sparks(null);
      return;
    }
    root.setEnabled(true);
    // Hold the wand broadside across the Arcade isometric view (+Math.PI / 4)
    // beside and above the marble, waving smoothly across it.
    const swing = Math.sin(magic.progress * Math.PI * 5) * 0.38;
    const tilt = -0.82 + swing;
    const yaw = Math.PI / 4 + Math.cos(magic.progress * Math.PI * 2.5) * 0.14;
    root.position.set(point.x - 0.95, point.y + 1.05, point.z + 0.95);
    root.rotation.set(0, yaw, tilt);
    const len = 2.38;
    tip.x = root.position.x - Math.sin(tilt) * Math.cos(yaw) * len;
    tip.y = root.position.y + Math.cos(tilt) * len;
    tip.z = root.position.z + Math.sin(tilt) * Math.sin(yaw) * len;
    sparks(tip, magic.progress * 180);
  };
}
