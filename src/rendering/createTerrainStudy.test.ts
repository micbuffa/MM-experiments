import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import {
  setLevel4CatapultFrame,
  setLevel4HammerFrames,
  setLevel4VacuumExtensions,
} from './createLevel4Materials';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { expect, it, vi } from 'vitest';
import { practiceFinishScroll } from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { createTerrainStudy } from './createTerrainStudy';
import {
  intermediateBridgeRise,
  intermediateBridgeThickness,
} from './createIntermediateBridge';

it('creates an upward-facing, textured terrain surface owned by the scene', () => {
  const engine = new NullEngine();
  try {
    const scene = createTerrainStudy(engine);
    const mesh = scene.getMeshByName('terrain-surface')!;
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    expect(
      normals.filter((_, index) => index % 3 === 1).every((y) => y > 0),
    ).toBe(true);
    expect(mesh.getIndices()!.length).toBeGreaterThan(6);
    expect(mesh.material!.getActiveTextures()).toHaveLength(1);
    expect(scene.lights).toHaveLength(2);
    scene.dispose();
    expect(scene.textures).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});

it('lays the finish marking on the same joined heights as the last ramp', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 68 }, () =>
      Array<TerrainCell>(80).fill(null),
    );
    cells[65]![72] = [0, -0.1, -0.2, 0];
    cells[65]![73] = [-0.5, -0.6, -0.75, -0.7];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: practiceFinishScroll,
    });
    const finish = scene.getMeshByName('practice-finish')!;
    const terrain = scene.getMeshByName('terrain-surface')!;
    const positions = finish.getVerticesData(VertexBuffer.PositionKind)!;
    expect(positions).toEqual(
      terrain.getVerticesData(VertexBuffer.PositionKind),
    );
    expect(positions[4]).toBeCloseTo(-0.3);
    expect(finish.position.y).toBeGreaterThan(0);
  } finally {
    engine.dispose();
  }
});

