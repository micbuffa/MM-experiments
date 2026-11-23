import { createHash } from 'node:crypto';
import console from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseIntermediatePipeGeometry } from '../src/game/modern/intermediatePipeGeometry.ts';

const [meshPath, surveyPath, examplePath] = process.argv.slice(2);
if (
  !meshPath ||
  !surveyPath ||
  !examplePath ||
  resolve(surveyPath) === resolve(examplePath)
)
  throw new Error(
    'Usage : node scripts/add-intermediate-pipes.mjs lev2.ase.mesh relevé.json copie.json',
  );

const mesh = await readFile(meshPath);
if (
  createHash('sha256').update(mesh).digest('hex') !==
  '5004cd1c6618426dda4e0137154ef967a785b19294cdd5abea1047d16f5baa4c'
)
  throw new Error(
    'Le maillage ne correspond pas à lev2.ase.mesh de l’installateur examiné.',
  );
const survey = JSON.parse(await readFile(surveyPath, 'utf8'));
if (survey.format !== 'intermediate-terrain-v1' || survey.rows?.length !== 130)
  throw new Error('Sélectionner le relevé de 130 dalles d’Intermediate Race.');

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
  // Match the paved levels and their edges in the two terrain grids.
  positions.push(
    rounded(z / 10 + 60 - width / 2),
    rounded(((y - 305) / 1.25 + 16264 - 16384) * heightScale),
    rounded(x / 10 + 65 - width / 2),
  );
  // Apply the inverse transpose of the position transform to the source normal.
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
    material === 'lev2_tube_out.png'
      ? shell
      : material === 'lev2_tube_in.png'
        ? interior
        : undefined;
  if (indices)
    // The X/Z swap reflects the mesh. Preserve the outward face winding.
    for (const corner of [0, 8, 4])
      indices.push(vertex(mesh.readUInt32LE(offset + corner)));
}
survey.pipes = parseIntermediatePipeGeometry({
  positions,
  normals,
  shell,
  interior,
});
await writeFile(examplePath, JSON.stringify(survey));
console.log(
  `${shell.length / 3} triangles de coque, ${interior.length / 3} triangles intérieurs.`,
);
