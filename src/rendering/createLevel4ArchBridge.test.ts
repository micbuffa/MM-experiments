import { createTerrainStudy } from './createTerrainStudy';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { splitLevel4LandingWalls } from './level4LandingWalls';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import {
  level4CliffColors,
  level4DisplayTerrain,
} from './createLevel4Materials';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import {
  createLevel4ArchBridge,
  openLevel4Bridge,
} from './createLevel4ArchBridge';

it('opens the two bridge sides while preserving the nearby terrain walls', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (let z = 78; z < 81; z++)
    for (let x = 76; x < 79; x++) cells[z]![x] = [-10, -10, -10, -10];
  for (let z = 91; z < 94; z++)
    for (let x = 87; x < 90; x++) cells[z]![x] = [-15, -15, -15, -15];
  cells[10]![10] = [0, 0, 0, 0];
  const walls = terrainCliffs(terrainMesh(cells), 130, 130, -30);
  const opened = openLevel4Bridge(walls, 130, 130);
  expect(opened.indices.length).toBeLessThan(walls.indices.length);
  expect(opened.positions).toBe(walls.positions);
  for (let i = 0; i < opened.indices.length; i += 3) {
    const tri = opened.indices.slice(i, i + 3);
    const x = tri.map((v) => opened.positions[v * 3]! + 65);
    const z = tri.map((v) => opened.positions[v * 3 + 2]! + 65);
    const acrossUpperPassage =
      x.every((v) => Math.abs(v - 76) < 0.001) &&
      Math.min(...z) >= 78 &&
      Math.max(...z) <= 81;
    expect(acrossUpperPassage).toBe(false);
  }
  const remainingX = opened.indices.map((i) => opened.positions[i * 3]!);
  expect(remainingX).toContain(-55);
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const arches = createLevel4ArchBridge(scene, cells);
    expect(arches).toHaveLength(2);
    expect(arches.every((arch) => arch.receiveShadows)).toBe(true);
    const mesh = arches[0]!;
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    expect(bounds.minimumWorld.x).toBeCloseTo(11);
    expect(bounds.maximumWorld.x).toBeCloseTo(14);
    expect(bounds.minimumWorld.z).toBeCloseTo(13);
    expect(bounds.maximumWorld.z).toBeCloseTo(16);
    expect(bounds.maximumWorld.y - bounds.minimumWorld.y).toBeLessThan(1.6);
    expect(bounds.maximumWorld.y).toBeCloseTo(
      ((16264 - 16384) * Math.sqrt(2 / 3)) / 8 - 0.015,
    );
    expect(mesh.getTotalVertices()).toBeGreaterThan(100);
    expect(bounds.maximumWorld.x - bounds.minimumWorld.x).toBeCloseTo(3);
    // Two strips of 0.1 unit leave the central 2.8 units open.
    const xs = mesh.getVerticesData('position')!.filter((_, i) => i % 3 === 0);
    expect(xs.every((x) => x <= 11.1001 || x >= 13.8999)).toBe(true);
    const lower = arches[1]!;
    lower.computeWorldMatrix(true);
    const lowerBounds = lower.getBoundingInfo().boundingBox;
    expect(lowerBounds.minimumWorld.x).toBeCloseTo(22);
    expect(lowerBounds.maximumWorld.x).toBeCloseTo(25);
    expect(lowerBounds.minimumWorld.z).toBeCloseTo(26);
    expect(lowerBounds.maximumWorld.z).toBeCloseTo(30);
    const rimY = ((16272 - 16384) * Math.sqrt(2 / 3)) / 8;
    expect(lowerBounds.maximumWorld.y).toBeCloseTo(rimY);
    const topNormals = lower.getVerticesData('normal')!;
    const topPositions = lower.getVerticesData('position')!;
    const topHeights = topPositions.filter(
      (_, i) => i % 3 === 1 && topNormals[i]! > 0.99,
    );
    expect(topHeights.length).toBeGreaterThan(0);
    expect(topHeights.every((y) => Math.abs(y - rimY) < 0.0001)).toBe(true);
    const normals = lower.getVerticesData('normal')!;
    const positions = lower.getVerticesData('position')!;
    // The exposed front face must face +Z, rather than receiving the back face's light.
    const frontNormals = [];
    for (let i = 0; i < positions.length; i += 3)
      if (
        Math.abs(positions[i + 2]! - 30) < 0.0001 &&
        Math.abs(normals[i + 2]!) > 0.9
      )
        frontNormals.push(normals[i + 2]!);
    expect(frontNormals.length).toBeGreaterThan(0);
    expect(frontNormals.every((normal) => normal > 0)).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('keeps two beveled edges on the second bridge landing', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (const z of [91, 92, 93, 94]) cells[z]![86] = [0, 0, 0, 0];
  const display = level4DisplayTerrain(cells);
  const back = display[91]![86]!;
  const middle = display[92]![86]!;
  const front = display[94]![86]!;
  expect(back[0]).toBeLessThan(back[3]!);
  expect(front[0]).toBeGreaterThan(front[3]!);
  expect(back[3]).toBe(middle[0]);
  expect(front[0]).toBe(middle[0]);
});

