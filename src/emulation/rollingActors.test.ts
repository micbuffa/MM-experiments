import { expect, it } from 'vitest';
import { parseRollingActors } from './rollingActors';

const fixture = () => ({
  format: 'rolling-actors-v1',
  textures: { 'player.png': 'data:image/png;base64,AA==' },
  models: {
    player_broken: {
      seconds: 2,
      poses: [
        {
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        },
      ],
      uvs: [0, 0, 1, 0, 0, 1],
      groups: { 'player.png': [0, 1, 2] },
    },
  },
});
it('loads morph poses and rejects external textures or out-of-range faces', () => {
  const data = fixture();
  expect(
    parseRollingActors(JSON.stringify(data)).models.player_broken?.poses,
  ).toHaveLength(1);
  data.models.player_broken.groups['player.png'][0] = 9;
  expect(() => parseRollingActors(JSON.stringify(data))).toThrow();
  const external = fixture();
  external.textures['player.png'] = 'https://example.com/texture.png';
  expect(() => parseRollingActors(JSON.stringify(external))).toThrow();
  expect(() => parseRollingActors('{}')).toThrow();
});
