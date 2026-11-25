import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'native/audio/opm_pokey.cpp');
const output = resolve(root, 'public/assets/audio/opm-pokey.wasm');

mkdirSync(dirname(output), { recursive: true });

const emcc = process.env.EMCC || 'emcc';
const exportsList =
  "['_audio_init','_audio_set_mix','_opm_write','_pokey_write','_audio_render','_audio_left_ptr','_audio_right_ptr']";

execFileSync(
  emcc,
  [
    source,
    '-O3',
    '-std=c++17',
    '--no-entry',
    '-sSTANDALONE_WASM=1',
    `-sEXPORTED_FUNCTIONS=${exportsList}`,
    '-o',
    output,
  ],
  { stdio: 'inherit' },
);

const size = statSync(output).size;
process.stdout.write(`Built ${output} (${(size / 1024).toFixed(1)} KiB)\n`);
