import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'dist-beta');
const dataDir = join(outDir, 'beta-data');

const MAGIC = 0x31424d52; // 'RMB1'

function encodeRollingActorsBinary(actors) {
  let totalFloats = 0;
  let totalIndices = 0;
  const modelHeaders = [];

  for (const [key, model] of Object.entries(actors.models)) {
    const vertexCount = model.uvs.length / 2;
    const poseCount = model.poses.length;
    totalFloats += vertexCount * 2 + poseCount * vertexCount * 6;
    const groups = [];
    for (const [tex, indices] of Object.entries(model.groups)) {
      groups.push([tex, indices.length]);
      totalIndices += indices.length;
    }
    modelHeaders.push([
      key,
      { seconds: model.seconds, poseCount, vertexCount, groups },
    ]);
  }

  const headerBytes = Buffer.from(
    JSON.stringify({ textures: actors.textures, models: modelHeaders }),
    'utf8',
  );
  const paddedHeaderLen = (headerBytes.byteLength + 3) & ~3;
  const floatsBytes = totalFloats * 4;
  const indicesBytes = totalIndices * 2;
  const raw = new ArrayBuffer(8 + paddedHeaderLen + floatsBytes + indicesBytes);
  const view = new DataView(raw);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, headerBytes.byteLength, true);
  new Uint8Array(raw, 8, headerBytes.byteLength).set(headerBytes);

  const floats = new Float32Array(raw, 8 + paddedHeaderLen, totalFloats);
  const indices = new Uint16Array(
    raw,
    8 + paddedHeaderLen + floatsBytes,
    totalIndices,
  );
  let fOffset = 0;
  let iOffset = 0;
  for (const model of Object.values(actors.models)) {
    floats.set(model.uvs, fOffset);
    fOffset += model.uvs.length;
    for (const pose of model.poses) {
      floats.set(pose.positions, fOffset);
      fOffset += pose.positions.length;
      floats.set(pose.normals, fOffset);
      fOffset += pose.normals.length;
    }
    for (const group of Object.values(model.groups)) {
      indices.set(group, iOffset);
      iOffset += group.length;
    }
  }
  return deflateSync(Buffer.from(raw), { level: 6 });
}

const ASSETS = [
  ['roms', 'marble.zip'],
  ['roms', 'atarisy1.zip'],
  ['local-roms', 'attract-web.state'],
  ['local-roms', 'practice-complete-terrain.json'],
  ['local-roms', 'intermediate-terrain-pipes.json'],
  ['local-roms', 'intermediate-web.state'],
  ['local-roms', 'level3-terrain.json'],
  ['local-roms', 'level3-web.state'],
  ['local-roms', 'level4-terrain.json'],
  ['local-roms', 'level4-web.state'],
  ['local-roms', 'level5-terrain.json'],
  ['local-roms', 'level5-web.state'],
];

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--config', 'vite.beta.config.ts'],
  { cwd: root, stdio: 'inherit' },
);

await rename(join(outDir, 'beta.html'), join(outDir, 'index.html'));
await copyFile(join(root, 'scripts', 'beta-sw.js'), join(outDir, 'sw.js'));
await mkdir(dataDir, { recursive: true });

for (const [dir, file] of ASSETS) {
  const src = join(root, dir, file);
  await stat(src);
  await copyFile(src, join(dataDir, file));
}

const actorsJson = join(root, 'local-roms', 'rolling-actors.json');
const actorsData = JSON.parse(await readFile(actorsJson, 'utf8'));
const actorsBin = encodeRollingActorsBinary(actorsData);
await writeFile(join(dataDir, 'rolling-actors.bin'), actorsBin);

process.stdout.write(
  `\n✓ Distribution statique beta prête dans ${outDir} (${ASSETS.length} fichiers + rolling-actors.bin ${(actorsBin.byteLength / 1024).toFixed(0)} Ko + sw.js).\n`,
);
