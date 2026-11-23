import { CORE_WASM_SHA256 } from '../emulation/coreInputPatch';

// ABI statique du WASM figé : Memory_ReadAddress16 {u32 start,end,handler}.
// Provenance : table main_readmem d'atarisy1.c et segment data 43696 du binaire.
export const TRACKBALL_MAP_ADDRESS = 9849616;
export const TRACKBALL_HANDLER_INDEX = 17927;
const ROWS = [
  [-12, 0xf00000, 0xf00fff, 17926],
  [0, 0xf20000, 0xf20007, TRACKBALL_HANDLER_INDEX],
  [12, 0xf40000, 0xf4001f, 17928],
  [24, 0xf60000, 0xf60003, 17929],
  [36, 0xfc0000, 0xfc0001, 17930],
] as const;

// Petit trampoline (i32,i32)->i32 qui appelle l'import t.f, sans modifier le cœur.
export const PORT_TRAMPOLINE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 2, 7, 1, 1,
  116, 1, 102, 0, 0, 3, 2, 1, 0, 7, 5, 1, 1, 102, 0, 1, 10, 10, 1, 8, 0, 32, 0,
  32, 1, 16, 0, 11,
]);

export interface TrackballRead {
  frame: number;
  iterationFrame: number | null;
  offset: number;
  mask: number;
  value: number;
}

/** Diagnostic volontaire seulement ; conserve appels, arguments et retours natifs. */
export async function traceTrackballPorts(options: {
  wasmHash: string;
  memory: WebAssembly.Memory;
  table: WebAssembly.Table;
  frame(): number;
  iterationFrame?(): number;
  from: number;
  to: number;
  maxReads?: number;
}) {
  const { memory, table, from, to } = options;
  const maxReads = options.maxReads ?? 4096;
  if (options.wasmHash !== CORE_WASM_SHA256)
    throw new Error('WASM non vérifié pour la trace des ports.');
  if (
    ![from, to, maxReads].every(Number.isSafeInteger) ||
    from < 0 ||
    to < from ||
    maxReads < 1
  )
    throw new RangeError('Fenêtre de trace invalide.');
  if (
    memory.buffer.byteLength < TRACKBALL_MAP_ADDRESS + 48 ||
    table.length <= TRACKBALL_HANDLER_INDEX
  )
    throw new Error('Mémoire/table incompatibles avec le cœur figé.');
  const view = new DataView(memory.buffer);
  for (const [offset, start, end, index] of ROWS) {
    const address = TRACKBALL_MAP_ADDRESS + offset;
    if (
      view.getUint32(address, true) !== start ||
      view.getUint32(address + 4, true) !== end ||
      view.getUint32(address + 8, true) !== index
    )
      throw new Error('Table de lecture Atari différente du binaire vérifié.');
  }
  const handler = table.get(TRACKBALL_HANDLER_INDEX);
  if (typeof handler !== 'function' || handler.length !== 2)
    throw new Error('Signature du handler trackball incompatible.');
  const original = handler as (offset: number, mask: number) => number;
  const reads: TrackballRead[] = [];
  let dropped = 0;
  let observerErrors = 0;
  const wrapper = await WebAssembly.instantiate(PORT_TRAMPOLINE, {
    t: {
      f(offset: number, mask: number) {
        const value = original(offset, mask);
        // Une erreur de mesure ne doit pas interrompre une lecture du programme.
        try {
          const frame = options.frame();
          if (!Number.isSafeInteger(frame))
            throw new Error('Frame non entière.');
          if (frame >= from && frame <= to) {
            const iterationFrame = options.iterationFrame?.() ?? null;
            if (
              iterationFrame !== null &&
              !Number.isSafeInteger(iterationFrame)
            )
              throw new Error('Frame d’itération non entière.');
            if (reads.length < maxReads)
              reads.push({ frame, iterationFrame, offset, mask, value });
            else dropped++;
          }
        } catch {
          observerErrors++;
        }
        return value;
      },
    },
  });
  const wrapped = wrapper.instance.exports.f;
  if (typeof wrapped !== 'function')
    throw new Error('Trampoline WASM invalide.');
  // Ne pas écraser un changement de propriétaire pendant l'instanciation async.
  if (table.get(TRACKBALL_HANDLER_INDEX) !== original)
    throw new Error('Handler modifié pendant l’installation de la trace.');
  table.set(TRACKBALL_HANDLER_INDEX, wrapped);
  let disposed = false;
  return {
    snapshot() {
      return {
        reads: reads.map((read) => ({ ...read })),
        dropped,
        observerErrors,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (table.get(TRACKBALL_HANDLER_INDEX) === wrapped)
        table.set(TRACKBALL_HANDLER_INDEX, original);
    },
  };
}

/** Écart modulo d'un compteur, pas une reconstruction certaine du mouvement >127. */
export function signedCounterStep(previous: number, current: number): number {
  if (
    ![previous, current].every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 255,
    )
  )
    throw new RangeError('Compteur hors octet.');
  return ((current - previous + 128) & 255) - 128;
}
