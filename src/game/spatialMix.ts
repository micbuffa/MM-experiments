export interface SpatialPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
export function spatialMix(listener: SpatialPose) {
  if (
    ![listener.x, listener.y, listener.z, listener.yaw].every(Number.isFinite)
  )
    throw new RangeError('Invalid audio listener');
  const dx = -listener.x,
    dy = 1.3 - listener.y,
    dz = -0.2 - listener.z;
  const distance = Math.hypot(dx, dy, dz);
  const right = dx * Math.cos(listener.yaw) - dz * Math.sin(listener.yaw);
  const gain = 1 / (1 + Math.max(0, distance - 1.5) * 0.4);
  return {
    distance,
    gain,
    pan: distance > 0 ? Math.max(-1, Math.min(1, right / distance)) || 0 : 0,
  };
}
