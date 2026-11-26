import { describe, expect, it } from 'vitest';
import {
  decideBridgeCrossing,
  LEVEL2_BRIDGE_FOOTPRINT,
  MARBLE_TERRAIN_ROM,
  type BridgeMarbleProbe,
} from './bridgeCrossing';

const approaching = (
  over: Partial<BridgeMarbleProbe> = {},
): BridgeMarbleProbe => ({
  along: 55.5,
  lateral: 63,
  heightUnits: 0,
  velocityAlong: 6,
  radiusCells: 0.675,
  ...over,
});

describe('decideBridgeCrossing: approach lip', () => {
  it('lets the marble roll on at steps 0 and 1 (lip 0 / 3 units)', () => {
    expect(decideBridgeCrossing(approaching(), 0)).toEqual({
      kind: 'traverse',
      surfaceRiseUnits: 0,
    });
    expect(decideBridgeCrossing(approaching(), 1).kind).toBe('traverse');
  });

  it('rebounds from step 2 (lip 5 units >= 4) with the velocity reflected', () => {
    expect(decideBridgeCrossing(approaching(), 2)).toEqual({
      kind: 'rebound',
      lipUnits: 5,
      reflectedVelocityAlong: -6,
    });
    expect(decideBridgeCrossing(approaching(), 6)).toMatchObject({
      kind: 'rebound',
      lipUnits: 16,
    });
  });

  it('uses the exact 4-unit boundary and the marble height', () => {
    // Fractional step 1.5 -> lip 4: rebound (ROM uses >= 4).
    expect(decideBridgeCrossing(approaching(), 1.5).kind).toBe('rebound');
    expect(decideBridgeCrossing(approaching(), 1.49).kind).toBe('traverse');
    // A marble already 2 units up sees only a 3-unit lip at step 2.
    expect(decideBridgeCrossing(approaching({ heightUnits: 2 }), 2).kind).toBe(
      'traverse',
    );
  });

  it('accepts a more forgiving step-up threshold', () => {
    expect(
      decideBridgeCrossing(approaching(), 3, { wallStepUnits: 9 }).kind,
    ).toBe('traverse');
  });

  it('ignores marbles not touching, outside the deck width, or moving away', () => {
    expect(decideBridgeCrossing(approaching({ along: 55 }), 6).kind).toBe(
      'clear',
    );
    expect(decideBridgeCrossing(approaching({ lateral: 66 }), 6).kind).toBe(
      'clear',
    );
    expect(
      decideBridgeCrossing(approaching({ velocityAlong: -2 }), 6).kind,
    ).toBe('clear');
    expect(decideBridgeCrossing(approaching({ along: 60.5 }), 6).kind).toBe(
      'clear',
    );
  });

  it('reflects correctly when the travel axis is reversed', () => {
    const footprint = {
      ...LEVEL2_BRIDGE_FOOTPRINT,
      freeEdge: 60,
      direction: -1 as const,
    };
    expect(
      decideBridgeCrossing(approaching({ along: 60.5, velocityAlong: -6 }), 6, {
        footprint,
      }),
    ).toMatchObject({ kind: 'rebound', reflectedVelocityAlong: 6 });
  });
});

describe('decideBridgeCrossing: on the deck', () => {
  it('rides the tilted deck surface', () => {
    expect(
      decideBridgeCrossing(approaching({ along: 57, heightUnits: 12 }), 6),
    ).toEqual({
      kind: 'traverse',
      surfaceRiseUnits: 12,
    });
    expect(decideBridgeCrossing(approaching({ along: 59 }), 6)).toEqual({
      kind: 'traverse',
      surfaceRiseUnits: 4,
    });
  });

  it('falls into the void on -X (vanish) and into the recess on +X (land)', () => {
    expect(
      decideBridgeCrossing(approaching({ along: 58, lateral: 60.5 }), 0),
    ).toEqual({
      kind: 'fall',
      side: 'lateral-min',
      dropUnits: Number.POSITIVE_INFINITY,
      outcome: 'vanish',
    });
    expect(
      decideBridgeCrossing(approaching({ along: 58, lateral: 65.2 }), 6),
    ).toEqual({
      kind: 'fall',
      side: 'lateral-max',
      dropUnits: 44 + 8,
      outcome: 'land',
    });
  });

  it('flags a marble left more than 16 units under the deck as embedded', () => {
    expect(
      decideBridgeCrossing(approaching({ along: 56.1, heightUnits: -1 }), 6),
    ).toMatchObject({ kind: 'embedded' });
    expect(
      decideBridgeCrossing(approaching({ along: 56.1, heightUnits: 0 }), 6)
        .kind,
    ).toBe('traverse');
  });

  it('exposes the decoded terrain thresholds', () => {
    expect(MARBLE_TERRAIN_ROM).toMatchObject({
      wallStepUnits: 4,
      takeoffDropUnits: 8,
      vanishDropUnits: 128,
      embeddedUnits: 16,
      rebuildTicksAfterVoidFall: 48,
      rebuildTicksAfterEmbedded: 24,
    });
  });
});
