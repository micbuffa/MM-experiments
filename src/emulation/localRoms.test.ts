import { expect, it, vi } from 'vitest';
import { loadLocalRoms } from './localRoms';

it.each([
  new Response('', { status: 404 }),
  Response.json({ game: false, bios: false }),
])(
  'garde la sélection manuelle si le service ou le jeu manque',
  async (response) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    expect(await loadLocalRoms(fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it('précharge les deux archives synthétiques en mémoire, sans cache', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ game: true, bios: true }))
    .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])))
    .mockResolvedValueOnce(new Response(new Uint8Array([4, 5])));
  const result = await loadLocalRoms(fetcher);
  expect(result!.game.name).toBe('marble.zip');
  expect(result!.bios!.name).toBe('atarisy1.zip');
  expect([...new Uint8Array(await result!.game.arrayBuffer())]).toEqual([
    1, 2, 3,
  ]);
  expect(
    fetcher.mock.calls.every(([, options]) => options?.cache === 'no-store'),
  ).toBe(true);
});
it('permet un jeu complet sans BIOS séparé', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ game: true, bios: false }))
    .mockResolvedValueOnce(new Response('synthetic'));
  expect((await loadLocalRoms(fetcher))!.bios).toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('signale un fichier qui devient indisponible', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ game: true, bios: false }))
    .mockResolvedValueOnce(new Response('', { status: 404 }));
  await expect(loadLocalRoms(fetcher)).rejects.toThrow('roms/marble.zip');
});
