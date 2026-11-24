import { level5FortGeometry, level5FortCornerHeight } from './level5Fort';
import {
  level5BridgeGeometry,
  level5PassageFloor,
  openLevel5Bridge,
} from './level5Bridge';
import { createPracticeTower } from './createPracticeTower';
import {
  level5DisplayTerrain,
  level5Pyramids,
  level5Surface,
  level5Goal,
} from './level5DisplayTerrain';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import type { RollingActors } from '../emulation/rollingActors';
import type { terrainMesh } from '../game/modern/terrainMesh';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { createPracticeSun } from './createPracticeSun';
import { createPracticeSurfaceMaterial } from './createPracticeSurfaceMaterial';
import { intermediateSlopeColors } from './intermediateLandmarks';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TerrainPalettePaint } from './terrainPalettePaint';
import {
  createPracticeGoalFlags,
  createPracticeGoalMaterial,
} from './createPracticeGoal';
import { intermediateFinishSurface } from './intermediateFinish';

/** Native yellow wall banks, with the remake's cheese pattern as a mask only. */
class Level5WallPaint extends TerrainPalettePaint {
  constructor(material: StandardMaterial) {
    super(
      material,
      'arcade-terrain-paint',
      [
        ['sillyLight', 15, 255, 255, 0],
        ['sillyMid', 14, 170, 170, 0],
        ['sillyDark', 13, 119, 119, 0],
        ['sillyOrange', 31, 255, 119, 34],
        ['sillyOrangeShade', 29, 153, 68, 0],
        ['sillyPink', 27, 238, 102, 136],
        ['sillyPinkShade', 28, 119, 34, 51],
        ['sillyJoint', 4, 70, 70, 70],
      ],
      'MM_LEVEL5_WALL',
    );
  }
  override getCustomCode(shader: string) {
    return shader === 'fragment'
      ? {
          CUSTOM_FRAGMENT_DEFINITIONS:
            'uniform vec3 sillyLight,sillyMid,sillyDark,sillyOrange,sillyOrangeShade,sillyPink,sillyPinkShade,sillyJoint;',
          CUSTOM_FRAGMENT_BEFORE_FOG: `
        float sun = numLights > 0.0 ? clamp((aggShadow * numLights - (numLights - 1.0)-0.1)/0.9,0.0,1.0) : 1.0;
        vec3 yellow = abs(normalW.x)>0.9 ? mix(sillyMid,sillyLight,sun) : sillyDark;
        vec3 pattern = baseColor.rgb;
        float lit=abs(normalW.x)>0.9 ? sun : 0.0;
        vec3 pigment = pattern.b>0.25 ? mix(sillyPinkShade,sillyPink,lit) : mix(sillyOrangeShade,sillyOrange,lit);
        float spot = step(0.1,pattern.r) * (1.0-step(0.8,pattern.g));
        vec3 paint = mix(yellow,pigment,spot);
        float along = abs(normalW.x)>0.9 ? vPositionW.z : vPositionW.x;
        float joint = step(0.125,fract(along+0.5));
        color.rgb = mix(sillyJoint,paint,joint);
      `,
        }
      : null;
  }
}

