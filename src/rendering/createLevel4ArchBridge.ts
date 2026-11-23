import { archBridgeGeometry } from './archBridgeGeometry';
import { createLevel4RampEndJoints } from './createLevel4RampEndJoints';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { terrainCliffs } from '../game/modern/terrainCliffs';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { level4CliffColors } from './createLevel4Materials';

type Walls = ReturnType<typeof terrainCliffs>;

// Both native profiles span three tiles. Rim-to-intrados depths are 9/15
// arcade height units on the upper pair and 10/16 on the lower pair.
// Measurements use the full arcade reference, aligned on adjacent tile joints.
const bridgeSpans = [
  {
    name: 'level4-bridge-arches',
    checkX: 77,
    checkZ: 79,
    alongAxis: 'z' as const,
    alongStart: 78,
    alongSpan: 3,
    sideMin: 76,
    sideMax: 79,
    thickness: 0.1,
    deckArcade: [16264, 16264] as const,
    floorArcade: 16228,
    crownArcade: 16255,
    springArcade: 16249,
  },
  {
    name: 'level4-lower-bridge-arches',
    checkX: 88,
    checkZ: 92,
    alongAxis: 'x' as const,
    alongStart: 87,
    alongSpan: 3,
    sideMin: 91,
    sideMax: 95,
    thickness: 0.1,
    deckArcade: [16272, 16272] as const,
    floorArcade: 16228,
    crownArcade: 16262,
    springArcade: 16256,
  },
] as const;

/** Remove only the cliff faces beneath the two long sides of each Level 4 arch span. */
export function openLevel4Bridge(
  walls: Walls,
  columns: number,
  rows: number,
): Walls {
  const indices: number[] = [];
  const toY = (arcade: number) => ((arcade - 16384) * Math.sqrt(2 / 3)) / 8;
  const topJumpThresholdY = toY(16336);
  for (let i = 0; i < walls.indices.length; i += 3) {
    const triangle = walls.indices.slice(i, i + 3);
    const x = triangle.map((v) => walls.positions[v * 3]! + columns / 2);
    const y = triangle.map((v) => walls.positions[v * 3 + 1]!);
    const z = triangle.map((v) => walls.positions[v * 3 + 2]! + rows / 2);
    const upperSide =
      (x.every((v) => Math.abs(v - 76) < 0.01) ||
        x.every((v) => Math.abs(v - 79) < 0.01)) &&
      Math.min(...z) >= 78 &&
      Math.max(...z) <= 81;
    // Open only the long sides. Keep the bank end walls at X=87/90:
    // the arches project their curved shadow onto these vertical receivers.
    const lowerSide =
      (z.every((v) => Math.abs(v - 91) < 0.01) ||
        z.every((v) => Math.abs(v - 94) < 0.01) ||
        z.every((v) => Math.abs(v - 95) < 0.01)) &&
      Math.min(...x) >= 86.99 &&
      Math.max(...x) <= 90.01;
    // The two crossing jump ramps at the top of Level 4 (X=22, Z=19..26 and Z=23, X=19..27)
    // are floating ski-jump spans at height 16344 above the continuous cliff walls at X=21/Z=21 (16320).
    // Remove all cliff walls in the jump/walkway corner region so we can build clean non-overlapping walls!
    const isTopJumpHeight = Math.max(...y) > topJumpThresholdY;
    const floatingRampZ =
      (x.every((v) => Math.abs(v - 22) < 0.01) ||
        x.every((v) => Math.abs(v - 23) < 0.01)) &&
      Math.min(...z) >= 18.99 &&
      Math.max(...z) <= 31.01;
    const floatingRampX =
      (z.every((v) => Math.abs(v - 23) < 0.01) ||
        z.every((v) => Math.abs(v - 24) < 0.01)) &&
      Math.min(...x) >= 18.99 &&
      Math.max(...x) <= 32.01;
    const floatingRampTipZ =
      isTopJumpHeight &&
      z.every((v) => Math.abs(v - 27) < 0.01) &&
      Math.min(...x) >= 21.99 &&
      Math.max(...x) <= 23.01;
    const floatingRampTipX =
      isTopJumpHeight &&
      x.every((v) => Math.abs(v - 28) < 0.01) &&
      Math.min(...z) >= 22.99 &&
      Math.max(...z) <= 24.01;
    if (
      upperSide ||
      lowerSide ||
      floatingRampZ ||
      floatingRampX ||
      floatingRampTipZ ||
      floatingRampTipX
    )
      continue;
    indices.push(...triangle);
  }
  return { ...walls, indices };
}

