import { CABINET } from './venueLayout';
export interface BarPose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}
export const BAR_EYE_HEIGHT = 1.65;
export const WALK_SPEED = 2.4;
export const initialBarPose = (): BarPose => ({
  x: 0,
  z: -3,
  yaw: 0,
  pitch: -0.03,
});
const obstacles = [
  [2.1, 7.4, 1.25, 3.2],
  [2.1, 7.4, 4.0, 4.9], // Counter.
  [-5.6, -3.6, 0.05, 2], // Table.
  [2.6, 3.6, 0.15, 1.15],
  [4.2, 5.2, 0.15, 1.15],
  [5.8, 6.8, 0.15, 1.15],
  [-6.1, -5.3, -0.2, 0.6],
  [-3.9, -3.1, -0.2, 0.6],
] as const;
function finite(...values: number[]) {
  if (!values.every(Number.isFinite))
    throw new RangeError('Invalid navigation value');
}
function blocked(x: number, z: number) {
  const radius = 0.2;
  const edge = CABINET.width / 2 + radius;
  if (
    x > -edge &&
    x < edge &&
    z > CABINET.frontZ - radius &&
    z < CABINET.backZ + radius
  )
    return true;
  for (const [left, right, near, far] of obstacles)
    if (
      x > left - radius &&
      x < right + radius &&
      z > near - radius &&
      z < far + radius
    )
      return true;
  return false;
}
export function lookInBar(pose: BarPose, dx: number, dy: number): BarPose {
  finite(dx, dy, pose.x, pose.z, pose.yaw, pose.pitch);
  const yaw = pose.yaw + dx * 0.002;
  return {
    ...pose,
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch: Math.max(-1.15, Math.min(1.15, pose.pitch + dy * 0.002)),
  };
}
export function walkInBar(
  pose: BarPose,
  forward: number,
  right: number,
  seconds: number,
): BarPose {
  finite(pose.x, pose.z, pose.yaw, pose.pitch, forward, right, seconds);
  if (seconds < 0) throw new RangeError('Invalid navigation step');
  const length = Math.max(1, Math.hypot(forward, right));
  const distance = (WALK_SPEED * Math.min(seconds, 0.05)) / length;
  const dx =
    (Math.sin(pose.yaw) * forward + Math.cos(pose.yaw) * right) * distance;
  const dz =
    (Math.cos(pose.yaw) * forward - Math.sin(pose.yaw) * right) * distance;
  const x = Math.max(-7.9, Math.min(7.9, pose.x + dx));
  const acceptedX = blocked(x, pose.z) ? pose.x : x;
  const z = Math.max(-6.8, Math.min(4.5, pose.z + dz));
  return {
    ...pose,
    x: acceptedX,
    z: blocked(acceptedX, z) ? pose.z : z,
  };
}
export function canEnterCabinet(pose: BarPose): boolean {
  return pose.z < -0.65 && Math.hypot(pose.x, pose.z) < 3.25;
}
