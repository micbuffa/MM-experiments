import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  ITERATION_MARKER,
  MOUSE_CALLBACK_MARKER,
  isolateTrackpadPort,
  patchCoreInput,
} from './coreInputPatch';

it('routes the shared mouse exclusively to J1 and forwards other devices unchanged', () => {
  const marker = 'wasmTable=wasmExports["Eh"];';
  const calls: number[][] = [];
  const original = (...args: number[]) => {
    calls.push(args);
    return 17;
  };
  Object.defineProperty(original, 'length', { value: 10 });
  let entry = original;
  const table = {
    get(index: number) {
      expect(index).toBe(490);
      return entry;
    },
    set(index: number, callback: typeof original) {
      expect(index).toBe(490);
      entry = callback;
    },
  };
  runInNewContext(isolateTrackpadPort(marker), {
    wasmTable: undefined,
    wasmExports: { Eh: table },
  });
  const trackpad = [100, 0, 0, 0, 0, 0, 0, 2, 0, 0];
  const keyboard = [100, 0, 0, 0, 0, 0, 1, 1, 0, 7];
  expect(entry(...trackpad)).toBe(17);
  expect(entry(100, 0, 0, 0, 0, 0, 1, 2, 0, 0)).toBe(0);
  expect(entry(...keyboard)).toBe(17);
  expect(calls).toEqual([trackpad, keyboard]);
  expect(() => isolateTrackpadPort(marker.repeat(2))).toThrow('Table');
  entry = () => 0;
  expect(() =>
    runInNewContext(isolateTrackpadPort(marker), {
      wasmTable: undefined,
      wasmExports: { Eh: table },
    }),
  ).toThrow('ABI');
});

describe('raccord au callback Emscripten vérifié', () => {
  it('refuse un glue absent ou ambigu au lieu de patcher une autre version', () => {
    expect(() => patchCoreInput('different')).toThrow('version vérifiée');
    expect(() => patchCoreInput(MOUSE_CALLBACK_MARKER.repeat(2))).toThrow(
      'version vérifiée',
    );
  });
  it('refuse une boucle absente ou ambiguë', () => {
    expect(() => patchCoreInput(MOUSE_CALLBACK_MARKER)).toThrow(
      'Boucle native',
    );
    expect(() =>
      patchCoreInput(MOUSE_CALLBACK_MARKER + ITERATION_MARKER.repeat(2)),
    ).toThrow('Boucle native');
  });
  it('observe après le callback natif et conserve les hooks existants', () => {
    const events: string[] = [];
    const Module: {
      marbleBeforeIteration?: () => void;
      marbleAfterIteration?: () => void;
    } = {};
    const source = `function unused(){${MOUSE_CALLBACK_MARKER}}}function run(){${ITERATION_MARKER}};run`;
    const run = runInNewContext(patchCoreInput(source), {
      Module,
      func: () => events.push('native'),
      callUserCallback: (func: () => void) => func(),
      MainLoop: { postMainLoop: [() => events.push('post')] },
    }) as () => void;
    run();
    expect(events).toEqual(['native', 'post']);
    events.length = 0;
    Module.marbleBeforeIteration = () => events.push('before');
    Module.marbleAfterIteration = () => events.push('sample');
    run();
    expect(events).toEqual(['before', 'native', 'sample', 'post']);
  });
  function fixture(userData = 512, eventType = 'mousemove') {
    const memory = new ArrayBuffer(2048);
    const HEAPU8 = new Uint8Array(memory);
    const HEAP32 = new Int32Array(memory);
    const canvas = {};
    const Module = { canvas } as {
      canvas: object;
      marbleNativeInput?: {
        state(): {
          pendingX: number;
          pendingY: number;
          polledX: number;
          polledY: number;
          buttons: number;
        };
        clear(): void;
        setPending(x: number, y: number): void;
      };
      marbleMouseTransform?: () => number[];
    };
    let handler: ((e: object) => void) | undefined;
    const source = `var registerMouseEventCallback=(target,userData,useCapture,callbackfunc,eventTypeId,eventTypeString,targetThread)=>{JSEvents.mouseEvent||=_malloc(64);${MOUSE_CALLBACK_MARKER}nativeCallback(JSEvents.mouseEvent,userData)};return JSEvents.registerOrRemoveHandler({handlerFunc:mouseEventHandlerFunc})};function iteration(){${ITERATION_MARKER}};registerMouseEventCallback`;
    const register = runInNewContext(patchCoreInput(source), {
      Module,
      HEAPU8,
      HEAP32,
      JSEvents: {
        mouseEvent: 128,
        registerOrRemoveHandler: (entry: { handlerFunc: typeof handler }) => {
          handler = entry.handlerFunc;
        },
      },
      _malloc: () => 128,
      findEventTarget: (target: object) => target,
      fillMouseEventData: () => {},
      nativeCallback: (event: number, data: number) => {
        HEAP32[(data + 40) >> 2]! += HEAP32[(event + 32) >> 2]!;
        HEAP32[(data + 44) >> 2]! += HEAP32[(event + 36) >> 2]!;
      },
    }) as (
      target: object,
      data: number,
      capture: boolean,
      callback: number,
      id: number,
      type: string,
    ) => void;
    register(canvas, userData, false, 1, 8, eventType);
    return { HEAP32, HEAPU8, Module, deliver: () => handler!({}) };
  }
  it('transmet les deltas par les champs natifs, et expose la consommation du poll', () => {
    const f = fixture();
    f.Module.marbleMouseTransform = () => [7, -4];
    f.deliver();
    expect(f.Module.marbleNativeInput!.state()).toMatchObject({
      pendingX: 7,
      pendingY: -4,
    });
    f.HEAP32[(512 + 48) >> 2] = 7;
    expect(f.Module.marbleNativeInput!.state().polledX).toBe(7);
  });
  it('refuse les déplacements sans filtre actif et purge exactement les 64 octets souris', () => {
    const f = fixture();
    f.deliver();
    expect(f.Module.marbleNativeInput!.state().pendingX).toBe(0);
    f.HEAPU8.fill(23, 512, 576);
    f.HEAPU8[576] = 99;
    f.Module.marbleNativeInput!.clear();
    expect(f.Module.marbleNativeInput!.state()).toEqual({
      pendingX: 0,
      pendingY: 0,
      polledX: 0,
      polledY: 0,
      buttons: 0,
    });
    expect(f.HEAPU8[576]).toBe(99);
  });
  it('remplace seulement les deltas en attente avant leur poll natif', () => {
    const f = fixture();
    f.HEAP32[(512 + 48) >> 2] = 22;
    f.Module.marbleNativeInput!.setPending(416, -100);
    expect(f.Module.marbleNativeInput!.state()).toMatchObject({
      pendingX: 416,
      pendingY: -100,
      polledX: 22,
      polledY: 0,
      buttons: 0,
    });
  });
  it('ne transmet aucun clic de bouton souris à la bille', () => {
    const f = fixture(512, 'mousedown');
    f.Module.marbleMouseTransform = () => [100, 100];
    f.deliver();
    expect(f.Module.marbleNativeInput!.state()).toMatchObject({
      pendingX: 0,
      pendingY: 0,
      buttons: 0,
    });
  });
  it.each([0, 513, 2040])(
    'refuse une adresse native incompatible %s',
    (pointer) => {
      expect(() => fixture(pointer)).toThrow('ABI souris incompatible');
    },
  );
});
