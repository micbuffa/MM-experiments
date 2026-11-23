import { locateBlueMarker } from '../src/diagnostics/blueMarker.ts';
import {
  practiceFrame,
  projectPracticePoint,
} from '../src/game/modern/practiceProjection.ts';
import console from 'node:console';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const binary = process.env.MAME_BINARY;
if (!binary) throw new Error('Définir MAME_BINARY vers MAME 0.271.');
const executable = resolve(binary);
const project = resolve(import.meta.dirname, '..');
const output = await mkdtemp(join(tmpdir(), 'marble-terrain-'));

function run(args, directory, axis) {
  const result = spawnSync(executable, args, {
    cwd: directory,
    env: {
      ...process.env,
      SDL_VIDEODRIVER: 'dummy',
      SDL_AUDIODRIVER: 'dummy',
      MARBLE_TERRAIN_AXIS: axis,
      MARBLE_TERRAIN_DECODER: join(
        project,
        'scripts/reference/terrain-sample.lua',
      ),
      MARBLE_TERRAIN_OUTPUT: directory,
    },
    encoding: 'utf8',
    timeout: 45000,
  });
  if (result.error || result.status !== 0)
    throw new Error(String(result.error ?? result.stderr ?? result.status));
  return result.stdout;
}

async function checkProjection(directory, trace) {
  const { width, height } = practiceFrame;
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  // The sprite is clear of the HUD and foreground rails in these three images.
  for (const frame of [1199, 1250, 1260]) {
    const pose = trace.match(
      new RegExp(`^TERRAIN_POSE ${frame} ([-0-9]+) ([-0-9]+) ([0-9]+)$`, 'm'),
    );
    if (!pose) throw new Error(`Position manquante à l’image ${frame}`);
    const [, x, z, elevation] = pose;
    const ppm = await readFile(join(directory, `${frame}.ppm`));
    if (
      !ppm.subarray(0, header.length).equals(header) ||
      ppm.length !== header.length + width * height * 3
    )
      throw new Error('Image PPM MAME inattendue.');
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const source = header.length + (y * width + x) * 3;
        rgba.set(
          ppm.subarray(source, source + 3),
          ((height - 1 - y) * width + x) * 4,
        );
      }
    }
    const marker = locateBlueMarker(rgba, width, height);
    const expected = projectPracticePoint(
      Number(x),
      Number(z),
      Number(elevation),
    );
    if (!marker) throw new Error(`Bille bleue absente de l’image ${frame}.`);
    const error = Math.hypot(marker.x - expected.x, marker.y - expected.y);
    console.log(
      `Projection ${frame} : écart de ${error.toFixed(2)} px natifs.`,
    );
    if (error > 3)
      throw new Error(
        `Écart de projection supérieur à 3 px à l’image ${frame}.`,
      );
  }
}

function replay(directory, axis) {
  const intermediate =
    axis === 'intermediate' || axis === 'intermediate-impact';
  return run(
    [
      'marble',
      '-bios',
      'ttl',
      '-noreadconfig',
      '-nowriteconfig',
      '-noautosave',
      '-nonvram_save',
      '-noplugins',
      '-rompath',
      join(project, 'roms'),
      '-homepath',
      directory,
      '-cfg_directory',
      directory,
      '-nvram_directory',
      directory,
      '-video',
      'none',
      '-sound',
      'none',
      '-nothrottle',
      '-skip_gameinfo',
      '-seconds_to_run',
      intermediate
        ? '65'
        : axis === 'finish'
          ? '36'
          : axis === 'scroll'
            ? '29'
            : '26',
      '-autoboot_script',
      join(
        project,
        'scripts/reference',
        intermediate ? 'intermediate-probe.lua' : 'terrain-probe.lua',
      ),
    ],
    directory,
    axis,
  );
}

async function measureScroll() {
  const trace = replay(output, 'scroll');
  const { width, height } = practiceFrame;
  const headerBytes = Buffer.byteLength(`P6\n${width} ${height}\n255\n`);
  const opening = await readFile(join(output, '1199.ppm'));
  const grid = await readFile(join(output, 'grid-1199.json'));
  const baseline = Number(trace.match(/^TERRAIN_SCROLL 1199 (-?\d+)$/m)?.[1]);
  if (!/^TERRAIN_COMPLETE 0\.271 [1-9]\d*$/m.test(trace) || baseline !== -16144)
    throw new Error('Trace du défilement incomplète ou incompatible.');
  for (const frame of [1399, 1450, 1500, 1630]) {
    const survey = await readFile(join(output, `grid-${frame}.json`));
    if (!survey.equals(grid))
      throw new Error(`Grille différente à l’image ${frame}.`);
  }
  for (const frame of [1407, 1417, 1427, 1437, 1455]) {
    const scroll = Number(
      trace.match(new RegExp(`^TERRAIN_SCROLL ${frame} (-?\\d+)$`, 'm'))?.[1],
    );
    const after = await readFile(join(output, `${frame}.ppm`));
    const delta = scroll - baseline;
    if (delta <= 0 || !Number.isFinite(delta))
      throw new Error(`Défilement absent à l’image ${frame}.`);
    const best = [0, 1, 2, 3]
      .map((lag) => {
        const dy = -delta + lag;
        let count = 0;
        let matches = 0;
        for (let y = 28; y < 195; y++) {
          if (y + dy <= 24 || y + dy >= 235) continue;
          for (let x = 36; x < 300; x += 2) {
            const i = headerBytes + (y * width + x) * 3;
            const j = headerBytes + ((y + dy) * width + x) * 3;
            if (!opening[i] && !opening[i + 1] && !opening[i + 2]) continue;
            count++;
            if (
              opening[i] === after[j] &&
              opening[i + 1] === after[j + 1] &&
              opening[i + 2] === after[j + 2]
            )
              matches++;
          }
        }
        return { dy, score: matches / count };
      })
      .sort((a, b) => b.score - a.score)[0];
    if (best.score < 0.95)
      throw new Error(`Décalage vidéo incompatible à l’image ${frame}.`);
    console.log(
      `Image ${frame}, RAM +${delta}, vidéo ${best.dy} px (${(best.score * 100).toFixed(1)} % de pixels identiques).`,
    );
  }
  const path = join(output, 'practice-scroll-terrain.json');
  await writeFile(path, grid);
  await writeFile(join(output, 'trace.txt'), trace);
  console.log(path);
}

