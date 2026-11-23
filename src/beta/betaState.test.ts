import { expect, it } from 'vitest';
import {
  arrowKeyDirection,
  betaAssetUrls,
  checkpointForStartLevel,
  nextBetaViewMode,
  parseBetaControlMode,
  parseBetaStartLevel,
  resolvePlayerControls,
  wasdKeyDirection,
} from './betaState';

it('cycles beta views cleanly in both directions', () => {
  expect(nextBetaViewMode('compare')).toBe('modern');
  expect(nextBetaViewMode('modern')).toBe('direct');
  expect(nextBetaViewMode('direct')).toBe('compare');
  expect(nextBetaViewMode('compare', true)).toBe('direct');
  expect(nextBetaViewMode('direct', true)).toBe('modern');
});

it('maps starting levels 1..5 to their native checkpoint keys', () => {
  expect(checkpointForStartLevel(1)).toBeUndefined();
  expect(checkpointForStartLevel(2)).toBe('intermediate');
  expect(checkpointForStartLevel(3)).toBe('level3');
  expect(checkpointForStartLevel(4)).toBe('level4');
  expect(checkpointForStartLevel(5)).toBe('level5');
});

it('parses radio values safely and falls back to level 1', () => {
  expect(parseBetaStartLevel('1')).toBe(1);
  expect(parseBetaStartLevel('5')).toBe(5);
  expect(parseBetaStartLevel('9')).toBe(1);
  expect(parseBetaStartLevel('')).toBe(1);
});

it('resolves static beta-data URLs with dev loopback fallback', () => {
  expect(betaAssetUrls('marble.zip', './')).toEqual([
    './beta-data/marble.zip',
    '/__local-roms/marble.zip',
  ]);
  expect(betaAssetUrls('level5-terrain.json', '/mm')).toEqual([
    '/mm/beta-data/level5-terrain.json',
    '/__local-roms/level5-terrain.json',
  ]);
});

it('keeps at most one player assigned to the trackpad while allowing dual keyboard', () => {
  expect(parseBetaControlMode('keyboard')).toBe('keyboard');
  expect(parseBetaControlMode('trackpad')).toBe('trackpad');
  const initial = { p1: 'trackpad', p2: 'keyboard' } as const;
  expect(resolvePlayerControls(initial, 1, 'keyboard')).toEqual({
    p1: 'keyboard',
    p2: 'keyboard',
  });
  expect(resolvePlayerControls(initial, 2, 'trackpad')).toEqual({
    p1: 'keyboard',
    p2: 'trackpad',
  });
  expect(
    resolvePlayerControls({ p1: 'keyboard', p2: 'trackpad' }, 1, 'trackpad'),
  ).toEqual({
    p1: 'trackpad',
    p2: 'keyboard',
  });
  expect(arrowKeyDirection('ArrowUp')).toBe('up');
  expect(wasdKeyDirection('z')).toBe('up');
  expect(wasdKeyDirection('d')).toBe('right');
});
