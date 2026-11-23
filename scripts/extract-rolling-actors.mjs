import { level5WallPattern } from './level5-wall-pattern.mjs';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import console from 'node:console';
import process from 'node:process';

const [root, destination = 'local-roms/rolling-actors.json'] =
  process.argv.slice(2);
if (!root)
  throw new Error('Indiquer le dossier extrait contenant model/ et texture/.');
const fallbackPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const textureFiles = await readdir(join(root, 'texture'));
const models = {};
const textures = {};
for (const name of [
  'stick_idle',
  'stick_bend',
  'stick_jump_start',
  'stick_jump',
  'player',
  'player_dizzy',
  'player_broken',
  'player_melt',
  'player_hoover',
  'catapult',
  'catapult_throw',
  'hammer',
  'blacky',
  'amoeba_stretch',
  'bird',
  'bird_fast',
  'bird_expl',
  'blacky_mini',
  'blacky_squashed_mini',
  'stick_idle_mini',
  'stick_squashed_mini',
  'amoeba_squashed_mini',
  'amoeba_stretch_mini',
  'lev5',
]) {
  const bytes = await readFile(join(root, 'model', name + '.ase.mesh'));
  let offset = 0;
  const count = () => {
    const value = bytes.readUInt32LE(offset);
    offset += 4;
    return value;
  };
  const names = () =>
    Array.from({ length: count() }, () => {
      const end = bytes.indexOf(0x22, offset + 1);
      if (end < 0) throw new Error('Noms de matériaux invalides.');
      const value = bytes.toString('utf8', offset + 1, end);
      offset = end + 1;
      return value;
    });
  const materials = names();
  names();
  const frames = count() + 1;
  const seconds = bytes.readFloatLE(offset);
  offset += 4;
  const vertexCount = count();
  const vertices = offset;
  offset += vertexCount * 24;
  const vertexPerFrame = count();
  const uvOffset = offset;
  offset += vertexPerFrame * 24;
  if (vertexCount !== frames * vertexPerFrame)
    throw new Error('Nombre de poses incompatible.');
  const faces = count();
  const groups = new Map();
  for (let i = 0; i < faces; i++, offset += 28) {
    const material = materials[bytes.readInt32LE(offset + 12)];
    if (!material) throw new Error('Matériau manquant.');
    let indices = groups.get(material);
    if (!indices) groups.set(material, (indices = []));
    for (const corner of [0, 8, 4])
      indices.push(bytes.readUInt32LE(offset + corner));
    if (!(material in textures)) {
      try {
        const image = await readFile(
          join(
            root,
            'texture',
            textureFiles.find(
              (name) => name.toLowerCase() === material.toLowerCase(),
            ) ?? material,
          ),
        );
        textures[material] =
          'data:image/' +
          (material.endsWith('.jpg') ? 'jpeg' : 'png') +
          ';base64,' +
          image.toString('base64');
      } catch {
        textures[material] = fallbackPng;
      }
    }
  }
  const poses = Array.from({ length: frames }, (_, frame) => {
    const positions = [],
      normals = [];
    for (let i = 0; i < vertexPerFrame; i++) {
      const at = vertices + (frame * vertexPerFrame + i) * 24;
      // Reuse the level importer axis convention and invert winding above.
      positions.push(
        bytes.readFloatLE(at + 8),
        bytes.readFloatLE(at + 4),
        bytes.readFloatLE(at),
      );
      normals.push(
        bytes.readFloatLE(at + 20),
        bytes.readFloatLE(at + 16),
        bytes.readFloatLE(at + 12),
      );
    }
    return { positions, normals };
  });
  const uvs = [];
  for (let i = 0; i < vertexPerFrame; i++) {
    uvs.push(
      bytes.readFloatLE(uvOffset + i * 24),
      1 - bytes.readFloatLE(uvOffset + i * 24 + 4),
    );
  }
  if (name === 'lev5') {
    // Static clock only. The terrain remains the native collision survey.
    const indices = groups.get('catapult.png');
    if (!indices) throw new Error('Horloge du niveau 5 absente.');
    const used = [...new Set(indices)];
    const remap = new Map(used.map((old, i) => [old, i]));
    const source = poses[0];
    const positions = used.flatMap((i) => [
      source.positions[i * 3] / 10 + 74.2815673828125 - 70.5,
      ((source.positions[i * 3 + 1] * 0.8 + 15902 - 16384) * Math.sqrt(2 / 3)) /
        8,
      source.positions[i * 3 + 2] / 10,
    ]);
    models.level5_clock = {
      seconds: 0,
      poses: [
        {
          positions,
          normals: used.flatMap((i) => source.normals.slice(i * 3, i * 3 + 3)),
        },
      ],
      uvs: used.flatMap((i) => uvs.slice(i * 2, i * 2 + 2)),
      groups: { 'catapult.png': indices.map((i) => remap.get(i)) },
    };
    const side = textureFiles.find(
      (name) => name.toLowerCase() === 'lev5_side.png',
    );
    textures['lev5_side.png'] =
      'data:image/png;base64,' +
      (await readFile(join(root, 'texture', side))).toString('base64');
  } else
    models[name] = { seconds, poses, uvs, groups: Object.fromEntries(groups) };
  console.log(name, frames, 'poses', faces, 'triangles');
}
textures['level5_native_wall_mask.png'] =
  'data:image/png;base64,' +
  level5WallPattern(
    await readFile('MM_original_levels_full_views/MarbleMadness_Level5.png'),
  ).toString('base64');
await mkdir('local-roms', { recursive: true });
await writeFile(
  destination,
  JSON.stringify({ format: 'rolling-actors-v1', models, textures }),
);
