import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { expect, it } from 'vitest';
import type { PracticePose } from '../emulation/practicePose';
import {
  arcadeHeightScale,
  practiceCompleteOrigin,
  practiceFinishScroll,
  practiceOrigin,
  practiceLastSurveyedScroll,
} from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { createLivePracticeView } from './createLivePracticeView';

const flatCell: TerrainCell = [0, 0, 0, 0];
const terrain = {
  cells: Array.from({ length: 14 }, () =>
    Array<TerrainCell>(20).fill(flatCell),
  ),
  origin: practiceOrigin,
  lastScroll: practiceLastSurveyedScroll,
};
const pose: PracticePose = {
  marble: 'visible',
  x: 140,
  z: 140,
  height: 0x4000,
  scroll: -16144,
};

it('sweeps the level during the countdown and hands back to the selected camera', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    expect(view.update({ ...pose, opening: 0 })).toBe(true);
    const camera = view.scene.activeCamera!;
    expect(view.camera.diagnostics.active).toBe('opening');
    const widePosition = camera.position.clone();
    view.update({ ...pose, opening: 0.5 });
    expect(camera.position.equals(widePosition)).toBe(false);
    view.update(pose);
    expect(view.scene.activeCamera?.name).toBe('practice-reference-camera');
    view.update({ ...pose, opening: 0 });
    view.camera.select('follow');
    view.camera.setFov(65);
    view.update({ ...pose, opening: 0.25 });
    expect(view.camera.diagnostics.active).toBe('follow');
    expect(view.scene.activeCamera).toBe(camera);
    expect(camera.fov).toBeCloseTo((65 * Math.PI) / 180);
    const previousX = camera.position.x;
    view.update({ ...pose, x: pose.x + 8 });
    expect(camera.position.x - previousX).toBeCloseTo(1);
    const followed = camera.position.clone();
    view.update({ ...pose, marble: 'rebuilding' });
    expect(camera.position.equals(followed)).toBe(true);
    view.camera.select('overhead');
    view.update(pose);
    expect(camera.position.y).toBeGreaterThan(followed.y + 20);
  } finally {
    engine.dispose();
  }
});

it('zooms the arcade projection around its original center', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    view.update(pose);
    const camera = view.scene.activeCamera!;
    const width = camera.orthoRight! - camera.orthoLeft!;
    const center = camera.orthoRight! + camera.orthoLeft!;
    view.camera.setFov(40);
    view.update(pose);
    expect(camera.orthoRight! - camera.orthoLeft!).toBeLessThan(width);
    expect(camera.orthoRight! + camera.orthoLeft!).toBeCloseTo(center);
  } finally {
    engine.dispose();
  }
});

it('follows from behind the marble at a low height and keeps the downhill viewing direction', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    view.camera.select('chase');
    view.update(pose);
    const camera = view.scene.activeCamera!;
    const marble = view.scene.getMeshByName('practice-player')!;
    expect(view.camera.diagnostics.active).toBe('chase');
    expect(camera.position.x).toBeLessThan(marble.position.x - 3);
    expect(camera.position.z).toBeLessThan(marble.position.z - 3);
    expect(camera.position.y - marble.position.y).toBeLessThan(4);
    const moved = { ...pose, x: pose.x + 4, z: pose.z + 4 };
    view.update(moved);
    const stopped = camera.position.clone();
    view.update(moved);
    expect(camera.position.equalsWithEpsilon(stopped)).toBe(true);
    const offset = camera.position.subtract(marble.position);
    for (let i = 1; i <= 14; i++)
      view.update({ ...moved, x: moved.x - i * 0.5, z: moved.z - i * 0.5 });
    expect(
      camera.position.subtract(marble.position).equalsWithEpsilon(offset),
    ).toBe(true);
  } finally {
    engine.dispose();
  }
});

