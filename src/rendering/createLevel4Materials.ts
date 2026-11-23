import { Level4GoldPaint } from './level4PalettePaint';
import { createLevel4Vacuums } from './createLevel4Vacuums';
import { level4HammerSpriteSequence } from '../emulation/level4Hammers';
import { Level4CliffPaint } from './level4CliffPaint';
import { createCatapultMasonry } from './createCatapultMasonry';
import {
  level4PistonCount,
  type Level4PistonPose,
} from '../emulation/level4Pistons';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateLathe } from '@babylonjs/core/Meshes/Builders/latheBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { practiceFloorTone } from './createPracticeSurfaceMaterial';

const surveyDiagonal = 21;
export const level4Goal = { x: 113, z: 104, width: 4, length: 10 };
const level4Height = (arcade: number) =>
  ((arcade - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
const topRampThresholdY = level4Height(16336);
const yellowCliffDiagonal = 146;

/** Cool neutral grey stone paving for the main Level 4 (Aerial Race) tracks. */
export function createLevel4FloorMaterial(scene: Scene) {
  const size = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tone = Math.max(70, practiceFloorTone(x, y));
      const offset = (y * size + x) * 4;
      const g = Math.min(255, Math.round(tone * 1.18));
      pixels[offset] = g;
      pixels[offset + 1] = g;
      pixels[offset + 2] = g;
      pixels[offset + 3] = 255;
    }
  }
  const material = new StandardMaterial('level4-floor', scene);
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
  material.diffuseTexture = texture;
  material.emissiveColor.set(0.08, 0.08, 0.08);
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  return material;
}

/** Warm golden-ochre paving for the crossing half-pipe ramps at the top of Level 4. */
export function createLevel4TopFloorMaterial(scene: Scene) {
  const size = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Golden paving has ochre mortar in the original, rather than black grout.
      const tone = Math.max(122, practiceFloorTone(x, y));
      const offset = (y * size + x) * 4;
      const grain = Math.min(255, Math.round((tone * 255) / 188));
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = grain;
      pixels[offset + 3] = 255;
    }
  }
  const material = new StandardMaterial('level4-top-floor', scene);
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
  material.diffuseTexture = texture;
  // Keep the native bronze ramp range without whitening the sun-facing slope.
  new Level4GoldPaint(material);
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  return material;
}

