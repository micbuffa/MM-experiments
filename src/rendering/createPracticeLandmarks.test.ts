import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import {
  arcadeCellUnits,
  arcadeHeightScale,
  projectPracticePoint,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh } from '../game/modern/terrainMesh';
import {
  createPracticeLandmarks,
  practiceDisplayTerrain,
} from './createPracticeLandmarks';

const spike = (8 * arcadeHeightScale) / arcadeCellUnits;
const course: PracticeTerrain = {
  cells: Array.from({ length: 48 }, () =>
    Array<PracticeTerrain['cells'][number][number]>(48).fill([0, 0, 0, 0]),
  ),
  origin: { x: 0, z: 0 },
  lastScroll: -16069,
};
course.cells[26]![28] = [0, spike, 0, 0];
course.cells[14]![24] = [null, null, null, null];
course.cells[13]![25] = [-0.24, -0.21, -0.22, null];
course.cells[24]![31] = [-1.86, -1.88, -2.1, -1.8];

it('builds two raised points and connects the rails to their posts', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const display = practiceDisplayTerrain(course);
    const props = createPracticeLandmarks(scene, course, display);
    const point = scene.getMeshByName('practice-point-0')!;
    const pointB = scene.getMeshByName('practice-point-1')!;
    for (const tower of [point, pointB]) {
      tower.computeWorldMatrix(true);
      const positions = tower.getVerticesData(VertexBuffer.PositionKind)!;
      expect(tower.getTotalVertices()).toBe(76);
      expect(tower.getTotalIndices()).toBe(108);
      const firstFace = positions.slice(0, 57);
      const t =
        (firstFace[13]! - firstFace[1]!) / (firstFace[7]! - firstFace[1]!);
      const backingZ = firstFace[2]! + t * (firstFace[8]! - firstFace[2]!);
      expect(firstFace[14]).toBeLessThan(backingZ);
      const bounds = tower.getBoundingInfo().boundingBox;
      const shoulderY = firstFace[49]!;
      const shoulderRadius = Math.abs(firstFace[48]! - 0.5);
      expect(shoulderRadius).toBeCloseTo(0.72);
      expect((bounds.maximum.y - shoulderY) / shoulderRadius).toBeGreaterThan(
        2.4,
      );
      expect(shoulderY / (firstFace[3]! - shoulderRadius)).toBeLessThan(0.5);
      expect(bounds.maximumWorld.y).toBeCloseTo(0.5711, 4);
      expect(firstFace[15]).toBeLessThan(firstFace[24]!);
      expect(firstFace[27]).toBeLessThan(firstFace[36]!);
      const centerFoot = firstFace[27]! - firstFace[24]!;
      const centerTop = firstFace[30]! - firstFace[33]!;
      expect(centerFoot).toBeGreaterThan(1.17);
      expect(centerTop / centerFoot).toBeGreaterThan(0.6);
      expect(firstFace[0]).toBe(-1);
      expect(firstFace[3]).toBe(2);
      expect(bounds.minimumWorld.y).toBeCloseTo(display[25]![28]![0]!);
      expect(Math.abs(firstFace[48]!)).toBeLessThan(bounds.maximum.x / 2);
      // Centring the shoulder on the platform shifts this joint down four pixels.
      const base = tower.position;
      const front = positions.slice(108, 111);
      const projected = projectPracticePoint(
        (base.x + 24 + front[0]!) * arcadeCellUnits,
        (base.z + 24 + front[2]!) * arcadeCellUnits,
        0x4000 + ((base.y + front[1]!) * arcadeCellUnits) / arcadeHeightScale,
      );
      expect(Math.abs(projected.y + 7 - 155)).toBeLessThan(2);
    }

    const beam = scene.getMeshByName('practice-rail-0-beam-1')!;
    const postA = scene.getMeshByName('practice-rail-0-post-0')!;
    const postB = scene.getMeshByName('practice-rail-0-post-1')!;
    postA.computeWorldMatrix(true);
    const postBounds = postA.getBoundingInfo().boundingBox;
    expect(
      postBounds.maximumWorld.x - postBounds.minimumWorld.x,
    ).toBeGreaterThan(0.24);
    expect(postBounds.minimumWorld.y).toBeCloseTo(-0.252);
    const beamAxis = Vector3.Up();
    beamAxis.rotateByQuaternionToRef(beam.rotationQuaternion!, beamAxis);
    postB.computeWorldMatrix(true);
    const betweenPosts = new Vector3(
      postB.position.x - postA.position.x,
      postB.getBoundingInfo().boundingBox.maximumWorld.y -
        postBounds.maximumWorld.y,
      postB.position.z - postA.position.z,
    ).normalize();
    expect(Vector3.Dot(beamAxis, betweenPosts)).toBeCloseTo(1);
    expect(props.getChildMeshes()).toContain(beam);
    const upperLeftPost = scene.getMeshByName('practice-rail-3-post-1')!;
    upperLeftPost.computeWorldMatrix(true);
    expect(upperLeftPost.position.x).toBeCloseTo(7);
    expect(upperLeftPost.position.z).toBeCloseTo(1);
    // Every rail segment must stay strictly axis-aligned with the floor grid joints.
    for (let rail = 0; rail < 5; rail++) {
      for (let i = 0; ; i++) {
        const a = scene.getMeshByName(`practice-rail-${rail}-post-${i}`);
        const b = scene.getMeshByName(`practice-rail-${rail}-post-${i + 1}`);
        if (!a || !b) break;
        const alignedX = Math.abs(a.position.x - b.position.x) < 1e-6;
        const alignedZ = Math.abs(a.position.z - b.position.z) < 1e-6;
        expect(alignedX || alignedZ).toBe(true);
      }
    }
    const upperBounds = upperLeftPost.getBoundingInfo().boundingBox;
    expect(upperBounds.minimumWorld.y).toBeCloseTo(-1.8462, 4);
    expect(upperBounds.maximumWorld.y).toBeLessThan(-1.15);
    const elbowJoint = scene.getMeshByName('practice-rail-0-joint-1')!;
    expect(elbowJoint).not.toBeNull();
    expect(
      elbowJoint.position.equals(
        postB.position.add(
          new Vector3(
            0,
            (postB.getBoundingInfo().boundingBox.maximumWorld.y -
              postB.getBoundingInfo().boundingBox.minimumWorld.y) /
              2,
            0,
          ),
        ),
      ),
    ).toBe(true);
    scene.dispose();
    expect(beam.isDisposed()).toBe(true);
  } finally {
    engine.dispose();
  }
});