it('raises a three-tile ramp with closed sides and restores the surveyed floor', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const first = view.scene.getMeshByName('practice-start-lift-1')!;
    const highest = view.scene.getMeshByName('practice-start-lift-5')!;
    const sides = view.scene.getMeshByName('practice-start-lift-walls-5')!;
    const floor = view.scene.getMeshByName('terrain-surface')!;
    expect(highest.isEnabled()).toBe(false);
    expect(view.update({ ...pose, startLift: 1 })).toBe(true);
    expect(first.isEnabled()).toBe(true);
    expect(view.update({ ...pose, startLift: 5 })).toBe(true);
    expect(first.isEnabled()).toBe(false);
    expect(highest.isEnabled()).toBe(true);
    expect(sides.isEnabled()).toBe(true);
    expect(sides.getTotalIndices()).toBeGreaterThan(0);
    highest.computeWorldMatrix(true);
    const bounds = highest.getBoundingInfo().boundingBox;
    expect(bounds.minimumWorld.x).toBe(-4);
    expect(bounds.maximumWorld.x).toBe(-1);
    expect(bounds.minimumWorld.z).toBe(-2);
    expect(bounds.maximumWorld.z).toBe(1);
    expect(bounds.maximumWorld.y).toBeCloseTo(2 * arcadeHeightScale);
    expect(floor.getBoundingInfo().boundingBox.maximum.y).toBe(0);
    expect(view.update(pose)).toBe(true);
    expect(highest.isEnabled()).toBe(false);
    expect(sides.isEnabled()).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('places the bottom of the marble at the reported height', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const marble = view.scene.getMeshByName('practice-player')!;
    const ground = view.scene.getMeshByName('terrain-surface')!;

    expect(view.update(pose)).toBe(true);
    marble.computeWorldMatrix(true);
    expect(marble.getBoundingInfo().boundingBox.minimumWorld.y).toBeCloseTo(
      ground.getBoundingInfo().boundingBox.maximumWorld.y,
    );

    expect(view.update({ ...pose, height: 0x4008 })).toBe(true);
    marble.computeWorldMatrix(true);
    const raisedBottom = marble.getBoundingInfo().boundingBox.minimumWorld.y;
    expect(raisedBottom).toBeCloseTo(Math.sqrt(2 / 3));
  } finally {
    engine.dispose();
  }
});

it('rolls the surface against the direction of travel and pauses at rest or across a missing pose', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const marble = view.scene.getMeshByName('practice-player')!;
    expect((marble.material as StandardMaterial).diffuseTexture).not.toBeNull();
    const orientation = marble.rotationQuaternion!;
    view.update(pose);
    const next = { ...pose, x: pose.x + 4 };
    view.update(next);
    const down = Vector3.Down();
    down.rotateByQuaternionToRef(orientation, down);
    expect(down.x).toBeLessThan(-0.5);
    expect(down.z).toBeCloseTo(0);
    const stopped = orientation.asArray();

    view.update({ ...next, height: next.height + 2 });
    expect(orientation.asArray()).toEqual(stopped);
    expect(view.update(null)).toBe(false);
    view.update(pose);
    expect(orientation.asArray()).toEqual(stopped);
  } finally {
    engine.dispose();
  }
});

it('keeps filtered scenic shadows and toggles the shadow of both marbles', () => {
  const engine = new NullEngine();
  try {
    const { scene, setMarbleShadows } = createLivePracticeView(engine, terrain);
    const marble = scene.getMeshByName('practice-player')!;
    const second = scene.getMeshByName('practice-player-2')!;
    const ground = scene.getMeshByName('terrain-surface')!;
    const generator = scene.getLightByName('key')?.getShadowGenerator();
    expect(generator).toBeInstanceOf(ShadowGenerator);
    expect((generator as ShadowGenerator).filter).toBe(
      // NullEngine has no hardware shadow samplers; Babylon uses its Poisson fallback.
      ShadowGenerator.FILTER_POISSONSAMPLING,
    );
    const shadowMap = generator?.getShadowMap();
    expect(shadowMap?.renderList).not.toContain(marble);
    expect(shadowMap?.renderList).not.toContain(second);
    setMarbleShadows(true);
    setMarbleShadows(true);
    expect(
      shadowMap?.renderList?.filter((mesh) => mesh === marble),
    ).toHaveLength(1);
    expect(shadowMap?.renderList).toContain(second);
    setMarbleShadows(false);
    expect(shadowMap?.renderList).not.toContain(marble);
    expect(shadowMap?.renderList).not.toContain(second);
    expect(shadowMap?.renderList).toContain(
      scene.getMeshByName('practice-rail-0-beam-1'),
    );
    expect(ground.receiveShadows).toBe(true);
  } finally {
    engine.dispose();
  }
});

