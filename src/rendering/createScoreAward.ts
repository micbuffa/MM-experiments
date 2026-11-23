import type { Scene } from '@babylonjs/core/scene';
import type { PracticeMarblePose } from '../emulation/practicePose';
import { createPracticeCatchUpLabel } from './createPracticeCatchUpLabel';

/** Cache the few native score notices; their lifetime comes from native flags. */
export function createScoreAward(scene: Scene, name: string, red: boolean) {
  const labels = new Map<
    number,
    ReturnType<typeof createPracticeCatchUpLabel>
  >();
  let current: number | undefined;
  return (
    pose: PracticeMarblePose | undefined,
    point: { x: number; y: number; z: number } | null,
  ) => {
    const award = pose?.scoreAward;
    if (current !== award?.points && current !== undefined)
      labels.get(current)?.(null);
    current = award?.points;
    if (!award || !point) {
      if (current !== undefined) labels.get(current)?.(null);
      return;
    }
    let label = labels.get(award.points);
    if (!label) {
      label = createPracticeCatchUpLabel(
        scene,
        name + '-' + award.points,
        red,
        award.points,
      );
      labels.set(award.points, label);
    }
    label(point, award.offset);
  };
}
