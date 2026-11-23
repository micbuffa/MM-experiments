import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';

type Face = { vertices: [number, number, number]; lining: boolean };
type Edge = {
  a: number;
  b: number;
  opposite: number[];
  faces: number[];
  crease: boolean;
  midpoint: number;
};

/** One crease-preserving Loop refinement of the closed Y, leaving the J alone. */
export function refineIntermediatePipe(
  source: IntermediatePipeGeometry,
): IntermediatePipeGeometry {
  const points: number[][] = [],
    faces: Face[] = [];
  const welded = new Map<string, number>();
  const vertex = (index: number) => {
    const point = source.positions.slice(index * 3, index * 3 + 3);
    const key = point.map((value) => Math.round(value * 10000)).join(',');
    let id = welded.get(key);
    if (id === undefined) {
      id = points.length;
      points.push(point);
      welded.set(key, id);
    }
    return id;
  };
  const shell: number[] = [],
    interior: number[] = [];
  for (const [indices, lining] of [
    [source.shell, false],
    [source.interior, true],
  ] as const) {
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3) as [number, number, number];
      if (triangle.every((index) => source.positions[index * 3 + 2]! > 18))
        faces.push({
          vertices: triangle.map(vertex) as [number, number, number],
          lining,
        });
      else (lining ? interior : shell).push(...triangle);
    }
  }
  if (!faces.length) return source;
  const volume = faces.reduce((sum, { vertices }) => {
    const [a, b, c] = vertices.map((index) => points[index]!);
    return (
      sum +
      a![0]! * (b![1]! * c![2]! - b![2]! * c![1]!) +
      a![1]! * (b![2]! * c![0]! - b![0]! * c![2]!) +
      a![2]! * (b![0]! * c![1]! - b![1]! * c![0]!)
    );
  }, 0);
  if (Math.abs(volume) < 0.000001) return source;
  const edges = new Map<string, Edge>();
  const neighbors = points.map(() => new Set<number>());
  const faceNormals = faces.map(({ vertices }) => {
    const [a, b, c] = vertices.map((index) => points[index]!);
    const u = b!.map((value, i) => value - a![i]!),
      v = c!.map((value, i) => value - a![i]!);
    const n = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    const length = Math.hypot(...n);
    return length > 0 ? n.map((value) => value / length) : [0, 0, 0];
  });
  const key = (a: number, b: number) => (a < b ? `${a}/${b}` : `${b}/${a}`);
  faces.forEach(({ vertices }, face) => {
    for (let i = 0; i < 3; i++) {
      const a = vertices[i]!,
        b = vertices[(i + 1) % 3]!,
        c = vertices[(i + 2) % 3]!;
      const id = key(a, b);
      let edge = edges.get(id);
      if (!edge) {
        edge = { a, b, opposite: [], faces: [], crease: false, midpoint: -1 };
        edges.set(id, edge);
      }
      edge.opposite.push(c);
      edge.faces.push(face);
      neighbors[a]!.add(b);
      neighbors[b]!.add(a);
    }
  });
  // Never refine a partial export: its boundary must first be repaired upstream.
  if ([...edges.values()].some((edge) => edge.faces.length !== 2))
    return source;
  const creases = points.map(() => new Set<number>());
  for (const edge of edges.values()) {
    const a = faceNormals[edge.faces[0]!]!,
      b = faceNormals[edge.faces[1]!]!;
    edge.crease =
      a.reduce((sum, value, i) => sum + value * b[i]!, 0) <
        Math.cos((80 * Math.PI) / 180) ||
      faces[edge.faces[0]!]!.lining !== faces[edge.faces[1]!]!.lining;
    if (edge.crease) {
      creases[edge.a]!.add(edge.b);
      creases[edge.b]!.add(edge.a);
    }
  }
  // The lips are thin nested surfaces. Keep both skins on their source
  // planes; relaxing them independently can invert the rim thickness.
  const protectedPoint = (point: number[]) =>
    point[2]! < 22 || point[2]! > 26.5;
  const refined = points.map((point, index) => {
    if (protectedPoint(point)) return [...point];
    const sharp = [...creases[index]!],
      ring = [...neighbors[index]!];
    if (sharp.length > 2) return [...point];
    if (sharp.length === 2)
      return point.map(
        (value, i) =>
          0.75 * value +
          0.125 * (points[sharp[0]!]![i]! + points[sharp[1]!]![i]!),
      );
    const beta = ring.length === 3 ? 3 / 16 : 3 / (8 * ring.length);
    return point.map(
      (value, i) =>
        (1 - ring.length * beta) * value +
        beta * ring.reduce((sum, j) => sum + points[j]![i]!, 0),
    );
  });
  for (const edge of edges.values()) {
    edge.midpoint = refined.length;
    refined.push(
      points[edge.a]!.map((value, i) =>
        edge.crease ||
        protectedPoint(points[edge.a]!) ||
        protectedPoint(points[edge.b]!)
          ? (value + points[edge.b]![i]!) / 2
          : ((value + points[edge.b]![i]!) * 3) / 8 +
            (points[edge.opposite[0]!]![i]! + points[edge.opposite[1]!]![i]!) /
              8,
      ),
    );
  }
  const positions = [...source.positions, ...refined.flat()],
    offset = source.positions.length / 3;
  for (const {
    vertices: [a, b, c],
    lining,
  } of faces) {
    const ab = edges.get(key(a, b))!.midpoint,
      bc = edges.get(key(b, c))!.midpoint,
      ca = edges.get(key(c, a))!.midpoint;
    for (const triangle of [
      [a, ab, ca],
      [b, bc, ab],
      [c, ca, bc],
      [ab, bc, ca],
    ])
      (lining ? interior : shell).push(
        ...triangle.map((index) => index + offset),
      );
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, [...shell, ...interior], normals);
  if (source.normals)
    for (let i = 0; i < source.normals.length; i++)
      normals[i] = source.normals[i]!;
  return { positions, normals, shell, interior };
}