it('projects wall-on-wall shadows across Practice Race cliffs without floor self-shadow acne', () => {
  const engine = new NullEngine();
  try {
    const scene = createTerrainStudy(engine, undefined, {
      cells: [
        [[0, 0, 0, 0], null],
        [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      ],
      origin: { x: 39, z: 39 },
      lastScroll: -16069,
    });
    const cliffs = scene.getMeshByName('terrain-cliffs')!;
    const floor = scene.getMeshByName('terrain-surface')!;
    expect(cliffs.receiveShadows).toBe(true);
    expect(floor.receiveShadows).toBe(true);
    expect(scene.getMeshByName('practice-arrow-center')?.receiveShadows).toBe(
      true,
    );
    const casters = scene
      .getLightByName('key')
      ?.getShadowGenerator()
      ?.getShadowMap()?.renderList;
    expect(casters).toContain(cliffs);
    expect(casters).not.toContain(floor);
  } finally {
    engine.dispose();
  }
});

it('projects Intermediate Race cliff and bridge shadows onto the paving', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 62 }, () =>
      Array<TerrainCell>(70).fill(null),
    );
    cells[56]![61] = [0, 0, 0, 0];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
      level: 'intermediate',
    });
    const floor = scene.getMeshByName('terrain-surface')!;
    const cliffs = scene.getMeshByName('terrain-cliffs')!;
    const deck = scene.getMeshByName('intermediate-bridge-deck')!;
    const casters = scene
      .getLightByName('key')
      ?.getShadowGenerator()
      ?.getShadowMap()?.renderList;
    expect(casters).toContain(cliffs);
    expect(cliffs.material?.backFaceCulling).toBe(false);
    expect(cliffs.receiveShadows).toBe(true);
    expect(casters).toContain(deck);
    expect(floor.receiveShadows).toBe(true);

    const auxCap = scene.getMeshByName('intermediate-bridge-auxiliary-cap')!;
    const initialCapY = auxCap.position.y;
    vi.spyOn(engine, 'getDeltaTime').mockReturnValue(50);
    for (let i = 0; i < 30; i++)
      scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(auxCap.position.y).not.toBeCloseTo(initialCapY, 3);
    const positions = deck.getVerticesData(VertexBuffer.PositionKind)!;
    const freeEdge = [];
    const hinge = [];
    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i + 2] === -2) freeEdge.push(positions[i + 1]);
      if (positions[i + 2] === 2) hinge.push(positions[i + 1]);
    }
    expect(freeEdge[0]).toBeCloseTo(intermediateBridgeRise(1.5));
    expect(freeEdge[0]).toBeGreaterThan(1);
    expect(hinge.length).toBeGreaterThan(0);
    expect(hinge.every((y) => y === 0)).toBe(true);
    deck.computeWorldMatrix(true);
    const bounds = deck.getBoundingInfo().boundingBox;
    expect(bounds.minimumWorld.y).toBeCloseTo(deck.position.y);
    expect(bounds.maximumWorld.y).toBeGreaterThan(
      deck.position.y + freeEdge[0]! - 0.01,
    );
    const slab = scene.getMeshByName('intermediate-bridge-slab')!;
    const piston = scene.getMeshByName('intermediate-bridge-piston')!;
    const edge = scene.getMeshByName('intermediate-bridge-edge')!;
    expect(slab.getBoundingInfo().boundingBox.extendSize.y * 2).toBeCloseTo(
      intermediateBridgeThickness,
    );
    expect(slab.rotation.x).toBeGreaterThan(0);
    const housing = scene.getMeshByName('intermediate-bridge-housing')!;
    expect(piston.position.x).toBeCloseTo(housing.position.x);
    expect(piston.position.z).toBeCloseTo(housing.position.z);
    expect(housing.position.x - deck.position.x).toBeCloseTo(-0.35);
    expect(housing.position.z - deck.position.z).toBeCloseTo(0);
    piston.computeWorldMatrix(true);
    expect(piston.getAbsolutePosition().x - deck.position.x).toBeCloseTo(0.15);
    expect(piston.getAbsolutePosition().z - deck.position.z).toBeCloseTo(0.15);
    const mechanics = scene.getTransformNodeByName(
      'intermediate-bridge-moving-machinery',
    )!;
    for (const part of mechanics.getChildMeshes()) {
      part.computeWorldMatrix(true);
      const bounds = part.getBoundingInfo().boundingBox;
      expect(bounds.minimumWorld.x).toBeGreaterThanOrEqual(
        deck.position.x - 2.01,
      );
      expect(bounds.maximumWorld.x).toBeLessThanOrEqual(deck.position.x + 2.01);
      expect(bounds.minimumWorld.z).toBeGreaterThanOrEqual(
        deck.position.z - 2.01,
      );
      expect(bounds.maximumWorld.z).toBeLessThanOrEqual(deck.position.z + 2.01);
    }
    const auxiliary = scene.getMeshByName(
      'intermediate-bridge-auxiliary-housing',
    )!;
    expect(auxiliary.position.x).toBeGreaterThan(piston.position.x);
    expect(
      scene
        .getMeshByName('intermediate-bridge-hydraulic-line')
        ?.getTotalVertices(),
    ).toBeGreaterThan(0);
    expect(
      Math.abs(edge.position.x - deck.position.x) +
        edge.getBoundingInfo().boundingBox.extendSize.x,
    ).toBeCloseTo(2);
    expect(edge.material?.getActiveTextures()).toHaveLength(1);
    expect(
      scene.getMeshByName('intermediate-bridge-piston-head')?.position.y,
    ).toBeGreaterThan(piston.position.y);
    expect(
      scene.getMeshByName('intermediate-bridge-linkage')?.scaling.y,
    ).toBeGreaterThan(1);
  } finally {
    engine.dispose();
  }
});

it('sets the Ice surface and goal flags at their surveyed finish tiles', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[95]![90] = [-24, -24, -25, -25];
    cells[109]![110] = [-27, -27, -27, -27];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
      level: 'intermediate',
    });
    expect(scene.getMeshByName('intermediate-ice')?.getIndices()).toHaveLength(
      6,
    );
    expect(
      Array.from(
        scene
          .getMeshByName('intermediate-ice')!
          .getVerticesData(VertexBuffer.PositionKind)!
          .slice(0, 3),
      ),
    ).toEqual([25, -24, 30]);
    const paving = scene.getMeshByName('terrain-surface')!;
    const vertices = paving.getVerticesData(VertexBuffer.PositionKind)!;
    expect(
      paving.getIndices()!.some((index) => vertices[index * 3] === 25),
    ).toBe(false);
    expect(
      scene.getMeshByName('intermediate-finish')?.getIndices(),
    ).toHaveLength(6);
    const flags = scene.meshes.filter((mesh) =>
      /^intermediate-goal-flag-/.test(mesh.name),
    );
    expect(flags).toHaveLength(2);
    expect(flags[0]?.position.z).toBeCloseTo(44.05);
    expect(flags[0]?.position.y).toBeCloseTo(-27);
    expect(flags[1]!.position.x - flags[0]!.position.x).toBeCloseTo(3.9);
  } finally {
    engine.dispose();
  }
});

