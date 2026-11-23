import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import { ArcadeTerrainPaint } from './arcadeTerrainPaint';
import {
  createPracticeSun,
  invalidatePracticeShadows,
} from './createPracticeSun';
import { createPracticeSurfaceMaterial } from './createPracticeSurfaceMaterial';
import { createPracticeTower } from './createPracticeTower';
import {
  createPracticeGoalFlags,
  createPracticeGoalMaterial,
} from './createPracticeGoal';
import { intermediateFinishSurface } from './intermediateFinish';
import { intermediateSlopeColors } from './intermediateLandmarks';
import {
  level6DisplayTerrain,
  level6Goal,
  level6PhaseGrid,
  level6Pyramids,
  level6SurfaceKind,
  level6Wedges,
  type Level6SurfaceKind,
} from './level6DisplayTerrain';

const PHASE_PREFIX = 'level6-maze-phase-';
const PHASE_COUNT = 4;
// Authentic Atari 68010 cadence: 41 frames per phase at 60 Hz (~0.683 s).
const STUDY_PHASE_SECONDS = 41 / 60;

interface Level6MaterialSet {
  readonly stone: StandardMaterial;
  readonly amber: StandardMaterial;
  readonly ice: StandardMaterial;
  readonly peach: StandardMaterial;
  readonly ribbed: StandardMaterial;
  readonly dark: StandardMaterial;
  readonly cliff: StandardMaterial;
}

function buildPatternTexture(
  scene: Scene,
  size: number,
  pixelAt: (x: number, y: number) => readonly [number, number, number, number],
) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pixels.set(pixelAt(x, y), 4 * (y * size + x));
    }
  }
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    size,
    size,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  return texture;
}

function createLevel6Materials(scene: Scene): Level6MaterialSet {
  const stone = createPracticeSurfaceMaterial(scene, 'floor', 'level6');

  const amber = new StandardMaterial('level6-amber', scene);
  amber.specularColor.set(0, 0, 0);
  amber.emissiveColor.set(0.16, 0.1, 0.01);
  amber.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    const hash = (Math.imul(x + 17, y + 31) ^ Math.imul(x * 3, y * 5)) & 15;
    if (x === 0 || y === 0) return [126, 78, 8, 255];
    if (hash < 3) return [245, 198, 42, 255];
    if (hash > 12) return [152, 92, 10, 255];
    return [206, 138, 16, 255];
  });

  const ice = new StandardMaterial('level6-ice', scene);
  ice.specularColor.set(0, 0, 0);
  ice.emissiveColor.set(0.05, 0.24, 0.26);
  ice.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) return [0, 96, 108, 255];
    const glint =
      (x + y) % 8 === 0 ||
      (x >= 3 && x <= 5 && y === 4) ||
      (x === 10 && y === 11);
    return glint ? [156, 255, 255, 255] : [0, 206, 212, 255];
  });

  const peach = new StandardMaterial('level6-peach', scene);
  peach.specularColor.set(0, 0, 0);
  peach.emissiveColor.set(0.18, 0.11, 0.06);
  peach.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    const dx = Math.abs(x - 7.5);
    const dy = Math.abs(y - 7.5);
    const diamond = Math.abs(dx + dy - 6) < 1.2;
    if (x === 0 || y === 0) return [156, 98, 52, 255];
    if (diamond) return [252, 224, 184, 255];
    return [222, 146, 86, 255];
  });

  const ribbed = new StandardMaterial('level6-ribbed', scene);
  ribbed.specularColor.set(0, 0, 0);
  ribbed.emissiveColor.set(0.12, 0.12, 0.12);
  ribbed.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    const band = y % 4;
    if (band === 0) return [84, 84, 88, 255];
    if (band === 1) return [224, 224, 230, 255];
    if (x === 0) return [105, 105, 110, 255];
    return [168, 168, 174, 255];
  });

  const dark = new StandardMaterial('level6-dark', scene);
  dark.specularColor.set(0, 0, 0);
  dark.emissiveColor.set(0.08, 0.08, 0.09);
  dark.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    if (x === 0 || y === 0) return [28, 28, 32, 255];
    if (x === 1 || y === 1) return [142, 142, 148, 255];
    return [82, 82, 88, 255];
  });

  const cliff = new StandardMaterial('level6-cliffs', scene);
  cliff.specularColor.set(0, 0, 0);
  cliff.backFaceCulling = false;
  cliff.twoSidedLighting = true;
  cliff.diffuseTexture = buildPatternTexture(scene, 16, (x) =>
    x < 2 || x >= 14 ? [0, 0, 0, 255] : [255, 255, 255, 255],
  );
  new ArcadeTerrainPaint(cliff, 'level6', 'wall');

  return { stone, amber, ice, peach, ribbed, dark, cliff };
}

function buildMesh(
  scene: Scene,
  name: string,
  geometry: ReturnType<typeof terrainMesh>,
) {
  const out = new Mesh(name, scene);
  const data = new VertexData();
  Object.assign(data, geometry);
  data.normals = [];
  VertexData.ComputeNormals(geometry.positions, geometry.indices, data.normals);
  data.applyToMesh(out);
  return out;
}

