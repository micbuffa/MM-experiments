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
import { TerrainPalettePaint } from './terrainPalettePaint';
import {
  createPracticeSun,
  invalidatePracticeShadows,
} from './createPracticeSun';
import { createPracticeSurfaceMaterial } from './createPracticeSurfaceMaterial';
import {
  createPracticeGoalFlags,
  createPracticeGoalMaterial,
} from './createPracticeGoal';
import { intermediateFinishSurface } from './intermediateFinish';
import { intermediateSlopeColors } from './intermediateLandmarks';
import {
  isLevel6FloatingSlabEdge,
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
// 1-block slab thickness (8 arcade height units) for the upper floating platforms.
const FLOATING_SLAB_THICKNESS = arcadeHeightScale;

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

/** Live Playfield Bank 3 (0xb00470..0xb0047e, indices 56..63) color-cycling shader for Level 6 peach plateaus & maze cap. */
class Level6ShimmerPaint extends TerrainPalettePaint {
  constructor(material: StandardMaterial) {
    super(
      material,
      'arcade-terrain-paint',
      [
        ['l6Shim0', 57, 221, 170, 0],
        ['l6Shim1', 58, 255, 153, 119],
        ['l6Shim2', 59, 255, 153, 119],
        ['l6Shim3', 60, 255, 187, 51],
        ['l6Shim4', 61, 238, 204, 85],
        ['l6Shim5', 62, 255, 221, 0],
        ['l6Shim6', 63, 255, 187, 51],
        ['l6Joint', 56, 204, 136, 0],
      ],
      'MM_LEVEL6_SHIMMER',
    );
  }
  override getCustomCode(shader: string) {
    return shader === 'fragment'
      ? {
          CUSTOM_FRAGMENT_DEFINITIONS:
            'uniform vec3 l6Shim0,l6Shim1,l6Shim2,l6Shim3,l6Shim4,l6Shim5,l6Shim6,l6Joint;',
          CUSTOM_FRAGMENT_BEFORE_FOG: `
        float l6Sun = numLights > 0.0
          ? clamp((aggShadow * numLights - (numLights - 1.0) - 0.05) / 0.95, 0.0, 1.0)
          : 1.0;
        float l6Band = floor(baseColor.r * 7.99);
        vec3 l6Col = l6Band < 0.5 ? l6Joint
          : l6Band < 1.5 ? l6Shim0
          : l6Band < 2.5 ? l6Shim1
          : l6Band < 3.5 ? l6Shim2
          : l6Band < 4.5 ? l6Shim3
          : l6Band < 5.5 ? l6Shim4
          : l6Band < 6.5 ? l6Shim5
          : l6Shim6;
        color.rgb = mix(l6Col * 0.72, l6Col, l6Sun);
      `,
        }
      : null;
  }
}

function createLevel6Materials(scene: Scene): Level6MaterialSet {
  const stone = createPracticeSurfaceMaterial(scene, 'floor', 'level6');

  const amber = new StandardMaterial('level6-amber', scene);
  amber.specularColor.set(0, 0, 0);
  amber.emissiveColor.set(0.14, 0.08, 0.01);
  // Warm mottled orange-brown arcade tiles with soft seam and golden-yellow central speckle.
  amber.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    if (x === 0 || y === 0) return [138, 76, 8, 255];
    const dist = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    const hash = (Math.imul(x + 11, y + 23) ^ Math.imul(x * 7, y * 13)) & 15;
    if (dist <= 3.5 && hash < 9) return [246, 188, 30, 255];
    if (dist <= 5.5 && hash < 4) return [236, 168, 22, 255];
    if (hash > 12) return [156, 88, 10, 255];
    return [196, 120, 14, 255];
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
  // Encode 7 concentric palette-cycling bands (1..7) + border seam (0) in the red channel.
  peach.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    if (x === 0 || y === 0) return [0, 0, 0, 255];
    const dist = Math.round(Math.abs(x - 7.5) + Math.abs(y - 7.5));
    const band = 1 + (dist % 7);
    const v = Math.round((band / 7.5) * 255);
    return [v, v, v, 255];
  });
  new Level6ShimmerPaint(peach);

  const ribbed = new StandardMaterial('level6-ribbed', scene);
  ribbed.specularColor.set(0, 0, 0);
  ribbed.emissiveColor.set(0.1, 0.1, 0.1);
  // Diagonal (x + y) metallic ribs that project to horizontal stripes in the 45-degree isometric view,
  // framed by a 1-texel dark grey tile border so individual cell boundaries remain crisp.
  ribbed.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    if (x === 0 || y === 0) return [88, 88, 94, 255];
    const phase = (x + y) & 3;
    if (phase === 0) return [242, 242, 246, 255];
    if (phase === 1) return [212, 212, 218, 255];
    if (phase === 2) return [148, 148, 154, 255];
    return [76, 76, 82, 255];
  });

  const dark = new StandardMaterial('level6-dark', scene);
  dark.specularColor.set(0, 0, 0);
  dark.emissiveColor.set(0.08, 0.08, 0.09);
  // Inverted-contrast dark charcoal maze tops with bright light-grey tile joints (no center dot).
  dark.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    if (x <= 1 || y <= 1 || x >= 14 || y >= 14) return [168, 168, 174, 255];
    if (x === 2 || y === 2 || x === 13 || y === 13) return [108, 108, 114, 255];
    return [64, 64, 70, 255];
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

