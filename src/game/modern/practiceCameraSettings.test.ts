import { expect, it } from 'vitest';
import {
  clampPracticeFov,
  nextPracticeCamera,
  practiceArcadeZoomScale,
  practiceOpeningBlend,
  resolvePracticeCamera,
} from './practiceCameraSettings';

it('cycles between arcade, follow, overhead and chase, skipping chase in two-player mode', () => {
  expect(nextPracticeCamera('arcade')).toBe('follow');
  expect(nextPracticeCamera('follow')).toBe('overhead');
  expect(nextPracticeCamera('overhead')).toBe('chase');
  expect(nextPracticeCamera('chase')).toBe('arcade');
  expect(nextPracticeCamera('overhead', true)).toBe('arcade');
  expect(nextPracticeCamera('chase', true)).toBe('follow');
  expect(resolvePracticeCamera('chase', false)).toBe('chase');
  expect(resolvePracticeCamera('chase', true)).toBe('arcade');
});

it('bounds the perspective field of view and scales the arcade frame about its center', () => {
  expect(clampPracticeFov(0)).toBe(35);
  expect(clampPracticeFov(120)).toBe(85);
  expect(clampPracticeFov(Number.NaN)).toBe(55);
  expect(clampPracticeFov(60)).toBe(60);
  expect(practiceArcadeZoomScale(55)).toBe(1);
  expect(practiceArcadeZoomScale(35)).toBeLessThan(1);
  expect(practiceArcadeZoomScale(85)).toBeGreaterThan(1);
});

it('eases into the opening shot and settles before the start', () => {
  expect(practiceOpeningBlend(0)).toBe(0);
  expect(practiceOpeningBlend(0.25)).toBeLessThan(0.25);
  expect(practiceOpeningBlend(0.5)).toBe(0.5);
  expect(practiceOpeningBlend(0.75)).toBeGreaterThan(0.75);
  expect(practiceOpeningBlend(1)).toBe(1);
});
