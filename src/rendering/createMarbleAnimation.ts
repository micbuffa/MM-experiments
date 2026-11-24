import type { Scene } from '@babylonjs/core/scene';
import type { PracticeMarblePose } from '../emulation/practicePose';
import type { RollingActors } from '../emulation/rollingActors';
import { createRollingActor } from './createRollingActor';
import { createDizzyStars } from './createDizzyStars';
import { createAcidDissolve } from './createAcidDissolve';

export function createMarbleAnimation(
  scene: Scene,
  name: string,
  library: RollingActors,
  red: boolean,
) {
  const model = createRollingActor(scene, name, library, red);
  let animation: number | undefined;
  let previousTick: number | undefined;
  let elapsed = 0;
  let stars: ReturnType<typeof createDizzyStars> | undefined;
  let acidDissolve: ReturnType<typeof createAcidDissolve> | undefined;
  return (
    pose: PracticeMarblePose | undefined,
    position: { x: number; y: number; z: number } | null,
  ) => {
    const next = pose?.animation;
    if (!position || next === undefined || pose?.animationTick === undefined) {
      model.hide();
      stars?.(null);
      acidDissolve?.(null);
      animation = previousTick = undefined;
      return false;
    }
    // Native state 7 consumes the marble. The remake melt mesh produced a
    // large blue puddle which does not exist in the original worm sequence.
    if (next === 7 || next === 11) {
      model.hide();
      stars?.(null);
      acidDissolve?.(null);
      animation = previousTick = undefined;
      return true;
    }
    if (next !== animation) elapsed = 0;
    else if (previousTick !== undefined)
      elapsed += (pose.animationTick - previousTick + 65536) % 65536;
    animation = next;
    previousTick = pose.animationTick;
    if (next === 9) {
      model.hide();
      stars?.(null);
      acidDissolve ??= createAcidDissolve(scene, name, red);
      const progress =
        pose.melt !== undefined
          ? Math.max(pose.melt, Math.min(1, elapsed / 48))
          : Math.min(1, elapsed / 48);
      acidDissolve(position, progress);
      return true;
    }
    acidDissolve?.(null);
    const key = next === 2 ? 'player_broken' : 'player_dizzy';
    if (key === 'player_dizzy') {
      stars ??= createDizzyStars(scene, name);
      stars(position, elapsed);
    } else stars?.(null);
    const source = library.models[key];
    if (!source) return false;
    if (next === 2 && pose.broken) {
      const last = Math.max(0, source.poses.length - 1);
      const marbleFrame = (pose.broken.primaryFrame / 31) * last;
      const broomStart = Math.min(5, last);
      const broomEnd = Math.max(broomStart, Math.min(15, last));
      const broomFrame =
        pose.broken.broomFrame !== undefined
          ? broomStart + (pose.broken.broomFrame / 43) * (broomEnd - broomStart)
          : null;
      return model.update(key, marbleFrame, position, 0, 0.675, {
        'player.png': marbleFrame,
        'broom.jpg': broomFrame,
      });
    }
    const progress =
      (elapsed / Math.max(1, source.seconds * 60)) * source.poses.length;
    const frame =
      next === 2
        ? Math.min(source.poses.length - 1, progress)
        : progress % source.poses.length;
    return model.update(key, frame, position);
  };
}