/** Open-mouthed hollow golden wedge tunnel matching the arcade silhouette (no black plug, bright yellow rim). */
function createWedgeChute(
  scene: Scene,
  name: string,
  xCell: number,
  zCell: number,
  width: number,
  length: number,
  columns: number,
  rows: number,
  roofMaterial: StandardMaterial,
  cheekMaterial: StandardMaterial,
  rimMaterial: StandardMaterial,
) {
  const baseY = 0;
  const peakY = 1.6;
  const x0 = xCell - columns / 2;
  const x1 = x0 + width;
  const z0 = zCell - rows / 2;
  const z1 = z0 + length;
  const lip = 0.09;

  // 1) Sloped bright golden-ochre roof (rises from x0 to x1, open at +X mouth)
  const roof = buildMesh(scene, name, {
    positions: [x0, baseY, z0, x1, peakY, z0, x1, peakY, z1, x0, baseY, z1],
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
  });
  roof.material = roofMaterial;
  roof.receiveShadows = true;

  // 2) Two triangular side walls (left z=z0 visible inside the open mouth, right z=z1 outer cheek)
  const cheeks = buildMesh(scene, `${name}-cheeks`, {
    positions: [
      x0,
      baseY,
      z0,
      x1,
      baseY,
      z0,
      x1,
      peakY,
      z0,
      x0,
      baseY,
      z1,
      x1,
      peakY,
      z1,
      x1,
      baseY,
      z1,
    ],
    indices: [0, 1, 2, 3, 4, 5],
    uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0],
  });
  cheeks.material = cheekMaterial;
  cheeks.receiveShadows = true;

  // 3) Thin bright yellow front archway frame around the open +X mouth (top lintel + 2 side posts)
  const rim = buildMesh(scene, `${name}-rim`, {
    positions: [
      // Left pillar (z0..z0+lip)
      x1,
      baseY,
      z0,
      x1,
      baseY,
      z0 + lip,
      x1,
      peakY,
      z0 + lip,
      x1,
      peakY,
      z0,
      // Right pillar (z1-lip..z1)
      x1,
      baseY,
      z1 - lip,
      x1,
      baseY,
      z1,
      x1,
      peakY,
      z1,
      x1,
      peakY,
      z1 - lip,
      // Top lintel (peakY-lip..peakY)
      x1,
      peakY - lip,
      z0 + lip,
      x1,
      peakY - lip,
      z1 - lip,
      x1,
      peakY,
      z1 - lip,
      x1,
      peakY,
      z0 + lip,
    ],
    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11],
    uvs: Array<number>(12 * 2).fill(0),
  });
  rim.material = rimMaterial;
  return [roof, cheeks, rim] as const;
}

