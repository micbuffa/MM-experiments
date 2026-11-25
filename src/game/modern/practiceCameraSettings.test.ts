import { expect, it } from 'vitest';
import {
  clampPracticeFov,
  nextPracticeCamera,
  practiceArcadeZoomScale,
  practiceOpeningBlend,
  resolvePracticeCamera,
  stepOpeningCurtain,
} from './practiceCameraSettings';

it('cycles between arcade, follow, overhead and chase, skipping chase in two-player mode', () => {
  expect(nextPracticeCamera('arcade')).toBe('follow');
  expect(nextPracticeCamera('follow')).toBe('overhead');
  expect(nextPracticeCamera('overhead')).toBe('chase');
  expect(nextPracticeCamera('chase')).toBe('chaseHigh');
  expect(nextPracticeCamera('chaseHigh')).toBe('arcade');
  expect(nextPracticeCamera('overhead', true)).toBe('arcade');
  expect(nextPracticeCamera('chase', true)).toBe('follow');
  expect(nextPracticeCamera('chaseHigh', true)).toBe('follow');
  expect(resolvePracticeCamera('chase', false)).toBe('chase');
  expect(resolvePracticeCamera('chaseHigh', false)).toBe('chaseHigh');
  expect(resolvePracticeCamera('chase', true)).toBe('arcade');
  expect(resolvePracticeCamera('chaseHigh', true)).toBe('arcade');
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

it('keeps the curtain closed during pre-flyover counter wraparound and opens once progress starts', () => {
  // Wrapped 68010 byte (0x00..0x41 -> 0.75..1.0) before 0x42 must stay hidden.
  expect(stepOpeningCurtain(false, 1)).toEqual({ armed: false, hidden: true });
  expect(stepOpeningCurtain(false, 0.76)).toEqual({
    armed: false,
    hidden: true,
  });
  // Counter hits 0x42 (opening = 0): armed, still behind curtain until > 0.02.
  expect(stepOpeningCurtain(false, 0)).toEqual({ armed: true, hidden: true });
  expect(stepOpeningCurtain(true, 0.02)).toEqual({ armed: true, hidden: true });
  // Real flyover visible all the way through 1.0 once armed.
  expect(stepOpeningCurtain(true, 0.03)).toEqual({
    armed: true,
    hidden: false,
  });
  expect(stepOpeningCurtain(true, 0.9)).toEqual({ armed: true, hidden: false });
  expect(stepOpeningCurtain(true, 1)).toEqual({ armed: true, hidden: false });
  // Gameplay (no opening): disarmed and visible.
  expect(stepOpeningCurtain(true, undefined)).toEqual({
    armed: false,
    hidden: false,
  });
});
