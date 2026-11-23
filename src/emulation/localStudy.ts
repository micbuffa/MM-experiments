import {
  MAX_TERRAIN_BYTES,
  parsePracticeTerrain,
} from '../game/modern/practiceTerrain';
import { decodeIntermediateCheckpoint } from './intermediateCheckpoint';

const root = '/__local-roms/';

async function loadTerrain(file: string, fetcher: typeof fetch) {
  const response = await fetcher(root + file, {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  const contents = await response.blob();
  if (contents.size > MAX_TERRAIN_BYTES) return undefined;
  return parsePracticeTerrain(await contents.text());
}

export async function loadPracticeTerrain(fetcher: typeof fetch = fetch) {
  const terrain = await loadTerrain('practice-complete-terrain.json', fetcher);
  return terrain?.level === undefined ? terrain : undefined;
}

export async function loadIntermediateTerrain(fetcher: typeof fetch = fetch) {
  const terrain = await loadTerrain('intermediate-terrain-pipes.json', fetcher);
  return terrain?.level === 'intermediate' ? terrain : undefined;
}

export async function loadLevel3Terrain(fetcher: typeof fetch = fetch) {
  const terrain = await loadTerrain('level3-terrain.json', fetcher);
  return terrain?.level === 'level3' ? terrain : undefined;
}

export async function loadLevel4Terrain(fetcher: typeof fetch = fetch) {
  const terrain = await loadTerrain('level4-terrain.json', fetcher);
  return terrain?.level === 'level4' ? terrain : undefined;
}

export async function loadIntermediateCheckpoint(
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(root + 'intermediate-web.state', {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  return decodeIntermediateCheckpoint(
    new Uint8Array(await response.arrayBuffer()),
  );
}

export async function loadLevel3Checkpoint(fetcher: typeof fetch = fetch) {
  const response = await fetcher(root + 'level3-web.state', {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  return decodeIntermediateCheckpoint(
    new Uint8Array(await response.arrayBuffer()),
  );
}

export async function loadLevel4Checkpoint(fetcher: typeof fetch = fetch) {
  const response = await fetcher(root + 'level4-web.state', {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  return decodeIntermediateCheckpoint(
    new Uint8Array(await response.arrayBuffer()),
  );
}

export async function loadLevel5Terrain(fetcher: typeof fetch = fetch) {
  const terrain = await loadTerrain('level5-terrain.json', fetcher);
  return terrain?.level === 'level5' ? terrain : undefined;
}
export async function loadLevel5Checkpoint(fetcher: typeof fetch = fetch) {
  const response = await fetcher(root + 'level5-web.state', {
    cache: 'no-store',
  });
  if (!response.ok) return undefined;
  return decodeIntermediateCheckpoint(
    new Uint8Array(await response.arrayBuffer()),
  );
}
