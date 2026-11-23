import { unzlibSync, zlibSync } from 'fflate';
import type { RollingActors, RollingModel } from './rollingActors';

const MAGIC = 0x31424d52; // 'RMB1'

interface BinaryModelHeader {
  readonly seconds: number;
  readonly poseCount: number;
  readonly vertexCount: number;
  readonly groups: readonly (readonly [string, number])[];
}

interface BinaryHeader {
  readonly textures: Readonly<Record<string, string>>;
  readonly models: readonly (readonly [string, BinaryModelHeader])[];
}

/** Compact zlib-compressed binary encoding for RollingActors (~4-5x smaller than JSON). */
export function encodeRollingActorsBinary(actors: RollingActors): Uint8Array {
  let totalFloats = 0;
  let totalIndices = 0;
  const modelHeaders: [string, BinaryModelHeader][] = [];

  for (const [key, model] of Object.entries(actors.models)) {
    const vertexCount = model.uvs.length / 2;
    const poseCount = model.poses.length;
    totalFloats += vertexCount * 2 + poseCount * vertexCount * 6;
    const groups: [string, number][] = [];
    for (const [tex, indices] of Object.entries(model.groups)) {
      groups.push([tex, indices.length]);
      totalIndices += indices.length;
    }
    modelHeaders.push([
      key,
      { seconds: model.seconds, poseCount, vertexCount, groups },
    ]);
  }

  const header: BinaryHeader = {
    textures: actors.textures,
    models: modelHeaders,
  };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
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
  for (const [, model] of Object.entries(actors.models)) {
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

  return zlibSync(new Uint8Array(raw), { level: 6 });
}

export function decodeRollingActorsBinary(
  compressed: Uint8Array,
): RollingActors {
  const unpacked = unzlibSync(compressed);
  const raw = unpacked.buffer.slice(
    unpacked.byteOffset,
    unpacked.byteOffset + unpacked.byteLength,
  );
  const view = new DataView(raw);
  if (raw.byteLength < 8 || view.getUint32(0, true) !== MAGIC) {
    throw new Error('Invalid binary rolling actors archive.');
  }
  const headerLen = view.getUint32(4, true);
  const paddedHeaderLen = (headerLen + 3) & ~3;
  const header = JSON.parse(
    new TextDecoder().decode(new Uint8Array(raw, 8, headerLen)),
  ) as BinaryHeader;

  let totalFloats = 0;
  let totalIndices = 0;
  for (const [, meta] of header.models) {
    totalFloats += meta.vertexCount * 2 + meta.poseCount * meta.vertexCount * 6;
    for (const [, count] of meta.groups) totalIndices += count;
  }

  const floats = new Float32Array(raw, 8 + paddedHeaderLen, totalFloats);
  const indices = new Uint16Array(
    raw,
    8 + paddedHeaderLen + totalFloats * 4,
    totalIndices,
  );
  let fOffset = 0;
  let iOffset = 0;
  const models: Record<string, RollingModel> = {};

  for (const [key, meta] of header.models) {
    const uvLen = meta.vertexCount * 2;
    const vecLen = meta.vertexCount * 3;
    const uvs = Array.from(floats.subarray(fOffset, fOffset + uvLen));
    fOffset += uvLen;
    const poses: { positions: number[]; normals: number[] }[] = [];
    for (let p = 0; p < meta.poseCount; p++) {
      const positions = Array.from(floats.subarray(fOffset, fOffset + vecLen));
      fOffset += vecLen;
      const normals = Array.from(floats.subarray(fOffset, fOffset + vecLen));
      fOffset += vecLen;
      poses.push({ positions, normals });
    }
    const groups: Record<string, number[]> = {};
    for (const [tex, count] of meta.groups) {
      groups[tex] = Array.from(indices.subarray(iOffset, iOffset + count));
      iOffset += count;
    }
    models[key] = { seconds: meta.seconds, uvs, poses, groups };
  }

  return { textures: header.textures, models };
}
