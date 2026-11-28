import { describe, expect, it } from 'vitest';
import {
  AMIGA_BOTTOM_SCROLL_METRICS,
  AMIGA_BOTTOM_SCROLL_TEXT,
  AMIGA_TOP_SCROLL_METRICS,
  AMIGA_TOP_SCROLL_TEXT,
  computeAmigaDemoDurationSeconds,
  computeScrollPassDurationSeconds,
} from './amigaScrollTexts';
import {
  ATTRACT_STAGE_DURATIONS,
  DEFAULT_HIGH_SCORES,
  HIGH_SCORE_STORAGE_KEY,
  MAX_HIGH_SCORES,
  REMASTER_CREDITS,
  REMASTER_TITLE,
  computeAttractAiInput,
  computeVectorballPosition,
  computeVictoryRank,
  createAttractCycle,
  getCourseShowcase,
  loadHighScores,
  recordHighScore,
  sanitizeInitials,
  stepAttractCycle,
  switchAttractStage,
  type KeyValueStorage,
} from './remasterAttract';

function makeMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('remasterAttract', () => {
  it('cycles through flyover -> aiDemo (with camera switches) -> showcase -> next course', () => {
    let state = createAttractCycle(1);
    expect(state.stage).toBe('flyover');
    expect(state.course).toBe(1);

    // Advance through flyover into aiDemo
    let movedToAi = false;
    for (let i = 0; i < 90; i++) {
      const next = stepAttractCycle(state, 0.2);
      state = next.state;
      if (next.stageChanged) {
        movedToAi = true;
        break;
      }
    }
    expect(movedToAi).toBe(true);
    expect(state.stage).toBe('aiDemo');
    expect(state.course).toBe(1);

    // Camera preset switches during aiDemo
    const startCam = state.cameraPreset;
    const seenCams = new Set([startCam]);
    for (let i = 0; i < 60; i++) {
      const next = stepAttractCycle(state, 0.2);
      state = next.state;
      seenCams.add(state.cameraPreset);
      if (next.stageChanged) break;
    }
    expect(seenCams.size).toBeGreaterThan(1);

    // Advance into showcase, then wrap to course 2 flyover
    while (state.stage !== 'showcase') {
      state = stepAttractCycle(state, 0.25).state;
    }
    let advancedCourse = false;
    const steps = Math.ceil(ATTRACT_STAGE_DURATIONS.showcase / 0.25) + 2;
    for (let i = 0; i < steps; i++) {
      const next = stepAttractCycle(state, 0.25);
      state = next.state;
      if (next.courseChanged) {
        advancedCourse = true;
        break;
      }
    }
    expect(advancedCourse).toBe(true);
    expect(state.stage).toBe('flyover');
    expect(state.course).toBe(2);

    // Manual stage switching works forward and backward across all 4 modes
    const s1 = switchAttractStage(createAttractCycle(1, 'flyover'), 1);
    expect(s1.stage).toBe('aiDemo');
    const s2 = switchAttractStage(s1, 1);
    expect(s2.stage).toBe('amigaDemo');
    const s3 = switchAttractStage(s2, 1);
    expect(s3.stage).toBe('showcase');
    const sNextCourse = switchAttractStage(s3, 1);
    expect(sNextCourse.stage).toBe('flyover');
    expect(sNextCourse.course).toBe(2);
    expect(sNextCourse.flyoverProgress).toBe(0);
    const sWrapBack = switchAttractStage(createAttractCycle(1, 'flyover'), -1);
    expect(sWrapBack.stage).toBe('showcase');
    expect(sWrapBack.course).toBe(6);
    const s0 = switchAttractStage(s1, -1);
    expect(s0.stage).toBe('flyover');
  });

  it('morphs 3D Amiga vectorballs smoothly across Cube, Torus, Helix & Sphere', () => {
    const pCube = computeVectorballPosition(0, 48, 0.0);
    const pTorus = computeVectorballPosition(0, 48, 3.0);
    const pHelix = computeVectorballPosition(0, 48, 6.0);
    const pSphere = computeVectorballPosition(0, 48, 9.0);
    for (const p of [pCube, pTorus, pHelix, pSphere]) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
    expect(
      Math.hypot(pCube.x - pHelix.x, pCube.y - pHelix.y, pCube.z - pHelix.z),
    ).toBeGreaterThan(0.5);
  });

  it('steers the Attract AI autopilot away from void edges along the course direction', () => {
    // Void for x > 2, solid corridor along +Z
    const sample = (wx: number, wz: number) =>
      wx <= 1.2 && wz >= -5 && wz <= 20 ? 0 : null;
    const cmd = computeAttractAiInput(
      { x: 0.5, y: 0, z: 0 },
      { x: 0, z: 1 },
      1,
      sample,
    );
    expect(cmd.z).toBeGreaterThan(0);
    expect(cmd.x).toBeLessThanOrEqual(0.2);

    // Uphill course (Level 5, direction = -1) steers toward negative coordinates
    const uphill = computeAttractAiInput(
      { x: 10, y: 0, z: 10 },
      { x: 0, z: 0 },
      -1,
      () => 0,
    );
    expect(uphill.x + uphill.z).toBeLessThan(0);
  });

  it('exposes Marbylon Madness 3D title, course showcase, and full tribute credits', () => {
    expect(REMASTER_TITLE).toBe('MARBYLON MADNESS 3D');
    expect(getCourseShowcase(6).name).toBe('Ultimate Race');
    expect(getCourseShowcase(5).difficulty).toBe('UPSIDE-DOWN');
    expect(REMASTER_CREDITS.some((c) => c.name.includes('Mark Cerny'))).toBe(
      true,
    );
    expect(REMASTER_CREDITS.some((c) => c.name.includes('Michel Buffa'))).toBe(
      true,
    );
    expect(
      REMASTER_CREDITS.some((c) => c.name.includes('Peter Salomonsen')),
    ).toBe(true);
    expect(REMASTER_CREDITS.some((c) => c.name.includes('Luca Elia'))).toBe(
      true,
    );
  });

  it('computes victory ranks across all score tiers', () => {
    expect(computeVictoryRank(100000).title).toBe('GRAND MASTER');
    expect(computeVictoryRank(65000).title).toBe('MARBLE MASTER');
    expect(computeVictoryRank(40000).title).toBe('COURSE ACROBAT');
    expect(computeVictoryRank(12000).title).toBe('ULTIMATE FINISHER');
  });

  it('sanitizes 3-letter arcade initials cleanly', () => {
    expect(sanitizeInitials('mb!')).toBe('MB_');
    expect(sanitizeInitials('michel')).toBe('MIC');
    expect(sanitizeInitials('   ')).toBe('AAA');
  });

  it('loads default tribute high scores and persists new sorted entries', () => {
    const storage = makeMemoryStorage();
    expect(loadHighScores(null)).toEqual(DEFAULT_HIGH_SCORES);
    expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES);

    storage.setItem(HIGH_SCORE_STORAGE_KEY, '{broken');
    expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES);
    storage.setItem(HIGH_SCORE_STORAGE_KEY, '[]');
    expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES);
    storage.setItem(HIGH_SCORE_STORAGE_KEY, '"not-array"');
    expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES);

    const updated = recordHighScore(storage, 'mbu', 120500, 6);
    expect(updated).toHaveLength(MAX_HIGH_SCORES);
    expect(updated[0]).toEqual({ initials: 'MBU', score: 120500, course: 6 });
    expect(loadHighScores(storage)[0]).toEqual({
      initials: 'MBU',
      score: 120500,
      course: 6,
    });

    const throwingStorage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const fallback = recordHighScore(throwingStorage, 'ACE', 99000, 6);
    expect(fallback[0]?.initials).toBe('ACE');
  });

  it('keeps amigaDemo duration long enough for both top and bottom scroll texts to finish', () => {
    const bottomDuration = computeScrollPassDurationSeconds(
      AMIGA_BOTTOM_SCROLL_TEXT,
      AMIGA_BOTTOM_SCROLL_METRICS,
    );
    const topDuration = computeScrollPassDurationSeconds(
      AMIGA_TOP_SCROLL_TEXT,
      AMIGA_TOP_SCROLL_METRICS,
    );
    expect(ATTRACT_STAGE_DURATIONS.amigaDemo).toBeGreaterThanOrEqual(
      bottomDuration,
    );
    expect(ATTRACT_STAGE_DURATIONS.amigaDemo).toBeGreaterThanOrEqual(
      topDuration,
    );

    const longerDuration = computeAmigaDemoDurationSeconds(
      AMIGA_TOP_SCROLL_TEXT,
      `${AMIGA_BOTTOM_SCROLL_TEXT}${AMIGA_BOTTOM_SCROLL_TEXT}`,
    );
    expect(longerDuration).toBeGreaterThan(ATTRACT_STAGE_DURATIONS.amigaDemo);
  });
});
