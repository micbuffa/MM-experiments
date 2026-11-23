import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { CabinetAction } from '../game/cabinetAction';
import parts from './assets/atariSystem1.json';
import { decorTools } from './decorTools';
import { createTrackball } from './createTrackball';

export function createCabinet(scene: Scene, parent: TransformNode) {
  const root = new TransformNode('arcade-cabinet', scene);
  root.parent = parent;
  const tools = decorTools(scene, root);
  const { material, box, cylinder, grain } = tools;
  const materials = new Map([
    ['black', material('cabinet-laminate', '#242424')],
    ['trim', material('cabinet-blue-trim', '#168cc4')],
    ['metal', material('cabinet-metal', '#55565a')],
    ['label', material('cabinet-lettering', '#9a9a98')],
    ['coin', material('cabinet-coin-return', '#ad1913', 0.26)],
    ['bezel', material('cabinet-bezel', '#17191c')],
    ['speaker', material('cabinet-speaker-grille', '#303134')],
  ]);
  for (const name of ['control-panel', 'side-art', 'rear-vent', 'marquee']) {
    const mat = material(`cabinet-${name}`, '#ffffff');
    if (typeof document !== 'undefined') {
      const texture = new Texture(
        `${import.meta.env.BASE_URL}assets/cabinet/${name}.webp`,
        scene,
        false,
        true,
        Texture.TRILINEAR_SAMPLINGMODE,
      );
      if (name === 'marquee') {
        mat.disableLighting = true;
        mat.emissiveTexture = texture;
      } else {
        mat.diffuseTexture = texture;
        mat.ambientColor.set(0.3, 0.3, 0.3);
      }
    }
    materials.set(name, mat);
  }
  for (const part of parts) {
    const mesh = new Mesh(part.name, scene);
    mesh.parent = root;
    mesh.material = materials.get(part.material)!;
    const geometry = new VertexData();
    geometry.positions = part.positions;
    geometry.indices = part.indices;
    geometry.uvs = part.uvs;
    const normals: number[] = [];
    VertexData.ComputeNormals(part.positions, part.indices, normals);
    geometry.normals = normals;
    geometry.applyToMesh(mesh);
    mesh.isPickable = false;
  }

  function target(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    action: CabinetAction,
  ) {
    const mesh = box(name, size, position, materials.get('black')!);
    mesh.visibility = 0;
    mesh.isPickable = true;
    mesh.metadata = { cabinetAction: action };
  }
  target(
    'cabinet-button-credit',
    [0.031, 0.035, 0.008],
    [0.146, 0.717, -0.268],
    'credit',
  );
  target(
    'cabinet-coin-slot',
    [0.031, 0.035, 0.008],
    [0.202, 0.717, -0.268],
    'credit',
  );
  target(
    'cabinet-button-start1',
    [0.033, 0.019, 0.032],
    [-0.0237, 0.986, -0.242],
    'start1',
  );
  target(
    'cabinet-button-start2',
    [0.033, 0.019, 0.032],
    [0.0287, 0.986, -0.242],
    'start2',
  );
  const grille = material('cabinet-speaker-mesh', '#222325');
  const surround = material('cabinet-speaker-surround', '#151517');
  grain(grille, 'metal', 128);
  for (const x of [-0.213, 0.213]) {
    cylinder(
      'speaker-surround',
      0.101,
      0.008,
      [x, 1.048, -0.145],
      surround,
    ).rotation.x = -0.91;
    cylinder(
      'speaker-grille',
      0.087,
      0.005,
      [x, 1.052, -0.149],
      grille,
    ).rotation.x = -0.91;
  }
  const trackballs = [
    createTrackball(
      tools,
      'cabinet-trackball',
      '#195cba',
      [-0.1516, 0.9444, -0.3069],
    ),
    createTrackball(
      tools,
      'cabinet-trackball-p2',
      '#c42a19',
      [0.1564, 0.9444, -0.3069],
    ),
  ] as const;
  trackballs[0].mesh.isPickable = true;
  trackballs[0].mesh.metadata = { cabinetAction: 'play' };
  trackballs[1].mesh.isPickable = true;
  trackballs[1].mesh.metadata = { cabinetAction: 'preview2' };

  return {
    root,
    roll(x: number, y: number, player: 0 | 1 = 0) {
      trackballs[player].roll(x, y);
    },
  };
}
