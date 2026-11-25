import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outDir = resolve(root, 'dist-remaster');

execFileSync('npx', ['vite', 'build', '--config', 'vite.remaster.config.ts'], {
  stdio: 'inherit',
});

renameSync(resolve(outDir, 'remaster.html'), resolve(outDir, 'index.html'));

const dataDir = resolve(outDir, 'beta-data');
mkdirSync(dataDir, { recursive: true });
copyFileSync(
  resolve(root, 'local-roms/practice-complete-terrain.json'),
  resolve(dataDir, 'practice-complete-terrain.json'),
);

process.stdout.write(`✓ Standalone Remaster build ready in ${outDir}\n`);
