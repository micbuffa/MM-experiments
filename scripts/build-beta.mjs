import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rename, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'dist-beta');
const dataDir = join(outDir, 'beta-data');

const ASSETS = [
  ['roms', 'marble.zip'],
  ['roms', 'atarisy1.zip'],
  ['local-roms', 'rolling-actors.json'],
  ['local-roms', 'practice-complete-terrain.json'],
  ['local-roms', 'intermediate-terrain-pipes.json'],
  ['local-roms', 'intermediate-web.state'],
  ['local-roms', 'level3-terrain.json'],
  ['local-roms', 'level3-web.state'],
  ['local-roms', 'level4-terrain.json'],
  ['local-roms', 'level4-web.state'],
  ['local-roms', 'level5-terrain.json'],
  ['local-roms', 'level5-web.state'],
];

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--config', 'vite.beta.config.ts'],
  { cwd: root, stdio: 'inherit' },
);

await rename(join(outDir, 'beta.html'), join(outDir, 'index.html'));
await mkdir(dataDir, { recursive: true });

for (const [dir, file] of ASSETS) {
  const src = join(root, dir, file);
  await stat(src);
  await copyFile(src, join(dataDir, file));
}

process.stdout.write(
  `\n✓ Distribution statique beta prête dans ${outDir} (${ASSETS.length} fichiers copiés dans beta-data/).\n`,
);