it('levels the three tiles at the foot of each tower and removes their internal walls', () => {
  const cells = course.cells.map((row) => [...row]);
  cells[27]![29] = [0.6, 0.6, 0.6, 0.6];
  cells[29]![27] = [0.6, 0.6, 0.6, 0.6];
  cells[30]![25] = [-1.43, -0.82, -1.43, null];
  cells[30]![26] = [-0.82, -0.82, -1.43, null];
  const display = practiceDisplayTerrain({ ...course, cells });
  const level = display[25]![28]![0]!;
  expect(level).toBeCloseTo(-1.84, 2);
  for (const [x, z] of [
    [28, 25],
    [25, 28],
  ] as const) {
    const platform = display.slice(z, z + 3).map((row) => row.slice(x, x + 3));
    expect(platform.flat(2)).toEqual(Array(36).fill(level));
    expect(terrainCliffs(terrainMesh(platform), 3, 3, -3).indices).toEqual([]);
  }
  expect(course.cells[26]![28]![1]).toBe(spike);
  expect(cells[27]![29]![0]).toBe(0.6);
  expect(cells[30]![25]).toEqual([-1.43, -0.82, -1.43, null]);
  expect(display[14]![24]).toEqual([null, null, null, null]);
});

it('preserves the opening above the three treads under each tower and keeps the lower stairs', () => {
  const display = practiceDisplayTerrain(course);
  const level = display[25]![28]![0]!;
  for (const [x, z] of [
    [31, 27],
    [31, 28],
    [30, 28],
    [27, 31],
    [28, 31],
    [28, 30],
  ] as const) {
    const tread = display[z]![x]!;
    expect(tread[0]).toBeLessThan(level - 0.6);
    expect(tread.every((corner) => corner === tread[0])).toBe(true);
    expect(tread[3]).not.toBeNull();
  }
  expect(course.cells[27]![31]![0]).toBe(0);
});

