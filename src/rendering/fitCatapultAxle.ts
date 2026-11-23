import type { RollingModel } from '../emulation/rollingActors';

/** Shorten only the transverse pivot ends, keeping the bowl and arm intact. */
export function fitCatapultAxle(model: RollingModel): RollingModel {
  const rest = model.poses[0]!.positions;
  const ends = new Set<number>();
  for (let i = 0; i < rest.length; i += 3)
    if (rest[i + 2]! < -13 && Math.abs(rest[i]!) > 7) ends.add(i);
  return {
    ...model,
    poses: model.poses.map((pose) => ({
      ...pose,
      positions: pose.positions.map((value, i) =>
        ends.has(i) ? value * 0.86 : value,
      ),
    })),
  };
}
