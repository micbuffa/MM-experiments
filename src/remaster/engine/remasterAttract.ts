import type { PracticeCameraPreset } from '../../game/modern/practiceCameraSettings';
import { computeAmigaDemoDurationSeconds } from './amigaScrollTexts';

export type RemasterScreenMode = 'attract' | 'playing' | 'victory';
export type AttractStage = 'flyover' | 'aiDemo' | 'amigaDemo' | 'showcase';
export type RemasterCourseNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface CourseShowcaseInfo {
  readonly course: RemasterCourseNumber;
  readonly name: string;
  readonly subtitle: string;
  readonly difficulty: string;
}

export interface HighScoreEntry {
  readonly initials: string;
  readonly score: number;
  readonly course: RemasterCourseNumber;
}

export interface AttractCycleState {
  readonly stage: AttractStage;
  readonly stageElapsed: number;
  readonly courseIndex: number;
  readonly course: RemasterCourseNumber;
  readonly totalElapsed: number;
  readonly flyoverProgress: number;
  readonly cameraPreset: PracticeCameraPreset;
}

export interface VictoryRank {
  readonly title: string;
  readonly badge: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const REMASTER_TITLE = 'MARBYLON MADNESS 3D';
export const REMASTER_TRIBUTE_SUBTITLE =
  'A 3D HOMAGE TO ATARI’S MARBLE MADNESS (1984)';
export const ATTRACT_STAGE_DURATIONS: Readonly<Record<AttractStage, number>> = {
  flyover: 14.0,
  aiDemo: 16.0,
  amigaDemo: computeAmigaDemoDurationSeconds(),
  showcase: 16.0,
};
export const ATTRACT_AI_CAMERAS: readonly PracticeCameraPreset[] = [
  'arcade',
  'follow',
  'chase',
  'chaseHigh',
  'overhead',
] as const;
export const AUTO_ADVANCE_DELAY_SECONDS = 3.2;
export const HIGH_SCORE_STORAGE_KEY = 'marbylon-madness-3d-high-scores-v1';
export const MAX_HIGH_SCORES = 6;

export const ATTRACT_COURSE_SHOWCASE: readonly CourseShowcaseInfo[] = [
  {
    course: 1,
    name: 'Practice Race',
    subtitle: 'Warm-up ramps, chasm jump & twin GOAL flags',
    difficulty: 'WARM-UP',
  },
  {
    course: 2,
    name: 'Beginner Race',
    subtitle: 'Black Marble rival, Green Worms, drawbridge & ice basin',
    difficulty: 'CLASSIC',
  },
  {
    course: 3,
    name: 'Intermediate Race',
    subtitle: 'Sine-wave bridge, copper pipe & 7 Acid Amoebas',
    difficulty: 'TRICKY',
  },
  {
    course: 4,
    name: 'Aerial Race',
    subtitle: 'Suspended ice beams, twin vacuums, catapult & hammers',
    difficulty: 'EXPERT',
  },
  {
    course: 5,
    name: 'Silly Race',
    subtitle: 'Uphill gravity, miniature sillies, birds & Escher arch',
    difficulty: 'UPSIDE-DOWN',
  },
  {
    course: 6,
    name: 'Ultimate Race',
    subtitle: 'Amber sand, wedge tunnels, pyramids & 4-phase maze',
    difficulty: 'ULTIMATE',
  },
] as const;

export const DEFAULT_HIGH_SCORES: readonly HighScoreEntry[] = [
  { initials: 'MCY', score: 95000, course: 6 },
  { initials: 'BFL', score: 78000, course: 6 },
  { initials: 'BFR', score: 62000, course: 5 },
  { initials: 'HCN', score: 48000, course: 4 },
  { initials: 'MBU', score: 36000, course: 3 },
  { initials: 'PSA', score: 25000, course: 2 },
] as const;

export interface CreditLine {
  readonly role: string;
  readonly name: string;
}

export const REMASTER_CREDITS: readonly CreditLine[] = [
  {
    role: 'ORIGINAL ARCADE CLASSIC (1984)',
    name: 'Atari Games — Marble Madness',
  },
  {
    role: 'ORIGINAL DESIGN & LEAD CODE',
    name: 'Mark Cerny & Bob Flanagan',
  },
  {
    role: 'ORIGINAL ARCADE MUSIC & SFX',
    name: 'Brad Fuller & Hal Canon',
  },
  {
    role: 'ORIGINAL ISOMETRIC ART',
    name: 'Sam Comstock',
  },
  {
    role: '3D REMASTER ENGINE & ADAPTATION',
    name: 'Michel Buffa (BabylonJS 9 + Havok Physics)',
  },
  {
    role: 'WEBASSEMBLY MUSIC & SOUND DESIGN',
    name: 'Peter Salomonsen (WebAssembly Music)',
  },
  {
    role: 'PROTOTYPE 3D ACTOR MODELS',
    name: 'Luca Elia (Rolling Madness 3D, 2005)',
  },
  {
    role: 'FM SYNTHESIS CORE (BSD-3-CLAUSE)',
    name: 'Aaron Giles (ymfm)',
  },
] as const;

const STAGE_ORDER: readonly AttractStage[] = [
  'flyover',
  'aiDemo',
  'amigaDemo',
  'showcase',
];

/**
 * Pure 3D Vectorball morphing coordinates (classic Amiga 500 demoscene):
 * smoothly morphs `count` spheres between a 3D Cube -> Torus -> Double Helix -> Sphere.
 */
export function computeVectorballPosition(
  index: number,
  count: number,
  timeSeconds: number,
): { readonly x: number; readonly y: number; readonly z: number } {
  const safeCount = Math.max(1, count);
  const tNorm = index / safeCount;

  // Shape 0: 4x4x3 Cube lattice (48 balls)
  const cx = ((index % 4) - 1.5) * 1.15;
  const cy = ((Math.floor(index / 4) % 4) - 1.5) * 1.15;
  const cz = (Math.floor(index / 16) - 1.0) * 1.35;

  // Shape 1: 3D Torus ring
  const u = tNorm * Math.PI * 2 * 3;
  const v = tNorm * Math.PI * 2;
  const R = 2.4;
  const r = 0.85;
  const tx = (R + r * Math.cos(u)) * Math.cos(v);
  const ty = r * Math.sin(u) * 1.25;
  const tz = (R + r * Math.cos(u)) * Math.sin(v);

  // Shape 2: Double DNA Helix
  const strand = index % 2 === 0 ? 0 : Math.PI;
  const ha = tNorm * Math.PI * 6 + strand;
  const hx = Math.cos(ha) * 1.9;
  const hy = (tNorm - 0.5) * 4.4;
  const hz = Math.sin(ha) * 1.9;

  // Shape 3: Fibonacci Sphere
  const phi = Math.acos(1 - (2 * (index + 0.5)) / safeCount);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const sx = Math.sin(phi) * Math.cos(theta) * 2.35;
  const sy = Math.cos(phi) * 2.35;
  const sz = Math.sin(phi) * Math.sin(theta) * 2.35;

  const shapes = [
    [cx, cy, cz],
    [tx, ty, tz],
    [hx, hy, hz],
    [sx, sy, sz],
  ] as const;

  const cycle = (((timeSeconds * 0.34) % 4) + 4) % 4;
  const i0 = Math.floor(cycle) % 4;
  const i1 = (i0 + 1) % 4;
  const frac = cycle - Math.floor(cycle);
  // Smoothstep hold + transition
  const blend =
    frac < 0.45
      ? 0
      : (() => {
          const k = (frac - 0.45) / 0.55;
          return k * k * (3 - 2 * k);
        })();

  const a = shapes[i0]!;
  const b = shapes[i1]!;
  return {
    x: a[0] + (b[0] - a[0]) * blend,
    y: a[1] + (b[1] - a[1]) * blend,
    z: a[2] + (b[2] - a[2]) * blend,
  };
}

export function createAttractCycle(
  startCourse: RemasterCourseNumber = 1,
  startStage: AttractStage = 'flyover',
): AttractCycleState {
  const idx = Math.max(
    0,
    ATTRACT_COURSE_SHOWCASE.findIndex((c) => c.course === startCourse),
  );
  return {
    stage: startStage,
    stageElapsed: 0,
    courseIndex: idx,
    course: ATTRACT_COURSE_SHOWCASE[idx]!.course,
    totalElapsed: 0,
    flyoverProgress: 0,
    cameraPreset: 'arcade',
  };
}

export function switchAttractStage(
  state: AttractCycleState,
  delta: 1 | -1,
): AttractCycleState {
  const curIdx = STAGE_ORDER.indexOf(state.stage);
  const nextIdx = (curIdx + delta + STAGE_ORDER.length) % STAGE_ORDER.length;
  const nextStage = STAGE_ORDER[nextIdx]!;
  return {
    ...state,
    stage: nextStage,
    stageElapsed: 0,
    flyoverProgress: 0,
    cameraPreset: 'arcade',
  };
}

/**
 * Advance the 3-mode Attract sequencer:
 *   flyover (live 3D course sweep) -> aiDemo (live Havok AI with dynamic camera cuts)
 *   -> showcase (3D GLSL arcade tribute & Hall of Fame) -> next course!
 */
export function stepAttractCycle(
  state: AttractCycleState,
  dtSeconds: number,
): {
  readonly state: AttractCycleState;
  readonly stageChanged: boolean;
  readonly courseChanged: boolean;
} {
  const safeDt = Math.max(0, Math.min(0.25, dtSeconds));
  const totalElapsed = state.totalElapsed + safeDt;
  let stageElapsed = state.stageElapsed + safeDt;
  let stage = state.stage;
  let courseIndex = state.courseIndex;
  let stageChanged = false;
  let courseChanged = false;

  const limit = ATTRACT_STAGE_DURATIONS[stage];
  if (stageElapsed >= limit) {
    stageElapsed %= limit;
    stageChanged = true;
    const nextStageIdx = (STAGE_ORDER.indexOf(stage) + 1) % STAGE_ORDER.length;
    stage = STAGE_ORDER[nextStageIdx]!;
    if (stage === 'flyover') {
      courseIndex = (courseIndex + 1) % ATTRACT_COURSE_SHOWCASE.length;
      courseChanged = true;
    }
  }

  const flyoverProgress =
    stage === 'flyover'
      ? Math.max(0, Math.min(1, stageElapsed / ATTRACT_STAGE_DURATIONS.flyover))
      : 0;

  const camIdx =
    stage === 'aiDemo'
      ? Math.floor(stageElapsed / 2.6) % ATTRACT_AI_CAMERAS.length
      : 0;

  return {
    state: {
      stage,
      stageElapsed,
      courseIndex,
      course: ATTRACT_COURSE_SHOWCASE[courseIndex]!.course,
      totalElapsed,
      flyoverProgress,
      cameraPreset: ATTRACT_AI_CAMERAS[camIdx]!,
    },
    stageChanged,
    courseChanged,
  };
}

const AI_PROBES: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [Math.SQRT1_2, Math.SQRT1_2],
  [0.9239, 0.3827],
  [0.3827, 0.9239],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0],
  [0, -1],
];