it('casts Intermediate Race cliff and pipe shadows from the single main sun without floor acne', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 10 }, () =>
      Array<TerrainCell>(10).fill([0, 0, 0, 0]),
    );
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 60, z: 74 },
      lastScroll: -15846,
      level: 'intermediate',
      pipes: {
        positions: [0, 0, 0, 1, 2, 0, 1, 0, 1],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        shell: [0, 1, 2],
        interior: [0, 2, 1],
      },
    });
    const cliffs = scene.getMeshByName('terrain-cliffs')!;
    const floor = scene.getMeshByName('terrain-surface')!;
    const shell = scene.getMeshByName('intermediate-pipes-shell')!;
    const interior = scene.getMeshByName('intermediate-pipes-interior')!;
    expect(scene.getLightByName('intermediate-pipe-wall-light')).toBeNull();
    const casters = scene
      .getLightByName('key')
      ?.getShadowGenerator()
      ?.getShadowMap()?.renderList;
    expect(casters).toContain(cliffs);
    expect(casters).not.toContain(floor);
    expect(casters).toContain(shell);
    expect(casters).toContain(interior);
    expect(floor.getVerticesData(VertexBuffer.ColorKind)).not.toBeNull();
  } finally {
    engine.dispose();
  }
});

it('carves the recessed alcove and gray tiled shelf behind the Intermediate Race ice wall', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    for (let z = 76; z <= 86; z++)
      for (let x = 85; x <= 87; x++)
        cells[z]![x] = [-10.6, -10.6, -10.6, -10.6];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
      level: 'intermediate',
    });
    const shelf = scene.getMeshByName('intermediate-alcove-shelf');
    expect(shelf).not.toBeNull();
    expect(shelf?.receiveShadows).toBe(true);
    expect(shelf?.getIndices()?.length).toBe(7 * 3 * 6);
    const lower = scene.getMeshByName('intermediate-alcove-shelf-lower')!;
    expect(lower.getIndices()).toHaveLength(7 * 3 * 6);
    const upperPoints = shelf!.getVerticesData(VertexBuffer.PositionKind)!;
    const lowerPoints = lower.getVerticesData(VertexBuffer.PositionKind)!;
    expect(upperPoints[1]! - lowerPoints[1]!).toBeCloseTo(9.0);
    const xs = upperPoints.filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(3);
    for (const mesh of [shelf!, lower]) {
      const zs = mesh
        .getVerticesData(VertexBuffer.PositionKind)!
        .filter((_, i) => i % 3 === 2)
        .map((z) => z + mesh.position.z);
      expect(Math.max(...zs) - Math.min(...zs)).toBe(7);
      expect(Math.min(...zs)).toBe(76 - 65);
    }
    const lowerXs = lowerPoints
      .filter((_, i) => i % 3 === 0)
      .map((x) => x + lower.position.x);
    expect(Math.min(...lowerXs)).toBe(85 - 65);
    // The inset shelf must stop at the facade, without protruding over the ice.
    expect(Math.max(...lowerXs)).toBe(88 - 65);
  } finally {
    engine.dispose();
  }
});

