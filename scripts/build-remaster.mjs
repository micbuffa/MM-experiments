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
copyFileSync(
  resolve(root, 'local-roms/intermediate-terrain-pipes.json'),
  resolve(dataDir, 'intermediate-terrain-pipes.json'),
);
copyFileSync(
  resolve(root, 'local-roms/level3-terrain.json'),
  resolve(dataDir, 'level3-terrain.json'),
);
copyFileSync(
  resolve(root, 'local-roms/level4-terrain.json'),
  resolve(dataDir, 'level4-terrain.json'),
);
copyFileSync(
  resolve(root, 'local-roms/level5-terrain.json'),
  resolve(dataDir, 'level5-terrain.json'),
);
copyFileSync(
  resolve(root, 'local-roms/level6-terrain.json'),
  resolve(dataDir, 'level6-terrain.json'),
);
const rollingActorsSrc = resolve(root, 'local-roms/rolling-actors.json');
if (existsSync(rollingActorsSrc)) {
  copyFileSync(rollingActorsSrc, resolve(dataDir, 'rolling-actors.json'));
}

// Bundle local reference VGM tracks into dist-remaster/assets/audio/ when present
// so Peter Salomonsen can test them directly on the live /remaster/ preview.
const audioOutDir = resolve(outDir, 'assets/audio');
mkdirSync(audioOutDir, { recursive: true });
const packDir = resolve(root, 'local-roms/original_FX_and_musics');
const vgmMap = [
  ['02 Level 1.vgz', 'level1-practice.vgz'],
  ['03 Player 1 Goal In.vgz', 'goal-fanfare.vgz'],
  ['04 Player 2 Goal In.vgz', 'goal-fanfare-p2.vgz'],
  ['05 Level 2.vgz', 'level2-beginner.vgz'],
  ['06 Level 3.vgz', 'level3-intermediate.vgz'],
  ['07 Level 4-1.vgz', 'level4-aerial.vgz'],
  ['09 Level 5.vgz', 'level5-silly.vgz'],
  ['10 Level 6.vgz', 'level6-ultimate.vgz'],
  ['11 Congratulations.vgz', 'congratulations.vgz'],
  ['13 Game Over.vgz', 'game-over.vgz'],
  ['sfx/sfx-wall-bounce.vgm', 'sfx-wall-bounce.vgm'],
  ['sfx/sfx-marble-clack.vgm', 'sfx-marble-clack.vgm'],
  ['sfx/sfx-pvp-clack.vgm', 'sfx-pvp-clack.vgm'],
  ['sfx/sfx-impact.vgm', 'sfx-impact.vgm'],
  ['sfx/sfx-fall.vgm', 'sfx-fall.vgm'],
  ['sfx/sfx-void-fall.vgm', 'sfx-void-fall.vgm'],
  ['sfx/sfx-dizzy.vgm', 'sfx-dizzy.vgm'],
  ['sfx/sfx-shatter.vgm', 'sfx-shatter.vgm'],
  ['sfx/sfx-broom.vgm', 'sfx-broom.vgm'],
  ['sfx/sfx-respawn.vgm', 'sfx-respawn.vgm'],
  ['sfx/sfx-worm-eat.vgm', 'sfx-worm-eat.vgm'],
  ['sfx/sfx-pipe.vgm', 'sfx-pipe.vgm'],
  ['sfx/sfx-ice-enter.vgm', 'sfx-ice-enter.vgm'],
  ['sfx/sfx-ice-leave.vgm', 'sfx-ice-leave.vgm'],
  ['sfx/sfx-acid-dissolve.vgm', 'sfx-acid-dissolve.vgm'],
  ['sfx/sfx-mini-squash-acid.vgm', 'sfx-mini-squash-acid.vgm'],
  ['sfx/sfx-mini-squash-worm.vgm', 'sfx-mini-squash-worm.vgm'],
  ['sfx/sfx-mini-squash-black.vgm', 'sfx-mini-squash-black.vgm'],
  ['sfx/sfx-countdown.vgm', 'sfx-countdown.vgm'],
];
for (const [srcName, dstName] of vgmMap) {
  const src = resolve(packDir, srcName);
  if (existsSync(src)) {
    copyFileSync(src, resolve(audioOutDir, dstName));
  }
}

process.stdout.write(`✓ Standalone Remaster build ready in ${outDir}\n`);
