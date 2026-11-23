import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  practiceWorldPoint,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { practiceDecalOpacity } from './practiceDecalOpacity';
import { intermediateGoal } from './intermediateFinish';
import { level3Goal } from './createLevel3Materials';
import { level5Goal } from './level5DisplayTerrain';
import { level6Goal } from './level6DisplayTerrain';
import { level4Goal } from './createLevel4Materials';

const letters = [
  [
    '...######.#.',
    '..##....###.',
    '.###.....##.',
    '.###......#.',
    '###.........',
    '###.........',
    '###....#####',
    '###.....###.',
    '###.....###.',
    '.###....###.',
    '.###....###.',
    '..###..###..',
    '....#####...',
  ],
  [
    '...######...',
    '..###..###..',
    '.###....###.',
    '.###....###.',
    '###......###',
    '###......###',
    '###......###',
    '###......###',
    '###......###',
    '.###....###.',
    '.###....###.',
    '..###..###..',
    '...######...',
  ],
  [
    '.....###....',
    '.....###....',
    '....#####...',
    '....#.###...',
    '...##.####..',
    '...#...###..',
    '..##...####.',
    '..#.....###.',
    '..#########.',
    '.##......###',
    '.#.......###',
    '.#........##',
    '####....####',
  ],
  [
    '#######.....',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###.......',
    '..###......#',
    '..###.....##',
    '..###....###',
    '############',
  ],
] as const;

type GoalPalette = 'idle' | 'blue' | 'red' | 'intermediate';
const goalColors = {
  idle: { ink: [20, 20, 20, 255], paper: [193, 193, 193, 255] },
  blue: { ink: [24, 25, 164, 255], paper: [163, 170, 238, 255] },
  red: { ink: [166, 23, 23, 255], paper: [237, 166, 166, 255] },
  intermediate: { ink: [44, 44, 44, 255], paper: [131, 131, 131, 255] },
};

export function practiceGoalPaint(
  palette: GoalPalette,
  compact = palette === 'intermediate',
) {
  const { ink, paper } = goalColors[palette];
  const pixels = new Uint8Array(128 * 64 * 4);
  const height = compact ? 36 : 64;
  // On Practice Race the letters sit on the upper two rows while the frame spans all four rows.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < 128; x++) {
      const column = Math.floor((x - 13) / 2);
      const row = Math.floor((y - 6) / 2);
      const letter = letters[Math.floor(column / 13)];
      const frame = x < 4 || x >= 124 || y < 3 || y >= height - 3;
      const stroke = letter?.[row]?.[column % 13] === '#';
      const offset = 4 * (y * 128 + x);
      pixels.set(frame || stroke ? ink : paper, offset);
      pixels[offset + 3] = practiceDecalOpacity(x, y);
    }
  }
  return pixels;
}

