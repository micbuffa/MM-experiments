import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export const LOCAL_ROMS_PREFIX = '/__local-roms/';
const MAX_BYTES = 16 * 1024 * 1024;
const NAMES = ['marble.zip', 'atarisy1.zip'] as const;
type RomName = (typeof NAMES)[number];
const STUDY_TYPES = new Map([
  ['attract-web.state', 'application/octet-stream'],
  ['rolling-actors.json', 'application/json'],
  ['practice-complete-terrain.json', 'application/json'],
  ['intermediate-terrain-pipes.json', 'application/json'],
  ['intermediate-web.state', 'application/octet-stream'],
  ['level3-terrain.json', 'application/json'],
  ['level3-web.state', 'application/octet-stream'],
  ['level4-terrain.json', 'application/json'],
  ['level4-web.state', 'application/octet-stream'],
  ['level5-terrain.json', 'application/json'],
  ['level5-web.state', 'application/octet-stream'],
  ['level6-terrain.json', 'application/json'],
  ['level6-web.state', 'application/octet-stream'],
  ['level1-practice.vgz', 'application/octet-stream'],
  ['level1-practice.vgm', 'application/octet-stream'],
  ['goal-fanfare.vgz', 'application/octet-stream'],
  ['goal-fanfare.vgm', 'application/octet-stream'],
  ['level2-beginner.vgz', 'application/octet-stream'],
  ['level2-beginner.vgm', 'application/octet-stream'],
  ['level3-intermediate.vgz', 'application/octet-stream'],
  ['level3-intermediate.vgm', 'application/octet-stream'],
  ['level4-aerial.vgz', 'application/octet-stream'],
  ['level4-aerial.vgm', 'application/octet-stream'],
  ['level5-silly.vgz', 'application/octet-stream'],
  ['level5-silly.vgm', 'application/octet-stream'],
  ['level6-ultimate.vgz', 'application/octet-stream'],
  ['level6-ultimate.vgm', 'application/octet-stream'],
]);
// Optional local VGMRips pack inside local-roms/original_FX_and_musics/ (with or without inner folder).
const ORIGINAL_VGM_FILES: Readonly<Record<string, string>> = {
  'level1-practice.vgz': '02 Level 1.vgz',
  'goal-fanfare.vgz': '03 Player 1 Goal In.vgz',
  'goal-fanfare-p2.vgz': '04 Player 2 Goal In.vgz',
  'level2-beginner.vgz': '05 Level 2.vgz',
  'level3-intermediate.vgz': '06 Level 3.vgz',
  'level4-aerial.vgz': '07 Level 4-1.vgz',
  'level4-aerial-2.vgz': '08 Level 4-2.vgz',
  'level5-silly.vgz': '09 Level 5.vgz',
  'level6-ultimate.vgz': '10 Level 6.vgz',
  'congratulations.vgz': '11 Congratulations.vgz',
  'high-score.vgz': '12 High Score Entry.vgz',
  'game-over.vgz': '13 Game Over.vgz',
  'coin.vgz': '01 Coin.vgz',
  'sfx-wall-bounce.vgm': 'sfx/sfx-wall-bounce.vgm',
  'sfx-marble-clack.vgm': 'sfx/sfx-marble-clack.vgm',
  'sfx-pvp-clack.vgm': 'sfx/sfx-pvp-clack.vgm',
  'sfx-impact.vgm': 'sfx/sfx-impact.vgm',
  'sfx-fall.vgm': 'sfx/sfx-fall.vgm',
  'sfx-void-fall.vgm': 'sfx/sfx-void-fall.vgm',
  'sfx-dizzy.vgm': 'sfx/sfx-dizzy.vgm',
  'sfx-shatter.vgm': 'sfx/sfx-shatter.vgm',
  'sfx-broom.vgm': 'sfx/sfx-broom.vgm',
  'sfx-respawn.vgm': 'sfx/sfx-respawn.vgm',
  'sfx-worm-eat.vgm': 'sfx/sfx-worm-eat.vgm',
  'sfx-pipe.vgm': 'sfx/sfx-pipe.vgm',
  'sfx-ice-enter.vgm': 'sfx/sfx-ice-enter.vgm',
  'sfx-ice-leave.vgm': 'sfx/sfx-ice-leave.vgm',
  'sfx-countdown.vgm': 'sfx/sfx-countdown.vgm',
};
const LEVEL_PNG_FILES = new Map([
  ['level-png-1.png', 'MarbleMadness_Level1.png'],
  ['level-png-2.png', 'MarbleMadness_Level2.png'],
  ['level-png-3.png', 'MarbleMadness_Level3.png'],
  ['level-png-4.png', 'MarbleMadness_Level4.png'],
  ['level-png-5.png', 'MarbleMadness_Level5.png'],
  ['level-png-6.png', 'MarbleMadness_Level6.png'],
]);
interface RequestInfo {
  url: string;
  method: string;
  address: string;
}
interface LocalResponse {
  status: number;
  contentType: string;
  body: string | Uint8Array;
}