/** Scene-owned geometry and materials; no clock or physics advancement here. */
export function createLevel5Terrain(
  scene: Scene,
  terrain: PracticeTerrain,
  library?: RollingActors,
) {
  const mesh = (name: string, geometry: ReturnType<typeof terrainMesh>) => {
    const out = new Mesh(name, scene),
      data = new VertexData();
    Object.assign(data, geometry);
    data.normals = [];
    VertexData.ComputeNormals(
      geometry.positions,
      geometry.indices,
      data.normals,
    );
    data.applyToMesh(out);
    return out;
  };
  const display = level5DisplayTerrain(terrain.cells);
  const surface = level5Surface(display);
  const floor = mesh('terrain-surface', surface);
  floor.setVerticesData(
    VertexBuffer.ColorKind,
    intermediateSlopeColors(floor.getVerticesData(VertexBuffer.NormalKind)!),
  );
  floor.material = createPracticeSurfaceMaterial(scene, 'floor', 'level5');
  floor.receiveShadows = true;
  const walls = openLevel5Bridge(
    terrainCliffs(surface, terrain.cells[0]!.length, terrain.cells.length, -42),
    terrain.cells[0]!.length,
    terrain.cells.length,
  );
  const nativeMask = library?.textures['level5_native_wall_mask.png'];
  // World-aligned pattern, independent of edge triangulation or wall height.
  const paintCoordinates = (walls: ReturnType<typeof terrainMesh>) => {
    for (let i = 0; i < walls.positions.length / 3; i++) {
      const face = Math.floor(i / 4) * 12;
      const acrossZ =
        Math.abs(walls.positions[face]! - walls.positions[face + 3]!) < 0.01;
      if (nativeMask) {
        const x = walls.positions[i * 3]!,
          y = walls.positions[i * 3 + 1]!,
          z = walls.positions[i * 3 + 2]!;
        walls.uvs[i * 2] = (270 + 16 * (z - x)) / 576;
        walls.uvs[i * 2 + 1] =
          (8 * (x + z + 141) - (16 * y) / Math.sqrt(2 / 3) - 256) / 2286;
      } else {
        walls.uvs[i * 2] =
          (walls.positions[i * 3 + (acrossZ ? 2 : 0)]! + 70.5) / 16;
        walls.uvs[i * 2 + 1] = walls.positions[i * 3 + 1]! / 64;
      }
    }
  };
  paintCoordinates(walls);
  const cliffs = mesh('terrain-cliffs', walls);
  const paint = new StandardMaterial('level5-cliffs', scene);
  const image = nativeMask ?? library?.textures['lev5_side.png'];
  paint.diffuseTexture = image
    ? new Texture(image, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE)
    : RawTexture.CreateRGBATexture(
        new Uint8Array([255, 255, 0, 255]),
        1,
        1,
        scene,
      );
  if (nativeMask && paint.diffuseTexture instanceof Texture) {
    paint.diffuseTexture.wrapU = paint.diffuseTexture.wrapV =
      Texture.CLAMP_ADDRESSMODE;
  }
  paint.specularColor.set(0, 0, 0);
  paint.backFaceCulling = false;
  paint.twoSidedLighting = true;
  new Level5WallPaint(paint);
  cliffs.material = paint;
  cliffs.receiveShadows = true;
  const shadows = createPracticeSun(
    scene,
    Math.hypot(terrain.cells.length, terrain.cells[0]!.length),
    'intermediate',
  );
  shadows.usePercentageCloserFiltering = true;
  shadows.normalBias = 0.02;
  shadows.darkness = 0.1;
  shadows.addShadowCaster(cliffs, false);
  if (display[22]?.[26]) {
    const geometry = level5BridgeGeometry(
      terrain.cells[0]!.length,
      terrain.cells.length,
    );
    paintCoordinates(geometry);
    const bridge = mesh('level5-finish-bridge-arches', geometry);
    bridge.material = paint;
    bridge.receiveShadows = true;
    shadows.addShadowCaster(bridge, false);
    const passage = mesh(
      'level5-bridge-passage',
      level5PassageFloor(terrain.cells[0]!.length, terrain.cells.length),
    );
    passage.material = floor.material;
    passage.setVerticesData(
      VertexBuffer.ColorKind,
      intermediateSlopeColors(
        passage.getVerticesData(VertexBuffer.NormalKind)!,
      ),
    );
    passage.receiveShadows = true;
  }

  const goal = intermediateFinishSurface(display, level5Goal, 'goal');
  if (goal.indices.length) {
    const finish = mesh('level5-finish', goal);
    finish.position.y = 0.015;
    finish.material = createPracticeGoalMaterial(scene, 'intermediate');
    finish.receiveShadows = true;
    createPracticeGoalFlags(scene, { ...terrain, cells: display });
  }
  const birdTowerPaint = createPracticeSurfaceMaterial(
    scene,
    'point',
    'level5',
  );
  const pyramidPaint = new StandardMaterial('level5-pyramid-grey', scene);
  pyramidPaint.diffuseColor.set(0.55, 0.55, 0.55);
  pyramidPaint.specularColor.set(0, 0, 0);
  pyramidPaint.emissiveColor.set(0.15, 0.15, 0.15);
  for (const [cx, cz, height] of level5Pyramids) {
    const x = cx - terrain.cells[0]!.length / 2,
      z = cz - terrain.cells.length / 2;
    const base = ((height - 16384) * Math.sqrt(2 / 3)) / 8,
      tip = ((height + 19.2 - 16384) * Math.sqrt(2 / 3)) / 8;
    if (height === 16352) {
      const tower = createPracticeTower(
        scene,
        `level5-pyramid-${cx}-${cz}`,
        birdTowerPaint,
      );
      tower.scaling.y =
        (tip - base) / tower.getBoundingInfo().boundingBox.maximum.y;
      tower.position.set(x, base, z);
      tower.receiveShadows = true;
      shadows.addShadowCaster(tower, false);
      continue;
    }
    const fort = level5FortGeometry(
      (level5FortCornerHeight * Math.sqrt(2 / 3)) / 8,
      (12 * Math.sqrt(2 / 3)) / 8,
    );
    for (const [part, geometry] of Object.entries(fort)) {
      for (let v = 0; v < geometry.positions.length; v += 3) {
        geometry.positions[v]! += x;
        geometry.positions[v + 1]! += base;
        geometry.positions[v + 2]! += z;
      }
      if (part === 'walls') paintCoordinates(geometry);
      else
        for (let v = 0; v < geometry.positions.length / 3; v++) {
          geometry.uvs[v * 2] =
            geometry.positions[v * 3]! + terrain.cells[0]!.length / 2;
          geometry.uvs[v * 2 + 1] =
            geometry.positions[v * 3 + 2]! + terrain.cells.length / 2;
        }
      const cap = mesh(`level5-fort-${part}-${cx}-${cz}`, geometry);
      cap.material =
        part === 'roof'
          ? floor.material
          : part === 'corners'
            ? pyramidPaint
            : paint;
      if (part === 'roof')
        cap.setVerticesData(
          VertexBuffer.ColorKind,
          intermediateSlopeColors(
            cap.getVerticesData(VertexBuffer.NormalKind)!,
          ),
        );
      cap.receiveShadows = true;
      shadows.addShadowCaster(cap, false);
    }
  }
  if (display[22]?.[26]) {
    const hint = createLevel5EscherHint(
      scene,
      terrain.cells[0]!.length,
      terrain.cells.length,
    );
    const syncHint = () => {
      hint.isVisible = scene.activeCamera?.name !== 'practice-reference-camera';
    };
    syncHint();
    scene.onActiveCameraChanged.add(syncHint);
  }
  const source = library?.models.level5_clock;
  if (source) {
    const clock = mesh('level5-clock', {
      positions: [...source.poses[0]!.positions],
      indices: Object.values(source.groups).flatMap((indices) => [...indices]),
      uvs: [...source.uvs],
    });
    const material = new StandardMaterial('level5-clock-red', scene);
    material.diffuseColor.set(0.85, 0.015, 0.01);
    material.emissiveColor.set(0.08, 0, 0);
    material.specularColor.set(0.03, 0, 0);
    clock.material = material;
    clock.receiveShadows = true;
    shadows.addShadowCaster(clock, false);
  }
}

