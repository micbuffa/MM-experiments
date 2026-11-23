import console from 'node:console';
import process from 'node:process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Local developer Level 6 (Ultimate Race) survey, checkpoint & dynamic-block audit.
const level5Ref = JSON.parse(
  await readFile('local-roms/level5-terrain.json', 'utf8'),
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
  await page.waitForSelector('#start-level5:not([hidden])', {
    timeout: 30000,
  });
  await page.locator('#start-level5').click();
  await page.waitForTimeout(300);

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
      const romWord = (addr) => {
        if (addr >= 0x400000 && addr < 0x410000)
          return view.getUint16(workBase + (addr - 0x400000), true);
        return view.getUint16(romBase + addr, true);
      };
      const romByte = (addr) => heap[(romBase + addr) ^ 1];
      const romI16 = (addr) => view.getInt16(romBase + addr, true);
      const romU32 = (addr) => romWord(addr) * 65536 + romWord(addr + 2);

      function makeSampler(pfBase) {
        const pfU32 = (off) => {
          const w0 = view.getUint16(pfBase + off, true);
          const w1 = view.getUint16(pfBase + off + 2, true);
          return ((w0 << 16) | w1) >>> 0;
        };
        function decodeCode(code, base, recordBase) {
          const heights = [0, 0, 0, 0];
          if (code >= 0x1000) {
            const height = (base + (code & 0x7f) - 0x40) & 0xffff;
            const coeff = romI16(0x1ed62 + ((code >> 6) & 0x3e));
            const other = coeff === 0x1000 ? 0 : (height - coeff) & 0xffff;
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
          return heights;
        }
        function sampleCell(x, y, collectDynamic) {
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
            let heights = [0, 0, 0, 0];
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
                  const base = rWord(0x478 + diagonal * 2);
                  let depth = 0;
                  while (code >= 0x800 && code < 0x1000 && depth < 8) {
                    const dynOff = code & 0x7fe;
                    if (collectDynamic) {
                      collectDynamic(x, y, i, dynOff, base, recordBase);
                    }
                    depth++;
                    code = rWord(0x76e + dynOff);
                  }
                  heights = decodeCode(code, base, recordBase);
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
        }
        return { sampleCell, decodeCode };
      }

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
      for (const step of [0x1000, 0x100, 0x10]) {
        for (let addr = 0x100000; addr < heap.length - 0x10000; addr += step) {
          const { sampleCell } = makeSampler(addr);
          let matches = 0;
          for (const [tx, ty] of testPts) {
            const got = sampleCell(tx, ty);
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

      const level6Descriptor = romU32(0x2be00 + 5 * 4);
      const maxDiag6 = romWord(level6Descriptor + 0x18);
      const dimension = Math.ceil((maxDiag6 + 44) / 2);
      const recordBase6 = romU32(level6Descriptor);
      console.log(
        'LEVEL6_META',
        JSON.stringify({
          descriptor: '0x' + level6Descriptor.toString(16),
          maxDiag: maxDiag6,
          dimension,
          recordBase: '0x' + recordBase6.toString(16),
        }),
      );
      globalThis.level6Metadata = {
        descriptor: level6Descriptor,
        maxDiag: maxDiag6,
        dimension,
        recordBase: recordBase6,
      };

      let reachedGoal = false;
      let level6StartFrame = -1;
      let dynamicCells = [];
      let slotHistory = new Map();
      let prevSlotValues = new Map();
      const before = core.marbleBeforeIteration;
      core.marbleBeforeIteration = () => {
        before();
        const frame = gameManager.functions.getFrameNum();
        const descriptor = rLong(0x474);
        const mode = rWord(0x390);
        if (descriptor === 0x2de1e && mode === 0 && !reachedGoal) {
          ram.setUint8(0x33, 6);
          ram.setUint8(0x3a5, 0);
          reachedGoal = true;
          return;
        }
        if (descriptor === level6Descriptor && mode === 0) {
          if (level6StartFrame < 0) level6StartFrame = frame;
          const rel = frame - level6StartFrame;
          if (rel === 20) {
            globalThis.level6Checkpoint = encodeIntermediateCheckpoint(
              gameManager.getState(),
              readCheckpointPorts(core.HEAPU8),
              readCheckpointHardware(core.HEAPU8),
            );
            if (pfBase >= 0) {
              const { sampleCell } = makeSampler(pfBase);
              const size = dimension;
              const rows = [];
              const seenDyn = new Map();
              for (let row = 0; row < size; row++) {
                const line = [];
                for (let col = 0; col < size; col++) {
                  if (Math.abs(row - col) > 21) {
                    line.push([0, 0, 0, 0]);
                    continue;
                  }
                  const cell = sampleCell(
                    col,
                    row,
                    (cx, cz, sub, dynOff, base) => {
                      const key = `${cx},${cz},${sub},${dynOff}`;
                      if (!seenDyn.has(key)) {
                        seenDyn.set(key, { x: cx, z: cz, sub, dynOff, base });
                      }
                    },
                  );
                  line.push(cell);
                }
                rows.push(line);
              }
              dynamicCells = [...seenDyn.values()];
              globalThis.level6Survey = { format: 'level6-terrain-v1', rows };
              for (const d of dynamicCells) {
                if (!slotHistory.has(d.dynOff)) slotHistory.set(d.dynOff, []);
              }
            }
          }
          // Track every dynamic slot transition for 600 frames (~10 seconds)!
          if (rel >= 20 && rel <= 620) {
            for (const dynOff of slotHistory.keys()) {
              const val = rWord(0x76e + dynOff);
              if (prevSlotValues.get(dynOff) !== val) {
                prevSlotValues.set(dynOff, val);
                slotHistory.get(dynOff).push([rel, val]);
              }
            }
          }
          if (rel === 621) {
            const summary = {};
            for (const [dynOff, changes] of slotHistory.entries()) {
              const cells = dynamicCells.filter((d) => d.dynOff === dynOff);
              const xs = cells.map((c) => c.x);
              const zs = cells.map((c) => c.z);
              summary['0x' + dynOff.toString(16)] = {
                ramAddr: '0x' + (0x76e + dynOff).toString(16),
                cellCount: cells.length,
                xRange: [Math.min(...xs), Math.max(...xs)],
                zRange: [Math.min(...zs), Math.max(...zs)],
                changes: changes.slice(0, 24),
              };
            }
            globalThis.level6DynamicReport = {
              totalDynamicRefs: dynamicCells.length,
              uniqueSlots: slotHistory.size,
              slots: summary,
            };
            core.marbleBeforeIteration = before;
          }
        }
      };
    },
    { refRows: level5Ref.rows },
  );

  await page.locator('#resume').click();
  await page.waitForFunction(() => globalThis.level6DynamicReport, null, {
    timeout: 90000,
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
          ...globalThis.level6Metadata,
          scroll: ram.getInt16(0x97e, true),
          x: ram.getInt16(0x24, true),
          z: ram.getInt16(0x28, true),
          height: ram.getUint16(0x2c, true),
          time: ram.getUint16(0x3a4, true),
        };
      }),
    ),
  );
  const dynReport = await page.evaluate(() => globalThis.level6DynamicReport);
  console.log('DYNAMIC_REPORT', JSON.stringify(dynReport, null, 2));

  const stateBytes = await page.evaluate(() =>
    Array.from(globalThis.level6Checkpoint),
  );
  await mkdir('local-roms', { recursive: true });
  await writeFile('local-roms/level6-web.state', Buffer.from(stateBytes));
  console.log('Saved local-roms/level6-web.state');

  const survey = await page.evaluate(() => globalThis.level6Survey);
  if (survey) {
    let active = 0;
    for (const r of survey.rows)
      for (const c of r) if (c.some((v) => v > 0)) active++;
    await writeFile('local-roms/level6-terrain.json', JSON.stringify(survey));
    console.log(
      `Saved local-roms/level6-terrain.json (${survey.rows.length}x${survey.rows[0].length}, ${active} active cells)`,
    );
  }
} finally {
  await browser.close();
}
