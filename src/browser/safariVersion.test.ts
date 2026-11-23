import { expect, it } from 'vitest';
import { supportsFullscreenPointerLock } from './safariVersion';

it.each([
  ['Version/17.4.1 Safari/605.1.15', false],
  ['Version/18.1 Safari/605.1.15', false],
  ['Version/18.2 Safari/605.1.15', true],
  ['Version/26.0 Safari/605.1.15', true],
  ['Chrome/157.0 Safari/537.36', true],
  ['Firefox/144.0', true],
])('selects a fullscreen policy for %s', (ua, native) => {
  expect(supportsFullscreenPointerLock(ua)).toBe(native);
});