it('keeps a horizontal stone tread where the survey samples a descent to the pit floor', () => {
  const cells = course.cells.map((row) => [...row]);
  cells[29]![31] = [-1.4, -0.8, -1.4, -3.6];
  const display = practiceDisplayTerrain({ ...course, cells });
  expect(display[29]![31]).toEqual([-1.4, -1.4, -1.4, -1.4]);
  expect(cells[29]![31]).toEqual([-1.4, -0.8, -1.4, -3.6]);
});

it.each([
  { x: 17, z: 39 },
  { x: 24, z: 24 },
  { x: 30, z: 24 },
])('joins both descending panels to the platform at $x, $z', (origin) => {
  const cells: PracticeTerrain['cells'] = [
    [null, [0, -1, -1, null], [-1, -2, -2, null], null],
    [null, null, null, null],
  ];
  const display = practiceDisplayTerrain({
    ...course,
    origin,
    cells,
  });
  const sides = terrainCliffs(terrainMesh(display), 4, 2, -3);
  const rim: number[][] = [];
  for (let offset = 0; offset < sides.positions.length; offset += 12) {
    const a = sides.positions.slice(offset, offset + 3);
    const b = sides.positions.slice(offset + 3, offset + 6);
    if (a[2] === 0 && b[2] === 0) rim.push([...a, ...b]);
  }
  expect(rim).toEqual([
    [-1, 0, 0, 0, -1, 0],
    [0, -1, 0, 1, -2, 0],
  ]);
  expect(cells[0]![1]![3]).toBeNull();
});

it('removes tower collision wedges from the three paving tiles bordering the opening', () => {
  const cells = course.cells.map((row) => [...row]);
  for (const x of [28, 29, 30]) cells[24]![x] = [-1.8, -1.8, -1.8, -0.8];
  for (const x of [28, 29, 30]) cells[23]![x] = [-1.8, -1.8, -1.8, -1.8];
  const before = JSON.stringify(cells);
  const display = practiceDisplayTerrain({ ...course, cells });
  for (const x of [28, 29, 30])
    expect(display[24]![x]).toEqual([-1.8, -1.8, -1.8, -1.8]);
  expect(display[23]![29]).toEqual(cells[23]![29]);
  expect(JSON.stringify(cells)).toBe(before);
  const patch = display.slice(23, 26).map((row) => row.slice(28, 31));
  const walls = terrainCliffs(terrainMesh(patch), 3, 3, -5);
  // All exposed edges are at or below the paving: no yellow vertical fins.
  expect(
    walls.positions.filter((_, i) => i % 3 === 1).every((y) => y <= -1.8),
  ).toBe(true);
});

it('mounts the two pyramid-adjacent rails on the outside corners and keeps their plan angle square', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    createPracticeLandmarks(scene, course, practiceDisplayTerrain(course));
    const post = (n: number) =>
      scene.getMeshByName(`practice-rail-2-post-${n}`)!.position;
    const a = post(0),
      c = post(1),
      b = post(2);
    expect([a.x + 24, a.z + 24]).toEqual([28, 25]);
    expect([c.x + 24, c.z + 24]).toEqual([25, 25]);
    expect([b.x + 24, b.z + 24]).toEqual([25, 28]);
    expect((a.x - c.x) * (b.x - c.x) + (a.z - c.z) * (b.z - c.z)).toBe(0);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