it('draws eight fragments on a raised ellipse that descends and closes at the checkpoint', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const marble = view.scene.getMeshByName('practice-player')!;
    const fragments = view.scene.meshes.filter((mesh) =>
      mesh.name.startsWith('practice-player-fragment-'),
    );
    view.update(pose);
    const center = marble.position.clone();
    const rebuilding = { ...pose, marble: 'rebuilding' } as const;
    view.update({ ...rebuilding, respawnTicks: 47 });
    expect(marble.isEnabled()).toBe(false);
    expect(fragments.some((mesh) => mesh.isEnabled())).toBe(false);
    const middle = { ...rebuilding, respawnTicks: 16 };
    view.update(middle);
    expect(fragments.filter((mesh) => mesh.isEnabled())).toHaveLength(8);
    const camera = view.scene.activeCamera!;
    const transform = camera
      .getViewMatrix()
      .multiply(camera.getProjectionMatrix());
    const viewport = new Viewport(24, 0, 288, 240);
    const screen = (point: Vector3) =>
      Vector3.Project(point, Matrix.IdentityReadOnly, transform, viewport);
    const checkpoint = screen(center);
    const positions = fragments.map((mesh) => screen(mesh.position));
    const xs = positions.map(({ x }) => x);
    const ys = positions.map(({ y }) => y);
    // At tick 16 the native replay spans roughly 100 by 50 pixels,
    // centered horizontally on the checkpoint and about 16 pixels above it.
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(101, 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(51, 0);
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(checkpoint.x);
    expect(checkpoint.y - (Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(
      16,
    );
    const near = { ...rebuilding, respawnTicks: 2 };
    view.update(near);
    expect(fragments.every((mesh) => mesh.isEnabled())).toBe(true);
    for (const fragment of fragments) {
      expect(
        Vector3.Distance(screen(fragment.position), checkpoint),
      ).toBeLessThan(12);
    }
    const paused = fragments[0]!.position.clone();
    view.update(near);
    expect(fragments[0]!.position.equals(paused)).toBe(true);
    view.update(pose);
    expect(fragments.some((mesh) => mesh.isEnabled())).toBe(false);
    expect(marble.isEnabled()).toBe(true);
  } finally {
    engine.dispose();
  }
});

it('rotates the fragments counterclockwise in the active camera and colors them by player', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const center = view.scene.getMeshByName('practice-player')!.position;
    const fragment = view.scene.getMeshByName('practice-player-fragment-0')!;
    for (const preset of ['arcade', 'follow', 'overhead'] as const) {
      view.camera.select(preset);
      view.update(pose);
      const checkpoint = center.clone();
      const rebuilding = { ...pose, marble: 'rebuilding' } as const;
      view.update({ ...rebuilding, respawnTicks: 16 });
      const camera = view.scene.activeCamera!;
      const viewProjection = camera
        .getViewMatrix()
        .multiply(camera.getProjectionMatrix());
      const viewport = camera.viewport.toGlobal(
        engine.getRenderWidth(),
        engine.getRenderHeight(),
      );
      const screen = (position: Vector3) =>
        Vector3.Project(
          position,
          Matrix.IdentityReadOnly,
          viewProjection,
          viewport,
        );
      const origin = screen(checkpoint);
      const before = screen(fragment.position).subtractInPlace(origin);
      view.update({ ...rebuilding, respawnTicks: 14 });
      const after = screen(fragment.position).subtractInPlace(origin);
      // Viewport Y grows downwards, so counterclockwise yields a negative cross product.
      expect(before.x * after.y - before.y * after.x).toBeLessThan(0);
    }
    for (let i = 0; i < 8; i++) {
      const blue = view.scene.getMeshByName(`practice-player-fragment-${i}`)!
        .material as StandardMaterial;
      const red = view.scene.getMeshByName(`practice-player-2-fragment-${i}`)!
        .material as StandardMaterial;
      expect(blue.emissiveColor.b).toBeGreaterThan(blue.emissiveColor.r);
      expect(red.emissiveColor.r).toBeGreaterThan(red.emissiveColor.b);
    }
  } finally {
    engine.dispose();
  }
});

