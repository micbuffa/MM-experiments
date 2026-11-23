import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import {
  serializeReplay,
  parseReferenceOutput,
} from '../src/diagnostics/referenceReplay.ts';

const root = resolve(import.meta.dirname, '..');
const binary = process.env.MAME_BINARY;
if (!binary)
  throw new Error('Définir MAME_BINARY vers un exécutable MAME 0.271 local.');
const executable = resolve(binary);
const environment = {
  ...process.env,
  SDL_VIDEODRIVER: 'dummy',
  SDL_AUDIODRIVER: 'dummy',
};
function run(args, cwd = root) {
  const result = spawnSync(executable, args, {
    cwd,
    env: environment,
    encoding: 'utf8',
    timeout: 45000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `MAME échoué : ${result.error ?? result.stderr ?? result.status}`,
    );
  }
  return result.stdout + '\n' + result.stderr;
}
if (!/^MAME v0\.271\b/m.test(run(['-help'])))
  throw new Error('MAME 0.271 requis.');
const verification = run([
  'marble',
  '-bios',
  'ttl',
  '-noreadconfig',
  '-rompath',
  join(root, 'roms'),
  '-verifyroms',
]);
if (!verification.includes('is good'))
  throw new Error('Archives locales non vérifiées.');
const evidence = JSON.parse(
  await readFile(
    join(root, 'third_party/trackball-port-evidence.json'),
    'utf8',
  ),
);
const template = await readFile(
  join(root, 'scripts/reference/replay.lua'),
  'utf8',
);
const report = {
  date: new Date().toISOString(),
  version: '0.271',
  bios: 'ttl',
  binarySha256: createHash('sha256')
    .update(await readFile(executable))
    .digest('hex'),
  sourceWasmSha256: evidence.coreWasmSha256,
  method:
    'Rejeu des octets des quatre ports, phase fixe par série ; aucune modification de ROM ou de physique.',
  phases: [-1, 0, 1, 2],
  trials: [],
};
const output = join(root, 'test-results/reference');
await mkdir(output, { recursive: true });
for (const shift of report.phases) {
  for (const trial of evidence.prototypeTrials) {
    const directory = join(
      output,
      `phase-${shift}-amplitude-${trial.amplitude}`,
    );
    await mkdir(directory, { recursive: true });
    const script = join(directory, 'replay.lua');
    await writeFile(script, serializeReplay(trial.portReads, shift) + template);
    const isolatedPaths = [
      'cfg_directory',
      'nvram_directory',
      'state_directory',
      'snapshot_directory',
      'diff_directory',
      'input_directory',
    ];
    const log = run(
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
        join(root, 'roms'),
        '-homepath',
        directory,
        ...isolatedPaths.flatMap((name) => [`-${name}`, join(directory, name)]),
        '-video',
        'none',
        '-sound',
        'none',
        '-nothrottle',
        '-skip_gameinfo',
        '-seconds_to_run',
        '24',
        '-autoboot_script',
        script,
      ],
      directory,
    );
    await writeFile(join(directory, 'output.log'), log);
    const samples = parseReferenceOutput(log);
    const initial = samples[0];
    const final = samples[2];
    const referenceDelta = [final.x - initial.x, final.y - initial.y];
    const webDeltaNativePixels = [
      (trial.dx * 336) / 1110,
      (trial.dy * 240) / 832,
    ];
    const entry = {
      amplitude: trial.amplitude,
      phaseShift: shift,
      samples,
      referenceDelta,
      webDeltaNativePixels,
      absoluteDifference: referenceDelta.map((value, i) =>
        Math.abs(value - webDeltaNativePixels[i]),
      ),
    };
    report.trials.push(entry);
    process.stdout.write(
      `${trial.amplitude} / phase ${shift} : Δ=${referenceDelta.map((v) => v.toFixed(3)).join(', ')}\n`,
    );
  }
}
await writeFile(
  join(output, 'comparison.json'),
  JSON.stringify(report, null, 2) + '\n',
);
process.stdout.write('Rapport : test-results/reference/comparison.json\n');
