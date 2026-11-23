export interface IntermediatePipeGeometry {
  readonly positions: number[];
  readonly normals?: number[];
  readonly shell: number[];
  readonly interior: number[];
}

export function parseIntermediatePipeGeometry(
  value: unknown,
): IntermediatePipeGeometry {
  const invalid = () =>
    new Error('Géométrie des tuyaux Intermediate Race invalide.');
  if (
    !value ||
    typeof value !== 'object' ||
    !('positions' in value) ||
    !('shell' in value) ||
    !('interior' in value)
  )
    throw invalid();
  const { positions, shell, interior } = value;
  if (
    !Array.isArray(positions) ||
    positions.length < 9 ||
    positions.length > 6000 ||
    positions.length % 3 !== 0 ||
    !positions.every(
      (n: unknown) =>
        typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 130,
    )
  )
    throw invalid();
  const vertexCount = positions.length / 3;
  const normals = 'normals' in value ? value.normals : undefined;
  if (
    normals !== undefined &&
    (!Array.isArray(normals) ||
      normals.length !== positions.length ||
      !normals.every(
        (n: unknown) =>
          typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1,
      ))
  )
    throw invalid();
  function parseIndices(indices: unknown): number[] {
    if (
      !Array.isArray(indices) ||
      indices.length < 3 ||
      indices.length > 6000 ||
      indices.length % 3 !== 0 ||
      !indices.every(
        (i: unknown) =>
          typeof i === 'number' &&
          Number.isInteger(i) &&
          i >= 0 &&
          i < vertexCount,
      )
    )
      throw invalid();
    return indices;
  }
  return {
    positions,
    ...(normals === undefined ? {} : { normals }),
    shell: parseIndices(shell),
    interior: parseIndices(interior),
  };
}