it('leaves both golden cantilevers suspended without overlapping undersides', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[23]![22] = [0, 0, 0, 0];
    const [mesh] = createLevel4ArchBridge(scene, cells);
    const p = mesh!.getVerticesData('position')!;
    const indices = Array.from(mesh!.getIndices()!);
    const deck = ((16344 - 16384) * Math.sqrt(2 / 3)) / 8;
    const lip = deck - 0.85;
    // Both side faces repeat one UV unit per case: five and three after the crossing.
    const uvs = mesh!.getVerticesData('uv')!;
    const armUvs: [number[], number[]] = [[], []];
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3);
      const onX = triangle.every(
        (v) =>
          Math.abs(p[v * 3 + 2]! + 65 - 24) < 0.0001 &&
          p[v * 3]! + 65 >= 23 &&
          p[v * 3]! + 65 <= 28 &&
          p[v * 3 + 1]! >= lip - 0.0001,
      );
      const onZ = triangle.every(
        (v) =>
          Math.abs(p[v * 3]! + 65 - 22) < 0.0001 &&
          p[v * 3 + 2]! + 65 >= 24 &&
          p[v * 3 + 2]! + 65 <= 27 &&
          p[v * 3 + 1]! >= lip - 0.0001,
      );
      if (onX) for (const v of triangle) armUvs[0].push(uvs[v * 2]!);
      if (onZ) for (const v of triangle) armUvs[1].push(uvs[v * 2]!);
    }
    expect(Math.max(...armUvs[0]) - Math.min(...armUvs[0])).toBe(5);
    expect(Math.max(...armUvs[1]) - Math.min(...armUvs[1])).toBe(3);
    let undersideArea = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const v = indices
        .slice(i, i + 3)
        .map((k) => [p[k * 3]!, p[k * 3 + 1]!, p[k * 3 + 2]!] as const);
      if (v.every((q) => Math.abs(q[1] - lip) < 0.0001)) {
        const [a, b, c] = v;
        undersideArea +=
          Math.abs(
            (b![0] - a![0]) * (c![2] - a![2]) -
              (b![2] - a![2]) * (c![0] - a![0]),
          ) / 2;
      }
      if (
        v.every((q) => Math.abs(q[0] + 65 - 22) < 0.0001) &&
        v.every((q) => q[2] + 65 >= 24 && q[2] + 65 <= 27)
      )
        expect(Math.min(...v.map((q) => q[1]))).toBeGreaterThanOrEqual(
          lip - 0.0001,
        );
    }
    // Incoming wall remains behind the ramp, in a separate shadow receiver.
    const walls = scene.getMeshByName('level4-jump-ramp-walls')!;
    const wallPositions = walls.getVerticesData('position')!;
    const wallIndices = Array.from(walls.getIndices()!);
    let hasIncomingWall = false;
    for (let i = 0; i < wallIndices.length; i += 3) {
      const triangle = wallIndices.slice(i, i + 3);
      if (
        triangle.every(
          (v) => Math.abs(wallPositions[v * 3]! + 65 - 22) < 0.0001,
        ) &&
        triangle.every(
          (v) =>
            wallPositions[v * 3 + 2]! + 65 >= 19 &&
            wallPositions[v * 3 + 2]! + 65 <= 23,
        ) &&
        triangle.some((v) => wallPositions[v * 3 + 1]! < lip - 2)
      )
        hasIncomingWall = true;
    }
    expect(walls.receiveShadows).toBe(true);
    expect(hasIncomingWall).toBe(true);
    expect(undersideArea).toBeCloseTo(8 + 9 - 1);
    expect(mesh!.receiveShadows).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('joins both trough slopes to level rims and joins the exit ramp to its foot', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (let z = 91; z < 95; z++)
    for (let x = 90; x < 94; x++) cells[z]![x] = [0, 0, 0, 0];
  const foot = ((16228 - 16384) * Math.sqrt(2 / 3)) / 8;
  for (let z = 92; z < 94; z++)
    for (let x = 94; x < 99; x++) cells[z]![x] = [foot, foot, foot, foot];
  const display = level4DisplayTerrain(cells);
  const back = display[91]![90]!;
  const middle = display[92]![90]!;
  const middle2 = display[93]![90]!;
  const front = display[94]![90]!;
  expect(back[0]).toBeGreaterThan(middle[0]!);
  expect(front[2]).toBe(back[0]);
  expect(back[3]).toBe(middle[0]);
  expect(front[0]).toBe(middle[0]);
  expect(middle.every((y) => y === middle[0])).toBe(true);
  expect(middle2).toEqual(middle);
  // No corner drops early at the upper join or floats above the foot.
  for (const z of [92, 93]) {
    for (let x = 94; x < 98; x++) {
      const ramp = display[z]![x]!;
      const next = display[z]![x + 1]!;
      expect(ramp[0]).toBe(ramp[3]);
      expect(ramp[1]).toBe(ramp[2]);
      expect(ramp[1]).toBeCloseTo(next[0]!);
    }
    expect(display[z]![94]![0]).toBe(middle[0]);
  }
});

