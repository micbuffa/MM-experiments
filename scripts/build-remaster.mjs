import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outDir = resolve(root, 'dist-remaster');

execFileSync('npx', ['vite', 'build', '--config', 'vite.remaster.config.ts'], {
  stdio: 'inherit',
});

renameSync(resolve(outDir, 'remaster.html'), resolve(outDir, 'index.html'));
rmSync(resolve(outDir, 'vendor'), { recursive: true, force: true });
rmSync(resolve(outDir, 'assets/cabinet'), { recursive: true, force: true });

const dataDir = resolve(outDir, 'beta-data');
mkdirSync(dataDir, { recursive: true });
copyFileSync(
  resolve(root, 'local-roms/practice-complete-terrain.json'),
  resolve(dataDir, 'practice-complete-terrain.json'),
);

// Bundle local reference VGM tracks into dist-remaster/assets/audio/ when present
// so Peter Salomonsen can test them directly on the live /remaster/ preview.
const audioOutDir = resolve(outDir, 'assets/audio');
mkdirSync(audioOutDir, { recursive: true });
const packDir = resolve(root, 'local-roms/original_FX_and_musics');
const vgmMap = [
  ['02 Level 1.vgz', 'level1-practice.vgz'],
  ['03 Player 1 Goal In.vgz', 'goal-fanfare.vgz'],
  ['04 Player 2 Goal In.vgz', 'goal-fanfare-p2.vgz'],
  ['13 Game Over.vgz', 'game-over.vgz'],
];
for (const [srcName, dstName] of vgmMap) {
  const src = resolve(packDir, srcName);
  if (existsSync(src)) {
    copyFileSync(src, resolve(audioOutDir, dstName));
  }
}

process.stdout.write(`✓ Standalone Remaster build ready in ${outDir}\n`);