const escherHintRows = [
  '................',
  '..############..',
  '.#............#.',
  '.#...######...#.',
  '.#..##....##..#.',
  '.#..##....##..#.',
  '.#........##..#.',
  '.#......###...#.',
  '.#.....##.....#.',
  '.#.....##.....#.',
  '.#............#.',
  '.#.....##.....#.',
  '.#.....##.....#.',
  '.#............#.',
  '..############..',
  '................',
] as const;

/** Floor '?' marker at the Escher teleport seam, visible only in non-arcade 3D views. */
function createLevel5EscherHint(scene: Scene, columns: number, rows: number) {
  const size = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ch = escherHintRows[y]![x]!;
      const o = (y * size + x) * 4;
      if (ch === '#') {
        pixels[o] = 255;
        pixels[o + 1] = 224;
        pixels[o + 2] = 32;
        pixels[o + 3] = 255;
      } else if (x >= 1 && x <= 14 && y >= 1 && y <= 14) {
        pixels[o] = 28;
        pixels[o + 1] = 32;
        pixels[o + 2] = 44;
        pixels[o + 3] = 220;
      }
    }
  }
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    size,
    size,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  texture.hasAlpha = true;
  const material = new StandardMaterial('level5-escher-hint', scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.specularColor.set(0, 0, 0);
  material.backFaceCulling = false;
  const y = ((16368 - 16384) * Math.sqrt(2 / 3)) / 8 + 0.025;
  const x0 = 29 - columns / 2;
  const x1 = 31 - columns / 2;
  const z0 = 15 - rows / 2;
  const z1 = 17 - rows / 2;
  const hint = new Mesh('level5-escher-hint', scene);
  const data = new VertexData();
  data.positions = [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  data.uvs = [0, 0, 0, 1, 1, 1, 1, 0];
  data.applyToMesh(hint);
  hint.material = material;
  return hint;
}
