export interface RollingModel {
  readonly seconds: number;
  readonly poses: readonly {
    readonly positions: readonly number[];
    readonly normals: readonly number[];
  }[];
  readonly uvs: readonly number[];
  readonly groups: Readonly<Record<string, readonly number[]>>;
}
export interface RollingActors {
  readonly models: Readonly<Record<string, RollingModel>>;
  readonly textures: Readonly<Record<string, string>>;
}

export function parseRollingActors(contents: string): RollingActors {
  const data: unknown = JSON.parse(contents);
  const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const numbers = (value: unknown): value is number[] =>
    Array.isArray(value) &&
    value.every((n: unknown) => typeof n === 'number' && Number.isFinite(n));
  if (
    !record(data) ||
    data.format !== 'rolling-actors-v1' ||
    !record(data.models) ||
    !record(data.textures)
  )
    throw new Error('Bibliothèque Rolling Madness invalide.');
  for (const model of Object.values(data.models)) {
    if (
      !record(model) ||
      typeof model.seconds !== 'number' ||
      !Number.isFinite(model.seconds) ||
      model.seconds < 0 ||
      !Array.isArray(model.poses) ||
      !model.poses.length ||
      model.poses.length > 64 ||
      !numbers(model.uvs) ||
      model.uvs.length > 8000 ||
      !record(model.groups)
    )
      throw new Error('Modèle animé invalide.');
    const vertices = model.uvs.length / 2;
    if (!Number.isInteger(vertices)) throw new Error('UV invalides.');
    for (const pose of model.poses)
      if (
        !record(pose) ||
        !numbers(pose.positions) ||
        !numbers(pose.normals) ||
        pose.positions.length !== vertices * 3 ||
        pose.normals.length !== vertices * 3
      )
        throw new Error('Pose animée invalide.');
    for (const [texture, indices] of Object.entries(model.groups))
      if (
        typeof data.textures[texture] !== 'string' ||
        !numbers(indices) ||
        indices.length % 3 !== 0 ||
        indices.some((i) => !Number.isInteger(i) || i < 0 || i >= vertices)
      )
        throw new Error('Faces animées invalides.');
  }
  for (const image of Object.values(data.textures))
    if (
      typeof image !== 'string' ||
      !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)
    )
      throw new Error('Texture locale invalide.');
  return data as unknown as RollingActors;
}

export async function loadRollingActors(fetcher: typeof fetch = fetch) {
  const response = await fetcher('/__local-roms/rolling-actors.json', {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  const file = await response.blob();
  if (file.size > 8_000_000) throw new Error('Bibliothèque trop volumineuse.');
  return parseRollingActors(await file.text());
}