it('follows the camera during a fall and restores the ball without rolling across the respawn gap', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const marble = view.scene.getMeshByName('practice-player')!;
    const camera = view.scene.activeCamera!;
    view.update(pose);
    view.update({ ...pose, x: 144 });
    const orientation = marble.rotationQuaternion!.asArray();
    const openingTop = camera.orthoTop!;

    expect(
      view.update({ ...pose, marble: 'hidden', z: 72, scroll: -16124 }),
    ).toBe(true);
    expect(camera.orthoTop).toBeLessThan(openingTop);
    expect(marble.isEnabled()).toBe(false);

    const checkpoint = { ...pose, x: 180, scroll: -16124 };
    expect(view.update({ ...checkpoint, marble: 'rebuilding' })).toBe(true);
    expect(marble.isEnabled()).toBe(false);
    expect(view.update(checkpoint)).toBe(true);
    expect(marble.isEnabled()).toBe(true);
    expect(marble.position.x).toBe(2.5);
    expect(marble.rotationQuaternion!.asArray()).toEqual(orientation);
  } finally {
    engine.dispose();
  }
});

it('renders the arrival using the complete survey and its different origin', () => {
  const engine = new NullEngine();
  try {
    const complete = {
      cells: Array.from({ length: 91 }, () =>
        Array<TerrainCell>(91).fill(flatCell),
      ),
      origin: practiceCompleteOrigin,
      lastScroll: practiceFinishScroll,
    };
    const view = createLivePracticeView(engine, complete);
    const arrival: PracticePose = {
      ...pose,
      x: 615,
      z: 528,
      height: 16339,
      scroll: -15784,
    };
    expect(view.update(arrival)).toBe(true);
    const ball = view.scene.getMeshByName('practice-player')!;
    expect(ball.position.x).toBeCloseTo(31.375);
    expect(ball.position.z).toBeCloseTo(20.5);
    expect(
      view.scene.getMeshByName('practice-finish')?.getTotalVertices(),
    ).toBe(128);
    const banner = view.scene.getMeshByName('practice-finish')!;
    expect(banner.material?.name).toBe('practice-goal-idle');
    expect(view.update({ ...arrival, atGoal: true })).toBe(true);
    expect(banner.material?.name).toBe('practice-goal-blue');
    const player2 = { ...arrival, x: 600, atGoal: true };
    expect(view.update({ ...arrival, player2, goalOwner: 2 })).toBe(true);
    expect(banner.material?.name).toBe('practice-goal-red');
    expect(
      view.update({
        ...arrival,
        player2: { ...player2, marble: 'hidden' },
        goalOwner: 2,
      }),
    ).toBe(true);
    expect(banner.material?.name).toBe('practice-goal-red');
    expect(
      view.update({ ...arrival, atGoal: true, player2, goalOwner: 2 }),
    ).toBe(true);
    expect(banner.material?.name).toBe('practice-goal-red');
    for (const index of [0, 1]) {
      expect(
        view.scene.getMeshByName(`practice-goal-flag-${index}`),
      ).not.toBeNull();
    }
    const numberSigns = [0, 1, 2].map(
      (index) =>
        view.scene.getMeshByName(`practice-number-sign-${index}`)!.material,
    );
    expect(numberSigns[0]?.name).toBe('practice-number-sign-left');
    expect(numberSigns[1]).toBe(numberSigns[2]);
    expect(numberSigns[1]).not.toBe(numberSigns[0]);
    expect(view.update({ ...arrival, scroll: -15770, x: 750 })).toBe(true);
    expect(ball.isEnabled()).toBe(true);
    expect(view.update({ ...arrival, x: 900 })).toBe(true);
    expect(ball.isEnabled()).toBe(false);
    expect(banner.material?.name).toBe('practice-goal-idle');
    expect(view.update(null)).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('renders Intermediate Race at native depths and scroll beyond the comparison captures', () => {
  const engine = new NullEngine();
  try {
    const study = {
      cells: Array.from({ length: 14 }, () =>
        Array<TerrainCell>(14).fill(flatCell),
      ),
      origin: { x: 98, z: 98 },
      lastScroll: -15846,
      level: 'intermediate' as const,
    };
    const view = createLivePracticeView(engine, study);
    const deepPose: PracticePose = {
      ...pose,
      level: 'intermediate',
      x: 810,
      z: 810,
      height: 16116,
      scroll: -15130,
    };
    expect(view.update(deepPose)).toBe(true);
    const ball = view.scene.getMeshByName('practice-player')!;
    expect(ball.isEnabled()).toBe(true);
    expect(ball.position.y).toBeLessThan(-26);
    expect(view.update(pose)).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('places the catch-up text above the returning marble and clears it on expiry', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const first = view.scene.getMeshByName('practice-player-catch-up')!;
    const label = view.scene.getMeshByName('practice-player-2-catch-up')!;
    const ball = view.scene.getMeshByName('practice-player-2')!;
    const player2 = { ...pose, z: 144, catchUpOffset: -10 };
    view.update({ ...pose, player2 });
    expect(first.isEnabled()).toBe(false);
    expect(label.isEnabled()).toBe(true);
    const camera = view.scene.activeCamera!;
    const up = camera.getDirection(Vector3.UpReadOnly);
    expect(
      Vector3.Dot(label.position.subtract(ball.position), up),
    ).toBeGreaterThan(1);
    const start = label.position.clone();
    view.update({ ...pose, player2 });
    expect(label.position.equals(start)).toBe(true);
    view.update({ ...pose, player2: { ...player2, catchUpOffset: -2 } });
    const right = camera.getDirection(Vector3.RightReadOnly);
    expect(Vector3.Dot(label.position.subtract(start), right)).toBeGreaterThan(
      0.5,
    );
    view.update({ ...pose, player2: { ...pose, z: 144 } });
    expect(label.isEnabled()).toBe(false);
    view.update({ ...pose, player2 });
    view.update(null);
    expect(label.isEnabled()).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('keeps the other marble and the course visible during a fall and respawn', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    const blue = view.scene.getMeshByName('practice-player')!;
    const red = view.scene.getMeshByName('practice-player-2')!;
    const dual: PracticePose = {
      ...pose,
      player2: { marble: 'visible', x: 132, z: 148, height: 0x4000 },
    };
    expect(view.update(dual)).toBe(true);
    expect(red.isEnabled()).toBe(true);
    const redPosition = red.position.clone();
    expect(view.update({ ...dual, marble: 'rebuilding' })).toBe(true);
    expect(blue.isEnabled()).toBe(false);
    expect(red.isEnabled()).toBe(true);
    expect(red.position.equals(redPosition)).toBe(true);
    expect(view.update(dual)).toBe(true);
    expect(blue.isEnabled()).toBe(true);
    expect(view.update(pose)).toBe(true);
    expect(red.isEnabled()).toBe(false);
  } finally {
    engine.dispose();
  }
});

it.each(['arcade', 'follow', 'overhead', 'chase'] as const)(
  'joins the sweep to %s without a projection or position cut',
  (preset) => {
    const engine = new NullEngine();
    try {
      const view = createLivePracticeView(engine, terrain);
      view.camera.select(preset);
      view.update({ ...pose, opening: 0.9999 });
      const beforeCamera = view.scene.activeCamera!;
      const before = beforeCamera
        .getViewMatrix(true)
        .multiply(beforeCamera.getProjectionMatrix(true));
      view.update({ ...pose, opening: 1 });
      const endCamera = view.scene.activeCamera!;
      const end = endCamera
        .getViewMatrix(true)
        .multiply(endCamera.getProjectionMatrix(true));
      const eye = endCamera.position.clone();
      expect(
        Math.max(
          ...before
            .asArray()
            .map((value, index) => Math.abs(value - end.asArray()[index]!)),
        ),
      ).toBeLessThan(0.01);
      view.update(pose);
      const gameplay = view.scene.activeCamera!;
      const after = gameplay
        .getViewMatrix(true)
        .multiply(gameplay.getProjectionMatrix(true));
      expect(gameplay.position.subtract(eye).length()).toBeLessThan(0.00001);
      for (let i = 0; i < 16; i++)
        expect(after.asArray()[i]).toBeCloseTo(end.asArray()[i]!, 3);
    } finally {
      engine.dispose();
    }
  },
);

it('sweeps a newly available level once, freezes with native time and can restart or skip', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, {
      ...terrain,
      level: 'intermediate',
    });
    const levelPose: PracticePose = {
      ...pose,
      level: 'intermediate',
      frame: 1000,
    };
    view.camera.restartOpening();
    view.update(levelPose);
    expect(view.camera.diagnostics.opening).toBe(0);
    view.update({ ...levelPose, frame: 1090 });
    expect(view.camera.diagnostics.opening).toBe(0.5);
    const eye = view.scene.activeCamera!.position.clone();
    view.update({ ...levelPose, frame: 1090 });
    expect(view.scene.activeCamera!.position.equals(eye)).toBe(true);
    view.update({ ...levelPose, frame: 1180 });
    expect(view.camera.diagnostics.active).toBe('arcade');
    view.update({ ...levelPose, frame: 1200 });
    expect(view.camera.diagnostics.opening).toBeNull();
    view.camera.restartOpening();
    view.update({ ...levelPose, frame: 1300 });
    expect(view.camera.diagnostics.opening).toBe(0);
    view.camera.select('chase');
    view.update({ ...levelPose, frame: 1310 });
    expect(view.camera.diagnostics.active).toBe('chase');
  } finally {
    engine.dispose();
  }
});

it('colors the Intermediate GOAL for the native first finisher and resets on a new start', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, (_, z) =>
      Array.from({ length: 130 }, (_, x): TerrainCell =>
        x >= 110 && x < 114 && z >= 109 && z < 119 ? [0, 0, 0, 0] : null,
      ),
    );
    const view = createLivePracticeView(engine, {
      cells,
      origin: practiceCompleteOrigin,
      lastScroll: -15846,
      level: 'intermediate',
    });
    const arrival: PracticePose = {
      ...pose,
      level: 'intermediate',
      x: 884,
      z: 876,
      scroll: -15700,
      atGoal: true,
      goalOwner: 2,
    };
    expect(view.update(arrival)).toBe(true);
    const banner = view.scene.getMeshByName('intermediate-finish')!;
    expect(banner.material?.name).toBe('practice-goal-red');
    view.update({
      ...arrival,
      atGoal: false,
      player2: { ...pose, atGoal: true },
    });
    expect(banner.material?.name).toBe('practice-goal-red');
    view.update({ ...pose, level: 'intermediate' });
    expect(banner.material?.name).toBe('practice-goal-intermediate');
    view.update({ ...arrival, goalOwner: 1 });
    expect(banner.material?.name).toBe('practice-goal-blue');
  } finally {
    engine.dispose();
  }
});