it('outlines the exposed terminal cubes with scene-owned visible mortar', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[23]![22] = [0, 0, 0, 0];
    createLevel4ArchBridge(scene, cells);
    const joints = scene.getMeshByName('level4-jump-ramp-end-joints')!;
    expect(joints.getTotalVertices()).toBeGreaterThan(0);
    const positions = joints.getVerticesData('position')!;
    const xs = positions.filter((_, i) => i % 3 === 0).map((x) => x + 65);
    const zs = positions.filter((_, i) => i % 3 === 2).map((z) => z + 65);
    expect(xs.some((x) => x > 28)).toBe(true);
    expect(zs.some((z) => z > 27)).toBe(true);
    expect(joints.receiveShadows).toBe(false);
    scene.dispose();
    expect(scene.getMaterialByName('level4-jump-ramp-end-mortar')).toBeNull();
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('keeps landing wall triangles separate without duplicating the global walls', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  cells[92]![84] = [-12, -12, -12, -12];
  cells[10]![10] = [0, 0, 0, 0];
  const walls = terrainCliffs(terrainMesh(cells), 130, 130, -30);
  const { cliffs, landing } = splitLevel4LandingWalls(walls, 130, 130);
  expect(landing.indices.length).toBeGreaterThan(0);
  expect(landing.positions.length % 12).toBe(0);
  const paint = level4CliffColors(landing.positions, 130, 130);
  expect(paint).toHaveLength((landing.positions.length / 3) * 4);
  expect(
    paint.filter((_, i) => i % 4 === 1).every((green) => green < 0.6),
  ).toBe(true);
  expect(cliffs.indices.length).toBeGreaterThan(0);
  expect(cliffs.indices.length + landing.indices.length).toBe(
    walls.indices.length,
  );
  expect(cliffs.positions).toBe(walls.positions);
  expect(
    landing.positions.every(
      (v, i) =>
        i % 3 === 1 ||
        (i % 3 === 0
          ? v + 65 >= 82 && v + 65 <= 87
          : v + 65 >= 91 && v + 65 <= 95),
    ),
  ).toBe(true);
});

