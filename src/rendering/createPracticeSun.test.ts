import { expect, it } from 'vitest';
import {
  arcadeHeightScale,
  projectPracticePoint,
} from '../game/modern/practiceProjection';
import {
  intermediateSunDirection,
  practiceSunDirection,
} from './createPracticeSun';

it('keeps the rightward azimuth and shortens the six-pixel rail shadow', () => {
  const ray = practiceSunDirection();
  const distance = (6 * arcadeHeightScale) / -ray.y;
  const railTop = projectPracticePoint(0, 0, 0x4006);
  const shadowTip = projectPracticePoint(
    ray.x * distance,
    ray.z * distance,
    0x4000,
  );
  expect(shadowTip.x - railTop.x).toBeCloseTo(15, 0);
  expect(shadowTip.y - railTop.y).toBeCloseTo(4, 0);
  expect(ray.length()).toBeCloseTo(1);
});

it('projects the Intermediate Race apex onto the measured shadow tip', () => {
  const ray = intermediateSunDirection();
  const floor = 16264;
  const apex = projectPracticePoint(360, 360, floor + 34);
  const distance = (34 * arcadeHeightScale) / -ray.y;
  const projected = projectPracticePoint(
    360 + ray.x * distance,
    360 + ray.z * distance,
    floor,
  );
  expect(projected.x).toBeCloseTo(apex.x + 79);
  expect(projected.y).toBeCloseTo(apex.y + 19);
  expect(ray.length()).toBeCloseTo(1);
});
