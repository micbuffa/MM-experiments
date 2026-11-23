import { expect, it } from 'vitest';
import { CORE_WASM_SHA256 } from '../emulation/coreInputPatch';
import {
  PORT_TRAMPOLINE,
  TRACKBALL_HANDLER_INDEX,
  TRACKBALL_MAP_ADDRESS,
  traceTrackballPorts,
  signedCounterStep,
} from './trackballPorts';

async function fixture(
  callback = (offset: number, mask: number) => (offset + mask) & 65535,
) {
  const memory = new WebAssembly.Memory({ initial: 151 });
  const view = new DataView(memory.buffer);
  for (const [delta, start, end, index] of [
    [-12, 0xf00000, 0xf00fff, 17926],
    [0, 0xf20000, 0xf20007, 17927],
    [12, 0xf40000, 0xf4001f, 17928],
    [24, 0xf60000, 0xf60003, 17929],
    [36, 0xfc0000, 0xfc0001, 17930],
  ]) {
    const address = TRACKBALL_MAP_ADDRESS + delta!;
    view.setUint32(address, start!, true);
    view.setUint32(address + 4, end!, true);
    view.setUint32(address + 8, index!, true);
  }
  const table = new WebAssembly.Table({
    element: 'anyfunc',
    initial: TRACKBALL_HANDLER_INDEX + 1,
  });
  const original = (
    await WebAssembly.instantiate(PORT_TRAMPOLINE, { t: { f: callback } })
  ).instance.exports.f as (offset: number, mask: number) => number;
  table.set(TRACKBALL_HANDLER_INDEX, original);
  const options = {
    wasmHash: CORE_WASM_SHA256,
    memory,
    table,
    frame: () => 1202,
    from: 1200,
    to: 1212,
  };
  return { table, memory, view, original, options };
}