it('keeps opening walls on the full-level shadow map with the tall terrain casters', () => {
  const engine = new NullEngine();
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  const y = ((16344 - 16384) * Math.sqrt(2 / 3)) / 8;
  cells[23]![22] = [y, y, y, y];
  const scene = createTerrainStudy(engine, undefined, {
    cells,
    origin: { x: 0, z: 0 },
    lastScroll: -15368,
    level: 'level4',
  });
  try {
    const key = scene.getLightByName('key');
    if (!(key instanceof DirectionalLight))
      throw new Error('Missing main sunlight');
    const walls = scene.getMeshByName('level4-jump-ramp-walls')!;
    expect(walls.receiveShadows).toBe(true);
    expect(key.excludedMeshes).not.toContain(walls);
    expect(scene.getLightByName('level4-jump-shadow-light')).toBeNull();
    const casters = key.getShadowGenerator()!.getShadowMap()!.renderList!;
    for (const name of [
      'terrain-cliffs',
      'level4-top-surface',
      'level4-jump-ramp-fascia',
      'level4-jump-ramp-walls',
    ])
      expect(casters).toContain(scene.getMeshByName(name));
    scene.dispose();
    expect(scene.lights).toHaveLength(0);
    expect(scene.textures).toHaveLength(0);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('preserves the bank end walls that receive the curved arch shadow', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (let z = 91; z < 95; z++)
    for (let x = 86; x <= 90; x++)
      cells[z]![x] =
        x === 86 || x === 90 ? [-11, -11, -11, -11] : [-16, -16, -16, -16];
  const opened = openLevel4Bridge(
    terrainCliffs(terrainMesh(cells), 130, 130, -30),
    130,
    130,
  );
  for (const end of [87, 90]) {
    let area = 0;
    for (let i = 0; i < opened.indices.length; i += 3) {
      const tri = opened.indices
        .slice(i, i + 3)
        .map((v) => opened.positions.slice(v * 3, v * 3 + 3));
      if (
        !tri.every(
          (p) =>
            Math.abs(p[0]! + 65 - end) < 0.001 &&
            p[1]! >= -16 &&
            p[2]! + 65 >= 91 &&
            p[2]! + 65 <= 95,
        )
      )
        continue;
      const [a, b, c] = tri;
      area +=
        Math.abs(
          (b![1]! - a![1]!) * (c![2]! - a![2]!) -
            (c![1]! - a![1]!) * (b![2]! - a![2]!),
        ) / 2;
    }
    expect(area).toBeCloseTo(4 * 5);
  }
  const scene = createTerrainStudy(new NullEngine(), undefined, {
    cells,
    origin: { x: 0, z: 0 },
    lastScroll: -15368,
    level: 'level4',
  });
  const engine = scene.getEngine();
  try {
    const wall = scene.getMeshByName('level4-landing-cliffs')!;
    expect(wall.receiveShadows).toBe(true);
    const sun = scene.getLightByName('key') as DirectionalLight;
    const casters = sun.getShadowGenerator()!.getShadowMap()!.renderList!;
    expect(casters).toContain(wall);
    expect(casters).toContain(
      scene.getMeshByName('level4-lower-bridge-arches'),
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('matches the native three-tile opening profile on both arch pairs', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  cells[79]![77] = [-16, -16, -16, -16];
  cells[92]![88] = [-16, -16, -16, -16];
  try {
    const meshes = createLevel4ArchBridge(scene, cells);
    // Pixel measurements of the reference intrados relative to its rim.
    // Keep a one-unit tolerance for the original staircase of raster pixels.
    const measuredDepths = [
      [15, 13, 11, 9, 11, 13, 15],
      [16, 14, 12, 10, 12, 14, 16],
    ];
    const samples = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];
    for (const [index, mesh] of meshes.entries()) {
      const p = mesh.getVerticesData('position')!;
      const deck =
        (([16264, 16272][index]! - 16384) * Math.sqrt(2 / 3)) / 8 -
        (index === 0 ? 0.015 : 0);
      for (const [sample, t] of samples.entries()) {
        let bottom = Infinity;
        for (let v = 0; v < p.length; v += 3) {
          const along = p[v + (index === 0 ? 2 : 0)]! + 65;
          if (Math.abs(along - ([78, 87][index]! + 3 * t)) < 0.0001)
            bottom = Math.min(bottom, p[v + 1]!);
        }
        const depth = ((deck - bottom) * 8) / Math.sqrt(2 / 3);
        expect(Math.abs(depth - measuredDepths[index]![sample]!)).toBeLessThan(
          1,
        );
      }
      expect(mesh.receiveShadows).toBe(true);
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
