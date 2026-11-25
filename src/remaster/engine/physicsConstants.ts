import type { RemasterSurfaceKind } from '../levels/remasterLevel';

/**
 * Calibrated physics & arcade-rule constants for Marble Madness Remaster.
 * Units are BabylonJS world cells (1 cell = 8 arcade units, marble radius = 0.675).
 * Calibrated against the 68010 Practice Race reference behaviour.
 */
export const REMASTER_PHYSICS = {
  fixedStepSeconds: 1 / 60,
  marbleRadius: 0.675,
  marbleMass: 1.0,
  gravityY: -32.0,
  /** Maximum horizontal acceleration applied by player input (cells / s²). */
  inputAcceleration: 38.0,
  /** Space boost multiplier for extra burst on ramps and side jumps. */
  boostMultiplier: 1.75,
  /** Soft speed cap on flat ground (cells / s) during normal rolling. */
  flatSpeedLimit: 18.0,
  /** Raised speed cap while holding Space boost to clear side gaps. */
  boostSpeedLimit: 26.0,
  /** Low air damping so ramp jumps keep horizontal momentum across side gaps. */
  airLinearDamping: 0.08,
  /** Downward landing speed that shatters the marble (corresponds to ~3.75-cell drop). */
  shatterImpactSpeed: 15.5,
  /** Vertical restitution against walls and guardrails. */
  wallRestitution: 0.42,
  /** Marble-to-marble restitution in 2-player mode. */
  marbleRestitution: 0.65,
  /** Surface-specific Havok friction and linear damping. */
  surfaces: {
    stone: { friction: 0.22, linearDamping: 1.15, restitution: 0.25 },
    ice: { friction: 0.02, linearDamping: 0.14, restitution: 0.2 },
    acid: { friction: 0.35, linearDamping: 2.0, restitution: 0.05 },
    goal: { friction: 0.35, linearDamping: 2.2, restitution: 0.15 },
    wave: { friction: 0.25, linearDamping: 1.1, restitution: 0.2 },
    booster: { friction: 0.1, linearDamping: 0.4, restitution: 0.2 },
  } satisfies Record<
    RemasterSurfaceKind,
    {
      readonly friction: number;
      readonly linearDamping: number;
      readonly restitution: number;
    }
  >,
} as const;

export const REMASTER_RULES = {
  openingDurationSeconds: 3.5,
  shatterDurationSeconds: 1.1,
  fallDurationSeconds: 0.9,
  respawnInvulnSeconds: 0.75,
  progressPointsPerCell: 10,
  timeBonusPointsPerSecond: 100,
  lowTimeThresholdSeconds: 10,
} as const;
