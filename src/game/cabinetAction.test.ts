import { expect, it } from 'vitest';
import { cabinetAction } from './cabinetAction';
it.each(['credit', 'start1', 'start2', 'play', 'preview2'] as const)(
  'accepts only the explicit cabinet action %s',
  (action) => {
    expect(cabinetAction({ cabinetAction: action }, false)).toBe(action);
    expect(cabinetAction({ cabinetAction: action }, true)).toBeNull();
    expect(cabinetAction({ cabinetAction: action }, false, 2)).toBeNull();
  },
);
it.each([
  null,
  undefined,
  3,
  'play',
  {},
  { cabinetAction: 'reset' },
  { cabinetAction: () => {} },
])('rejects unrecognized metadata %j', (value) => {
  expect(cabinetAction(value, false)).toBeNull();
});
