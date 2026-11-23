import { describe, expect, it, vi } from 'vitest';
import {
  loadIntermediateCheckpoint,
  loadIntermediateTerrain,
  loadLevel3Checkpoint,
  loadPracticeTerrain,
} from './localStudy';
import { encodeIntermediateCheckpoint } from './intermediateCheckpoint';

describe('local Intermediate Race study', () => {
  it('loads a same-origin checkpoint without caching and rejects an incompatible length', async () => {
    const state = new Uint8Array(1_106_168);
    const bytes = encodeIntermediateCheckpoint(
      state,
      new Int32Array(8),
      new Uint8Array(13),
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(Uint8Array.from(bytes)))
      .mockResolvedValueOnce(new Response(new Uint8Array(4)))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect((await loadIntermediateCheckpoint(fetcher))?.state).toHaveLength(
      1_106_168,
    );
    expect(fetcher).toHaveBeenCalledWith(
      '/__local-roms/intermediate-web.state',
      { cache: 'no-store' },
    );
    expect(await loadIntermediateCheckpoint(fetcher)).toBeUndefined();
    expect(await loadIntermediateCheckpoint(fetcher)).toBeUndefined();
    const l3Fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(Uint8Array.from(bytes)));
    expect((await loadLevel3Checkpoint(l3Fetcher))?.state).toHaveLength(
      1_106_168,
    );
    expect(l3Fetcher).toHaveBeenCalledWith('/__local-roms/level3-web.state', {
      cache: 'no-store',
    });
  });

  it('accepts a validated Intermediate Race survey and ignores a Practice Race survey', async () => {
    const tile = [16384, 16384, 16384, 16384];
    const row = Array.from({ length: 130 }, (_, i) =>
      i === 0 ? tile : [0, 0, 0, 0],
    );
    const rows = Array.from({ length: 130 }, () => row);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ format: 'intermediate-terrain-v1', rows }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ format: 'practice-terrain-v1', rows: [[row[0]]] }),
        ),
      );
    expect(await loadIntermediateTerrain(fetcher)).toMatchObject({
      level: 'intermediate',
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/__local-roms/intermediate-terrain-pipes.json',
      { cache: 'no-store' },
    );
    expect(await loadIntermediateTerrain(fetcher)).toBeUndefined();
  });
  it('preloads the complete Practice Race survey', async () => {
    const rows = Array.from({ length: 91 }, () =>
      Array.from({ length: 91 }, () => [0, 0, 0, 0]),
    );
    rows[17]![17] = [16384, 16384, 16384, 16384];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ format: 'practice-terrain-v2', rows })),
      );
    expect(await loadPracticeTerrain(fetcher)).toMatchObject({
      lastScroll: -15784,
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/__local-roms/practice-complete-terrain.json',
      { cache: 'no-store' },
    );
  });
});