const impact = process.argv.includes('--intermediate-impact');
if (process.argv.includes('--intermediate') || impact) {
  const trace = replay(output, impact ? 'intermediate-impact' : 'intermediate');
  if (!/^LEVEL_TERRAIN\s+2c54c\s+216\s+-16152$/m.test(trace))
    throw new Error(
      `Le rejeu n’a pas atteint Intermediate Race dans ${output}.`,
    );
  if (impact) {
    const poses = await readFile(join(output, 'intermediate-pose.csv'), 'utf8');
    if (
      !/^3085,2,2c54c,0,2,/m.test(poses) ||
      !/^3213,2,2c54c,0,4,/m.test(poses)
    )
      throw new Error(
        `Impact et reconstruction de J2 non confirmés dans ${output}.`,
      );
  }
  await writeFile(join(output, 'trace.txt'), trace);
  console.log(trace.trim());
  console.log(join(output, 'intermediate-terrain.json'));
  process.exit(0);
}

if (process.argv.includes('--finish')) {
  const trace = replay(output, 'finish');
  const grid = await readFile(join(output, 'grid-1199.json'));
  if (
    !/^TERRAIN_NEXT \d+ 02c54c -15784$/m.test(trace) ||
    !/^TERRAIN_FINISH_SAMPLE 1920 .* -15784 6$/m.test(trace) ||
    !/^TERRAIN_COMPLETE 0\.271 [1-9]\d*$/m.test(trace)
  )
    throw new Error(
      `Le rejeu n’a pas atteint l’arrivée attendue dans ${output}.`,
    );
  for (const frame of [1500, 1740, 1860, 1920]) {
    const sample = await readFile(join(output, `grid-${frame}.json`));
    if (!sample.equals(grid))
      throw new Error(`Grille différente à l’image ${frame}.`);
  }
  const path = join(output, 'practice-complete-terrain.json');
  await writeFile(path, grid);
  const lines = trace.split('\n').filter((line) => line.startsWith('TERRAIN_'));
  await writeFile(join(output, 'trace.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(path);
  process.exit(0);
}

if (process.argv.includes('--scroll')) {
  await measureScroll();
  process.exit(0);
}

let referenceGrid;
for (const axis of ['x', 'y']) {
  let reference;
  for (const attempt of [1, 2]) {
    const directory = join(output, `${axis}-${attempt}`);
    await mkdir(directory);
    const log = replay(directory, axis);
    const trace = log
      .split('\n')
      .filter((line) => line.startsWith('TERRAIN_'))
      .join('\n');
    await writeFile(join(directory, 'trace.txt'), trace + '\n');
    if (
      !/^TERRAIN_COMPLETE 0\.271 [1-9]\d*$/m.test(trace) ||
      !/^TERRAIN_LEVEL 02bee2$/m.test(trace) ||
      trace.match(/^TERRAIN_SAMPLE /gm)?.length !== 7
    )
      throw new Error(`Trace incomplète ou incompatible dans ${directory}`);
    const grid = await readFile(join(directory, 'practice-terrain.json'));
    referenceGrid ??= grid;
    if (!grid.equals(referenceGrid))
      throw new Error('La grille de départ diffère entre les rejeux.');
    if (!reference) {
      await checkProjection(directory, trace);
      reference = { trace, directory };
    } else {
      if (trace !== reference.trace)
        throw new Error(`Traces différentes sur l’axe ${axis}`);
      for (const frame of [1199, 1250, 1260, 1280, 1310, 1320, 1340]) {
        const [first, second] = await Promise.all(
          [reference.directory, directory].map((path) =>
            readFile(join(path, `${frame}.ppm`)),
          ),
        );
        if (!first.equals(second))
          throw new Error(
            `Images différentes sur l’axe ${axis}, frame ${frame}`,
          );
      }
    }
  }
  console.log(
    `Axe ${axis} : sept relevés et sept images identiques sur deux rejeux.`,
  );
}
console.log(`Traces et images locales dans ${output}`);
await writeFile(join(output, 'practice-terrain.json'), referenceGrid);
console.log(join(output, 'practice-terrain.json'));
