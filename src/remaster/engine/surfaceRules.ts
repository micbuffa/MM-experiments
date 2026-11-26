import { REMASTER_PHYSICS } from './physicsConstants';

/**
 * Per-surface control and damping rules for the Remaster marble.
 *
 * Decoded from the 68010 ROM (see `docs/remaster/ice-zones.md`). On an ice
 * zone the arcade:
 * - ignores trackball input (`FUN_00017F66`, branch to `0x1808E`);
 * - applies no friction at all (`FUN_000121B8` skips `FUN_00025E7C`);
 * - keeps slope gravity (`FUN_00025DF6` still runs).
 * Speed and direction are therefore kept, except for slope and wall bounces.
 * The rule does not depend on the current speed.
 */

export type SurfaceKind = 'normal' | 'ice';

/** Angular damping the Havok backend gives the marble on normal ground. */
export const MARBLE_ANGULAR_DAMPING = 2.0;

export interface SurfaceRulesInput {
  readonly surface: SurfaceKind;
  /** Horizontal player force that would be applied on normal ground. */
  readonly force: { readonly x: number; readonly z: number };
  readonly grounded: boolean;
}

export interface SurfaceRules {
  /** False on ice: the caller must not call `applyPlayerForce`. */
  readonly steering: boolean;
  /** Force to pass to `applyPlayerForce` (zero on ice). */
  readonly force: { readonly x: number; readonly z: number };
  /** Havok linear damping for the next step. */
  readonly linearDamping: number;
  /** Havok angular damping for the next step. */
  readonly angularDamping: number;
}

const zeroForce = { x: 0, z: 0 } as const;

/** Linear damping for a surface; allocation-free for per-step use. */
export function surfaceLinearDamping(
  surface: SurfaceKind,
  grounded: boolean,
): number {
  // No friction while the zone byte holds an ice tag, grounded or not.
  if (surface === 'ice') return 0;
  return grounded
    ? REMASTER_PHYSICS.surfaces.stone.linearDamping
    : REMASTER_PHYSICS.airLinearDamping;
}

/** Angular damping for a surface; zero on ice so rolling is not slowed. */
export function surfaceAngularDamping(surface: SurfaceKind): number {
  return surface === 'ice' ? 0 : MARBLE_ANGULAR_DAMPING;
}

export function resolveSurfaceRules(input: SurfaceRulesInput): SurfaceRules {
  const steering = input.surface !== 'ice';
  return {
    steering,
    force: steering ? input.force : zeroForce,
    linearDamping: surfaceLinearDamping(input.surface, input.grounded),
    angularDamping: surfaceAngularDamping(input.surface),
  };
}

/** Surface change between two frames, for effects such as a sound cue. */
export function surfaceTransition(
  previous: SurfaceKind,
  next: SurfaceKind,
): 'enterIce' | 'leaveIce' | undefined {
  if (previous === next) return undefined;
  return next === 'ice' ? 'enterIce' : 'leaveIce';
}
