import { describe, expect, it } from 'vitest';
import {
  createLevel3Amoebas,
  probeLevel3CopperPipe,
  sampleLevel3WaveAt,
  sampleLevel3WaveProfile,
  stepLevel3Amoebas,
  touchesLevel3Amoeba,
} from './level3Mechanics';
import {
  LEVEL3_AMOEBA_SPECS,
  LEVEL3_COPPER_PIPE,
  LEVEL3_WAVE,
} from './level3RomData';

describe('Level 3 ROM mechanics', () => {
  it('spawns all 7 ROM acid amoebas and advances them smoothly along closed loops', () => {
    let amoebas = createLevel3Amoebas();
    expect(amoebas).toHaveLength(LEVEL3_AMOEBA_SPECS.length);
    expect(amoebas).toHaveLength(7);

    const start0 = { x: amoebas[0]!.cellX, z: amoebas[0]!.cellZ };
    for (let i = 0; i < 120; i++) {
      amoebas = stepLevel3Amoebas(amoebas, 1 / 60);
    }
    // After 2 s at 1.85 cells/s (~3.7 cells), amoeba 0 has moved past its first corner.
    expect(
      Math.hypot(amoebas[0]!.cellX - start0.x, amoebas[0]!.cellZ - start0.z),
    ).toBeGreaterThan(0.5);

    // Contact detection triggers inside contactRadius and stays false outside.
    expect(
      touchesLevel3Amoeba(amoebas, amoebas[0]!.cellX, amoebas[0]!.cellZ),
    ).toBe(true);
    expect(touchesLevel3Amoeba(amoebas, 10, 10)).toBe(false);
  });

  it('generates a 22-tile traveling turquoise wave profile and longitudinal slope', () => {
    const profile0 = sampleLevel3WaveProfile(0);
    const profile1 = sampleLevel3WaveProfile(0.8);
    expect(profile0).toHaveLength(LEVEL3_WAVE.length);
    expect(Math.max(...profile0)).toBeGreaterThan(0.5);
    expect(profile0).not.toEqual(profile1);

    const offWave = sampleLevel3WaveAt(50, 50, 0);
    expect(offWave.onWave).toBe(false);
    expect(offWave.slopeZ).toBe(0);

    // Sample across the wave strip to confirm crest lift and non-zero slope gradients.
    let maxSurface = -Infinity;
    let maxAbsSlope = 0;
    for (
      let z = LEVEL3_WAVE.z;
      z < LEVEL3_WAVE.z + LEVEL3_WAVE.length;
      z += 0.5
    ) {
      const s = sampleLevel3WaveAt(LEVEL3_WAVE.x + 1.5, z, 0);
      expect(s.onWave).toBe(true);
      if (s.surfaceY > maxSurface) maxSurface = s.surfaceY;
      if (Math.abs(s.slopeZ) > maxAbsSlope) maxAbsSlope = Math.abs(s.slopeZ);
    }
    expect(maxSurface).toBeGreaterThan(offWave.surfaceY + 1.5);
    expect(maxAbsSlope).toBeGreaterThan(0.5);
  });

  it('probes the Level 3 copper vertical funnel pipe height bands', () => {
    const insideX = 77 * 8 + 4;
    const insideZ = 80 * 8 + 4;
    expect(probeLevel3CopperPipe(10 * 8, 10 * 8, 0x3f90)).toBe('none');
    expect(
      probeLevel3CopperPipe(insideX, insideZ, LEVEL3_COPPER_PIPE.rimFromHeight),
    ).toBe('none');
    expect(
      probeLevel3CopperPipe(
        insideX,
        insideZ,
        LEVEL3_COPPER_PIPE.mouthFromHeight + 2,
      ),
    ).toBe('mouth');
    expect(
      probeLevel3CopperPipe(
        insideX,
        insideZ,
        LEVEL3_COPPER_PIPE.mouthFromHeight - 4,
      ),
    ).toBe('enter');
    expect(
      probeLevel3CopperPipe(
        insideX,
        insideZ,
        LEVEL3_COPPER_PIPE.ignoreAtOrBelowHeight,
      ),
    ).toBe('none');
  });
});
