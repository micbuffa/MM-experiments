import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleLocalRoms, localRomsPlugin } from './localRoms';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'marble-local-rom-test-'));
  await mkdir(join(root, 'roms'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
const request = (url: string, method = 'GET', address = '127.0.0.1') => ({
  url,
  method,
  address,
});

describe('archives locales de développement (données synthétiques)', () => {
  it('ignore les autres routes et signale des fichiers absents', async () => {
    expect(await handleLocalRoms(root, request('/'))).toBeNull();
    const result = await handleLocalRoms(root, request('/__local-roms/status'));
    expect(JSON.parse(result!.body as string)).toEqual({
      game: false,
      bios: false,
    });
  });
  it('détecte et lit seulement les deux noms prévus sans les modifier', async () => {
    await writeFile(join(root, 'roms/marble.zip'), new Uint8Array([1, 2, 3]));
    await writeFile(join(root, 'roms/atarisy1.zip'), new Uint8Array([4, 5]));
    const status = await handleLocalRoms(
      root,
      request('/__local-roms/status?fresh=1'),
    );
    expect(JSON.parse(status!.body as string)).toEqual({
      game: true,
      bios: true,
    });
    const game = await handleLocalRoms(
      root,
      request('/__local-roms/marble.zip'),
    );
    expect(game!.status).toBe(200);
    expect([...(game!.body as Uint8Array)]).toEqual([1, 2, 3]);
    expect(
      (await handleLocalRoms(
        root,
        request('/__local-roms/atarisy1.zip', 'HEAD'),
      ))!.status,
    ).toBe(200);
  });
  it('rejette un nom arbitraire, traversée ou fichier manquant', async () => {
    for (const name of [
      'other.zip',
      '../package.json',
      '%2e%2e/package.json',
      'marble.zip',
    ]) {
      expect(
        (await handleLocalRoms(root, request(`/__local-roms/${name}`)))!.status,
      ).toBe(404);
    }
  });
  it('sert uniquement le relevé et le point de reprise prévus sur la boucle locale', async () => {
    await mkdir(join(root, 'local-roms'));
    for (const name of [
      'intermediate-terrain-pipes.json',
      'intermediate-web.state',
      'private.state',
    ])
      await writeFile(
        join(root, 'local-roms', name),
        new Uint8Array([1, 2, 3]),
      );
    const terrain = '/__local-roms/intermediate-terrain-pipes.json';
    const state = '/__local-roms/intermediate-web.state';
    expect(await handleLocalRoms(root, request(terrain))).toMatchObject({
      status: 200,
      contentType: 'application/json',
    });
    expect(await handleLocalRoms(root, request(state))).toMatchObject({
      status: 200,
      contentType: 'application/octet-stream',
    });
    expect(
      (await handleLocalRoms(root, request('/__local-roms/private.state')))
        ?.status,
    ).toBe(404);
    expect(
      (await handleLocalRoms(root, request(state, 'GET', '192.168.1.20')))
        ?.status,
    ).toBe(403);
  });
  it('ne propose ni répertoire ni fichier de plus de 16 Mio', async () => {
    await mkdir(join(root, 'roms/marble.zip'));
    await writeFile(
      join(root, 'roms/atarisy1.zip'),
      new Uint8Array(16 * 1024 * 1024 + 1),
    );
    const result = await handleLocalRoms(root, request('/__local-roms/status'));
    expect(JSON.parse(result!.body as string)).toEqual({
      game: false,
      bios: false,
    });
  });
  it.each(['::1', '::ffff:127.0.0.1'])(
    'accepte le loopback %s',
    async (address) => {
      expect(
        (await handleLocalRoms(
          root,
          request('/__local-roms/status', 'GET', address),
        ))!.status,
      ).toBe(200);
    },
  );
  it('refuse le réseau externe et les mutations HTTP', async () => {
    expect(
      (await handleLocalRoms(
        root,
        request('/__local-roms/status', 'GET', '192.168.1.20'),
      ))!.status,
    ).toBe(403);
    expect(
      (await handleLocalRoms(root, request('/__local-roms/status', 'POST')))!
        .status,
    ).toBe(405);
  });
  it('ne fournit pas de middleware preview ou de génération de bundle', () => {
    const plugin = localRomsPlugin();
    expect(plugin.apply).toBe('serve');
    expect(plugin.configurePreviewServer).toBeUndefined();
    expect(plugin.generateBundle).toBeUndefined();
  });
});

it('raccorde HTTP : aucune mise en cache, HEAD sans corps et routes étrangères ignorées', async () => {
  await writeFile(join(root, 'roms/marble.zip'), new Uint8Array([1, 2, 3]));
  type Request = {
    url?: string;
    method?: string;
    socket: { remoteAddress?: string };
  };
  type Response = {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: string | Uint8Array): void;
  };
  type Handler = (
    request: Request,
    response: Response,
    next: (error?: unknown) => void,
  ) => void;
  let handler: Handler;
  const configure = localRomsPlugin().configureServer as unknown as (server: {
    config: { root: string };
    middlewares: { use(callback: Handler): void };
  }) => void;
  configure({
    config: { root },
    middlewares: {
      use(callback) {
        handler = callback;
      },
    },
  });
  async function perform(request: Request) {
    const headers: Record<string, string> = {};
    let body: string | Uint8Array | undefined;
    let passed = false;
    const response: Response = {
      statusCode: 0,
      setHeader(name, value) {
        headers[name] = value;
      },
      end(value) {
        body = value;
      },
    };
    await new Promise<void>((resolve, reject) => {
      handler(
        request,
        {
          ...response,
          set statusCode(value) {
            response.statusCode = value;
          },
          get statusCode() {
            return response.statusCode;
          },
          end(value) {
            response.end(value);
            resolve();
          },
        },
        (error) => {
          if (error) reject(error);
          else {
            passed = true;
            resolve();
          }
        },
      );
    });
    return { headers, body, passed, status: response.statusCode };
  }
  const get = await perform({
    url: '/__local-roms/marble.zip',
    method: 'GET',
    socket: { remoteAddress: '127.0.0.1' },
  });
  expect(get.status).toBe(200);
  expect(get.headers['Cache-Control']).toBe('no-store');
  expect([...(get.body as Uint8Array)]).toEqual([1, 2, 3]);
  const head = await perform({
    url: '/__local-roms/marble.zip',
    method: 'HEAD',
    socket: { remoteAddress: '127.0.0.1' },
  });
  expect(head.body).toBeUndefined();
  expect(
    (await perform({ url: '/__local-roms/status', socket: {} })).status,
  ).toBe(403);
  expect((await perform({ socket: {} })).passed).toBe(true);
});