/**
 * Pure terrain-aware AI autopilot for the Live 3D Attract Mode demo.
 * Probes candidate directions ahead, avoids void edges and sheer drops, and
 * steers smoothly along the course direction (`+1` downhill or `-1` uphill).
 */
export function computeAttractAiInput(
  pos: { readonly x: number; readonly y: number; readonly z: number },
  vel: { readonly x: number; readonly z: number },
  direction: 1 | -1,
  sampleHeight: (wx: number, wz: number) => number | null,
): { readonly x: number; readonly z: number; readonly boost: boolean } {
  const h0 = sampleHeight(pos.x, pos.z) ?? pos.y;
  let bestScore = -Infinity;
  let bestX = direction * Math.SQRT1_2;
  let bestZ = direction * Math.SQRT1_2;

  for (let i = 0; i < AI_PROBES.length; i++) {
    const [rawDx, rawDz] = AI_PROBES[i]!;
    const dx = rawDx * direction;
    const dz = rawDz * direction;
    const hNear = sampleHeight(pos.x + dx * 1.1, pos.z + dz * 1.1);
    const hFar = sampleHeight(pos.x + dx * 2.4, pos.z + dz * 2.4);
    if (hNear === null) continue;
    const stepUp = hNear - h0;
    // Avoid walls / tall ledges
    if (stepUp > 0.75) continue;
    // Strongly prefer staying on solid terrain far ahead
    let score = (dx + dz) * direction * 1.6;
    if (hFar === null) {
      score -= 4.5;
    } else if (h0 - hFar > 2.4) {
      score -= 2.2;
    }
    // Slight momentum alignment so steering looks fluid and natural
    score += (dx * vel.x + dz * vel.z) * 0.08;
    if (score > bestScore) {
      bestScore = score;
      bestX = dx;
      bestZ = dz;
    }
  }

  return { x: bestX * 0.68, z: bestZ * 0.68, boost: false };
}

