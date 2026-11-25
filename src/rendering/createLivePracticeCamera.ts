import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticePose } from '../emulation/practicePose';
import {
  clampPracticeFov,
  practiceArcadeZoomScale,
  practiceLens,
  practiceOpeningBlend,
  resolvePracticeCamera,
} from '../game/modern/practiceCameraSettings';
import type { PracticeCameraPreset } from '../game/modern/practiceCameraSettings';
import {
  arcadeGroundHeight,
  practiceFrustum,
  practiceWorldPoint,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';

export function createLivePracticeCamera(
  scene: Scene,
  terrain: PracticeTerrain,
) {
  const direction = terrain.level === 'level5' ? -1 : 1;
  const columns = terrain.cells[0]!.length;
  const rows = terrain.cells.length;
  const arcade = scene.getCameraByName('practice-reference-camera')!;
  const perspective = new FreeCamera(
    'practice-perspective-camera',
    Vector3.Zero(),
    scene,
  );
  perspective.viewport = arcade.viewport;
  perspective.minZ = 0.5;
  perspective.maxZ = 350;
  scene.activeCamera = arcade;

  const start = practiceWorldPoint(
    140,
    140,
    arcadeGroundHeight,
    columns,
    rows,
    terrain.origin,
  );
  const followed = new Vector3(
    start?.x ?? 0,
    (start?.y ?? 0) + 0.5,
    start?.z ?? 0,
  );
  const target = Vector3.Zero();
  const followLead = new Vector3(3.5 * direction, 0, 3.5 * direction);
  const { finishAim, startAim } = (() => {
    let bestAlong = -Infinity;
    let leastAlong = Infinity;
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < columns; x++) {
        const cell = terrain.cells[z]![x];
        if (!cell) continue;
        const solid = cell.filter((h): h is number => h !== null);
        if (solid.length < 3) continue;
        const along = (x + z) * direction;
        if (along > bestAlong) bestAlong = along;
        if (along < leastAlong) leastAlong = along;
      }
    }
    let fX = 0,
      fY = 0,
      fZ = 0,
      fCount = 0;
    let sX = 0,
      sY = 0,
      sZ = 0,
      sCount = 0;
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < columns; x++) {
        const cell = terrain.cells[z]![x];
        if (!cell) continue;
        const solid = cell.filter((h): h is number => h !== null);
        if (solid.length < 3) continue;
        const along = (x + z) * direction;
        const wx = x + 0.5 - columns / 2;
        const wy = solid.reduce((a, b) => a + b, 0) / solid.length;
        const wz = z + 0.5 - rows / 2;
        if (along >= bestAlong - 6) {
          fX += wx;
          fY += wy;
          fZ += wz;
          fCount++;
        }
        if (along <= leastAlong + 6) {
          sX += wx;
          sY += wy;
          sZ += wz;
          sCount++;
        }
      }
    }
    return {
      finishAim:
        fCount > 0
          ? new Vector3(fX / fCount, fY / fCount, fZ / fCount)
          : new Vector3(columns * 0.25, -2, rows * 0.25),
      startAim:
        sCount > 0
          ? new Vector3(sX / sCount, sY / sCount, sZ / sCount)
          : Vector3.Zero(),
    };
  })();
  const arcadeDir = new Vector3(Math.sqrt(3 / 8), 0.5, Math.sqrt(3 / 8));
  const startDepth = Vector3.Dot(startAim, arcadeDir);
  const finishEye = finishAim.add(
    arcadeDir.scale(terrain.level === 'level5' ? 34 : 26),
  );
  const flyoverArc = terrain.level === 'level5' ? 18 : 0;

  function keepClearOfTerrain(eye: Vector3, weight: number) {
    if (weight <= 0) return;
    const cx = Math.floor(eye.x + columns / 2);
    const cz = Math.floor(eye.z + rows / 2);
    let ceiling = -Infinity;
    for (let dz = -3; dz <= 3; dz++) {
      const row = terrain.cells[cz + dz];
      if (!row) continue;
      for (let dx = -3; dx <= 3; dx++) {
        const cell = row[cx + dx];
        if (!cell) continue;
        for (let k = 0; k < 4; k++) {
          const h = cell[k];
          if (h !== null && h !== undefined && h > ceiling) ceiling = h;
        }
      }
    }
    const minY = ceiling + 7;
    if (ceiling !== -Infinity && eye.y < minY) {
      const push = ((minY - eye.y) / arcadeDir.y) * weight;
      eye.addInPlaceFromFloats(
        arcadeDir.x * push,
        arcadeDir.y * push,
        arcadeDir.z * push,
      );
    }
  }
  const followOffset = new Vector3(12, 15, 12);
  const overheadOffset = new Vector3(2, 44, 2);
  const chaseOffset = Vector3.Zero();
  const downhill = Math.SQRT1_2 * direction;
  const gamePosition = Vector3.Zero();
  const gameTarget = Vector3.Zero();
  const startCenter = Vector3.Zero();
  const startEye = Vector3.Zero();
  const arcadeRight = Vector3.Zero();
  const arcadeUp = Vector3.Zero();
  const gameProjection = Matrix.Identity();
  const gameViewProjection = Matrix.Identity();
  const sweepView = Matrix.Identity();
  const sweepViewInverse = Matrix.Identity();
  const sweepViewProjection = Matrix.Identity();
  const blendedViewProjection = Matrix.Identity();
  const blendedProjection = Matrix.Identity();
  let pendingOpening = false;
  let openingFrame: number | undefined;
  let nativeOpening = false;
  let projectionFrozen = false;

  function unfreezePerspective() {
    if (!projectionFrozen) return;
    projectionFrozen = false;
    perspective.unfreezeProjectionMatrix();
    // Force recomputation: BabylonJS unfreezeProjectionMatrix() clears the flag
    // without invalidating _cache, so getProjectionMatrix(false) would otherwise
    // keep returning the frozen orthographic blend matrix forever.
    perspective.getProjectionMatrix(true);
  }

  function blendOpening(progress: number) {
    const game = scene.activeCamera!;
    const t = Math.max(0, Math.min(1, progress));
    const gameView = game.getViewMatrix(true);
    gamePosition.copyFrom(game.position);
    gameTarget.copyFrom((game as FreeCamera).getTarget());
    gameProjection.copyFrom(game.getProjectionMatrix(true));
    if (t >= 1) {
      perspective.position.copyFrom(gamePosition);
      perspective.fov = (fov * Math.PI) / 180;
      perspective.setTarget(gameTarget);
      perspective.freezeProjectionMatrix(gameProjection);
      projectionFrozen = true;
      scene.activeCamera = perspective;
      active = 'opening';
      return;
    }
    if (game === arcade) {
      // Sweep linearly from the finish up to the exact screen center of the arcade
      // starting frame, then morph VP directly into the orthographic camera without reversing.
      const centerX = ((arcade.orthoLeft ?? 0) + (arcade.orthoRight ?? 0)) / 2;
      const centerY = ((arcade.orthoTop ?? 0) + (arcade.orthoBottom ?? 0)) / 2;
      arcadeRight.set(gameView.m[0]!, gameView.m[4]!, gameView.m[8]!);
      arcadeUp.set(gameView.m[1]!, gameView.m[5]!, gameView.m[9]!);
      startCenter
        .copyFrom(arcadeRight)
        .scaleInPlace(centerX)
        .addInPlace(arcadeUp.scale(centerY))
        .addInPlaceFromFloats(
          arcadeDir.x * startDepth,
          arcadeDir.y * startDepth,
          arcadeDir.z * startDepth,
        );
      const halfHeight = Math.abs(
        ((arcade.orthoTop ?? 10) - (arcade.orthoBottom ?? -10)) / 2,
      );
      const startDistance =
        halfHeight / Math.max(0.1, Math.tan((fov * Math.PI) / 360));
      startEye
        .copyFrom(arcadeDir)
        .scaleInPlace(startDistance)
        .addInPlace(startCenter);
      const handoff = practiceOpeningBlend(Math.max(0, (t - 0.65) / 0.35));
      const arcLift = Math.sin(t * Math.PI) * flyoverArc;
      Vector3.LerpToRef(finishAim, startCenter, t, target);
      Vector3.LerpToRef(finishEye, startEye, t, perspective.position);
      if (arcLift > 0)
        perspective.position.addInPlaceFromFloats(
          arcadeDir.x * arcLift,
          arcadeDir.y * arcLift,
          arcadeDir.z * arcLift,
        );
      keepClearOfTerrain(perspective.position, 1 - handoff);
      perspective.fov = (fov * Math.PI) / 180;
      perspective.setTarget(target);
      unfreezePerspective();
      sweepView.copyFrom(perspective.getViewMatrix(true));
      sweepView.multiplyToRef(
        perspective.getProjectionMatrix(true),
        sweepViewProjection,
      );
      gameView.multiplyToRef(gameProjection, gameViewProjection);
      if (handoff > 0) {
        const scale =
          1 / Math.max(1, Vector3.Distance(perspective.position, target));
        sweepViewProjection.scaleToRef(scale, sweepViewProjection);
        Matrix.LerpToRef(
          sweepViewProjection,
          gameViewProjection,
          handoff,
          blendedViewProjection,
        );
        sweepView.invertToRef(sweepViewInverse);
        sweepViewInverse.multiplyToRef(
          blendedViewProjection,
          blendedProjection,
        );
        perspective.freezeProjectionMatrix(blendedProjection);
        projectionFrozen = true;
      }
      scene.activeCamera = perspective;
      active = 'opening';
      return;
    }
    // Perspective gameplay cameras: sweep from finish over the terrain to start pose.
    const arcLift = Math.sin(t * Math.PI) * flyoverArc;
    Vector3.LerpToRef(finishAim, gameTarget, t, target);
    Vector3.LerpToRef(finishEye, gamePosition, t, perspective.position);
    if (arcLift > 0)
      perspective.position.addInPlaceFromFloats(
        arcadeDir.x * arcLift,
        arcadeDir.y * arcLift,
        arcadeDir.z * arcLift,
      );
    keepClearOfTerrain(perspective.position, 1 - t);
    perspective.fov = (fov * Math.PI) / 180;
    perspective.setTarget(target);
    unfreezePerspective();
    scene.activeCamera = perspective;
    active = 'opening';
  }
  let preset: PracticeCameraPreset = 'arcade';
  let fov = practiceLens.initial;
  let active: PracticeCameraPreset | 'opening' = 'arcade';
  let opening: number | undefined;
  let skipOpening = false;
  let lastScroll: number | undefined;
  let lastArcadeFov: number | undefined;

  function positionPerspective(aim: Vector3, offset: Vector3) {
    aim.addToRef(offset, perspective.position);
    perspective.fov = (fov * Math.PI) / 180;
    perspective.setTarget(aim);
    scene.activeCamera = perspective;
  }

  return {
    restartOpening() {
      pendingOpening = true;
      openingFrame = undefined;
      nativeOpening = false;
      skipOpening = false;
    },
    select(value: PracticeCameraPreset) {
      preset = value;
      if (opening !== undefined) skipOpening = true;
    },
    setFov(degrees: number) {
      fov = clampPracticeFov(degrees);
    },
    update(
      pose: PracticePose,
      position: { x: number; y: number; z: number } | null,
    ) {
      if (pendingOpening && pose.frame !== undefined) {
        openingFrame = pose.frame;
        pendingOpening = false;
      }
      if (pose.opening !== undefined) nativeOpening = true;
      if (nativeOpening && pose.opening === undefined) openingFrame = undefined;
      const timedOpening =
        openingFrame === undefined || pose.frame === undefined
          ? undefined
          : Math.max(0, (pose.frame - openingFrame) / 180);
      const nextOpening =
        pose.opening ??
        (timedOpening !== undefined && timedOpening < 1
          ? timedOpening
          : undefined);
      if (
        nextOpening !== undefined &&
        opening !== undefined &&
        nextOpening < opening
      )
        skipOpening = false;
      opening = nextOpening;
      if (position) followed.set(position.x, position.y + 0.5, position.z);
      unfreezePerspective();
      updateGameplay(pose);
      if (opening !== undefined && !skipOpening) blendOpening(opening);
    },
    get diagnostics() {
      return { preset, fov, active, opening: opening ?? null };
    },
  };

  function updateGameplay(pose: PracticePose) {
    const effective = resolvePracticeCamera(preset, pose.player2 !== undefined);
    active = effective;
    if (effective === 'chase' || effective === 'chaseHigh') {
      const high = effective === 'chaseHigh';
      target.set(
        followed.x + downhill * 1.7,
        followed.y - 0.1,
        followed.z + downhill * 1.7,
      );
      const back = high ? 8.4 : 7.2;
      const lift = high ? 4.2 : 2.6;
      const clearance = high ? 1.8 : 1.2;
      chaseOffset.set(-downhill * back, lift, -downhill * back);
      const column = Math.floor(target.x + chaseOffset.x + columns / 2);
      const row = Math.floor(target.z + chaseOffset.z + rows / 2);
      let maxGround = -Infinity;
      for (let dr = -1; dr <= 1; dr++) {
        const groundRow = terrain.cells[row + dr];
        if (!groundRow) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const ground = groundRow[column + dc];
          if (!ground) continue;
          for (let k = 0; k < 4; k++) {
            const h = ground[k];
            if (h !== null && h !== undefined && h > maxGround) maxGround = h;
          }
        }
      }
      if (maxGround !== -Infinity) {
        chaseOffset.y = Math.max(
          chaseOffset.y,
          maxGround - target.y + clearance,
        );
      }
      positionPerspective(target, chaseOffset);
      return;
    }
    if (effective !== 'arcade') {
      if (effective === 'follow') followed.addToRef(followLead, target);
      else target.copyFrom(followed);
      positionPerspective(
        target,
        effective === 'follow' ? followOffset : overheadOffset,
      );
      return;
    }
    if (pose.scroll !== lastScroll || fov !== lastArcadeFov) {
      const { left, right, top, bottom } = practiceFrustum(
        columns,
        rows,
        pose.scroll,
        terrain.origin,
      );
      const scale = practiceArcadeZoomScale(fov);
      const horizontal = ((right - left) / 2) * (scale - 1);
      const vertical = ((top - bottom) / 2) * (scale - 1);
      arcade.orthoLeft = left - horizontal;
      arcade.orthoRight = right + horizontal;
      arcade.orthoTop = top + vertical;
      arcade.orthoBottom = bottom - vertical;
      lastScroll = pose.scroll;
      lastArcadeFov = fov;
    }
    scene.activeCamera = arcade;
  }
}
