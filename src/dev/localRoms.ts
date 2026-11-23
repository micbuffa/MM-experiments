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
]);
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