/** Striped vertical cliff material for Level 4, tinted vermilion-orange above and yellow-gold below via vertex colors. */
export function createLevel4CliffMaterial(scene: Scene) {
  const width = 16;
  const pixels = new Uint8Array(width * 4);
  const joints = new Uint8Array(width * 4);
  for (let x = 0; x < width; x++) {
    const seam = x < 2 || x >= width - 2;
    pixels.set(seam ? [0, 0, 0, 255] : [255, 255, 255, 255], x * 4);
    joints.set(seam ? [102, 102, 102, 255] : [0, 0, 0, 255], x * 4);
  }
  const material = new StandardMaterial('level4-cliffs', scene);
  material.diffuseTexture = RawTexture.CreateRGBATexture(
    pixels,
    width,
    1,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  material.emissiveTexture = RawTexture.CreateRGBATexture(
    joints,
    width,
    1,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  const wallTexture = material.diffuseTexture as Texture;
  const jointTexture = material.emissiveTexture as Texture;
  wallTexture.wrapU = wallTexture.wrapV = Texture.WRAP_ADDRESSMODE;
  jointTexture.wrapU = jointTexture.wrapV = Texture.WRAP_ADDRESSMODE;
  material.useEmissiveAsIllumination = true;
  material.specularColor.set(0, 0, 0);
  material.emissiveColor.set(0, 0, 0);
  material.backFaceCulling = false;
  // Cliff strips can be visible from either side at crossings. Flip the
  // lighting normal with the visible face instead of shading a back face.
  material.twoSidedLighting = true;
  new Level4CliffPaint(material);
  return material;
}

/** Encodes full-height yellow on low finish walls; high walls keep the height-based frieze. */
export function level4CliffColors(
  positions: ArrayLike<number>,
  columns: number,
  rows: number,
) {
  const xOff = columns / 2;
  const zOff = rows / 2;
  const colors: number[] = [];
  // Cliff geometry has four independent vertices per wall face. Paint the
  // complete low walls yellow, rather than adding an orange strip at their rim.
  for (let face = 0; face < positions.length; face += 12) {
    let top = -Infinity;
    for (let corner = 0; corner < 4; corner++)
      top = Math.max(top, positions[face + corner * 3 + 1]!);
    const gx = positions[face]! + xOff;
    const gz = positions[face + 2]! + zOff;
    const yellow =
      gx + gz >= yellowCliffDiagonal && top <= level4Height(16228) + 0.001;
    for (let corner = 0; corner < 4; corner++)
      colors.push(...(yellow ? [0.98, 0.9, 0.14, 1] : [0.88, 0.28, 0.08, 1]));
  }
  return colors;
}

/** Whether a Level 4 cell belongs to the warm golden crossing half-pipes at the top. */
export function isLevel4TopRamp(cell: TerrainCell, x: number, z: number) {
  if (!cell || x + z > 52) return false;
  let maxY = -Infinity;
  for (const h of cell) if (h !== null && h > maxY) maxY = h;
  return maxY >= topRampThresholdY;
}

/** Clean Level 4 rim cells: restore missing SW corners on +Z rims, flatten single-corner trench outliers, and clip outer ±21 diagonals. */
export function level4DisplayTerrain(
  cells: readonly (readonly TerrainCell[])[],
): TerrainCell[][] {
  return cells.map((row, z) =>
    row.map((cell, x): TerrainCell => {
      if (!cell) return null;
      let [nw, ne, se, sw] = cell;
      // Narrow ramps & curb-adjacent strips where SW sampled the higher adjacent ledge:
      // keep each tile smoothly planar along X ([nw, ne, ne, nw]) to eliminate white fold triangles.
      if (z === 26 && x === 22) {
        const yFlat = level4Height(16344);
        return [yFlat, yFlat, yFlat, yFlat];
      }
      // The incoming flat landing and the ramp share the entire X=82 edge.
      if (x >= 80 && x < 82 && z >= 91 && z < 95) {
        const y = level4Height(16264);
        return [y, y, y, y];
      }
      // The landing has a central strip and two bevels, as in lev4.ase.mesh.
      // Preserve both folds instead of flattening the last row into the centre.
      if (x >= 82 && x < 87 && z >= 91 && z < 95) {
        const center = 16264 + (x - 82) * 2.4;
        const nextCenter = 16264 + (x + 1 - 82) * 2.4;
        const edge = 16264 + (x - 82) * 1.6;
        const nextEdge = 16264 + (x + 1 - 82) * 1.6;
        const heights =
          z === 91
            ? [edge, nextEdge, nextCenter, center]
            : z === 94
              ? [center, nextCenter, nextEdge, edge]
              : [center, nextCenter, nextCenter, center];
        return heights.map(level4Height) as [number, number, number, number];
      }
      // This crossing belongs to the lower corridor. The reference mesh
      // has two thin arch walls here, without a full upper slab.
      if (z >= 91 && z <= 94 && x >= 87 && x <= 89) {
        const y = level4Height(16228);
        return [y, y, y, y];
      }
      // The bridge landing is a trough: two flat central tiles and one
      // sloped tile on each side, meeting the horizontal arch rims at 16272.
      if (x >= 90 && x < 94 && z >= 91 && z < 95) {
        const high = level4Height(16272);
        const low = level4Height(16260);
        return z === 91
          ? [high, high, low, low]
          : z === 94
            ? [low, low, high, high]
            : [low, low, low, low];
      }
      // Make the two ramp rows share both ends, including the flat foot.
      // The survey's SW corner can otherwise leave a folded triangle or crack.
      if (x >= 94 && x < 98 && (z === 92 || z === 93)) {
        const high = level4Height(16260 - (x - 94) * 8);
        const low = level4Height(16260 - (x - 93) * 8);
        return [high, low, low, high];
      }
      if (
        (z === 62 && x >= 59 && x <= 63) ||
        (z === 66 && x >= 57 && x <= 63) ||
        (z === 80 && x >= 76 && x <= 78) ||
        (z === 94 && x >= 76 && x <= 86)
      ) {
        if (nw !== null && ne !== null) return [nw, ne, ne, nw];
      }
      if (Math.abs(x - z) < surveyDiagonal) {
        if (nw !== null && ne !== null && se !== null && sw === null) {
          sw = nw + (se - ne);
        }
        if (
          nw !== null &&
          ne !== null &&
          se !== null &&
          sw !== null &&
          Math.abs(ne - se) < 0.001 &&
          Math.abs(sw - ne) < 0.001 &&
          Math.abs(nw - ne) > 0.35
        ) {
          sw = nw;
        }
      }
      if (nw !== null && ne !== null && se !== null && sw !== null) {
        const heights = [nw, ne, se, sw] as const;
        const maxH = Math.max(nw, ne, se, sw);
        const lowIndices: number[] = [];
        const highValues: number[] = [];
        for (let i = 0; i < 4; i++) {
          if (maxH - heights[i]! > 0.55) lowIndices.push(i);
          else highValues.push(heights[i]!);
        }
        if (
          lowIndices.length === 1 &&
          Math.max(...highValues) - Math.min(...highValues) <= 0.35
        ) {
          const avg =
            highValues.reduce((sum, v) => sum + v, 0) / highValues.length;
          if (lowIndices[0] === 0) nw = avg;
          else if (lowIndices[0] === 1) ne = avg;
          else if (lowIndices[0] === 2) se = avg;
          else sw = avg;
        }
      }
      if (x - z === surveyDiagonal) return [nw, null, se, sw];
      if (z - x === surveyDiagonal) return [nw, ne, se, null];
      return [nw, ne, se, sw];
    }),
  );
}

// At a complete cell's centre, both surface triangles meet along NW–SE.
function mechanismHeight(
  cells: readonly (readonly TerrainCell[])[],
  x: number,
  z: number,
) {
  const cell = cells[Math.floor(z)]?.[Math.floor(x)];
  if (!cell || cell.some((height) => height === null)) return undefined;
  return (cell[0]! + cell[2]!) / 2;
}

export function setLevel4VacuumExtensions(
  scene: Scene,
  extensions: readonly number[] | undefined,
  mouthFrames?: readonly (number | undefined)[],
) {
  const metadata = scene.metadata as {
    setLevel4VacuumExtensions?: (
      next: readonly number[] | undefined,
      frames?: readonly (number | undefined)[],
    ) => void;
  } | null;
  metadata?.setLevel4VacuumExtensions?.(extensions, mouthFrames);
}

export function setLevel4CatapultFrame(
  scene: Scene,
  frame: number | undefined,
) {
  const metadata = scene.metadata as {
    setLevel4CatapultFrame?: (next: number | undefined) => void;
  } | null;
  metadata?.setLevel4CatapultFrame?.(frame);
}

export function setLevel4Pistons(
  scene: Scene,
  poses: readonly Level4PistonPose[] | undefined,
) {
  const metadata = scene.metadata as {
    setLevel4Pistons?: (next: readonly Level4PistonPose[] | undefined) => void;
  } | null;
  metadata?.setLevel4Pistons?.(poses);
}

export function setLevel4HammerFrames(
  scene: Scene,
  frames: readonly (number | undefined)[] | undefined,
) {
  const metadata = scene.metadata as {
    setLevel4HammerFrames?: (
      next: readonly (number | undefined)[] | undefined,
    ) => void;
  } | null;
  metadata?.setLevel4HammerFrames?.(frames);
}

/** Builds the procedural mechanisms on the visible terrain surface. */
export function createLevel4Landmarks(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
  live: boolean,
): AbstractMesh[] {
  const columns = cells[0]?.length ?? 0;
  const rows = cells.length;
  if (columns < 116 || rows < 114) return [];
  const xOff = columns / 2;
  const zOff = rows / 2;
  const casters: AbstractMesh[] = [];

  // Shared materials
  const chromeMat = new StandardMaterial('level4-piston-chrome', scene);
  chromeMat.diffuseColor.set(0.76, 0.78, 0.82);
  chromeMat.emissiveColor.set(0.1, 0.11, 0.12);
  chromeMat.specularColor.set(0.75, 0.78, 0.82);
  chromeMat.specularPower = 48;

  const redMat = new StandardMaterial('level4-catapult-red', scene);
  redMat.diffuseColor.set(0.9, 0.12, 0.08);
  redMat.emissiveColor.set(0.16, 0.02, 0.01);
  redMat.specularColor.set(0.4, 0.18, 0.15);

  const hammerMat = new StandardMaterial('level4-hammer-wood', scene);
  hammerMat.diffuseColor.set(0.78, 0.34, 0.14);
  hammerMat.emissiveColor.set(0.1, 0.04, 0.015);
  hammerMat.specularColor.set(0.25, 0.15, 0.1);

  casters.push(...createLevel4Vacuums(scene, cells, live));

  const capMaterial = new StandardMaterial('level4-piston-cap-metal', scene);
  capMaterial.diffuseColor.set(0.4, 0.4, 0.4);
  capMaterial.emissiveColor.set(0.055, 0.055, 0.055);
  capMaterial.specularColor.set(0, 0, 0);
  const capJoint = new StandardMaterial('level4-piston-cap-joint', scene);
  capJoint.diffuseColor.set(0.25, 0.25, 0.25);
  capJoint.emissiveColor.set(0.035, 0.035, 0.035);
  capJoint.specularColor.set(0, 0, 0);
  for (let slot = 0; slot < level4PistonCount; slot++) {
    const group = Math.floor(slot / 12);
    const col = slot % 3;
    const row = Math.floor((slot % 12) / 3);
    const x = (group === 2 ? 76 : 69) + col;
    const z = [55, 63, 74][group]! + row;
    const y = mechanismHeight(cells, x + 0.5, z + 0.5);
    if (y === undefined) continue;
    const cap = CreateDisc(
      `level4-piston-cap-${slot}`,
      { radius: 0.4, tessellation: 24, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(x + 0.5 - xOff, y + 0.008, z + 0.5 - zOff);
    cap.material = capMaterial;
    cap.receiveShadows = true;
    const joint = CreateTorus(
      `level4-piston-cap-joint-${slot}`,
      { diameter: 0.84, thickness: 0.035, tessellation: 24 },
      scene,
    );
    joint.position.set(cap.position.x, y - 0.008, cap.position.z);
    joint.material = capJoint;
    joint.receiveShadows = true;
  }

  if (live) {
    const tubeHeight = 2.2;
    const pistons = Array.from({ length: level4PistonCount }, (_, index) => {
      const mesh = CreateCylinder(
        `level4-piston-${index}`,
        { diameter: 0.57, height: tubeHeight, tessellation: 14 },
        scene,
      );
      mesh.material = chromeMat;
      mesh.receiveShadows = true;
      mesh.setEnabled(false);
      casters.push(mesh);
      return mesh;
    });
    const visible = new Uint8Array(level4PistonCount);
    scene.metadata ??= {};
    Object.assign(scene.metadata, {
      setLevel4Pistons(poses: readonly Level4PistonPose[] | undefined) {
        visible.fill(0);
        for (const pose of poses ?? []) {
          const mesh = pistons[pose.slot];
          if (!mesh || cells[pose.z]?.[pose.x] == null) continue;
          visible[pose.slot] = 1;
          mesh.position.set(
            pose.x + 0.5 - xOff,
            level4Height(pose.height) - tubeHeight / 2 + pose.step * 0.34,
            pose.z + 0.5 - zOff,
          );
        }
        for (let i = 0; i < pistons.length; i++)
          pistons[i]!.setEnabled(visible[i] === 1);
      },
    });
  }

  // The native launch starts at the cup. Place the axle back along the track.
  const catX = 63;
  const cupZ = 70;
  const reach = 1.88;
  const catY = mechanismHeight(cells, catX + 0.5, cupZ - 0.5);
  if (catY !== undefined) {
    const root = new TransformNode('level4-catapult', scene);
    root.position.set(catX - xOff, catY, cupZ - reach - zOff);
    root.rotation.y = -Math.PI / 2;
    let bottom = catY;
    for (const row of cells)
      for (const cell of row)
        for (const height of cell ?? [])
          if (height !== null) bottom = Math.min(bottom, height);
    casters.push(
      ...createCatapultMasonry(scene, columns, rows, catY, bottom - 18),
    );
    const axle = CreateCylinder(
      'level4-catapult-bearing',
      { diameter: 0.33, height: 1.35, tessellation: 12 },
      scene,
    );
    axle.rotation.x = Math.PI / 2;
    axle.position.y = 0.6;
    axle.material = chromeMat;
    axle.parent = root;
    const pivot = new TransformNode('level4-catapult-axle', scene);
    pivot.position.y = 0.6;
    pivot.parent = root;
    const arm = CreateBox(
      'level4-catapult-arm',
      { width: 1.61, height: 0.18, depth: 0.39 },
      scene,
    );
    arm.position.set(0.72, -0.295, 0);
    arm.rotation.z = -0.4;
    arm.material = redMat;
    arm.parent = pivot;
    const cup = CreateLathe(
      'level4-catapult-cup',
      {
        shape: [
          [0, 0],
          [0.43, 0],
          [0.62, 0.095],
          [0.79, 0.25],
          [0.78, 0.33],
          [0.65, 0.33],
          [0.5, 0.14],
          [0, 0.1],
        ].map(([r, y]) => new Vector3(r, y, 0)),
        tessellation: 28,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene,
    );
    cup.position.set(reach, -0.64, 0);
    cup.material = redMat;
    cup.parent = pivot;
    casters.push(axle, arm, cup);

    scene.metadata ??= {};
    Object.assign(scene.metadata, {
      setLevel4CatapultFrame(frame: number | undefined) {
        // Lift promptly, hold briefly, then follow the native return frames.
        pivot.rotation.z =
          frame === undefined
            ? 0
            : Math.max(0, Math.min(frame / 3, (18 - frame) / 5, 1)) * 0.95;
      },
    });
  }

  const hammerSpecs = [
    { x: 105, z: 102.5, phase: 0 },
    { x: 105, z: 104.5, phase: Math.PI },
    { x: 105, z: 106.5, phase: Math.PI / 2 },
    { x: 105, z: 108.5, phase: (3 * Math.PI) / 2 },
  ] as const;
  const hammerPivots: {
    index: number;
    pivot: TransformNode;
    base: Mesh;
    phase: number;
  }[] = [];
  for (const [i, spec] of hammerSpecs.entries()) {
    const y = mechanismHeight(cells, spec.x + 0.5, spec.z);
    if (y === undefined) continue;
    const base = CreateBox(
      `level4-hammer-${i}-base`,
      { width: 0.55, height: 0.65, depth: 0.65 },
      scene,
    );
    base.position.set(spec.x - xOff, y + 0.325, spec.z - zOff);
    base.material = hammerMat;
    casters.push(base);
    const pivot = new TransformNode(`level4-hammer-${i}`, scene);
    pivot.position.set(base.position.x, y + 0.65, base.position.z);
    const arm = CreateBox(
      `level4-hammer-${i}-arm`,
      { width: 1.25, height: 0.25, depth: 0.25 },
      scene,
    );
    arm.position.x = 0.6;
    arm.material = hammerMat;
    arm.parent = pivot;
    casters.push(arm);
    const head = CreateBox(
      `level4-hammer-${i}-head`,
      { width: 0.62, height: 0.8, depth: 0.76 },
      scene,
    );
    head.position.x = 1.17;
    head.material = hammerMat;
    head.parent = pivot;
    casters.push(head);
    pivot.rotation.y = Math.PI;
    if (live) {
      base.setEnabled(false);
      pivot.setEnabled(false);
    }
    hammerPivots.push({ index: i, pivot, base, phase: spec.phase });
  }

  const nativeHammerAngles = [
    0, 0.2, 0.4, 0.65, 0.85, 1.05, 0.7, 0.05, 0.3,
  ] as const;
  if (live) {
    scene.metadata ??= {};
    Object.assign(scene.metadata, {
      setLevel4HammerFrames: (
        frames: readonly (number | undefined)[] | undefined,
      ) => {
        for (const { index, pivot, base } of hammerPivots) {
          const step = frames?.[index];
          const sprite =
            step === undefined ? 0 : (level4HammerSpriteSequence[step] ?? 0);
          const visible = sprite > 0;
          base.setEnabled(visible);
          pivot.setEnabled(visible);
          if (visible) {
            pivot.rotation.z = nativeHammerAngles[sprite];
          }
        }
      },
    });
  } else {
    let seconds = 0;
    scene.onBeforeRenderObservable.add(() => {
      seconds += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
      for (const { pivot, phase } of hammerPivots) {
        pivot.rotation.z = (1 + Math.cos(seconds * 2.6 + phase)) * 0.55;
      }
    });
  }

  return casters;
}
