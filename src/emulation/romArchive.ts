import { unzipSync, zipSync } from 'fflate';
import type { Unzipped } from 'fflate';
import manifest from './marble-roms.json';

export interface RomRequirement {
  readonly name: string;
  readonly size: number;
  readonly sha1: string;
  readonly aliases?: readonly string[];
}

export const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
// Noms du BIOS Atari System 1 moderne ; acceptés uniquement après vérification
// de la taille et du SHA-1 des octets, jamais par le nom seul.
const BIOS_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '136032.205': ['136032.205.l13'],
  '136032.206': ['136032.206.l12'],
  '136032.107': ['136032.107.b2', '136032.104.f5'],
};
export const MARBLE_ROMS: readonly RomRequirement[] = manifest.roms.map(
  (rom) => ({
    ...rom,
    aliases: BIOS_ALIASES[rom.name] ?? [],
  }),
);

async function readVerifiedFiles(
  archives: readonly Uint8Array<ArrayBuffer>[],
  requirements: readonly RomRequirement[],
): Promise<Unzipped> {
  const required = new Map(
    requirements.flatMap((rom) =>
      [rom.name, ...(rom.aliases ?? [])].map((name) => [name, rom] as const),
    ),
  );
  const verified: Unzipped = {};
  for (const bytes of archives) {
    if (bytes.length > MAX_ARCHIVE_BYTES) {
      throw new Error('Archive trop volumineuse (limite : 16 Mio par ZIP).');
    }
    const seen = new Set<string>();
    let files: Unzipped;
    try {
      files = unzipSync(bytes, {
        filter(entry) {
          const rom = required.get(entry.name);
          if (!rom) return false;
          if (seen.has(entry.name))
            throw new Error(`Entrée dupliquée : ${entry.name}`);
          seen.add(entry.name);
          if (entry.originalSize !== rom.size)
            throw new Error(`Taille incompatible : ${entry.name}`);
          return true;
        },
      });
    } catch (error) {
      throw new Error(
        `Archive ZIP illisible ou incompatible : ${String(error)}`,
        { cause: error },
      );
    }
    const entries = Object.entries(files);
    await Promise.all(
      entries.map(async ([name, content]) => {
        const rom = required.get(name)!;
        if (content.length !== rom.size)
          throw new Error(`Taille décompressée incorrecte : ${name}`);
        const digest = await crypto.subtle.digest('SHA-1', content);
        const sha1 = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
        if (sha1 !== rom.sha1)
          throw new Error(
            `Contenu incompatible : ${name} (SHA-1 différent du set attendu).`,
          );
      }),
    );
    // Vérifier chaque copie et conserver l’ordre de priorité des alias.
    for (const [name, content] of entries)
      verified[required.get(name)!.name] = content;
  }
  const missing = requirements.filter((rom) => !verified[rom.name]);
  if (missing.length) {
    throw new Error(
      `ROMs manquantes : ${missing.map((rom) => rom.name).join(', ')}. Sélectionner aussi atarisy1.zip dans le champ BIOS si les fichiers système sont séparés. Les fichiers attendus doivent être à la racine des ZIP.`,
    );
  }
  return verified;
}

/** Vérifie une archive complète, sans conserver ses données. */
export async function validateRomArchive(
  bytes: Uint8Array<ArrayBuffer>,
  requirements: readonly RomRequirement[] = MARBLE_ROMS,
): Promise<void> {
  await readVerifiedFiles([bytes], requirements);
}

/** Produit un ZIP MAME canonique en mémoire ; aucune écriture des ROMs sur disque. */
export async function assembleRomArchive(
  game: Uint8Array<ArrayBuffer>,
  bios?: Uint8Array<ArrayBuffer>,
  requirements: readonly RomRequirement[] = MARBLE_ROMS,
): Promise<Uint8Array<ArrayBuffer>> {
  const files = await readVerifiedFiles(
    bios ? [game, bios] : [game],
    requirements,
  );
  return zipSync(files, { level: 0 });
}