it('disallows chase camera in two-player mode and sweeps linearly from finish toward start', () => {
  const engine = new NullEngine();
  try {
    const view = createLivePracticeView(engine, terrain);
    view.camera.select('chase');
    view.update(pose);
    expect(view.camera.diagnostics.active).toBe('chase');
    view.update({
      ...pose,
      player2: { marble: 'visible', x: 132, z: 148, height: 0x4000 },
    });
    expect(view.camera.diagnostics.active).toBe('arcade');
    // Finish-to-start sweep moves monotonically from finish (+X,+Z) toward start (-X,-Z).
    view.camera.select('follow');
    view.update({ ...pose, opening: 0 });
    const startPos = view.scene.activeCamera!.position.clone();
    view.update({ ...pose, opening: 0.5 });
    const midPos = view.scene.activeCamera!.position.clone();
    view.update({ ...pose, opening: 1 });
    const endPos = view.scene.activeCamera!.position.clone();
    expect(midPos.x).toBeCloseTo((startPos.x + endPos.x) / 2, 3);
    expect(midPos.z).toBeCloseTo((startPos.z + endPos.z) / 2, 3);
    expect(startPos.x + startPos.z).toBeGreaterThan(endPos.x + endPos.z);

    // Regression: after an arcade opening blend freezes the perspective camera
    // with an orthographic projection matrix, switching to overhead/chase must
    // force-recompute a real perspective matrix (m[15] === 0, not 1).
    view.camera.select('arcade');
    view.update({ ...pose, opening: 0.9 });
    view.update({ ...pose, opening: 1 });
    expect(view.scene.activeCamera!.getProjectionMatrix().m[15]).toBeCloseTo(
      1,
      2,
    );
    view.camera.select('overhead');
    view.update(pose);
    expect(view.scene.activeCamera!.getProjectionMatrix().m[15]).toBeCloseTo(
      0,
      4,
    );
  } finally {
    engine.dispose();
  }
});