it('builds the Level 3 olive-khaki terrain with copper pipe, animated wave, GOAL flags and rim cleanup', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 118 }, () =>
      Array<TerrainCell>(118).fill(null),
    );
    cells[7]![20] = [1, 1, 1, 1];
    cells[10]![22] = [1, 1, 1, -2];
    cells[10]![23] = [1, 0.5, 0.5, 1];
    cells[22]![10] = [1, 0.5, 0.5, 0.5];
    cells[37]![49] = [-2.5, -2.5, -2.5, -2.5];
    cells[77]![82] = [-12, -12, -12, -12];
    cells[92]![90] = [-11, -11.5, -11.5, -13];
    cells[92]![99] = [-12, -12, -12, -12];
    cells[100]![92] = [-14, -14, -14, -14];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15440,
      level: 'level3',
      pipes: {
        positions: [0, 0, 0, 1, 2, 0, 1, 0, 1],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        shell: [0, 1, 2],
        interior: [0, 2, 1],
      },
    });
    const cliffs = scene.getMeshByName('terrain-cliffs')!;
    const floor = scene.getMeshByName('terrain-surface')!;
    const pipe = scene.getMeshByName('level3-pipe-shell')!;
    const wave = scene.getMeshByName('level3-wave')!;
    const finish = scene.getMeshByName('level3-finish')!;
    const towers = scene.getMeshByName('level3-opening-towers')!;
    expect(cliffs.material?.name).toBe('level3-cliffs');
    expect(towers.material?.name).toBe('level3-tower-stone');
    expect(floor.material?.name).toBe('level3-floor');
    expect(pipe.material?.name).toBe('level3-pipe-copper');
    expect(pipe.position.y).toBeGreaterThan(0);
    expect(wave.material?.name).toBe('level3-wave-material');
    expect(wave.receiveShadows).toBe(false);
    const waveSides = scene.getMeshByName('level3-wave-sides');
    expect(waveSides?.material?.name).toBe('level3-wave-sides-material');
    expect(waveSides?.material?.getActiveTextures()).toHaveLength(1);
    expect(finish.getIndices()).toHaveLength(6);
    expect(
      scene.meshes.filter((mesh) => /^level3-goal-flag-/.test(mesh.name)),
    ).toHaveLength(2);
    expect(cliffs.receiveShadows).toBe(true);
    expect(floor.receiveShadows).toBe(true);
    expect(floor.getVerticesData(VertexBuffer.ColorKind)).not.toBeNull();
    const generator = scene.getLightByName('key')?.getShadowGenerator();
    expect(generator).toBeInstanceOf(ShadowGenerator);
    expect((generator as ShadowGenerator).getDarkness()).toBeLessThan(0.2);
    const casters = generator?.getShadowMap()?.renderList;
    expect(casters).toContain(cliffs);
    expect(casters).toContain(towers);
    expect(scene.getMeshByName('level3-tower-windows')).not.toBeNull();
    expect(casters).toContain(pipe);
    expect(casters).toContain(wave);
    expect(scene.getMeshByName('level3-turquoise-curbs')?.material?.name).toBe(
      'level3-curb-turquoise',
    );
    expect(casters).toContain(scene.getMeshByName('level3-turquoise-spike'));
    expect(casters).not.toContain(floor);
  } finally {
    engine.dispose();
  }
});

it('builds Level 4 (Aerial Race) with golden top ramps, grey tracks, orange-to-yellow cliffs and GOAL flags', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[8]![22] = [0, 0, 0, 0];
    cells[40]![40] = [-4, -4, -4, -4];
    cells[104]![113] = [-9.75, -9.75, -9.75, -9.75];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15368,
      level: 'level4',
    });
    expect(scene.getMeshByName('terrain-surface')?.material?.name).toBe(
      'level4-floor',
    );
    expect(scene.getMeshByName('level4-top-surface')?.material?.name).toBe(
      'level4-top-floor',
    );
    const cliffs = scene.getMeshByName('terrain-cliffs')!;
    expect(cliffs.material?.name).toBe('level4-cliffs');
    expect(cliffs.material).toBeInstanceOf(StandardMaterial);
    if (cliffs.material instanceof StandardMaterial)
      expect(cliffs.material.twoSidedLighting).toBe(true);
    for (const name of ['level4-floor', 'level4-top-floor', 'level4-cliffs']) {
      const material = scene.getMaterialByName(name) as StandardMaterial;
      // Masonry must not produce view-dependent white highlights.
      expect(material.specularColor.asArray()).toEqual([0, 0, 0]);
    }
    const floorMaterial = scene.getMaterialByName(
      'level4-floor',
    ) as StandardMaterial;
    expect(floorMaterial.emissiveColor.r).toBe(floorMaterial.emissiveColor.g);
    expect(floorMaterial.emissiveColor.g).toBe(floorMaterial.emissiveColor.b);
    // The golden ramps use their real light-facing normals, without the
    // Intermediate Race vertex boost that whitened one side of the crossing.
    expect(
      scene
        .getMeshByName('level4-top-surface')!
        .getVerticesData(VertexBuffer.ColorKind),
    ).toBeNull();
    expect(cliffs.getVerticesData(VertexBuffer.ColorKind)).not.toBeNull();
    expect(scene.getMeshByName('level4-finish')?.getIndices()).toHaveLength(6);
    expect(
      scene.meshes.filter((mesh) => /^level4-goal-flag-/.test(mesh.name)),
    ).toHaveLength(2);
    expect(scene.getMeshByName('level4-vacuum-0-hood')).toBeNull();
    expect(scene.getMeshByName('level4-piston-0')).toBeNull();
    expect(scene.getMeshByName('level4-catapult-cup')).toBeNull();
    expect(scene.getMeshByName('level4-hammer-0-head')).toBeNull();
  } finally {
    engine.dispose();
  }
});