export function createPracticeGoalMaterial(
  scene: Scene,
  palette: GoalPalette,
  compact = palette === 'intermediate',
) {
  const material = new StandardMaterial(`practice-goal-${palette}`, scene);
  material.specularColor.set(0, 0, 0);
  const glow = palette === 'intermediate' ? 0.17 : 0.26;
  material.emissiveColor.set(glow, glow, glow);
  const texture = RawTexture.CreateRGBATexture(
    practiceGoalPaint(palette, compact),
    128,
    64,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  if (palette === 'blue' || palette === 'red') {
    material.emissiveTexture = texture;
    material.emissiveColor.set(0.45, 0.45, 0.45);
  }
  material.useAlphaFromDiffuseTexture = true;
  return material;
}

const flagColumns = 9;
const flagRows = 5;
const checkColumns = 3;
const checkRows = 2;

export function practiceFlagPaint(level?: PracticeTerrain['level']) {
  const light =
    level === 'intermediate'
      ? [16, 181, 235, 255]
      : level === 'level5' || level === 'level6'
        ? [255, 170, 0, 255]
        : [255, 255, 128, 255];
  const squares = new Uint8Array(checkColumns * checkRows * 4);
  for (let y = 0; y < checkRows; y++) {
    for (let x = 0; x < checkColumns; x++) {
      squares.set(
        (x + y) % 2 === 0 ? light : [25, 21, 17, 255],
        (y * checkColumns + x) * 4,
      );
    }
  }
  return squares;
}

export function practiceFlagWave(
  positions: number[],
  seconds: number,
  phase: number,
) {
  for (let v = 0; v < flagRows; v++) {
    for (let u = 0; u < flagColumns; u++) {
      const along = u / (flagColumns - 1);
      const offset = 3 * (v * flagColumns + u);
      const wave = Math.sin(seconds * 9 - along * 7 + phase);
      positions[offset] = -0.23 * along + 0.14 * along * wave;
      positions[offset + 1] =
        2.4 - v * 0.24 + 0.18 * along * wave - 0.12 * along;
      positions[offset + 2] = 1.65 * along;
    }
  }
}

export function createPracticeGoalFlags(
  scene: Scene,
  terrain: PracticeTerrain,
) {
  const name = `${terrain.level ?? 'practice'}-goal`;
  const poleMaterial = new StandardMaterial(`${name}-pole`, scene);
  if (terrain.level === 'intermediate')
    poleMaterial.diffuseColor.set(0.09, 0.58, 0.79);
  else if (terrain.level === 'level4')
    poleMaterial.diffuseColor.set(0.9, 0.88, 0.12);
  else poleMaterial.diffuseColor.set(0.84, 0.62, 0.22);
  const cloth = new StandardMaterial(`${name}-flag`, scene);
  cloth.backFaceCulling = false;
  cloth.disableLighting = true;
  const pattern = RawTexture.CreateRGBATexture(
    practiceFlagPaint(terrain.level),
    checkColumns,
    checkRows,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  cloth.emissiveTexture = pattern;
  const flags: { mesh: Mesh; positions: number[] }[] = [];
  const goalRegion =
    terrain.level === 'intermediate'
      ? intermediateGoal
      : terrain.level === 'level3'
        ? level3Goal
        : terrain.level === 'level4'
          ? level4Goal
          : terrain.level === 'level5'
            ? level5Goal
            : terrain.level === 'level6'
              ? level6Goal
              : undefined;
  const flagZ =
    terrain.level === 'level3' && goalRegion ? goalRegion.z - 1 : goalRegion?.z;
  const ground =
    goalRegion && flagZ !== undefined
      ? terrain.cells[flagZ]?.[goalRegion.x]?.[0]
      : undefined;
  const anchors =
    goalRegion && flagZ !== undefined
      ? [0.05, goalRegion.width - 0.05].map(
          (dx) =>
            [goalRegion.x + dx, flagZ + 0.05, arcadeGroundHeight] as const,
        )
      : [64.05, 67.98].map((z) => [72, z, 16348] as const);
  for (const [index, [x, z, height]] of anchors.entries()) {
    const position = practiceWorldPoint(
      x * arcadeCellUnits,
      z * arcadeCellUnits,
      height,
      terrain.cells[0]!.length,
      terrain.cells.length,
      terrain.origin,
    );
    if (!position) continue;
    const pole = CreateCylinder(
      `${name}-pole-${index}`,
      { height: 2.5, diameter: 0.1, tessellation: 8 },
      scene,
    );
    const y = ground ?? position.y;
    pole.position.set(position.x, y + 1.25, position.z);
    pole.material = poleMaterial;
    const mesh = new Mesh(`${name}-flag-${index}`, scene);
    mesh.position.set(position.x, y, position.z);
    mesh.material = cloth;
    const positions = Array<number>(flagColumns * flagRows * 3).fill(0);
    practiceFlagWave(positions, 0, index);
    const data = new VertexData();
    data.positions = positions;
    data.indices = [];
    data.uvs = [];
    for (let v = 0; v < flagRows; v++) {
      for (let u = 0; u < flagColumns; u++) {
        data.uvs.push(u / (flagColumns - 1), v / (flagRows - 1));
        if (u + 1 === flagColumns || v + 1 === flagRows) continue;
        const a = v * flagColumns + u;
        data.indices.push(
          a,
          a + 1,
          a + flagColumns,
          a + 1,
          a + flagColumns + 1,
          a + flagColumns,
        );
      }
    }
    data.applyToMesh(mesh, true);
    flags.push({ mesh, positions });
  }
  let seconds = 0;
  scene.onBeforeRenderObservable.add(() => {
    seconds += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    for (const [index, flag] of flags.entries()) {
      practiceFlagWave(flag.positions, seconds, index);
      flag.mesh.updateVerticesData(VertexBuffer.PositionKind, flag.positions);
    }
  });
}
