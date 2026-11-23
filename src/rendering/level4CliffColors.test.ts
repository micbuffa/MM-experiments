import { expect, it } from 'vitest';
import { level4CliffColors } from './createLevel4Materials';

it('paints entire low finish walls yellow while preserving high walls and the opening', () => {
  const height = (arcade: number) => ((arcade - 16384) * Math.sqrt(2 / 3)) / 8;
  const wall = (x: number, z: number, top: number) => [
    x - 65,
    height(top),
    z - 65,
    x - 65,
    height(top),
    z + 1 - 65,
    x - 65,
    -40,
    z + 1 - 65,
    x - 65,
    -40,
    z - 65,
  ];
  const colors = level4CliffColors(
    [
      ...wall(105, 104, 16228),
      ...wall(90, 95, 16272),
      ...wall(22, 23, 16228),
      ...wall(105, 104, 16240),
    ],
    130,
    130,
  );
  // Green encodes full-wall yellow; high walls retain the shader's height/frieze split.
  expect([1, 5, 9, 13].map((i) => colors[i])).toEqual([0.9, 0.9, 0.9, 0.9]);
  for (let i = 17; i < colors.length; i += 4) expect(colors[i]).toBe(0.28);
  expect(level4CliffColors([], 130, 130)).toEqual([]);
});
