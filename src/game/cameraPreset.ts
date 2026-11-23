const cameraCycle = [
  'front',
  'monitor',
  'controls',
  'perspective',
  'bar',
] as const;
export type CameraPreset = (typeof cameraCycle)[number];

export function nextCameraPreset(current: CameraPreset): CameraPreset {
  return cameraCycle[(cameraCycle.indexOf(current) + 1) % cameraCycle.length]!;
}