async function isAvailable(path: string): Promise<boolean> {
  try {
    const file = await stat(path);
    return file.isFile() && file.size <= MAX_BYTES;
  } catch {
    return false;
  }
}

/** Sert les archives et les fichiers d’étude par noms fixes, en loopback. */
export async function handleLocalRoms(
  root: string,
  request: RequestInfo,
): Promise<LocalResponse | null> {
  const path = request.url.split('?')[0]!;
  if (!path.startsWith(LOCAL_ROMS_PREFIX)) return null;
  const text = (status: number, body: string): LocalResponse => ({
    status,
    contentType: 'text/plain; charset=utf-8',
    body,
  });
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.address))
    return text(403, 'Archives accessibles uniquement depuis cette machine.');
  if (!['GET', 'HEAD'].includes(request.method))
    return text(405, 'Méthode non autorisée.');
  const directory = join(root, 'roms');
  const name = path.slice(LOCAL_ROMS_PREFIX.length);
  if (name === 'status') {
    const [game, bios] = await Promise.all(
      NAMES.map((file) => isAvailable(join(directory, file))),
    );
    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ game, bios }),
    };
  }
  async function resolveVgmPath(key: string): Promise<string | null> {
    const direct = join(root, 'local-roms', key);
    if (await isAvailable(direct)) return direct;
    const packFile = ORIGINAL_VGM_FILES[key];
    if (!packFile) return null;
    for (const folder of [
      join(root, 'local-roms', 'original_FX_and_musics'),
      join(
        root,
        'local-roms',
        'original_FX_and_musics',
        'Marble_Madness_(Atari_System_1)',
      ),
    ]) {
      const candidate = join(folder, packFile);
      if (await isAvailable(candidate)) return candidate;
    }
    return null;
  }

  if (name === 'vgm-list') {
    const vgmKeys = new Set([
      ...[...STUDY_TYPES.keys()].filter(
        (key) => key.endsWith('.vgz') || key.endsWith('.vgm'),
      ),
      ...Object.keys(ORIGINAL_VGM_FILES),
    ]);
    const available = await Promise.all(
      [...vgmKeys].map(async (file) =>
        (await resolveVgmPath(file)) ? file : null,
      ),
    );
    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        files: available.filter((item): item is string => item !== null),
      }),
    };
  }
  if (name.endsWith('.vgz') || name.endsWith('.vgm')) {
    const resolved = await resolveVgmPath(name);
    if (!resolved) return text(404, 'Piste VGM locale introuvable.');
    return {
      status: 200,
      contentType: 'application/octet-stream',
      body:
        request.method === 'HEAD'
          ? new Uint8Array()
          : new Uint8Array(await readFile(resolved)),
    };
  }
  const levelPng = LEVEL_PNG_FILES.get(name);
  if (levelPng) {
    const file = join(root, 'MM_original_levels_full_views', levelPng);
    if (!(await isAvailable(file)))
      return text(404, 'Image de niveau indisponible.');
    try {
      return {
        status: 200,
        contentType: 'image/png',
        body: await readFile(file),
      };
    } catch {
      return text(404, 'Image de niveau indisponible.');
    }
  }
  const studyType = STUDY_TYPES.get(name);
  if (!studyType && !NAMES.includes(name as RomName))
    return text(404, 'Archive locale inconnue.');
  const file = join(studyType ? join(root, 'local-roms') : directory, name);
  if (!(await isAvailable(file)))
    return text(404, 'Archive locale absente ou supérieure à 16 Mio.');
  try {
    return {
      status: 200,
      contentType: studyType ?? 'application/zip',
      body: await readFile(file),
    };
  } catch {
    return text(404, 'Archive locale indisponible.');
  }
}

export function localRomsPlugin(): Plugin {
  return {
    name: 'local-test-roms',
    apply: 'serve',
    // configureServer concerne le serveur de développement, jamais preview/build.
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleLocalRoms(server.config.root, {
          url: request.url ?? '',
          method: request.method ?? 'GET',
          address: request.socket.remoteAddress ?? '',
        })
          .then((result) => {
            if (!result) {
              next();
              return;
            }
            response.statusCode = result.status;
            response.setHeader('Content-Type', result.contentType);
            response.setHeader('Cache-Control', 'no-store');
            response.setHeader('X-Content-Type-Options', 'nosniff');
            response.end(request.method === 'HEAD' ? undefined : result.body);
          })
          .catch(next);
      });
    },
  };
}
