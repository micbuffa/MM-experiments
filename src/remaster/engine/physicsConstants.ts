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
  gravityY: -30.0,
  /** Terminal downward fall speed (cells / s) matching 68010 cap (-5 units/tick) so falls stay calm while jumps stay crisp. */
  maxFallSpeed: 15.5,
  /** Maximum horizontal acceleration applied by player input (cells / s²). */
  inputAcceleration: 34.0,
  /** Space boost multiplier for extra burst on ramps, side jumps, and shoving Black Marble. */
  boostMultiplier: 1.9,
  /** Soft speed cap on flat ground (cells / s) during normal rolling. */
  flatSpeedLimit: 15.5,
  /** Raised speed cap while holding Space boost to clear side gaps and climb ramps. */
  boostSpeedLimit: 24.5,
  /** Low air damping so ramp jumps keep horizontal momentum across side gaps. */
  airLinearDamping: 0.08,
  /** Downward landing speed that shatters the marble (corresponds to ~3.75-cell drop). */
  shatterImpactSpeed: 13.5,
  /** Vertical restitution against walls, raised well rims, and guardrails (matches 68010 0x1b5a6 sign-flip rebound). */
  wallRestitution: 0.96,
  /** Marble-to-marble billiard restitution (player vs player / Black Marble). */
  marbleRestitution: 0.9,
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
  shatterDurationSeconds: 1.65,
  fallDurationSeconds: 1.25,
  respawnInvulnSeconds: 0.75,
  /** 68010 ROM player state 5 ($56 = 0x32 = 50 ticks at 30 Hz = 1.67 s). */
  dizzyDurationSeconds: 50 / 30,
  /** Reduced steering acceleration multiplier while dizzy. */
  dizzySpeedFactor: 0.4,
  /** Drop height in world Y units (~3.5 arcade cells / 28 arcade units) so 32-unit drops shatter while 24-unit jumps stay dizzy. */
  shatterDropWorldY: 2.85,
  /** Drop height in world Y units (~1.4..3 arcade cells) that makes the marble dizzy on landing. */
  dizzyDropWorldY: 1.15,
  progressPointsPerCell: 10,
  timeBonusPointsPerSecond: 100,
  lowTimeThresholdSeconds: 10,
  /** Distance (cells along course) behind the leader that triggers 2P off-screen catch-up. */
  catchUpLagCells: 17,
  /** Time penalty deducted from the trailing player in 2P catch-up (matches arcade -5 SEC). */
  catchUpPenaltySeconds: 5,
  /** Duration of the floating -5 SEC 3D notice above the respawned marble. */
  catchUpNoticeSeconds: 1.6,
} as const;
