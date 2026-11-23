import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { decorTools } from './decorTools';

export function createBarRoom(scene: Scene, parent: TransformNode) {
  const root = new TransformNode('bar-room', scene);
  root.parent = parent;
  const { material, box, cylinder, sphere, label, grain } = decorTools(
    scene,
    root,
  );
  const wall = material('bar-midnight-wall', '#182732');
  const dark = material('bar-dark-metal', '#141b22');
  const brass = material('bar-brass', '#ac8450');
  const walnut = material('bar-walnut', '#69422f');
  const pale = material('bar-cream', '#dbc8a2');
  const teal = material('bar-neon-cyan', '#24bec8', 0.85);
  const amber = material('bar-neon-amber', '#e9a357', 0.9);
  const red = material('bar-seat-leather', '#7a3543');
  grain(walnut, 'wood');
  grain(brass, 'metal');
  const floor = box('bar-floor', [18, 0.08, 16], [0, -0.06, 0], dark);
  floor.receiveShadows = true;
  const planks = [
    material('bar-plank-walnut', '#3c302c'),
    material('bar-plank-warm', '#45362f'),
  ];
  for (const mat of planks) grain(mat, 'wood');
  for (let n = 0; n < 22; n++) {
    const mat = planks[n % 3 ? 0 : 1]!;
    const plank = box(
      `bar-floor-plank-${n}`,
      [0.78, 0.025, 15.9],
      [-8.55 + n * 0.81, -0.005, 0],
      mat,
    );
    plank.receiveShadows = true;
  }
  box('bar-back-wall', [18, 6, 0.16], [0, 3, 5], wall);
  box('bar-left-wall', [0.16, 6, 13], [-8.5, 3, -1.4], wall);
  box('bar-wall-baseboard', [18, 0.14, 0.06], [0, 0.14, 4.88], brass);
  box('bar-neon-back', [17, 0.035, 0.035], [0, 4.8, 4.86], teal);
  box('bar-neon-left', [0.035, 0.035, 12], [-8.38, 4.8, -1.3], amber);
  const rug = material('bar-cabinet-rug', '#163f48');
  const carpet = box('bar-cabinet-rug', [3, 0.015, 2.5], [0, 0.018, -0.1], rug);
  carpet.receiveShadows = true;
  grain(rug, 'paint', 64);
  for (const sign of [-1, 1])
    box(
      `bar-rug-edge-${sign}`,
      [0.035, 0.018, 2.5],
      [sign * 1.4, 0.028, -0.1],
      teal,
    );
  box('bar-counter-body', [4.6, 1.15, 1.25], [4.7, 0.6, 2.3], walnut);
  box('bar-counter-top', [4.95, 0.14, 1.6], [4.7, 1.25, 2.25], pale);
  box('bar-counter-light', [4.6, 0.045, 0.03], [4.7, 1.08, 1.6], amber);
  for (let n = 0; n < 14; n++)
    box(
      `bar-counter-slat-${n}`,
      [0.035, 0.85, 0.04],
      [2.55 + n * 0.33, 0.57, 1.65],
      brass,
    );
  const glasses = ['#285751', '#7d5631', '#4a526d'].map((color, i) =>
    material(`bar-bottle-glass-${i}`, color),
  );
  for (const y of [1.8, 2.65]) {
    box(`bar-shelf-${y}`, [4.7, 0.08, 0.55], [4.7, y, 4.6], walnut);
    for (let n = 0; n < 8; n++) {
      const glass = glasses[n % 3]!;
      cylinder(
        `bottle-body-${y}-${n}`,
        0.14,
        0.35,
        [2.8 + n * 0.53, y + 0.23, 4.53],
        glass,
      );
      cylinder(
        `bottle-neck-${y}-${n}`,
        0.065,
        0.15,
        [2.8 + n * 0.53, y + 0.46, 4.53],
        brass,
      );
    }
  }
  for (const [i, x] of [3.1, 4.7, 6.3].entries()) {
    cylinder(`bar-stool-foot-${i}`, 0.65, 0.08, [x, 0.08, 0.65], dark);
    cylinder(`bar-stool-stem-${i}`, 0.1, 0.65, [x, 0.43, 0.65], brass);
    cylinder(`bar-stool-seat-${i}`, 0.62, 0.13, [x, 0.83, 0.65], red);
  }
  cylinder('bar-table-base', 0.85, 0.08, [-4.6, 0.09, 1], dark);
  cylinder('bar-table-stem', 0.14, 1, [-4.6, 0.6, 1], brass);
  cylinder('bar-table-top', 1.7, 0.12, [-4.6, 1.15, 1], walnut);
  for (const [i, x] of [-5.7, -3.5].entries()) {
    cylinder(`bar-table-stool-leg-${i}`, 0.12, 0.65, [x, 0.37, 0.2], dark);
    cylinder(`bar-table-stool-${i}`, 0.6, 0.12, [x, 0.75, 0.2], red);
  }
  label(
    'bar-lounge-sign',
    'LEVEL / LOUNGE',
    4.4,
    0.8,
    [-3.6, 3.75, 4.88],
    '#22d1d8',
  );
  label(
    'bar-wall-caption',
    'PLAY. PAUSE. REPEAT.',
    3.9,
    0.34,
    [-3.6, 3.05, 4.88],
    '#edb775',
  );
  for (const [i, x] of [3.3, 6.1].entries()) {
    cylinder(`bar-pendant-wire-${i}`, 0.018, 1.25, [x, 4.55, 2.25], dark);
    cylinder(`bar-pendant-shade-${i}`, 0.8, 0.25, [x, 3.85, 2.25], dark);
    sphere(`bar-pendant-bulb-${i}`, 0.25, [x, 3.72, 2.25], amber);
  }
  const ambient = new HemisphericLight(
    'stage-ambient',
    new Vector3(0, 1, 0),
    scene,
  );
  ambient.intensity = 0.55;
  const key = new DirectionalLight(
    'stage-key',
    new Vector3(-0.5, -0.8, 0.7),
    scene,
  );
  key.intensity = 0.9;
  const warm = new PointLight(
    'bar-warm-light',
    new Vector3(4.7, 3.7, 2),
    scene,
  );
  warm.diffuse.set(1, 0.67, 0.4);
  warm.intensity = 1.4;
  warm.range = 10;
  const cool = new PointLight(
    'bar-cool-light',
    new Vector3(-2, 3.3, -0.5),
    scene,
  );
  cool.diffuse.set(0.2, 0.85, 1);
  cool.intensity = 0.6;
  cool.range = 7;
  for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix();
  return {
    key,
    root,
    setEnabled(enabled: boolean) {
      for (const light of [ambient, key, warm, cool]) light.setEnabled(enabled);
    },
  };
}