function buildLayeredSurface(
  scene: Scene,
  prefix: string,
  cells: readonly (readonly TerrainCell[])[],
  materials: Level6MaterialSet,
  parent?: TransformNode,
) {
  const kinds: readonly Level6SurfaceKind[] = [
    'stone',
    'amber',
    'ice',
    'peach',
    'ribbed',
    'dark',
  ];
  const meshes: Mesh[] = [];
  for (const kind of kinds) {
    const filtered = cells.map((row, z) =>
      row.map((cell, x) =>
        cell && level6SurfaceKind(x, z, cell) === kind ? cell : null,
      ),
    );
    const geometry = terrainMesh(filtered);
    if (!geometry.indices.length) continue;
    const meshName =
      prefix === 'terrain' && kind === 'stone'
        ? 'terrain-surface'
        : `${prefix}-${kind}`;
    const m = buildMesh(scene, meshName, geometry);
    const normals = m.getVerticesData(VertexBuffer.NormalKind);
    if (normals) {
      m.setVerticesData(
        VertexBuffer.ColorKind,
        intermediateSlopeColors(normals),
      );
    }
    m.material = materials[kind];
    m.receiveShadows = true;
    if (parent) m.parent = parent;
    meshes.push(m);
  }
  return meshes;
}

function createWedgeChute(
  scene: Scene,
  name: string,
  xCell: number,
  zCell: number,
  width: number,
  length: number,
  columns: number,
  rows: number,
  material: StandardMaterial,
  interiorMaterial: StandardMaterial,
) {
  const baseY = 0;
  const peakY = 1.45;
  const x0 = xCell - columns / 2;
  const x1 = x0 + width;
  const z0 = zCell - rows / 2;
  const z1 = z0 + length;
  // Orange triangular wedge rising from x0 (low) to x1 (high) with an open dark tunnel on the +X face.
  const positions = [
    // Sloped roof
    x0,
    baseY,
    z0,
    x1,
    peakY,
    z0,
    x1,
    peakY,
    z1,
    x0,
    baseY,
    z1,
    // Left triangular cheek (z = z0)
    x0,
    baseY,
    z0,
    x1,
    baseY,
    z0,
    x1,
    peakY,
    z0,
    // Right triangular cheek (z = z1)
    x0,
    baseY,
    z1,
    x1,
    peakY,
    z1,
    x1,
    baseY,
    z1,
  ];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 7, 8, 9];
  const uvs = Array<number>((positions.length / 3) * 2).fill(0);
  const wedge = buildMesh(scene, name, { positions, indices, uvs });
  wedge.material = material;
  wedge.receiveShadows = true;
  // Dark recessed tunnel opening on the high (+X) face.
  const mouth = buildMesh(scene, `${name}-mouth`, {
    positions: [
      x1 - 0.02,
      baseY,
      z0 + 0.25,
      x1 - 0.02,
      baseY,
      z1 - 0.25,
      x1 - 0.02,
      peakY - 0.15,
      z1 - 0.25,
      x1 - 0.02,
      peakY - 0.15,
      z0 + 0.25,
    ],
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
  });
  mouth.material = interiorMaterial;
  return wedge;
}

/** Toggle the active disappearing-block maze phase in O(1) with zero allocations. */
export function setLevel6MazePhase(scene: Scene, phase: 0 | 1 | 2 | 3) {
  let changed = false;
  for (let i = 0; i < PHASE_COUNT; i++) {
    const node = scene.getTransformNodeByName(`${PHASE_PREFIX}${i}`);
    if (node) {
      const want = i === phase;
      if (node.isEnabled() !== want) {
        node.setEnabled(want);
        changed = true;
      }
    }
  }
  if (changed) invalidatePracticeShadows(scene);
}

/** Enable or pause the automatic 41-frame study cycle in terrain.html. */
export function setLevel6MazeAutoCycle(scene: Scene, enabled: boolean) {
  const meta = (scene.metadata ??= {}) as Record<string, unknown>;
  meta.level6AutoCycle = enabled;
}