it('enregistre les vrais arguments/retours une seule fois et restaure le handler', async () => {
  const calls: number[][] = [];
  const f = await fixture((offset, mask) => {
    calls.push([offset, mask]);
    return 239;
  });
  const probe = await traceTrackballPorts(f.options);
  const handler = f.table.get(TRACKBALL_HANDLER_INDEX) as (
    offset: number,
    mask: number,
  ) => number;
  expect(handler(0, 65280)).toBe(239);
  expect(calls).toEqual([[0, 65280]]);
  expect(probe.snapshot()).toEqual({
    reads: [
      { frame: 1202, iterationFrame: null, offset: 0, mask: 65280, value: 239 },
    ],
    dropped: 0,
    observerErrors: 0,
  });
  probe.snapshot().reads[0]!.value = 99;
  expect(probe.snapshot().reads[0]!.value).toBe(239);
  probe.dispose();
  probe.dispose();
  expect(f.table.get(TRACKBALL_HANDLER_INDEX)).toBe(f.original);
});
it('limite la fenêtre et la mémoire du journal, sans filtrer les retours au programme', async () => {
  const f = await fixture();
  let frame = 1199;
  const probe = await traceTrackballPorts({
    ...f.options,
    frame: () => frame,
    maxReads: 1,
  });
  const handler = f.table.get(TRACKBALL_HANDLER_INDEX) as (
    a: number,
    b: number,
  ) => number;
  expect(handler(2, 65280)).toBe(65282);
  frame = 1200;
  handler(0, 0);
  handler(1, 0);
  frame = 1213;
  handler(3, 0);
  expect(probe.snapshot()).toMatchObject({
    dropped: 1,
    observerErrors: 0,
    reads: [{ frame: 1200, offset: 0, value: 0 }],
  });
  probe.dispose();
});
it('isole les erreurs de mesure et conserve les exceptions natives', async () => {
  const f = await fixture((offset) => {
    if (offset === 3) throw Error('native');
    return 146;
  });
  const probe = await traceTrackballPorts({
    ...f.options,
    frame: () => {
      throw Error('observer');
    },
  });
  const handler = f.table.get(TRACKBALL_HANDLER_INDEX) as (
    a: number,
    b: number,
  ) => number;
  expect(handler(0, 0)).toBe(146);
  expect(() => handler(3, 0)).toThrow('native');
  expect(probe.snapshot().observerErrors).toBe(1);
  probe.dispose();
  const other = await traceTrackballPorts({ ...f.options, frame: () => NaN });
  (f.table.get(TRACKBALL_HANDLER_INDEX) as (a: number, b: number) => number)(
    0,
    0,
  );
  expect(other.snapshot().observerErrors).toBe(1);
  other.dispose();
});
it('refuse une version, mémoire, table, signature ou cartographie non vérifiée', async () => {
  const f = await fixture();
  await expect(
    traceTrackballPorts({ ...f.options, wasmHash: 'other' }),
  ).rejects.toThrow('WASM non vérifié');
  await expect(
    traceTrackballPorts({
      ...f.options,
      memory: new WebAssembly.Memory({ initial: 1 }),
    }),
  ).rejects.toThrow('incompatibles');
  await expect(
    traceTrackballPorts({
      ...f.options,
      table: new WebAssembly.Table({ element: 'anyfunc', initial: 1 }),
    }),
  ).rejects.toThrow('incompatibles');
  f.view.setUint32(TRACKBALL_MAP_ADDRESS + 4, 0, true);
  await expect(traceTrackballPorts(f.options)).rejects.toThrow(
    'Table de lecture',
  );
  f.view.setUint32(TRACKBALL_MAP_ADDRESS + 4, 0xf20007, true);
  f.table.set(TRACKBALL_HANDLER_INDEX, null);
  await expect(traceTrackballPorts(f.options)).rejects.toThrow('Signature');
  expect(f.table.get(TRACKBALL_HANDLER_INDEX)).toBeNull();
  const oneArg = await WebAssembly.instantiate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 127, 1, 127, 3, 2, 1, 0, 7,
      5, 1, 1, 102, 0, 0, 10, 6, 1, 4, 0, 32, 0, 11,
    ]),
  );
  f.table.set(TRACKBALL_HANDLER_INDEX, oneArg.instance.exports.f);
  await expect(traceTrackballPorts(f.options)).rejects.toThrow('Signature');
});
it.each([{ from: -1 }, { to: 1199 }, { maxReads: 0 }, { maxReads: 1.5 }])(
  'refuse une fenêtre invalide %j',
  async (patch) => {
    const f = await fixture();
    await expect(
      traceTrackballPorts({ ...f.options, ...patch }),
    ).rejects.toThrow(RangeError);
  },
);
it('respecte un autre propriétaire pendant installation et démontage', async () => {
  const f = await fixture();
  const pending = traceTrackballPorts(f.options);
  f.table.set(TRACKBALL_HANDLER_INDEX, null);
  await expect(pending).rejects.toThrow('modifié');
  f.table.set(TRACKBALL_HANDLER_INDEX, f.original);
  const probe = await traceTrackballPorts(f.options);
  f.table.set(TRACKBALL_HANDLER_INDEX, null);
  probe.dispose();
  expect(f.table.get(TRACKBALL_HANDLER_INDEX)).toBeNull();
});
it.each([
  [0, 239, -17],
  [239, 237, -2],
  [0, 188, -68],
  [188, 179, -9],
  [0, 146, -110],
  [146, 131, -15],
  [0, 53, 53],
  [53, 26, -27],
  [250, 3, 9],
  [3, 250, -9],
  [0, 128, -128],
  [100, 100, 0],
])('décode le pas modulo %i→%i = %i', (before, after, expected) => {
  expect(signedCounterStep(before, after)).toBe(expected);
});
it.each([-1, 256, NaN, 1.5])('refuse un compteur invalide %s', (value) => {
  expect(() => signedCounterStep(value, 0)).toThrow(RangeError);
  expect(() => signedCounterStep(0, value)).toThrow(RangeError);
});

it('distingue compteur interne et frame avant itération sans altérer la lecture', async () => {
  const f = await fixture();
  const probe = await traceTrackballPorts({
    ...f.options,
    iterationFrame: () => 1201,
  });
  (f.table.get(TRACKBALL_HANDLER_INDEX) as (a: number, b: number) => number)(
    0,
    0,
  );
  expect(probe.snapshot().reads[0]).toMatchObject({
    frame: 1202,
    iterationFrame: 1201,
  });
  probe.dispose();
  const invalid = await traceTrackballPorts({
    ...f.options,
    iterationFrame: () => 1.2,
  });
  expect(
    (f.table.get(TRACKBALL_HANDLER_INDEX) as (a: number, b: number) => number)(
      0,
      99,
    ),
  ).toBe(99);
  expect(invalid.snapshot().observerErrors).toBe(1);
  invalid.dispose();
});
