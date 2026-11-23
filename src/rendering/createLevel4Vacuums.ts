import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateRibbon } from '@babylonjs/core/Meshes/Builders/ribbonBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { TerrainCell } from '../game/modern/terrainMesh';

function nozzleContour(
  width: number,
  height: number,
  radius: number,
  z: number,
) {
  const path: Vector3[] = [];
  for (let corner = 0; corner < 4; corner++) {
    const x =
      corner === 0 || corner === 3 ? width / 2 - radius : radius - width / 2;
    const y = corner < 2 ? height / 2 - radius : radius - height / 2;
    for (let step = 0; step <= 4; step++) {
      const angle = (corner * Math.PI) / 2 + (step * Math.PI) / 8;
      path.push(
        new Vector3(
          x + radius * Math.cos(angle),
          y + radius * Math.sin(angle),
          z,
        ),
      );
    }
  }
  return path;
}

/** Scene-owned procedural nozzles; native emitted images own the mouth tremor. */
export function createLevel4Vacuums(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
  live: boolean,
) {
  const paint = new StandardMaterial('level4-vacuum-yellow', scene);
  paint.diffuseColor.set(0.95, 0.77, 0.015);
  paint.emissiveColor.set(0.1, 0.07, 0);
  paint.specularColor.set(0.18, 0.14, 0.02);
  const lining = new StandardMaterial('level4-vacuum-mouth', scene);
  lining.diffuseColor.set(0.16, 0.11, 0.004);
  lining.emissiveColor.set(0.38, 0.27, 0.006);
  lining.specularColor.set(0, 0, 0);
  const vents = new StandardMaterial('level4-vacuum-vents', scene);
  vents.diffuseColor.set(0.28, 0.22, 0.008);
  vents.specularColor.set(0, 0, 0);
  const specs = [
    { x: 39.5, z: 37.5, yaw: 0, dx: 0, dz: -1.16 },
    { x: 48.5, z: 37.5, yaw: 0, dx: 0, dz: -1.16 },
    { x: 51.5, z: 46.5, yaw: Math.PI / 2, dx: -1.16, dz: 0 },
    { x: 34.5, z: 43.5, yaw: 0, dx: 0, dz: -1.16 },
    { x: 42.5, z: 43.5, yaw: 0, dx: 0, dz: -1.16 },
    { x: 45.5, z: 52.5, yaw: Math.PI / 2, dx: -1.16, dz: 0 },
  ];
  const mounts: {
    index: number;
    root: TransformNode;
    head: TransformNode;
    y: number;
  }[] = [];
  const casters: Mesh[] = [];
  for (const [index, spec] of specs.entries()) {
    const cell = cells[Math.floor(spec.z)]?.[Math.floor(spec.x)];
    if (!cell || cell.some((height) => height === null)) continue;
    const y = (cell[0]! + cell[2]!) / 2;
    const root = new TransformNode(`level4-vacuum-${index}`, scene);
    root.position.set(
      spec.x - cells[0]!.length / 2 + spec.dx,
      y,
      spec.z - cells.length / 2 + spec.dz,
    );
    root.rotation.y = spec.yaw;
    const shaft = [
      [-7, 0.9],
      [0.05, 0.9],
      [0.05, 1.0],
      [0.12, 1.0],
      [0.12, 0.9],
      [0.25, 0.9],
      [0.25, 1.0],
      [0.32, 1.0],
      [0.32, 0.9],
      [0.45, 0.9],
      [0.45, 1.0],
      [0.52, 1.0],
      [0.52, 0.9],
      [1.05, 0.9],
    ] as const;
    const hose = CreateRibbon(
      `level4-vacuum-${index}-hose`,
      {
        pathArray: shaft.map(([height, width]) =>
          nozzleContour(width, 0.72, 0.1, 0).map(
            (p) => new Vector3(p.x, height, p.y),
          ),
        ),
        closePath: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene,
    );
    hose.parent = root;
    hose.material = paint;
    // A quarter turn joins the vertical stem to the rear inlet. Its end is
    // seated inside the hood so the native head tremor cannot open a gap.
    const elbow = CreateRibbon(
      `level4-vacuum-${index}-elbow`,
      {
        pathArray: Array.from({ length: 13 }, (_, step) => {
          const angle = (step * Math.PI) / 24;
          return nozzleContour(0.9, 0.72, 0.1, 0).map(
            (p) =>
              new Vector3(
                p.x,
                0.9 + 0.3 * Math.sin(angle) - p.y * Math.sin(angle),
                0.3 * (1 - Math.cos(angle)) + p.y * Math.cos(angle),
              ),
          );
        }),
        closePath: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene,
    );
    elbow.parent = root;
    elbow.material = paint;
    const head = new TransformNode(`level4-vacuum-${index}-head`, scene);
    head.parent = root;
    head.position.set(0, 1.2, 0.02);
    const hood = CreateRibbon(
      `level4-vacuum-${index}-hood`,
      {
        pathArray: [
          nozzleContour(0.9, 0.72, 0.1, 0.23),
          nozzleContour(1.95, 1.16, 0.13, 0.23),
          nozzleContour(2.1, 1.28, 0.12, 0.86),
          nozzleContour(2.12, 1.28, 0.1, 1.0),
          nozzleContour(2.0, 1.16, 0.08, 1.07),
          nozzleContour(1.8, 0.94, 0.07, 1.07),
          nozzleContour(1.7, 0.84, 0.05, 0.72),
        ],
        closePath: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene,
    );
    hood.parent = head;
    hood.material = paint;
    const mouth = CreateBox(
      `level4-vacuum-${index}-mouth`,
      { width: 1.7, height: 0.84, depth: 0.045 },
      scene,
    );
    mouth.parent = head;
    mouth.position.z = 0.695;
    mouth.material = lining;
    for (let dot = 0; dot < 4; dot++) {
      const vent = CreateBox(
        `level4-vacuum-${index}-vent-${dot}`,
        { width: 0.055, height: 0.055, depth: 0.008 },
        scene,
      );
      vent.parent = head;
      vent.position.set((dot - 1.5) * 0.27, -0.22, 0.724);
      vent.material = vents;
    }
    root.setEnabled(!live);
    casters.push(hose, elbow, hood, mouth);
    mounts.push({ index, root, head, y });
  }
  scene.metadata ??= {};
  Object.assign(scene.metadata, {
    setLevel4VacuumExtensions(
      next: readonly number[] | undefined,
      frames?: readonly (number | undefined)[],
    ) {
      for (const { index, root, head, y } of mounts) {
        const extension = next?.[index] ?? (live ? 0 : 1);
        root.setEnabled(extension >= 0.35);
        root.position.y = y - (1 - extension) * 1.1;
        const frame = frames?.[index];
        const tremor =
          extension === 1 && frame !== undefined ? (frame === 1 ? 1 : -1) : 0;
        head.position.y = 1.2 + tremor * 0.025;
        head.rotation.z = tremor * 0.012;
        head.scaling.set(1 + tremor * 0.012, 1 - tremor * 0.01, 1);
      }
    },
  });
  return casters;
}
