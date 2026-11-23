import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { arcadeCellUnits } from '../game/modern/practiceProjection';
import { marbleRadius } from './createPracticeMarble';

const penaltyLettering = [
  '.....####..',
  '.....#.....',
  '.###.####..',
  '........#..',
  '.....####..',
  '...........',
  '###.###.###',
  '#...#...#..',
  '###.##..#..',
  '..#.#...#..',
  '###.###.###',
] as const;
const bonusLettering = [
  '.#...#..###',
  '.#..##..#.#',
  '###..#..#.#',
  '.#...#..#.#',
  '.#..###.###',
  '...........',
  '###.###.###',
  '#...#...#..',
  '###.##..#..',
  '..#.#...#..',
  '###.###.###',
];
const bonus3Lettering = [
  '..#...###..',
  '..#.....#..',
  '.###..###..',
  '..#.....#..',
  '..#...###..',
  '...........',
  '###.###.###',
  '#...#...#..',
  '###.##..#..',
  '..#.#...#..',
  '###.###.###',
];
const pixelsPerWorldUnit = arcadeCellUnits * Math.SQRT2;

export function createPracticeCatchUpLabel(
  scene: Scene,
  name: string,
  red: boolean,
  bonus: boolean | number | '+3' = false,
) {
  const digits = [
    ['###', '#.#', '#.#', '#.#', '###'],
    ['.#.', '##.', '.#.', '.#.', '###'],
    ['###', '..#', '###', '#..', '###'],
    ['###', '..#', '.##', '..#', '###'],
    ['#.#', '#.#', '###', '..#', '..#'],
    ['###', '#..', '###', '..#', '###'],
    ['###', '#..', '###', '#.#', '###'],
    ['###', '..#', '..#', '..#', '..#'],
    ['###', '#.#', '###', '#.#', '###'],
    ['###', '#.#', '###', '..#', '###'],
  ];
  const lettering =
    typeof bonus === 'number'
      ? Array.from({ length: 5 }, (_, row) =>
          String(bonus)
            .split('')
            .map((digit) => digits[Number(digit)]![row])
            .join('.'),
        )
      : bonus === '+3'
        ? bonus3Lettering
        : bonus
          ? bonusLettering
          : penaltyLettering;
  const labelWidth = lettering[0]!.length;
  const labelHeight = lettering.length;
  const pixels = new Uint8Array(labelWidth * labelHeight * 4);
  const ink = red ? [169, 0, 0, 255] : [0, 0, 254, 255];
  for (const [y, row] of lettering.entries()) {
    for (let x = 0; x < labelWidth; x++) {
      if (row[x] === '#') pixels.set(ink, (y * labelWidth + x) * 4);
    }
  }
  const texture = RawTexture.CreateRGBATexture(
    pixels,
    labelWidth,
    labelHeight,
    scene,
    false,
    true,
    Texture.NEAREST_SAMPLINGMODE,
  );
  texture.hasAlpha = true;
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = new StandardMaterial(`${name}-catch-up-ink`, scene);
  material.disableLighting = true;
  material.transparencyMode = Material.MATERIAL_ALPHATEST;
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.emissiveTexture = texture;
  const label = CreatePlane(
    `${name}-catch-up`,
    {
      width: labelWidth / pixelsPerWorldUnit,
      height: labelHeight / pixelsPerWorldUnit,
    },
    scene,
  );
  label.billboardMode = TransformNode.BILLBOARDMODE_ALL;
  label.renderingGroupId = 1;
  label.isPickable = false;
  label.material = material;
  label.setEnabled(false);
  const right = Vector3.Zero();
  const up = Vector3.Zero();

  return (
    position: { x: number; y: number; z: number } | null,
    offset?: number,
  ) => {
    const camera = scene.activeCamera;
    if (!camera || !position || offset === undefined) {
      label.setEnabled(false);
      return;
    }
    camera.getDirectionToRef(Vector3.RightReadOnly, right);
    camera.getDirectionToRef(Vector3.UpReadOnly, up);
    // Center the arcade sprite's lateral swing over the marble.
    right.scaleInPlace((offset + 10) / pixelsPerWorldUnit);
    up.scaleInPlace(13 / pixelsPerWorldUnit);
    label.position.set(position.x, position.y + marbleRadius, position.z);
    label.position.addInPlace(right).addInPlace(up);
    label.setEnabled(true);
  };
}
