export interface LocalRoms {
  game: File;
  bios?: File;
}

/** Ressources de test du serveur Vite local ; aucun stockage persistant. */
export async function loadLocalRoms(
  fetcher: typeof fetch = fetch,
): Promise<LocalRoms | null> {
  const response = await fetcher('/__local-roms/status', { cache: 'no-store' });
  if (!response.ok) return null;
  const status: { game?: boolean; bios?: boolean } = await response.json();
  if (status.game !== true) return null;
  async function load(name: string): Promise<File> {
    const file = await fetcher(`/__local-roms/${name}`, { cache: 'no-store' });
    if (!file.ok)
      throw new Error(
        `Impossible de précharger roms/${name}. La sélection manuelle reste disponible.`,
      );
    const bytes = await file.arrayBuffer();
    return new File([bytes], name, { type: 'application/zip' });
  }
  const [game, bios] = await Promise.all([
    load('marble.zip'),
    status.bios === true ? load('atarisy1.zip') : undefined,
  ]);
  return bios ? { game, bios } : { game };
}
