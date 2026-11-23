import console from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { parseIntermediatePipeGeometry } from '../src/game/modern/intermediatePipeGeometry.ts';

const [meshPath, surveyPath, outputPath] = process.argv.slice(2);
if (!meshPath || !surveyPath || !outputPath)
  throw new Error(
    'Usage : node scripts/add-level3-pipes.mjs lev3.ase.mesh level3-terrain.json out.json',
  );

const mesh = await readFile(meshPath);
const survey = JSON.parse(await readFile(surveyPath, 'utf8'));
if (survey.format !== 'level3-terrain-v1' || survey.rows?.length !== 118)
  throw new Error('Sélectionner le relevé de 118 dalles du niveau 3.');

let offset = 0;
function readCount() {
  const count = mesh.readUInt32LE(offset);
  offset += 4;
  return count;
}
function readNames() {
  return Array.from({ length: readCount() }, () => {
    const end = mesh.indexOf(0x22, offset + 1);
    const name = mesh.toString('ascii', offset + 1, end);
    offset = end + 1;
    return name;
  });
}

const textures = readNames();
readNames(); // Lightmap names.
offset += 8;
const vertexCount = readCount();
const vertexOffset = offset;
offset += vertexCount * 24;
const uvCount = readCount();
offset += uvCount * 24;
const faceCount = readCount();
const width = survey.rows.length;
const heightScale = Math.sqrt(2 / 3) / 8;
const positions = [];
const normals = [];
const shell = [];
const interior = [];
const compactIndices = new Map();
const rounded = (number) => Number(number.toFixed(4));

function vertex(index) {
  const existing = compactIndices.get(index);
  if (existing !== undefined) return existing;
  const indexInBuffer = vertexOffset + 24 * index;
  const x = mesh.readFloatLE(indexInBuffer);
  const y = mesh.readFloatLE(indexInBuffer + 4);
  const z = mesh.readFloatLE(indexInBuffer + 8);
  const positionIndex = positions.length / 3;
  // Exact mapping verified against local-roms/level3-terrain.json (118x118).
  positions.push(
    rounded(z / 10 + 54 - width / 2),
    rounded(((y - 60) / 1.25 + 16100 - 16384) * heightScale),
    rounded(x / 10 + 58 - width / 2),
  );
  const nx = mesh.readFloatLE(indexInBuffer + 20) * 10;
  const ny = (mesh.readFloatLE(indexInBuffer + 16) * 1.25) / heightScale;
  const nz = mesh.readFloatLE(indexInBuffer + 12) * 10;
  const length = Math.hypot(nx, ny, nz);
  normals.push(
    rounded(nx / length),
    rounded(ny / length),
    rounded(nz / length),
  );
  compactIndices.set(index, positionIndex);
  return positionIndex;
}

for (let i = 0; i < faceCount; i++, offset += 28) {
  const material = textures[mesh.readInt32LE(offset + 12)];
  const indices =
    material === 'lev3_tube_out.png'
      ? shell
      : material === 'lev2_tube_in.png'
        ? interior
        : undefined;
  if (indices)
    for (const corner of [0, 8, 4])
      indices.push(vertex(mesh.readUInt32LE(offset + corner)));
}

survey.pipes = parseIntermediatePipeGeometry({
  positions,
  normals,
  shell,
  interior,
});
await writeFile(outputPath, JSON.stringify(survey));
console.log(
  `Level 3 pipe: ${shell.length / 3} shell tris, ${interior.length / 3} interior tris.`,
);
