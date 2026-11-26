import { describe, expect, it } from 'vitest';
import { REMASTER_PHYSICS } from './physicsConstants';
import {
  MARBLE_ANGULAR_DAMPING,
  resolveSurfaceRules,
  surfaceTransition,
} from './surfaceRules';

describe('resolveSurfaceRules', () => {
  it('keeps the current Level 1 values on normal ground', () => {
    const grounded = resolveSurfaceRules({
      surface: 'normal',
      force: { x: 3, z: -4 },
      grounded: true,
    });
    expect(grounded).toEqual({
      steering: true,
      force: { x: 3, z: -4 },
      linearDamping: REMASTER_PHYSICS.surfaces.stone.linearDamping,
      angularDamping: MARBLE_ANGULAR_DAMPING,
    });
    const airborne = resolveSurfaceRules({
      surface: 'normal',
      force: { x: 1, z: 0 },
      grounded: false,
    });
    expect(airborne.linearDamping).toBe(REMASTER_PHYSICS.airLinearDamping);
    expect(airborne.steering).toBe(true);
  });

  it('drops all input and all damping on ice, grounded or airborne', () => {
    for (const grounded of [true, false]) {
      const rules = resolveSurfaceRules({
        surface: 'ice',
        force: { x: 38, z: 38 },
        grounded,
      });
      expect(rules).toEqual({
        steering: false,
        force: { x: 0, z: 0 },
        linearDamping: 0,
        angularDamping: 0,
      });
    }
  });
});

describe('surfaceTransition', () => {
  it('reports entering and leaving ice only on a change', () => {
    expect(surfaceTransition('normal', 'ice')).toBe('enterIce');
    expect(surfaceTransition('ice', 'ice')).toBeUndefined();
    expect(surfaceTransition('ice', 'normal')).toBe('leaveIce');
    expect(surfaceTransition('normal', 'normal')).toBeUndefined();
  });
});
