export type RenderQuality = 'eco' | 'balanced' | 'retina';
export function renderResolution(quality: RenderQuality, deviceRatio: number) {
  if (!Number.isFinite(deviceRatio) || deviceRatio <= 0)
    throw new RangeError('Invalid pixel ratio');
  return Math.min(
    deviceRatio,
    quality === 'retina' ? 2 : quality === 'balanced' ? 1.5 : 1,
  );
}