export function createLevel4ArchBridge(
  scene: Scene,
  cells: readonly (readonly TerrainCell[])[],
) {
  const columns = cells[0]!.length;
  const rows = cells.length;
  const toY = (arcade: number) => ((arcade - 16384) * Math.sqrt(2 / 3)) / 8;
  const meshes: Mesh[] = [];
  for (const span of bridgeSpans) {
    if (!cells[span.checkZ]?.[span.checkX]) continue;
    const { positions, indices, uvs } = archBridgeGeometry(span, columns, rows);
    const mesh = new Mesh(span.name, scene);
    const data = new VertexData();
    Object.assign(data, { positions, indices, uvs });
    data.normals = [];
    VertexData.ComputeNormals(positions, indices, data.normals);
    data.colors = level4CliffColors(positions, columns, rows);
    data.applyToMesh(mesh);
    mesh.material = scene.getMaterialByName('level4-cliffs');
    // The narrow strips retain directional shading and cast onto the passage.
    // They also receive the shadows of the opposite wall and the landings.
    mesh.receiveShadows = true;
    meshes.push(mesh);
  }

  // Build the thin 1-unit fascia walls and undersides for the two floating jump ramps at the start of Level 4.
  if (cells[23]?.[22]) {
    const deck = toY(16344);
    const lip = deck - 0.85;
    const fasciaPos: number[] = [],
      fasciaIdx: number[] = [],
      fasciaUvs: number[] = [];
    const addQuad = (
      x0: number,
      y0: number,
      z0: number,
      x1: number,
      y1: number,
      z1: number,
      u0: number,
      u1: number,
    ) => {
      const s = fasciaPos.length / 3;
      fasciaPos.push(
        x0 - columns / 2,
        y0,
        z0 - rows / 2,
        x1 - columns / 2,
        y0,
        z1 - rows / 2,
        x1 - columns / 2,
        y1,
        z1 - rows / 2,
        x0 - columns / 2,
        y1,
        z0 - rows / 2,
      );
      fasciaUvs.push(u0, y0, u1, y0, u1, y1, u0, y1);
      fasciaIdx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    // Ramp along Z (X=22..23, Z=19..27), interrupted across Z=23..24 on its side faces
    addQuad(22, deck, 19, 22, lip, 23, 19, 23);
    addQuad(23, deck, 23, 23, lip, 19, 23, 19);
    addQuad(22, deck, 24, 22, lip, 27, 24, 27);
    addQuad(23, deck, 27, 23, lip, 24, 27, 24);
    addQuad(22, deck, 27, 23, lip, 27, 22, 23);
    // Ramp along X (Z=23..24, X=19..28), interrupted across X=22..23 on its side faces
    addQuad(22, deck, 23, 19, lip, 23, 22, 19);
    addQuad(19, deck, 24, 22, lip, 24, 19, 22);
    addQuad(28, deck, 23, 23, lip, 23, 28, 23);
    addQuad(23, deck, 24, 28, lip, 24, 23, 28);
    addQuad(28, deck, 24, 28, lip, 23, 24, 23);
    const wallStartVertex = fasciaPos.length / 3;
    const wallStartIndex = fasciaIdx.length;
    // Native outer walls continue behind the incoming ramps. Only the
    // outgoing arms are cantilevered; removing the incoming walls left a void.
    let bottom = lip;
    for (const row of cells)
      for (const cell of row)
        for (const height of cell ?? [])
          if (height !== null) bottom = Math.min(bottom, height);
    const base = bottom - 30;
    const walkwayY = toY(16320);
    // Reference lev4.ase.mesh: incoming outer walls end at (22,23).
    addQuad(22, lip, 19, 22, base, 23, 19, 23);
    addQuad(22, lip, 23, 19, base, 23, 22, 19);
    // Both faces of each lower walkway remain solid below its grey surface.
    addQuad(22, walkwayY, 24, 22, base, 31, 24, 31);
    addQuad(32, walkwayY, 23, 23, base, 23, 32, 23);
    // Lower cliff walls under the 16320 grey walkways meeting at corner (X=23, Z=24)
    addQuad(23, walkwayY, 24, 23, base, 31, 24, 31);
    addQuad(32, walkwayY, 24, 23, base, 24, 32, 23);
    addQuad(22, walkwayY, 24, 23, base, 24, 22, 23);
    addQuad(23, walkwayY, 23, 23, base, 24, 23, 24);
    // Separate deep walls from the thin fascia: they need to receive the
    // overhang shadows, while the narrow fascia avoids coarse self-shadowing.
    const wallPositions = fasciaPos.splice(wallStartVertex * 3);
    const wallUvs = fasciaUvs.splice(wallStartVertex * 2);
    const wallIndices = fasciaIdx
      .splice(wallStartIndex)
      .map((v) => v - wallStartVertex);
    const rampWalls = new Mesh('level4-jump-ramp-walls', scene);
    const wallData = new VertexData();
    Object.assign(wallData, {
      positions: wallPositions,
      indices: wallIndices,
      uvs: wallUvs,
    });
    wallData.normals = [];
    VertexData.ComputeNormals(wallPositions, wallIndices, wallData.normals);
    wallData.colors = level4CliffColors(wallPositions, columns, rows);
    wallData.applyToMesh(rampWalls);
    rampWalls.material = scene.getMaterialByName('level4-cliffs');
    rampWalls.receiveShadows = true;
    // Horizontal underside of the two floating ramps so their shadow onto the grey walkways and cliffs is crisp
    const addFlatBottom = (x0: number, z0: number, x1: number, z1: number) => {
      const s = fasciaPos.length / 3;
      fasciaPos.push(
        x0 - columns / 2,
        lip,
        z0 - rows / 2,
        x1 - columns / 2,
        lip,
        z0 - rows / 2,
        x1 - columns / 2,
        lip,
        z1 - rows / 2,
        x0 - columns / 2,
        lip,
        z1 - rows / 2,
      );
      fasciaUvs.push(x0, z0, x1, z0, x1, z1, x0, z1);
      fasciaIdx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    addFlatBottom(22, 19, 23, 27);
    addFlatBottom(19, 23, 22, 24);
    addFlatBottom(23, 23, 28, 24);
    const fascia = new Mesh('level4-jump-ramp-fascia', scene);
    const data = new VertexData();
    Object.assign(data, {
      positions: fasciaPos,
      indices: fasciaIdx,
      uvs: fasciaUvs,
    });
    data.normals = [];
    VertexData.ComputeNormals(fasciaPos, fasciaIdx, data.normals);
    data.colors = level4CliffColors(fasciaPos, columns, rows);
    data.applyToMesh(fascia);
    fascia.material = scene.getMaterialByName('level4-cliffs');
    fascia.receiveShadows = false;
    meshes.push(
      fascia,
      rampWalls,
      createLevel4RampEndJoints(scene, columns, rows, deck, lip),
    );
  }
  return meshes;
}
