import { BRIDGE_ROM, deckRiseUnits, freeEdgeRiseUnits } from './bridgeCycle';

/**
 * Rules decoded from the generic marble update (0x121b8) that decide what
 * happens around the drawbridge. The ROM has no bridge-specific collision:
 * the deck is terrain, so these generic thresholds apply.
 */
export const MARBLE_TERRAIN_ROM = {
  /** Vertical edge >= 4 units above the marble reflects velocity (0x1b5c2). */
  wallStepUnits: BRIDGE_ROM.wallStepUnits,
  /** Ground more than 8 units below: marble becomes airborne, cue 0x45 (0x12450). */
  takeoffDropUnits: 8,
  /** Falling more than 128 units below the take-off height: vanish (0x1269e). */
  vanishDropUnits: 128,
  /** Ground more than 16 units above the marble: embedded, vanish (0x1225a). */
  embeddedUnits: 16,
  /** Respawn reassembly length after a void fall ($57 = 0x64 -> 0x30, 0x13afc). */
  rebuildTicksAfterVoidFall: 48,
  /** Respawn reassembly length after being embedded ($57 = 0x65 -> 0x18). */
  rebuildTicksAfterEmbedded: 24,
} as const;

/**
 * Bridge footprint in arcade cells. INFERRED from the existing Level 2 study
 * (`createIntermediateBridge`: deck x = 61..65, z = 56..60, pivot at z = 60)
 * and the decoded rise rows (free edge = 4 cells from the hinge). The void
 * side is on -X (cells x < 61 have void corners in the survey and in override
 * codes 0x6fxx/0xefc8); +X drops 44 units into the recess (0x9axx codes).
 */
export interface BridgeFootprint {
  /** Cell coordinate of the free edge along the travel axis. */
  readonly freeEdge: number;
  /** +1 if the hinge lies at larger coordinates than the free edge. */
  readonly direction: 1 | -1;
  /** Lateral cell range [min, max). */
  readonly lateralMin: number;
  readonly lateralMax: number;
  /** Drop when leaving the deck on the lateral min side (Infinity = void). */
  readonly dropAtLateralMin: number;
  /** Drop when leaving the deck on the lateral max side. */
  readonly dropAtLateralMax: number;
}

export const LEVEL2_BRIDGE_FOOTPRINT: BridgeFootprint = {
  freeEdge: 56,
  direction: 1,
  lateralMin: 61,
  lateralMax: 65,
  dropAtLateralMin: Number.POSITIVE_INFINITY,
  dropAtLateralMax: 44,
};

export interface BridgeMarbleProbe {
  /** Marble centre along the travel axis, arcade cells (z for Level 2). */
  readonly along: number;
  /** Marble centre across the travel axis, arcade cells (x for Level 2). */
  readonly lateral: number;
  /** Marble bottom height above the hinge/approach level, arcade units. */
  readonly heightUnits: number;
  /** Velocity along the travel axis, any unit (sign matters, returned reflected). */
  readonly velocityAlong: number;
  /** Marble radius in cells (remaster default 0.675). */
  readonly radiusCells: number;
}

export type BridgeDecision =
  | { readonly kind: 'clear' }
  | {
      readonly kind: 'traverse';
      /** Deck surface rise under the marble (0 on the approach), arcade units. */
      readonly surfaceRiseUnits: number;
    }
  | {
      readonly kind: 'rebound';
      readonly lipUnits: number;
      /** ROM 0x1b5a6/0x1b5b4: sign forced away from the edge, magnitude kept. */
      readonly reflectedVelocityAlong: number;
    }
  | {
      readonly kind: 'fall';
      readonly side: 'lateral-min' | 'lateral-max';
      /** Drop below the deck, arcade units (Infinity = void, vanish rule). */
      readonly dropUnits: number;
      readonly outcome: 'vanish' | 'land';
    }
  | { readonly kind: 'embedded'; readonly overlapUnits: number };

export interface BridgeCrossingOptions {
  readonly footprint?: BridgeFootprint;
  /**
   * Step-up forgiveness. Defaults to the ROM edge rule (4 units); raise it
   * for a more forgiving remaster without changing the cycle.
   */
  readonly wallStepUnits?: number;
}

/**
 * Decide traverse / rebound / fall for a marble near the drawbridge at a
 * given (possibly fractional) bridge step. Pure: the caller applies the
 * result to its physics body.
 */
export function decideBridgeCrossing(
  marble: BridgeMarbleProbe,
  step: number,
  options: BridgeCrossingOptions = {},
): BridgeDecision {
  const f = options.footprint ?? LEVEL2_BRIDGE_FOOTPRINT;
  const wallStep = options.wallStepUnits ?? MARBLE_TERRAIN_ROM.wallStepUnits;
  const u = (marble.along - f.freeEdge) * f.direction;
  const vel = marble.velocityAlong * f.direction;
  const length = BRIDGE_ROM.deckLengthCells;
  if (u > length) return { kind: 'clear' };
  if (u < 0) {
    const touching = u + marble.radiusCells >= 0;
    const lateralInside =
      marble.lateral >= f.lateralMin && marble.lateral < f.lateralMax;
    if (!touching || !lateralInside || vel <= 0) return { kind: 'clear' };
    const lip = freeEdgeRiseUnits(step) - marble.heightUnits;
    if (lip >= wallStep)
      return {
        kind: 'rebound',
        lipUnits: lip,
        reflectedVelocityAlong: -Math.abs(marble.velocityAlong) * f.direction,
      };
    return { kind: 'traverse', surfaceRiseUnits: 0 };
  }
  if (marble.lateral < f.lateralMin || marble.lateral >= f.lateralMax) {
    const side = marble.lateral < f.lateralMin ? 'lateral-min' : 'lateral-max';
    const surface = deckRiseUnits(length - u, step);
    const drop =
      (side === 'lateral-min' ? f.dropAtLateralMin : f.dropAtLateralMax) +
      surface;
    return {
      kind: 'fall',
      side,
      dropUnits: drop,
      outcome: drop > MARBLE_TERRAIN_ROM.vanishDropUnits ? 'vanish' : 'land',
    };
  }
  const surface = deckRiseUnits(length - u, step);
  const overlap = surface - marble.heightUnits;
  if (overlap > MARBLE_TERRAIN_ROM.embeddedUnits)
    return { kind: 'embedded', overlapUnits: overlap };
  return { kind: 'traverse', surfaceRiseUnits: surface };
}
