import console from 'node:console';
import process from 'node:process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Local developer Level 5 survey/checkpoint. Reuses the L4 sampler and verifies
// it against the existing L4 relief before advancing the native test session.
// Only derived terrain and a normal emulator checkpoint are saved locally.
const level4Ref = JSON.parse(
  await readFile('local-roms/level4-terrain.json', 'utf8'),
);

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  await page.addInitScript(() => {
    let constructor;
    Object.defineProperty(globalThis, 'EmulatorJS', {
      configurable: true,
      get: () => constructor,
      set: (original) => {
        constructor = new Proxy(original, {
          construct: (target, args) => {
            globalThis.localEmulator = Reflect.construct(target, args);
            return globalThis.localEmulator;
          },
        });
      },
    });
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#archive').setInputFiles('roms/marble.zip');
  await page.locator('#bios').setInputFiles('roms/atarisy1.zip');
  await page.locator('#prepare').click();
  await page.getByText('Démarrer l’émulation', { exact: true }).click();
  await page.waitForSelector('#start-level4:not([hidden])', {
    timeout: 30000,
  });
  await page.locator('#start-level4').click();
  await page.waitForTimeout(300);

  // Locate ROM (0x010000..0x02ffff, 0x080000..0x087fff) and Playfield RAM (0xa00000) in HEAPU8
  // using the known Level 3 terrain reference!
  await page.evaluate(
    async ({ refRows }) => {
      const {
        encodeIntermediateCheckpoint,
        readCheckpointPorts,
        readCheckpointHardware,
      } = await import('/src/emulation/intermediateCheckpoint.ts');
      const { Module: core, gameManager } = globalThis.localEmulator;
      const heap = core.HEAPU8;
      const view = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
      const workBase = 0x1d99478;
      const ram = new DataView(heap.buffer, workBase);
      const rWord = (off) => ram.getUint16(off, true);
      const rLong = (off) => rWord(off) * 65536 + rWord(off + 2);

      // Find 68010 ROM base (0x000000) in HEAPU8 by searching for level descriptor table
      // at 0x2be00: 0002 bee2 0002 c54c 0002 cd9e 0002 d648 (byte-swapped in 16-bit LE!)
      const sig = [
        0x02, 0x00, 0xe2, 0xbe, 0x02, 0x00, 0x4c, 0xc5, 0x02, 0x00, 0x9e, 0xcd,
      ];
      let romBase = -1;
      for (let i = 0; i < heap.length - 0x40000; i += 2) {
        let ok = true;
        for (let k = 0; k < sig.length; k++) {
          if (heap[i + k] !== sig[k]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          romBase = i - 0x2be00;
          break;
        }
      }
      console.log('Found romBase:', romBase.toString(16));
      // Find 0x080000 (slapstic ROM) by checking L3 descriptor's level+0 (0x0810c6)
      // In mame2003_plus, 0x080000 is mapped right after main ROM or via bankZeroPointer (24509232).
      const bankZero = view.getUint32(24509232, true);
      const bankTarget = view.getUint32(24509228, true);
      console.log(
        'bankTarget:',
        bankTarget.toString(16),
        'bankZero:',
        bankZero.toString(16),
      );

      // Helper to read 68010 address space (16-bit LE swapped)
      const romWord = (addr) => {
        if (addr >= 0x400000 && addr < 0x410000)
          return view.getUint16(workBase + (addr - 0x400000), true);
        if (addr >= 0x080000 && addr < 0x088000)
          return view.getUint16(romBase + addr, true);
        return view.getUint16(romBase + addr, true);
      };
      const romByte = (addr) => heap[(romBase + addr) ^ 1];
      const romI16 = (addr) => view.getInt16(romBase + addr, true);
      const romU32 = (addr) => romWord(addr) * 65536 + romWord(addr + 2);

      // Verify 0x080000..0x087fff is contiguous at romBase + 0x080000
      console.log('L3 diags at 0x2cd9e+0x18:', romWord(0x2cd9e + 0x18));

      // Find Playfield RAM (0xa00000): 4KB-aligned block in HEAPU8 where sampleCell matches L3 refRows!
      function makeSampler(pfBase) {
        const pfU32 = (off) => {
          const w0 = view.getUint16(pfBase + off, true);
          const w1 = view.getUint16(pfBase + off + 2, true);
          return ((w0 << 16) | w1) >>> 0;
        };
        return function sampleCell(x, y) {
          const level = rLong(0x474);
          const result = new Array(16).fill(0);
          let diagonal = y + x - 20;
          let column = 21 - x + Math.floor(diagonal / 2);
          let steps = 0x24b3a + (diagonal & 1) * 18;
          let out = 0;
          const maxDiag = romWord(level + 0x18);
          const codeTable = rLong(0x65a);
          const recordBase = romU32(level);
          for (let i = 0; i < 4; i++) {
            const heights = [0, 0, 0, 0];
            if (diagonal >= 0 && diagonal < maxDiag) {
              const slot = column + (diagonal & 1) * 22;
              if (slot >= 0 && slot < 44) {
                const pfOff =
                  romI16(0x1eb3a + (diagonal & 0xfe)) +
                  romByte(0x1ed0a + slot) -
                  2;
                if (pfOff >= 0 && pfOff + 4 <= 0x10000) {
                  const shift = romByte(0x1ed36 + slot);
                  const index = (pfU32(pfOff) >>> shift) & 0x7fe;
                  let code = romWord(codeTable + index);
                  let depth = 0;
                  while (code >= 0x800 && code < 0x1000 && depth < 8) {
                    depth++;
                    code = rWord(0x76e + (code & 0x7fe));
                  }
                  const base = rWord(0x478 + diagonal * 2);
                  if (code >= 0x1000) {
                    const height = (base + (code & 0x7f) - 0x40) & 0xffff;
                    const coeff = romI16(0x1ed62 + ((code >> 6) & 0x3e));
                    const other =
                      coeff === 0x1000 ? 0 : (height - coeff) & 0xffff;
                    for (let j = 0; j < 4; j++) {
                      heights[j] =
                        code >= 0xf000 || (code & (1 << (12 + j))) !== 0
                          ? height
                          : other;
                    }
                  } else if (code !== 0) {
                    const rec = recordBase + code;
                    for (let j = 0; j < 4; j++) {
                      const b = romByte(rec + j);
                      heights[j] = b !== 0 ? (base - 0x80 + b) & 0xffff : 0;
                    }
                  }
                }
              }
            }
            for (let j = 0; j < 4; j++) result[out + j] = heights[j];
            if (i < 3) {
              column += romI16(steps);
              diagonal += romI16(steps + 2);
              out += 4 + Math.floor(romI16(steps + 4) / 2);
              steps += 6;
            }
          }
          return [result[13], result[8], result[7], result[4]];
        };
      }

      // Probe for pfBase near workBase (typically within +-4MB, 16-byte aligned, try 0x1000 steps first then 0x100)
      const flats = [];
      for (let z = 0; z < refRows.length; z++)
        for (let x = 0; x < refRows[z].length; x++) {
          const c = refRows[z][x];
          if (c[0] && c.every((v) => v === c[0])) flats.push([x, z]);
        }
      const testPts = Array.from(
        { length: 15 },
        (_, i) => flats[Math.floor((i * (flats.length - 1)) / 14)],
      );
      let pfBase = -1;
      for (let step of [0x1000, 0x100, 0x10]) {
        for (let addr = 0x100000; addr < heap.length - 0x10000; addr += step) {
          const sample = makeSampler(addr);
          let matches = 0;
          for (const [tx, ty] of testPts) {
            const got = sample(tx, ty);
            const exp = refRows[ty][tx];
            if (
              got[0] === exp[0] &&
              got[1] === exp[1] &&
              got[2] === exp[2] &&
              got[3] === exp[3]
            ) {
              matches++;
            } else break;
          }
          if (matches === testPts.length) {
            pfBase = addr;
            break;
          }
        }
        if (pfBase >= 0) break;
      }
      console.log(
        'Found pfBase:',
        pfBase >= 0 ? '0x' + pfBase.toString(16) : 'NOT_FOUND',
      );

      const level5Descriptor = romU32(0x2be00 + 4 * 4);
      const maxDiag5 = romWord(level5Descriptor + 0x18);
      const dimension = Math.ceil((maxDiag5 + 44) / 2);
      console.log(
        'LEVEL5_META',
        JSON.stringify({
          descriptor: level5Descriptor,
          maxDiag: maxDiag5,
          dimension,
          recordBase: romU32(level5Descriptor),
        }),
      );
      globalThis.level5Metadata = {
        descriptor: level5Descriptor,
        maxDiag: maxDiag5,
        dimension,
      };
      let reachedGoal = false;
      let level5StartFrame = -1;
      const before = core.marbleBeforeIteration;
      core.marbleBeforeIteration = () => {
        before();
        const frame = gameManager.functions.getFrameNum();
        const descriptor = rLong(0x474);
        const mode = rWord(0x390);
        if (frame % 60 === 0) {
          console.log(
            `f=${frame} desc=0x${descriptor.toString(16)} mode=${mode} pos=(${ram.getInt16(0x24, true)},${ram.getInt16(0x28, true)},${rWord(0x2c)}) scroll=${ram.getInt16(0x97e, true)}`,
          );
        }
        if (descriptor === 0x2d648 && mode === 0 && !reachedGoal) {
          ram.setUint8(0x33, 6);
          ram.setUint8(0x3a5, 0);
          reachedGoal = true;
          return;
        }
        if (descriptor === level5Descriptor && mode === 0) {
          if (level5StartFrame < 0) level5StartFrame = frame;
          if (frame >= level5StartFrame + 20) {
            globalThis.level5Checkpoint = encodeIntermediateCheckpoint(
              gameManager.getState(),
              readCheckpointPorts(core.HEAPU8),
              readCheckpointHardware(core.HEAPU8),
            );
            if (pfBase >= 0) {
              const sample = makeSampler(pfBase);
              const size = dimension;
              const rows = [];
              for (let row = 0; row < size; row++) {
                const line = [];
                for (let col = 0; col < size; col++) {
                  if (Math.abs(row - col) > 21) line.push([0, 0, 0, 0]);
                  else line.push(sample(col, row));
                }
                rows.push(line);
              }
              globalThis.level5Survey = { format: 'level5-terrain-v1', rows };
            }
            core.marbleBeforeIteration = before;
          }
        }
      };
    },
    { refRows: level4Ref.rows },
  );

  await page.locator('#resume').click();
  await page.waitForFunction(() => globalThis.level5Checkpoint, null, {
    timeout: 60000,
  });
  console.log(
    'FINAL_META',
    JSON.stringify(
      await page.evaluate(() => {
        const ram = new DataView(
          globalThis.localEmulator.Module.HEAPU8.buffer,
          0x1d99478,
        );
        return {
          ...globalThis.level5Metadata,
          scroll: ram.getInt16(0x97e, true),
          x: ram.getInt16(0x24, true),
          z: ram.getInt16(0x28, true),
          height: ram.getUint16(0x2c, true),
          time: ram.getUint16(0x3a4, true),
        };
      }),
    ),
  );
  const stateBytes = await page.evaluate(() =>
    Array.from(globalThis.level5Checkpoint),
  );
  await mkdir('local-roms', { recursive: true });
  await writeFile('local-roms/level5-web.state', Buffer.from(stateBytes));
  console.log('Saved local-roms/level5-web.state');

  const survey = await page.evaluate(() => globalThis.level5Survey);
  if (survey) {
    let active = 0;
    for (const r of survey.rows)
      for (const c of r) if (c.some((v) => v > 0)) active++;
    await writeFile('local-roms/level5-terrain.json', JSON.stringify(survey));
    console.log(
      `Saved local-roms/level5-terrain.json (${survey.rows.length}x${survey.rows[0].length}, ${active} active cells)`,
    );
  } else {
    console.log('WARNING: pfBase not found, level5-terrain.json not written.');
  }
} finally {
  await browser.close();
}
