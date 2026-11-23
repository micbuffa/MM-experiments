import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import {
  assembleRomArchive,
  MARBLE_ROMS,
  MAX_ARCHIVE_BYTES,
  validateRomArchive,
} from './romArchive';

const content = new Uint8Array([1, 2, 3]);
const fixture = {
  name: 'fixture.bin',
  size: 3,
  sha1: '7037807198c22a7d2b0807371d763779a84fdfcf',
};
const archive = (bytes = content) => zipSync({ 'fixture.bin': bytes });

describe('archive locale (données synthétiques uniquement)', () => {
  it('valide les octets décompressés par taille et SHA-1', async () => {
    await expect(
      validateRomArchive(archive(), [fixture]),
    ).resolves.toBeUndefined();
  });
  it('valide aussi les ZIP sans compression', async () => {
    await expect(
      validateRomArchive(zipSync({ 'fixture.bin': content }, { level: 0 }), [
        fixture,
      ]),
    ).resolves.toBeUndefined();
  });
  it('ne confond pas noms de fichiers et contenu compatible', async () => {
    await expect(
      validateRomArchive(archive(new Uint8Array([3, 2, 1])), [fixture]),
    ).rejects.toThrow('SHA-1');
  });
  it('signale précisément un fichier manquant et les fichiers dans un sous-dossier', async () => {
    await expect(
      validateRomArchive(zipSync({ 'folder/fixture.bin': content }), [fixture]),
    ).rejects.toThrow('ROMs manquantes : fixture.bin');
  });
  it('rejette une mauvaise taille avant décompression', async () => {
    await expect(
      validateRomArchive(archive(new Uint8Array(1000)), [fixture]),
    ).rejects.toThrow('Taille incompatible');
  });
  it('rejette un fichier non ZIP et un ZIP tronqué', async () => {
    await expect(
      validateRomArchive(new Uint8Array([1, 2, 3]), [fixture]),
    ).rejects.toThrow('ZIP illisible');
    await expect(
      validateRomArchive(archive().slice(0, 20), [fixture]),
    ).rejects.toThrow('ZIP illisible');
  });
  it('borne la taille totale avant de lire la structure', async () => {
    await expect(
      validateRomArchive(new Uint8Array(MAX_ARCHIVE_BYTES + 1), [fixture]),
    ).rejects.toThrow('trop volumineuse');
  });
  it('ignore les fichiers supplémentaires sans les décompresser', async () => {
    const bytes = zipSync({
      'fixture.bin': content,
      'unneeded.txt': new Uint8Array(100_000),
    });
    await expect(validateRomArchive(bytes, [fixture])).resolves.toBeUndefined();
  });
  it('rejette des entrées dupliquées', async () => {
    const bytes = zipSync({ 'fixture.bin': content, 'another.bin': content });
    const from = new TextEncoder().encode('another.bin');
    const to = new TextEncoder().encode('fixture.bin');
    for (let i = 0; i <= bytes.length - from.length; i++) {
      if (from.every((value, offset) => bytes[i + offset] === value))
        bytes.set(to, i);
    }
    await expect(validateRomArchive(bytes, [fixture])).rejects.toThrow(
      'dupliquée',
    );
  });
  it('décrit les 30 dumps du set marble complet sans contenir de données ROM', () => {
    expect(MARBLE_ROMS).toHaveLength(30);
    expect(new Set(MARBLE_ROMS.map((rom) => rom.name)).size).toBe(30);
    expect(MARBLE_ROMS.find((rom) => rom.name === '136032.107')).toMatchObject({
      size: 8192,
    });
  });
});

describe('assemblage jeu et BIOS en mémoire', () => {
  const biosContent = new Uint8Array([4, 5, 6]);
  const biosRequirement = {
    name: 'system.bin',
    size: 3,
    sha1: 'e809c5d1cea47b45e34701d23f608a9a58034dc9',
    aliases: ['system.socket'],
  };
  const requirements = [fixture, biosRequirement];
  it('réunit deux ZIP et normalise le nom BIOS vérifié', async () => {
    const game = archive();
    const original = game.slice();
    const bios = zipSync({
      'system.socket': biosContent,
      'extra.txt': content,
    });
    const result = unzipSync(
      await assembleRomArchive(game, bios, requirements),
    );
    expect(result).toEqual({
      'fixture.bin': content,
      'system.bin': biosContent,
    });
    expect(game).toEqual(original);
  });
  it('accepte un jeu complet sans BIOS séparé', async () => {
    const result = await assembleRomArchive(archive(), undefined, [fixture]);
    expect(unzipSync(result)['fixture.bin']).toEqual(content);
  });
  it('indique le BIOS manquant et permet de compléter le même jeu', async () => {
    await expect(
      assembleRomArchive(archive(), undefined, requirements),
    ).rejects.toThrow('system.bin');
    await expect(
      assembleRomArchive(
        archive(),
        zipSync({ 'system.socket': biosContent }),
        requirements,
      ),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
  it('refuse un BIOS mal nommé par son contenu plutôt que de simplement le renommer', async () => {
    await expect(
      assembleRomArchive(
        archive(),
        zipSync({ 'system.socket': content }),
        requirements,
      ),
    ).rejects.toThrow('SHA-1');
  });
  it('vérifie aussi les copies redondantes et rejette une copie conflictuelle', async () => {
    await expect(
      assembleRomArchive(archive(), archive(), [fixture]),
    ).resolves.toBeInstanceOf(Uint8Array);
    await expect(
      assembleRomArchive(archive(), archive(new Uint8Array([3, 2, 1])), [
        fixture,
      ]),
    ).rejects.toThrow('SHA-1');
  });
  it('refuse un BIOS tronqué', async () => {
    await expect(
      assembleRomArchive(archive(), new Uint8Array([1]), requirements),
    ).rejects.toThrow('ZIP illisible');
  });
});
