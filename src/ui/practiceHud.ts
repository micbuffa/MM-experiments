import type { PracticeHud } from '../emulation/practiceHud';

// 8 × 8 cells drawn to match the block lettering of the arcade overlay.
const scoreGlyphs: Readonly<Record<string, string>> = {
  A: '..###.. .##.##. ##...## ####### ##...## ##...## ##...##',
  C: '.#####. ##...## ##..... ##..... ##..... ##...## .#####.',
  E: '####### ##..... ##..... #####.. ##..... ##..... #######',
  F: '####### ##..... ##..... #####.. ##..... ##..... ##.....',
  G: '.#####. ##...## ##..... ##..### ##...## ##...## .#####.',
  I: '.#####. ...#... ...#... ...#... ...#... ...#... .#####.',
  M: '##...## ###.### ####### ##.#.## ##...## ##...## ##...##',
  O: '.#####. ##...## ##...## ##...## ##...## ##...## .#####.',
  R: '######. ##...## ##...## ##..##. #####.. ##.###. ##..###',
  S: '.####.. ##..##. ##..... .#####. .....## ##...## .#####.',
  T: '####### ...#... ...#... ...#... ...#... ...#... ...#...',
  U: '##...## ##...## ##...## ##...## ##...## ##...## .#####.',
  V: '##...## ##...## ##...## ##...## .##.##. ..###.. ...#...',
  ' ': '....... ....... ....... ....... ....... ....... .......',
  '0': '..###.. .##.##. ##...## ##...## ##...## .##.##. ..###..',
  '1': '...##.. ..###.. .####.. ...##.. ...##.. ...##.. .######',
  '2': '.#####. ##...## ....### ...#### ..####. .###... #######',
  '3': '######. .....## ....##. ..####. .....## ##...## .#####.',
  '4': '...###. ..####. .##.##. ##..##. ####### ....##. ....##.',
  '5': '######. ##..... ######. .....## .....## ##...## .#####.',
  '6': '..####. .##.... ##..... ######. ##...## ##...## .#####.',
  '7': '####### ##...## ....##. ...##.. ..##... ..##... ..##...',
  '8': '.#####. ##...## ##...## .#####. ##...## ##...## .#####.',
  '9': '.#####. ##...## ##...## .###### .....## ....##. .####..',
  ',': '....... ....... ....... ....... ....... ...##.. ....#.. ....#..',
};

// The clock reserves the last column of each 16 × 16 cell as a gutter.
const clockGlyphs = [
  `....######....
..##########..
.####....####.
.###......###.
###........###
###........###
###........###
###........###
###........###
###........###
.###......###.
.####....####.
..##########..
....######....`,
  `.....###......
....####......
..######......
..##.###......
.....###......
.....###......
.....###......
.....###......
.....###......
.....###......
.....###......
.....###......
....#####.....
..#########...`,
  `...#######....
..##########..
.###.....####.
.##.......###.
..........###.
.........####.
.......#####..
.....#####....
...#####......
..####........
.####.......#.
.###.......##.
.############.
#############.`,
  `...#######....
..#########...
.###.....###..
.##.......###.
..........###.
.........####.
.....#######..
......######..
..........###.
.##........###
.###.......###
..###.....###.
...#########..
....#######...`,
  `.........##...
........###...
.......####...
......#####...
.....##.###...
....##..###...
...##...###...
..##....###...
.###########..
.############.
........###...
........###...
.......#####..
......#######.`,
  `.############.
.############.
.###.......##.
.###..........
.###..........
.##########...
.############.
.####.....###.
..........####
...........###
.##........###
.###......###.
..##########..
....######....`,
  `.....#######..
...#########..
..####.....##.
.####.........
.###..........
.###.#####....
.###########..
.####....####.
###........###
###........###
###........###
.###......###.
..##########..
....######....`,
  `.#############
.#############
.##.......####
.##......####.
........####..
.......####...
......####....
......###.....
.....###......
.....###......
....###.......
....###.......
....###.......
....###.......`,
  `....######....
..##########..
.####....####.
.###......###.
..###....####.
...#########..
....#######...
..##########..
.####....####.
###........###
###........###
.####....####.
..##########..
....######....`,
  `....######....
..##########..
.###......###.
###........###
###........###
###........###
.###.....####.
..###########.
....#####.###.
..........###.
.........####.
.##.....####..
..#########...
..#######.....`,
].map((glyph) => glyph.replace(/^(.{7})./gm, '$1'));

