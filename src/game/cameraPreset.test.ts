import { expect, it } from 'vitest';
import { nextCameraPreset } from './cameraPreset';

it('cycles from play to the controls, the cabinet, the bar and back to play', () => {
  const monitor = nextCameraPreset('front');
  const controls = nextCameraPreset(monitor);
  const cabinet = nextCameraPreset(controls);
  const bar = nextCameraPreset(cabinet);
  expect([monitor, controls, cabinet, bar, nextCameraPreset(bar)]).toEqual([
    'monitor',
    'controls',
    'perspective',
    'bar',
    'front',
  ]);
});
