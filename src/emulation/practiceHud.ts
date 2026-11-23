// Atari System 1 alpha tile RAM (68010 $A03000) in the pinned core's heap.
export const PRACTICE_ALPHA_RAM = 0x1fc3650;
const columns = 64;
const scoreColumn = 3;
const clockColumn = 19;
const scoreLabel = 'SCORE';
const scorePalette = 0x2000;
const firstClockTile = 0x2900;

interface PracticePlayerHud {
  readonly score: string;
  readonly seconds: number | null;
}

export interface PracticeHudNotice {
  readonly text: string;
  readonly row: number;
  readonly column: number;
  readonly red: boolean;
}

export interface PracticeHud extends PracticePlayerHud {
  readonly player2?: PracticePlayerHud;
  readonly notices?: readonly PracticeHudNotice[];
}

const hudNoticePatterns = ['OUT OF TIME', 'GAME OVER'] as const;

export function readPracticeHud(
  heap: Uint8Array,
  twoPlayers = false,
): PracticeHud | undefined {
  const minLength = (2 * columns + (twoPlayers ? 39 : clockColumn + 4)) * 2;
  if (heap.byteLength < PRACTICE_ALPHA_RAM + minLength) return;
  const fullAlphaLength = 28 * columns * 2;
  const length =
    heap.byteLength >= PRACTICE_ALPHA_RAM + fullAlphaLength
      ? fullAlphaLength
      : minLength;
  const memory = new DataView(
    heap.buffer,
    heap.byteOffset + PRACTICE_ALPHA_RAM,
    length,
  );
  const tile = (row: number, column: number) =>
    memory.getUint16((row * columns + column) * 2, true);
  function player(
    scoreStart: number,
    scoreEnd: number,
    palette: number,
    clockStart: number,
  ) {
    for (let index = 0; index < scoreLabel.length; index++) {
      if (
        tile(1, scoreStart + index) !==
        palette + scoreLabel.charCodeAt(index)
      )
        return;
    }

    let score = '';
    for (let column = scoreStart; column < scoreEnd; column++) {
      const value = tile(2, column);
      if (value === 0) break;
      score += String.fromCharCode(value - palette);
    }
    if (!/^\d{1,3}(,\d{3})*$/.test(score)) return;

    function clockDigit(column: number) {
      const first = tile(1, column);
      const digit = (first - (firstClockTile + palette - scorePalette)) / 4;
      // Each digit occupies a 2 × 2 block. A partial glyph is not a clock value.
      return Number.isInteger(digit) &&
        digit >= 0 &&
        digit <= 9 &&
        tile(1, column + 1) === first + 1 &&
        tile(2, column) === first + 2 &&
        tile(2, column + 1) === first + 3
        ? digit
        : null;
    }
    const tens = clockDigit(clockStart);
    const ones = clockDigit(clockStart + 2);
    return {
      score,
      seconds: tens === null || ones === null ? null : tens * 10 + ones,
    };
  }

  const first = player(
    scoreColumn,
    twoPlayers ? 13 : clockColumn,
    scorePalette,
    twoPlayers ? 13 : clockColumn,
  );
  const second = twoPlayers ? player(32, 39, 0x2400, 25) : undefined;
  const notices: PracticeHudNotice[] = [];
  if (length >= fullAlphaLength) {
    for (let r = 4; r < 28; r++) {
      let line = '';
      for (let c = 0; c < 42; c++) {
        const value = tile(r, c);
        const code = value & 0x7f;
        line +=
          value !== 0 && code >= 0x20 && code <= 0x5f
            ? String.fromCharCode(code)
            : ' ';
      }
      for (const pattern of hudNoticePatterns) {
        let index = line.indexOf(pattern);
        while (index >= 0) {
          const sample = tile(r, index);
          notices.push({
            text: pattern,
            row: r,
            column: index,
            red: (sample & 0x0c00) === 0x0400,
          });
          index = line.indexOf(pattern, index + pattern.length);
        }
      }
    }
  }
  if (!first && !second && !notices.length) return;
  return {
    ...(first ?? { score: '', seconds: null }),
    ...(twoPlayers ? { player2: second ?? { score: '', seconds: null } } : {}),
    ...(notices.length ? { notices } : {}),
  };
}
