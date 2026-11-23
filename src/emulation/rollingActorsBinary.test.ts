import { expect, it } from 'vitest';
import {
  decodeRollingActorsBinary,
  encodeRollingActorsBinary,
} from './rollingActorsBinary';
import type { RollingActors } from './rollingActors';

it('round-trips rolling actors through compact zlib binary format', () => {
  const sample: RollingActors = {
    textures: {
      'bird.png': 'data:image/png;base64,iVBORw0KGgo=',
    },
    models: {
      bird: {
        seconds: 0.4,
        uvs: [0, 0, 1, 0, 0.5, 1],
        poses: [
          {
            positions: [0, 0, 0, 1.5, 0, 0, 0, 2.25, -0.5],
            normals: [0, 0, 1, 0, 0, 1, 0, 1, 0],
          },
          {
            positions: [0, 0.5, 0, 1.5, 0.5, 0, 0, 2.75, -0.5],
            normals: [0, 0, 1, 0, 0, 1, 0, 1, 0],
          },
        ],
        groups: {
          'bird.png': [0, 1, 2],
        },
      },
    },
  };

  const encoded = encodeRollingActorsBinary(sample);
  const decoded = decodeRollingActorsBinary(encoded);
  expect(decoded.textures).toEqual(sample.textures);
  expect(decoded.models.bird!.seconds).toBe(0.4);
  expect(decoded.models.bird!.groups).toEqual(sample.models.bird!.groups);
  expect(decoded.models.bird!.poses).toHaveLength(2);
  expect(decoded.models.bird!.poses[0]!.positions[3]).toBeCloseTo(1.5, 5);
  expect(decoded.models.bird!.poses[1]!.positions[7]).toBeCloseTo(2.75, 5);
});