it('anchors the Level 4 mechanisms to the track and animates their moving parts', () => {
  const engine = new NullEngine();
  try {
    vi.spyOn(engine, 'getDeltaTime').mockReturnValue(50);
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[37]![39] = [-8, -8, -10, -10];
    cells[46]![51] = [-9, -9, -9, -9];
    cells[69]![63] = [-11, -11, -11, -11];
    cells[102]![105] = [-16, -16, -16, -16];
    const scene = createTerrainStudy(engine, undefined, {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15368,
      level: 'level4',
    });
    const vacuum = scene.getTransformNodeByName('level4-vacuum-0')!;
    const otherVacuum = scene.getTransformNodeByName('level4-vacuum-2')!;
    const catapult = scene.getTransformNodeByName('level4-catapult')!;
    const cup = scene.getMeshByName('level4-catapult-cup')!;
    const foundation = scene.getMeshByName('level4-catapult-masonry-0-wall')!;
    const hammer = scene.getMeshByName('level4-hammer-0-head')!;

    expect(vacuum.position.y).toBe(-9);
    expect(otherVacuum.rotation.y).toBe(Math.PI / 2);
    const firstTube = scene.getMeshByName('level4-vacuum-0-hose')!;
    const sideTube = scene.getMeshByName('level4-vacuum-2-hose')!;
    firstTube.computeWorldMatrix(true);
    sideTube.computeWorldMatrix(true);
    expect(firstTube.getBoundingInfo().boundingBox.maximumWorld.z).toBeLessThan(
      -28,
    );
    expect(sideTube.getBoundingInfo().boundingBox.maximumWorld.x).toBeLessThan(
      -14,
    );
    expect(firstTube.getBoundingInfo().boundingBox.minimumWorld.y).toBeLessThan(
      vacuum.position.y - 6,
    );
    const hood = scene.getMeshByName('level4-vacuum-0-hood')!;
    hood.computeWorldMatrix(true);
    expect(hood.getBoundingInfo().boundingBox.maximumWorld.z).toBeGreaterThan(
      firstTube.getBoundingInfo().boundingBox.maximumWorld.z + 0.4,
    );

    expect(catapult.position.y).toBe(-11);
    foundation.computeWorldMatrix(true);
    expect(
      foundation.getBoundingInfo().boundingBox.minimumWorld.y,
    ).toBeLessThan(catapult.position.y - 10);
    expect(foundation.material?.name).toBe('level4-cliffs');
    expect(
      scene.getMeshByName('level4-catapult-masonry-0-top')?.material?.name,
    ).toBe('level4-catapult-rim-top');
    const rimTop = scene.getMaterialByName(
      'level4-catapult-rim-top',
    ) as StandardMaterial;
    expect(rimTop.diffuseTexture).toBeNull();
    expect(rimTop.diffuseColor.r).toBe(rimTop.diffuseColor.g);
    expect(rimTop.diffuseColor.g).toBe(rimTop.diffuseColor.b);
    for (let block = 0; block < 6; block++)
      expect(
        scene.getMeshByName(`level4-catapult-masonry-${block}-top`)?.material,
      ).toBe(rimTop);
    const foundationBeforeLaunch = foundation.getAbsolutePosition().clone();
    const launchStart = cup.computeWorldMatrix(true).getTranslation();
    expect(launchStart.x).toBeCloseTo(-2);
    expect(launchStart.z).toBeCloseTo(5);
    const hammerStart = hammer.computeWorldMatrix(true).getTranslation().y;

    for (let step = 0; step < 4; step++)
      scene.onBeforeRenderObservable.notifyObservers(scene);

    expect(vacuum.position.y).toBe(-9);
    expect(cup.computeWorldMatrix(true).getTranslation().y).toBeCloseTo(
      launchStart.y,
    );
    setLevel4CatapultFrame(scene, 3);
    const raised = cup.computeWorldMatrix(true).getTranslation();
    expect(raised.y).toBeGreaterThan(launchStart.y);
    expect(raised.z).toBeLessThan(launchStart.z);
    foundation.computeWorldMatrix(true);
    expect(
      foundation.getAbsolutePosition().equals(foundationBeforeLaunch),
    ).toBe(true);
    setLevel4CatapultFrame(scene, undefined);
    expect(cup.computeWorldMatrix(true).getTranslation().y).toBeCloseTo(
      launchStart.y,
    );
    expect(catapult.rotation.z).toBe(0);
    expect(hammer.computeWorldMatrix(true).getTranslation().y).toBeGreaterThan(
      hammerStart,
    );
    expect(scene.getMeshByName('level4-hammer-1-head')).toBeNull();
    scene.dispose();
    expect(scene.onBeforeRenderObservable.hasObservers()).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('deploys each live vacuum from its own native pose and hides it on reset', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    for (const [x, z] of [
      [39, 37],
      [48, 37],
      [51, 46],
      [34, 43],
      [42, 43],
      [45, 52],
    ] as const)
      cells[z]![x] = [-8, -8, -8, -8];
    const scene = createTerrainStudy(
      engine,
      undefined,
      {
        cells,
        origin: { x: 0, z: 0 },
        lastScroll: -15368,
        level: 'level4',
      },
      true,
    );
    const vacuums = Array.from({ length: 6 }, (_, i) =>
      scene.getMeshByName(`level4-vacuum-${i}-hood`)!,
    );
    expect(vacuums.every((mesh) => !mesh.isEnabled())).toBe(true);
    setLevel4VacuumExtensions(scene, [0.5, 0, 1, 0, 0, 0.4]);
    expect(vacuums.map((mesh) => mesh.isEnabled())).toEqual([
      true,
      false,
      true,
      false,
      false,
      true,
    ]);
    const mount = scene.getTransformNodeByName('level4-vacuum-0')!;
    expect(mount.position.y).toBeLessThan(-8);
    setLevel4VacuumExtensions(scene, [1]);
    expect(mount.position.y).toBe(-8);
    expect(vacuums[2]!.isEnabled()).toBe(false);
    setLevel4VacuumExtensions(scene, undefined);
    expect(vacuums.every((mesh) => !mesh.isEnabled())).toBe(true);
    scene.dispose();
  } finally {
    engine.dispose();
  }
});

it('keeps procedural live hammers hidden until native frames and clears them on reset', () => {
  const engine = new NullEngine();
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (const z of [102, 104, 106, 108]) cells[z]![105] = [-16, -16, -16, -16];
  const scene = createTerrainStudy(
    engine,
    undefined,
    { cells, origin: { x: 0, z: 0 }, lastScroll: -15368, level: 'level4' },
    true,
  );
  try {
    const pivot = scene.getTransformNodeByName('level4-hammer-0')!;
    expect(pivot.position.x).toBe(40);
    expect(pivot.isEnabled()).toBe(false);
    for (let i = 0; i < 60; i++)
      scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(pivot.isEnabled()).toBe(false);
    expect(pivot.rotation.z).toBe(0);
    setLevel4HammerFrames(scene, [6, 0, undefined, undefined]);
    expect(pivot.isEnabled()).toBe(true);
    const angle = pivot.rotation.z;
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(pivot.rotation.z).toBe(angle);
    for (const step of [8, 9, 10, 11]) {
      setLevel4HammerFrames(scene, [step]);
      expect(pivot.rotation.z).toBeCloseTo(0.05);
    }
    setLevel4HammerFrames(scene, [14]);
    expect(pivot.isEnabled()).toBe(false);
    setLevel4HammerFrames(scene, undefined);
    expect(pivot.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