it('replaces an aspirated marble with fragments directed toward its vacuum and clears them for respawn', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[37]![39] = flatCell;
    const view = createLivePracticeView(engine, {
      cells,
      origin: practiceCompleteOrigin,
      lastScroll: -15368,
      level: 'level4',
    });
    const start = {
      ...pose,
      level: 'level4',
      x: 297,
      z: 302,
      vacuumExtensions: [1],
      vacuumMouthFrames: [1],
    } as const;
    const marble = view.scene.getMeshByName('practice-player')!;
    const fragment = view.scene.getMeshByName('suction-1-0')!;
    view.update(start);
    expect(marble.isEnabled()).toBe(true);
    expect(fragment.isEnabled()).toBe(false);
    view.update({ ...start, suction: { progress: 0, vacuumIndex: 0 } });
    expect(marble.isEnabled()).toBe(false);
    expect(fragment.isEnabled()).toBe(true);
    expect(
      view.scene.getTransformNodeByName('level4-vacuum-0-head')!.rotation.z,
    ).toBeGreaterThan(0);
    const nozzle = view.scene.getMeshByName('level4-vacuum-0-mouth')!;
    const target = nozzle.computeWorldMatrix(true).getTranslation();
    const startDistance = Vector3.Distance(fragment.position, target);
    view.update({ ...start, suction: { progress: 0.6, vacuumIndex: 0 } });
    expect(Vector3.Distance(fragment.position, target)).toBeLessThan(
      startDistance,
    );
    view.update({ ...start, marble: 'rebuilding' });
    expect(fragment.isEnabled()).toBe(false);
    view.update(start);
    expect(marble.isEnabled()).toBe(true);
  } finally {
    engine.dispose();
  }
});