function drawGlyph(
  context: CanvasRenderingContext2D,
  bitmap: string,
  x: number,
  y: number,
  outline = 0,
) {
  bitmap.split(/\s+/).forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '#')
        context.fillRect(
          x + dx - outline,
          y + dy - outline,
          1 + 2 * outline,
          1 + 2 * outline,
        );
    }
  });
}

function paintPlayer(
  context: CanvasRenderingContext2D,
  score: string,
  time: string,
  scoreX: number,
  clockX: number,
  ink: string,
) {
  context.fillStyle = '#a9a9a9';
  if (score) {
    context.fillRect(scoreX, 8, 40, 8);
    context.fillRect(scoreX, 16, score.length * 8, 8);
    context.fillStyle = ink;
    [...'SCORE'].forEach((letter, index) =>
      drawGlyph(context, scoreGlyphs[letter]!, scoreX + index * 8, 8),
    );
    [...score].forEach((digit, index) =>
      drawGlyph(context, scoreGlyphs[digit]!, scoreX + index * 8, 16),
    );
  }
  if (time) {
    context.fillStyle = '#a9a9a9';
    context.fillRect(clockX, 8, 32, 16);
  }
  [...time].forEach((digit, index) => {
    const glyph = clockGlyphs[Number(digit)]!;
    const x = clockX + 1 + index * 16;
    context.fillStyle = '#000000';
    drawGlyph(context, glyph, x, 9, 1);
    context.fillStyle = ink;
    drawGlyph(context, glyph, x, 9);
  });
}

function clockText(seconds: number | null | undefined) {
  return seconds == null ? '' : String(seconds).padStart(2, '0');
}

export function mountPracticeHud(root: HTMLElement) {
  const score = root.querySelector<HTMLElement>('#practice-score')!;
  const clock = root.querySelector<HTMLElement>('#practice-clock')!;
  const score2 = root.querySelector<HTMLElement>('#practice-score-2')!;
  const score2Label = root.querySelector<HTMLElement>(
    '#practice-score-2-label',
  )!;
  const clock2 = root.querySelector<HTMLElement>('#practice-clock-2')!;
  const context = root.querySelector('canvas')!.getContext('2d');
  let twoPlayers = false;
  let noticeKey = '';

  return (hud: PracticeHud | undefined) => {
    const points = hud?.score ?? '';
    const time = clockText(hud?.seconds);
    const points2 = hud?.player2?.score ?? '';
    const time2 = clockText(hud?.player2?.seconds);
    const duo = hud?.player2 !== undefined;
    const nextNoticeKey =
      hud?.notices
        ?.map((n) => `${n.row}:${n.column}:${n.red ? 1 : 0}:${n.text}`)
        .join('|') ?? '';
    if (
      root.hidden === !hud &&
      twoPlayers === duo &&
      noticeKey === nextNoticeKey &&
      score.textContent === points &&
      clock.textContent === time &&
      score2.textContent === points2 &&
      clock2.textContent === time2
    )
      return;
    twoPlayers = duo;
    noticeKey = nextNoticeKey;
    score.textContent = points;
    clock.textContent = time;
    clock.setAttribute('aria-label', duo ? 'Chrono J1' : 'Chrono');
    clock.hidden = !time;
    score2.textContent = points2;
    score2Label.hidden = !points2;
    clock2.textContent = time2;
    clock2.hidden = !time2;
    root.hidden = !hud;
    if (context && hud) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      paintPlayer(context, points, time, 24, duo ? 104 : 152, '#0000fe');
      if (duo) paintPlayer(context, points2, time2, 256, 200, '#ee1913');
      for (const notice of hud.notices ?? []) {
        const x = notice.column * 8;
        const y = notice.row * 8;
        context.fillStyle = '#a9a9a9';
        context.fillRect(x - 4, y - 2, notice.text.length * 8 + 8, 12);
        context.fillStyle = notice.red ? '#ee1913' : '#0000fe';
        [...notice.text].forEach((letter, index) => {
          const glyph = scoreGlyphs[letter];
          if (glyph) drawGlyph(context, glyph, x + index * 8, y);
        });
      }
    }
  };
}
