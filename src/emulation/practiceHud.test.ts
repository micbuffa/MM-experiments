import { describe, expect, it } from 'vitest';
import { PRACTICE_ALPHA_RAM, readPracticeHud } from './practiceHud';

describe('readPracticeHud', () => {
  const length = 302;
  const heap = new Uint8Array(PRACTICE_ALPHA_RAM + length + 1).subarray(1);
  const alpha = new DataView(heap.buffer, heap.byteOffset + PRACTICE_ALPHA_RAM);

  function row(offset: number, words: number[]) {
    words.forEach((word, index) =>
      alpha.setUint16(offset + index * 2, word, true),
    );
  }

  function arrange() {
    heap.fill(0, PRACTICE_ALPHA_RAM);
    row(134, [0x2053, 0x2043, 0x204f, 0x2052, 0x2045]);
    row(262, [0x2030]);
    row(166, [0x2914, 0x2915, 0x2920, 0x2921]);
    row(294, [0x2916, 0x2917, 0x2922, 0x2923]);
  }

  it('reads the score and the four-tile digits from the frame-1199 layout', () => {
    arrange();
    expect(readPracticeHud(heap)).toEqual({ score: '0', seconds: 58 });
  });

  it('preserves the grouping of the goal score and the core’s remaining time', () => {
    arrange();
    row(262, [0x2031, 0x202c, 0x2032, 0x2037, 0x2030]);
    row(166, [0x2910, 0x2911, 0x291c, 0x291d]);
    row(294, [0x2912, 0x2913, 0x291e, 0x291f]);
    expect(readPracticeHud(heap)).toEqual({ score: '1,270', seconds: 47 });
  });

  it('distinguishes zero from a missing or incomplete clock', () => {
    arrange();
    row(166, [0x2900, 0x2901, 0x2900, 0x2901]);
    row(294, [0x2902, 0x2903, 0x2902, 0x2903]);
    expect(readPracticeHud(heap)).toEqual({ score: '0', seconds: 0 });
    row(300, [0]);
    expect(readPracticeHud(heap)).toEqual({ score: '0', seconds: null });
  });

  it('ignores absent or incompatible score tiles and truncated memory', () => {
    arrange();
    expect(readPracticeHud(heap.subarray(0, -1))).toBeUndefined();
    row(262, [0x2041]);
    expect(readPracticeHud(heap)).toBeUndefined();
    row(262, [0x2030]);
    row(134, [0]);
    expect(readPracticeHud(heap)).toBeUndefined();
  });

  it('reads the two scores and clocks independently from the duo layout', () => {
    const duo = new Uint8Array(PRACTICE_ALPHA_RAM + 334);
    const tiles = new DataView(duo.buffer, PRACTICE_ALPHA_RAM);
    const write = (y: number, x: number, ...values: number[]) =>
      values.forEach((value, i) =>
        tiles.setUint16((y * 64 + x + i) * 2, value, true),
      );
    write(1, 3, 0x2053, 0x2043, 0x204f, 0x2052, 0x2045);
    write(2, 3, 0x2031, 0x2030);
    write(1, 13, 0x2914, 0x2915, 0x2920, 0x2921);
    write(2, 13, 0x2916, 0x2917, 0x2922, 0x2923);
    write(1, 32, 0x2453, 0x2443, 0x244f, 0x2452, 0x2445);
    write(2, 32, 0x2431, 0x2439, 0x2430);
    write(1, 25, 0x2d10, 0x2d11, 0x2d1c, 0x2d1d);
    write(2, 25, 0x2d12, 0x2d13, 0x2d1e, 0x2d1f);
    expect(readPracticeHud(duo, true)).toEqual({
      score: '10',
      seconds: 58,
      player2: { score: '190', seconds: 47 },
    });
    write(1, 3, 0);
    expect(readPracticeHud(duo, true)?.player2?.score).toBe('190');
    expect(
      readPracticeHud(duo.subarray(0, 333 + PRACTICE_ALPHA_RAM), true),
    ).toBeUndefined();
  });

  it('reads native OUT OF TIME and GAME OVER banners from full alpha RAM', () => {
    const full = new Uint8Array(PRACTICE_ALPHA_RAM + 30 * 64 * 2);
    const tiles = new DataView(full.buffer, PRACTICE_ALPHA_RAM);
    const writeText = (y: number, x: number, text: string, palette: number) => {
      [...text].forEach((ch, i) =>
        tiles.setUint16((y * 64 + x + i) * 2, palette + ch.charCodeAt(0), true),
      );
    };
    writeText(1, 3, 'SCORE', 0x2000);
    writeText(2, 3, '500', 0x2000);
    writeText(12, 15, 'OUT OF TIME', 0x2000);
    writeText(15, 16, 'GAME OVER', 0x2400);
    expect(readPracticeHud(full)).toEqual({
      score: '500',
      seconds: null,
      notices: [
        { text: 'OUT OF TIME', row: 12, column: 15, red: false },
        { text: 'GAME OVER', row: 15, column: 16, red: true },
      ],
    });
  });
});