/** Scene-owned Level 6 geometry, materials, shadows, and 4-phase animated maze. */
export function createLevel6Terrain(
  scene: Scene,
  terrain: PracticeTerrain,
  live = false,
) {
  const columns = terrain.cells[0]!.length;
  const rows = terrain.cells.length;
  const display = level6DisplayTerrain(terrain.cells);
  const materials = createLevel6Materials(scene);
  const hasMazePhases =
    terrain.mazePhases !== undefined &&
    terrain.mazePhases.length === PHASE_COUNT;

  const isDynamicMazeCell = (x: number, z: number) =>
    hasMazePhases && x >= 76 && z >= 78;

  // Build static terrain (everything outside the 4-phase maze when phases are present).
  const staticCells = display.map((row, z) =>
    row.map((cell, x) => (isDynamicMazeCell(x, z) ? null : cell)),
  );
  buildLayeredSurface(scene, 'terrain', staticCells, materials);

  const staticSurface = terrainMesh(staticCells);
  let lowest = 0;
  for (let i = 1; i < staticSurface.positions.length; i += 3) {
    lowest = Math.min(lowest, staticSurface.positions[i]!);
  }
  const cliffBase = lowest - 22;
  const staticWalls = terrainCliffs(staticSurface, columns, rows, cliffBase);
  const cliffs = buildMesh(scene, 'terrain-cliffs', staticWalls);
  cliffs.material = materials.cliff;
  cliffs.receiveShadows = true;

  const shadows = createPracticeSun(
    scene,
    Math.hypot(columns, rows),
    'intermediate',
  );
  shadows.usePercentageCloserFiltering = true;
  shadows.normalBias = 0.02;
  shadows.darkness = 0.1;
  shadows.addShadowCaster(cliffs, false);

  // Pre-build all 4 MAME-measured disappearing-block maze phases once (zero per-frame allocations).
  if (hasMazePhases) {
    for (let p = 0; p < PHASE_COUNT; p++) {
      const phaseNode = new TransformNode(`${PHASE_PREFIX}${p}`, scene);
      const fullPhase = level6DisplayTerrain(
        level6PhaseGrid(terrain.cells, terrain.mazePhases![p]!),
      );
      const mazeOnly = fullPhase.map((row, z) =>
        row.map((cell, x) => (isDynamicMazeCell(x, z) ? cell : null)),
      );
      buildLayeredSurface(
        scene,
        `${PHASE_PREFIX}${p}`,
        mazeOnly,
        materials,
        phaseNode,
      );
      const phaseSurface = terrainMesh(mazeOnly);
      const phaseWalls = terrainCliffs(phaseSurface, columns, rows, cliffBase);
      if (phaseWalls.indices.length) {
        const phaseCliffs = buildMesh(
          scene,
          `${PHASE_PREFIX}${p}-cliffs`,
          phaseWalls,
        );
        phaseCliffs.material = materials.cliff;
        phaseCliffs.receiveShadows = true;
        phaseCliffs.parent = phaseNode;
        shadows.addShadowCaster(phaseCliffs, false);
      }
      phaseNode.setEnabled(p === 0);
    }

    // In terrain.html study mode (no MAME), cycle automatically at the exact 41-frame arcade cadence.
    if (!live) {
      setLevel6MazeAutoCycle(scene, true);
      let elapsed = 0;
      let currentPhase: 0 | 1 | 2 | 3 = 0;
      scene.onBeforeRenderObservable.add(() => {
        const meta = scene.metadata as Record<string, unknown> | undefined;
        if (meta?.level6AutoCycle === false) return;
        elapsed += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
        const next = (Math.floor(elapsed / STUDY_PHASE_SECONDS) %
          PHASE_COUNT) as 0 | 1 | 2 | 3;
        if (next !== currentPhase) {
          currentPhase = next;
          setLevel6MazePhase(scene, next);
        }
      });
    }
  }

  // 2 orange/gold triangular wedge chutes on the upper branches.
  const wedgeMaterial = new StandardMaterial('level6-wedge', scene);
  wedgeMaterial.diffuseColor.set(0.84, 0.48, 0.05);
  wedgeMaterial.emissiveColor.set(0.18, 0.08, 0.01);
  wedgeMaterial.specularColor.set(0, 0, 0);
  wedgeMaterial.backFaceCulling = false;
  const wedgeInterior = new StandardMaterial('level6-wedge-mouth', scene);
  wedgeInterior.diffuseColor.set(0.08, 0.05, 0.02);
  wedgeInterior.specularColor.set(0, 0, 0);
  wedgeInterior.backFaceCulling = false;
  for (const [index, wedge] of level6Wedges.entries()) {
    const mesh = createWedgeChute(
      scene,
      `level6-wedge-${index}`,
      wedge.x,
      wedge.z,
      wedge.width,
      wedge.length,
      columns,
      rows,
      wedgeMaterial,
      wedgeInterior,
    );
    shadows.addShadowCaster(mesh, false);
  }

  // 4 grey pyramids on the cyan ice diamond.
  const pyramidPaint = createPracticeSurfaceMaterial(scene, 'point', 'level6');
  for (const [cx, cz, height] of level6Pyramids) {
    const x = cx - columns / 2;
    const z = cz - rows / 2;
    const base =
      ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
    const tip =
      ((height + 19.2 - arcadeGroundHeight) * arcadeHeightScale) /
      arcadeCellUnits;
    const tower = createPracticeTower(
      scene,
      `level6-pyramid-${cx}-${cz}`,
      pyramidPaint,
    );
    tower.scaling.y =
      (tip - base) / tower.getBoundingInfo().boundingBox.maximum.y;
    tower.position.set(x, base, z);
    tower.receiveShadows = true;
    shadows.addShadowCaster(tower, false);
  }

  // GOAL decal + orange/black checkered flags.
  const goal = intermediateFinishSurface(display, level6Goal, 'goal');
  if (goal.indices.length) {
    const finish = buildMesh(scene, 'level6-finish', goal);
    finish.position.y = 0.015;
    finish.material = createPracticeGoalMaterial(scene, 'intermediate');
    finish.receiveShadows = true;
    createPracticeGoalFlags(scene, { ...terrain, cells: display });
  }
}
