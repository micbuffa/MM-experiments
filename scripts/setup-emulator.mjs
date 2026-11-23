import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(
  await readFile(
    new URL('../third_party/emulatorjs-assets.json', import.meta.url),
  ),
);
const destination = new URL(
  `../public/vendor/emulatorjs/${manifest.frontend}/data/`,
  import.meta.url,
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

for (const asset of manifest.assets) {
  const target = new URL(asset.path, destination);
  const existing = await readFile(target).catch(() => null);
  if (existing && hash(existing) === asset.sha256) {
    process.stdout.write(`Vérifié : ${asset.path}\n`);
    continue;
  }
  const response = await fetch(asset.url, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${asset.url} : HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== asset.bytes || hash(bytes) !== asset.sha256) {
    throw new Error(
      `Empreinte incorrecte : ${asset.path}. Installation interrompue.`,
    );
  }
  await mkdir(dirname(fileURLToPath(target)), { recursive: true });
  await writeFile(target, bytes);
  process.stdout.write(`Installé et vérifié : ${asset.path}\n`);
}
for (const name of ['LICENSE.EmulatorJS.txt', 'LICENSE.MAME2003-Plus.txt']) {
  await writeFile(
    new URL(name, destination),
    await readFile(new URL(`../third_party/${name}`, import.meta.url)),
  );
}
process.stdout.write(
  'EmulatorJS 4.2.3 + MAME 2003-Plus disponibles localement. Aucune ROM téléchargée.\n',
);
