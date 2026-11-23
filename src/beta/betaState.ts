export type BetaStartLevel = 1 | 2 | 3 | 4 | 5;
export type BetaViewMode = 'compare' | 'modern' | 'direct';
export type BetaControlMode = 'trackpad' | 'keyboard';
export interface BetaPlayerControls {
  readonly p1: BetaControlMode;
  readonly p2: BetaControlMode;
}
export type BetaCheckpointLevel =
  'intermediate' | 'level3' | 'level4' | 'level5';

const VIEW_ORDER: readonly BetaViewMode[] = ['compare', 'modern', 'direct'];

export const BETA_LEVEL_LABELS: Readonly<Record<BetaStartLevel, string>> = {
  1: '1 · Practice',
  2: '2 · Beginner',
  3: '3 · Intermediate',
  4: '4 · Aerial',
  5: '5 · Silly',
};

export const BETA_VIEW_LABELS: Readonly<Record<BetaViewMode, string>> = {
  compare: 'Side-by-side (Original + 3D)',
  modern: '3D Only',
  direct: 'Original Only',
};

export function nextBetaViewMode(
  current: BetaViewMode,
  reverse = false,
): BetaViewMode {
  const index = VIEW_ORDER.indexOf(current);
  const delta = reverse ? -1 : 1;
  return VIEW_ORDER[(index + delta + VIEW_ORDER.length) % VIEW_ORDER.length]!;
}

export function checkpointForStartLevel(
  level: BetaStartLevel,
): BetaCheckpointLevel | undefined {
  switch (level) {
    case 2:
      return 'intermediate';
    case 3:
      return 'level3';
    case 4:
      return 'level4';
    case 5:
      return 'level5';
    default:
      return undefined;
  }
}

export function parseBetaStartLevel(value: string): BetaStartLevel {
  if (
    value === '1' ||
    value === '2' ||
    value === '3' ||
    value === '4' ||
    value === '5'
  ) {
    return Number(value) as BetaStartLevel;
  }
  return 1;
}

export function betaAssetUrls(
  name: string,
  baseUrl: string,
): readonly string[] {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return [`${normalized}beta-data/${name}`, `/__local-roms/${name}`];
}

export function parseBetaControlMode(value: string): BetaControlMode {
  return value === 'keyboard' ? 'keyboard' : 'trackpad';
}

/** At most one player can hold the browser trackpad pointer lock at a time. */
export function resolvePlayerControls(
  current: BetaPlayerControls,
  player: 1 | 2,
  mode: BetaControlMode,
): BetaPlayerControls {
  if (player === 1) {
    return {
      p1: mode,
      p2:
        mode === 'trackpad' && current.p2 === 'trackpad'
          ? 'keyboard'
          : current.p2,
    };
  }
  return {
    p1:
      mode === 'trackpad' && current.p1 === 'trackpad'
        ? 'keyboard'
        : current.p1,
    p2: mode,
  };
}

export function arrowKeyDirection(
  key: string,
): 'up' | 'down' | 'left' | 'right' | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

export function wasdKeyDirection(
  key: string,
): 'up' | 'down' | 'left' | 'right' | null {
  switch (key.toLowerCase()) {
    case 'w':
    case 'z':
      return 'up';
    case 's':
      return 'down';
    case 'a':
    case 'q':
      return 'left';
    case 'd':
      return 'right';
    default:
      return null;
  }
}