/** Smooth golden/ochre interior walls and dark brown floor for the 2x2 square pit (x=22..24, z=31..33). */
function createSquarePitLiner(scene: Scene, columns: number, rows: number) {
  const topY =
    ((16380 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
  const bottomY = topY - 0.92;
  const x0 = 22 - columns / 2;
  const x1 = 24 - columns / 2;
  const z0 = 31 - rows / 2;
  const z1 = 33 - rows / 2;
  const makeQuad = (
    name: string,
    positions: number[],
    r: number,
    g: number,
    b: number,
    emissiveScale = 0.45,
  ) => {
    const m = buildMesh(scene, name, {
      positions,
      indices: [0, 1, 2, 0, 2, 3],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    });
    const mat = new StandardMaterial(`${name}-mat`, scene);
    mat.diffuseColor.set(r, g, b);
    mat.emissiveColor.set(
      r * emissiveScale,
      g * emissiveScale,
      b * emissiveScale,
    );
    mat.specularColor.set(0, 0, 0);
    mat.backFaceCulling = false;
    m.material = mat;
    m.receiveShadows = true;
    return m;
  };
  // Bright sunlit golden-yellow wall (x = x0, receives diagonal cast shadow from the rim)
  makeQuad(
    'level6-pit-wall-x0',
    [x0, topY, z0, x0, topY, z1, x0, bottomY, z1, x0, bottomY, z0],
    0.98,
    0.7,
    0.03,
    0.48,
  );
  // Warm shaded amber-brown wall (z = z0)
  makeQuad(
    'level6-pit-wall-z0',
    [x0, topY, z0, x1, topY, z0, x1, bottomY, z0, x0, bottomY, z0],
    0.64,
    0.39,
    0.02,
    0.42,
  );
  // Back walls (x = x1 and z = z1, visible in free/top-down views)
  makeQuad(
    'level6-pit-wall-x1',
    [x1, topY, z0, x1, topY, z1, x1, bottomY, z1, x1, bottomY, z0],
    0.64,
    0.39,
    0.02,
    0.42,
  );
  makeQuad(
    'level6-pit-wall-z1',
    [x0, topY, z1, x1, topY, z1, x1, bottomY, z1, x0, bottomY, z1],
    0.9,
    0.6,
    0.03,
    0.45,
  );
  // Distinct dark chocolate-brown pit floor visible in the lower third of the 2x2 opening
  makeQuad(
    'level6-pit-floor',
    [x0, bottomY, z0, x1, bottomY, z0, x1, bottomY, z1, x0, bottomY, z1],
    0.38,
    0.2,
    0.02,
    0.35,
  );
}

const HEX_PYRAMID_BASE = [
  [-1, -1],
  [0, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 0],
] as const;

/** 6-sided hexagonal pyramid aligned to the exact isometric grid vertices around (cx, cz). */
function createLevel6HexPyramid(
  scene: Scene,
  name: string,
  material: StandardMaterial,
) {
  const rise = (9.5 * arcadeHeightScale) / arcadeCellUnits;
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < HEX_PYRAMID_BASE.length; i++) {
    const [ax, az] = HEX_PYRAMID_BASE[i]!;
    const [bx, bz] = HEX_PYRAMID_BASE[(i + 1) % HEX_PYRAMID_BASE.length]!;
    positions.push(ax, 0, az, bx, 0, bz, 0, rise, 0);
    indices.push(3 * i, 3 * i + 1, 3 * i + 2);
    uvs.push(0, 0.52, 1, 0.52, 0.5, 0.98);
  }
  const mesh = buildMesh(scene, name, { positions, indices, uvs });
  mesh.material = material;
  return mesh;
}

/** Alternating dark vertical viaduct pillar-window decals on the tall walkway & cyan-ice cliffs. */
function createViaductWindowSlots(
  scene: Scene,
  columns: number,
  rows: number,
  cliffBase: number,
) {
  const walkwayY =
    ((16352 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
  const topY = walkwayY - 1.25;
  const pad = 0.12;
  const eps = 0.02;

  const leftPos: number[] = [];
  const leftIdx: number[] = [];
  const leftUv: number[] = [];
  const pushXSlot = (cellX: number, cellZ: number) => {
    const x = cellX - columns / 2 + eps;
    const z0 = cellZ - rows / 2 + pad;
    const z1 = cellZ + 1 - rows / 2 - pad;
    const s = leftPos.length / 3;
    leftPos.push(x, topY, z0, x, topY, z1, x, cliffBase, z1, x, cliffBase, z0);
    leftIdx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    leftUv.push(0, 1, 1, 1, 1, 0, 0, 0);
  };
  const pushZSlotTo = (
    pos: number[],
    idx: number[],
    uv: number[],
    cellX: number,
    cellZ: number,
    slotTopY = topY,
  ) => {
    const z = cellZ - rows / 2 + eps;
    const x0 = cellX - columns / 2 + pad;
    const x1 = cellX + 1 - columns / 2 - pad;
    const s = pos.length / 3;
    pos.push(
      x0,
      slotTopY,
      z,
      x1,
      slotTopY,
      z,
      x1,
      cliffBase,
      z,
      x0,
      cliffBase,
      z,
    );
    idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    uv.push(0, 1, 1, 1, 1, 0, 0, 0);
  };
  for (let z = 55; z <= 67; z += 2) pushXSlot(69, z);
  for (let z = 71; z <= 77; z += 2) pushXSlot(80, z);
  // Subtle dark-crimson slots on the wall above-right of the ice (matching the original arcade shading)
  for (let x = 59; x <= 65; x += 2) {
    pushZSlotTo(leftPos, leftIdx, leftUv, x, 71, walkwayY - 1.55);
  }

  const leftMesh = buildMesh(scene, 'level6-viaduct-slots-left', {
    positions: leftPos,
    indices: leftIdx,
    uvs: leftUv,
  });
  const leftMat = new StandardMaterial('level6-viaduct-slots-left-mat', scene);
  leftMat.diffuseColor.set(0.42, 0, 0);
  leftMat.emissiveColor.set(0.24, 0, 0);
  leftMat.specularColor.set(0, 0, 0);
  leftMat.backFaceCulling = false;
  leftMesh.material = leftMat;
  leftMesh.receiveShadows = true;

  const rightPos: number[] = [];
  const rightIdx: number[] = [];
  const rightUv: number[] = [];
  for (let x = 55; x <= 57; x += 2) {
    pushZSlotTo(rightPos, rightIdx, rightUv, x, 71);
  }
  for (let x = 69; x <= 75; x += 2) {
    pushZSlotTo(rightPos, rightIdx, rightUv, x, 82);
  }

  const rightMesh = buildMesh(scene, 'level6-viaduct-slots-right', {
    positions: rightPos,
    indices: rightIdx,
    uvs: rightUv,
  });
  const rightMat = new StandardMaterial(
    'level6-viaduct-slots-right-mat',
    scene,
  );
  rightMat.diffuseColor.set(0.03, 0, 0);
  rightMat.emissiveColor.set(0.01, 0, 0);
  rightMat.specularColor.set(0, 0, 0);
  rightMat.backFaceCulling = false;
  rightMesh.material = rightMat;
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
  const staticSurfaces = buildLayeredSurface(
    scene,
    'terrain',
    staticCells,
    materials,
  );

  const staticSurface = terrainMesh(staticCells);
  let lowest = 0;
  for (let i = 1; i < staticSurface.positions.length; i += 3) {
    lowest = Math.min(lowest, staticSurface.positions[i]!);
  }
  const cliffBase = lowest - 22;
  const rawStaticWalls = terrainCliffs(staticSurface, columns, rows, cliffBase);
  // Clamp outer boundary cliffs in the upper floating section to a 1-block-thick slab suspended in space.
  for (let v = 0; v < rawStaticWalls.positions.length / 3; v += 4) {
    const lowA = rawStaticWalls.positions[(v + 2) * 3 + 1]!;
    const lowB = rawStaticWalls.positions[(v + 3) * 3 + 1]!;
    if (
      Math.abs(lowA - cliffBase) > 1e-4 ||
      Math.abs(lowB - cliffBase) > 1e-4
    ) {
      continue;
    }
    const cellX =
      (rawStaticWalls.positions[v * 3]! +
        rawStaticWalls.positions[(v + 1) * 3]!) *
        0.5 +
      columns / 2;
    const cellZ =
      (rawStaticWalls.positions[v * 3 + 2]! +
        rawStaticWalls.positions[(v + 1) * 3 + 2]!) *
        0.5 +
      rows / 2;
    if (!isLevel6FloatingSlabEdge(cellX, cellZ)) continue;
    const by = rawStaticWalls.positions[v * 3 + 1]!;
    const ay = rawStaticWalls.positions[(v + 1) * 3 + 1]!;
    const slabBottom = Math.min(ay, by, 0) - FLOATING_SLAB_THICKNESS;
    rawStaticWalls.positions[(v + 2) * 3 + 1] = slabBottom;
    rawStaticWalls.positions[(v + 3) * 3 + 1] = slabBottom;
    rawStaticWalls.uvs[v * 2 + 1] = by - slabBottom;
    rawStaticWalls.uvs[(v + 1) * 2 + 1] = ay - slabBottom;
  }
  // Strip red cliff walls from the 4 interior faces of the 2x2 square pit (x=22..24, z=31..33),
  // which are lined with smooth golden/ochre walls in the arcade.
  const pitMinX = 22 - columns / 2;
  const pitMaxX = 24 - columns / 2;
  const pitMinZ = 31 - rows / 2;
  const pitMaxZ = 33 - rows / 2;
  const filteredCliffIndices: number[] = [];
  for (let i = 0; i < rawStaticWalls.indices.length; i += 3) {
    const a = rawStaticWalls.indices[i]!;
    const b = rawStaticWalls.indices[i + 1]!;
    const c = rawStaticWalls.indices[i + 2]!;
    const cx =
      (rawStaticWalls.positions[a * 3]! +
        rawStaticWalls.positions[b * 3]! +
        rawStaticWalls.positions[c * 3]!) /
      3;
    const cz =
      (rawStaticWalls.positions[a * 3 + 2]! +
        rawStaticWalls.positions[b * 3 + 2]! +
        rawStaticWalls.positions[c * 3 + 2]!) /
      3;
    const insideSquarePit =
      cx >= pitMinX - 0.05 &&
      cx <= pitMaxX + 0.05 &&
      cz >= pitMinZ - 0.05 &&
      cz <= pitMaxZ + 0.05;
    if (!insideSquarePit) filteredCliffIndices.push(a, b, c);
  }
  const cliffs = buildMesh(scene, 'terrain-cliffs', {
    ...rawStaticWalls,
    indices: filteredCliffIndices,
  });
  cliffs.material = materials.cliff;
  cliffs.receiveShadows = true;

  // Golden/ochre interior walls + dark brown floor for the 2x2 square pit (x=22..24, z=31..33).
  createSquarePitLiner(scene, columns, rows);

  // Dark recessed viaduct window decals on the tall walkway and cyan-ice cliffs.
  createViaductWindowSlots(scene, columns, rows, cliffBase);

  const shadows = createPracticeSun(
    scene,
    Math.hypot(columns, rows),
    'intermediate',
  );
  shadows.usePercentageCloserFiltering = true;
  shadows.normalBias = 0.02;
  shadows.darkness = 0.1;
  shadows.addShadowCaster(cliffs, false);
  for (const surface of staticSurfaces) shadows.addShadowCaster(surface, false);

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

  // 2 open-mouthed hollow golden wedge tunnels on the upper branches.
  const wedgeRoofMat = new StandardMaterial('level6-wedge-roof', scene);
  wedgeRoofMat.diffuseColor.set(0.84, 0.52, 0.02);
  wedgeRoofMat.emissiveColor.set(0.42, 0.24, 0.01);
  wedgeRoofMat.specularColor.set(0, 0, 0);
  wedgeRoofMat.backFaceCulling = false;
  const wedgeCheekMat = new StandardMaterial('level6-wedge-cheek', scene);
  wedgeCheekMat.specularColor.set(0, 0, 0);
  wedgeCheekMat.emissiveColor.set(0.14, 0.07, 0.005);
  wedgeCheekMat.backFaceCulling = false;
  // Shaded cavity gradient: bright warm gold at the open mouth (u=1), deep dark brown shadow inside (u=0).
  wedgeCheekMat.diffuseTexture = buildPatternTexture(scene, 16, (x, y) => {
    const t = Math.pow(x / 15, 1.35) * (1 - (y / 15) * 0.22);
    const r = Math.round(58 + 162 * t);
    const g = Math.round(30 + 104 * t);
    const b = Math.round(4 + 10 * t);
    return [r, g, b, 255];
  });
  const wedgeRimMat = new StandardMaterial('level6-wedge-rim', scene);
  wedgeRimMat.diffuseColor.set(0.92, 0.64, 0.04);
  wedgeRimMat.emissiveColor.set(0.32, 0.2, 0.01);
  wedgeRimMat.specularColor.set(0, 0, 0);
  wedgeRimMat.backFaceCulling = false;
  for (const [index, wedge] of level6Wedges.entries()) {
    const parts = createWedgeChute(
      scene,
      `level6-wedge-${index}`,
      wedge.x,
      wedge.z,
      wedge.width,
      wedge.length,
      columns,
      rows,
      wedgeRoofMat,
      wedgeCheekMat,
      wedgeRimMat,
    );
    for (const part of parts) shadows.addShadowCaster(part, false);
  }

  // 4 hexagonal-base grey pyramids on the cyan ice diamond.
  const pyramidPaint = createPracticeSurfaceMaterial(scene, 'point', 'level6');
  for (const [cx, cz, height] of level6Pyramids) {
    const x = cx - columns / 2;
    const z = cz - rows / 2;
    const base =
      ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
    const pyramid = createLevel6HexPyramid(
      scene,
      `level6-pyramid-${cx}-${cz}`,
      pyramidPaint,
    );
    pyramid.position.set(x, base, z);
    pyramid.receiveShadows = true;
    shadows.addShadowCaster(pyramid, false);
  }

  // GOAL decal + orange-red/black checkered flags.
  const goal = intermediateFinishSurface(display, level6Goal, 'goal');
  if (goal.indices.length) {
    const finish = buildMesh(scene, 'level6-finish', goal);
    finish.position.y = 0.015;
    finish.material = createPracticeGoalMaterial(scene, 'level6');
    finish.receiveShadows = true;
    createPracticeGoalFlags(scene, { ...terrain, cells: display });
  }
}