it('shows Level 4 pistons only for the native slots in motion', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 130 }, () =>
      Array<TerrainCell>(130).fill(null),
    );
    cells[55]![69] = flatCell;
    cells[77]![78] = flatCell;
    const view = createLivePracticeView(engine, {
      cells,
      origin: practiceCompleteOrigin,
      lastScroll: -15368,
      level: 'level4',
    });
    const start = { ...pose, level: 'level4' } as const;
    const cap = view.scene.getMeshByName('level4-piston-cap-0')!;
    expect(cap.isEnabled()).toBe(true);
    expect(cap.material?.name).toBe('level4-piston-cap-metal');
    const first = view.scene.getMeshByName('level4-piston-0')!;
    const last = view.scene.getMeshByName('level4-piston-35')!;
    view.update(start);
    expect(first.isEnabled()).toBe(false);
    const rod = { slot: 0, x: 69, z: 55, height: 16300, step: 1 };
    view.update({
      ...start,
      pistons: [rod, { slot: 35, x: 78, z: 77, height: 16280, step: 4 }],
    });
    expect(first.isEnabled()).toBe(true);
    expect(last.isEnabled()).toBe(true);
    expect(first.position.x).toBe(4.5);
    expect(first.position.z).toBe(-9.5);
    const lowY = first.position.y;
    view.update({ ...start, pistons: [{ ...rod, step: 4 }] });
    expect(first.position.y).toBeGreaterThan(lowY);
    expect(last.isEnabled()).toBe(false);
    view.update(null);
    expect(first.isEnabled()).toBe(false);
  } finally {
    engine.dispose();
  }
});

it('keeps the Level 5 opening flyover clear above the uphill 3D terrain and blends smoothly into start', () => {
  const engine = new NullEngine();
  try {
    const size = 120;
    const cells = Array.from({ length: size }, (_, z) =>
      Array.from({ length: size }, (_, x): TerrainCell => {
        if (Math.abs(x - z) > 12 || x < 20 || x > 100 || z < 20 || z > 100)
          return null;
        // Uphill Level 5 terrain: high near GOAL (x=25,z=25), tall mid-cliffs, start at (95,95).
        const h = x < 45 ? 10 : x < 75 ? 16 : 2;
        return [h, h, h, h];
      }),
    );
    const view = createLivePracticeView(engine, {
      cells,
      origin: practiceCompleteOrigin,
      lastScroll: -15368,
      level: 'level5',
    });
    const level5Pose: PracticePose = {
      ...pose,
      level: 'level5',
      x: 95 * 8,
      z: 95 * 8,
      scroll: -15368,
      frame: 100,
    };
    view.camera.restartOpening();
    for (const step of [0, 0.25, 0.5, 0.75, 0.95]) {
      view.update({ ...level5Pose, frame: 100 + Math.round(step * 180) });
      const eye = view.scene.activeCamera!.position;
      const cx = Math.floor(eye.x + size / 2);
      const cz = Math.floor(eye.z + size / 2);
      const under = cells[cz]?.[cx]?.[0];
      if (under !== null && under !== undefined)
        expect(eye.y).toBeGreaterThan(under + 5);
    }
    // Near the start platform (bottom-right), the flyover eye stays well in front of start (+X, +Z).
    view.update({ ...level5Pose, frame: 279 });
    const endEye = view.scene.activeCamera!.position;
    expect(endEye.x).toBeGreaterThan(35);
    expect(endEye.z).toBeGreaterThan(35);
  } finally {
    engine.dispose();
  }
});