export function getCourseShowcase(
  course: RemasterCourseNumber,
): CourseShowcaseInfo {
  return (
    ATTRACT_COURSE_SHOWCASE.find((c) => c.course === course) ??
    ATTRACT_COURSE_SHOWCASE[0]!
  );
}

export function computeVictoryRank(score: number): VictoryRank {
  if (score >= 90000) {
    return { title: 'GRAND MASTER', badge: '★ S+' };
  }
  if (score >= 60000) {
    return { title: 'MARBLE MASTER', badge: '★ A' };
  }
  if (score >= 35000) {
    return { title: 'COURSE ACROBAT', badge: '★ B' };
  }
  return { title: 'ULTIMATE FINISHER', badge: '★ C' };
}

export function sanitizeInitials(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return cleaned.length > 0 ? cleaned.padEnd(3, '_') : 'AAA';
}

function isValidEntry(value: unknown): value is HighScoreEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.initials === 'string' &&
    typeof candidate.score === 'number' &&
    Number.isFinite(candidate.score) &&
    candidate.score >= 0 &&
    typeof candidate.course === 'number' &&
    candidate.course >= 1 &&
    candidate.course <= 6
  );
}

export function loadHighScores(
  storage?: KeyValueStorage | null,
): HighScoreEntry[] {
  if (!storage) return [...DEFAULT_HIGH_SCORES];
  try {
    const raw = storage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (!raw) return [...DEFAULT_HIGH_SCORES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_HIGH_SCORES];
    const valid = parsed.filter(isValidEntry);
    if (valid.length === 0) return [...DEFAULT_HIGH_SCORES];
    return [...valid]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
  } catch {
    return [...DEFAULT_HIGH_SCORES];
  }
}

export function recordHighScore(
  storage: KeyValueStorage | null | undefined,
  initials: string,
  score: number,
  course: RemasterCourseNumber,
): HighScoreEntry[] {
  const entry: HighScoreEntry = {
    initials: sanitizeInitials(initials),
    score: Math.max(0, Math.round(score)),
    course,
  };
  const updated = [...loadHighScores(storage), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);
  if (storage) {
    try {
      storage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota or private-mode failures.
    }
  }
  return updated;
}
