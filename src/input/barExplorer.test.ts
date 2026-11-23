import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createBarExplorer } from './barExplorer';
class TestElement extends EventTarget {
  editable = false;
  closest() {
    return this.editable ? this : null;
  }
}
class TestCanvas extends TestElement {
  readonly ownerDocument = doc;
  requestPointerLock = vi.fn(async () => {
    doc.pointerLockElement = this;
    doc.dispatchEvent(new Event('pointerlockchange'));
  });
  scrollIntoView = vi.fn();
  focus = vi.fn();
  tabIndex = -1;
}
class TestDocument extends EventTarget {
  pointerLockElement: TestCanvas | null = null;
  hidden = false;
  focused = true;
  hasFocus() {
    return this.focused;
  }
  exitPointerLock() {
    this.pointerLockElement = null;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
}
let doc: TestDocument, win: EventTarget;
const owned: ReturnType<typeof createBarExplorer>[] = [];
beforeEach(() => {
  doc = new TestDocument();
  win = new EventTarget();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('Element', TestElement);
});
afterEach(() => {
  for (const explorer of owned) explorer.dispose();
  owned.length = 0;
  vi.unstubAllGlobals();
});
function setup() {
  const canvas = new TestCanvas();
  const host = {
    pose: vi.fn(),
    stopped: vi.fn(),
    enterCabinet: vi.fn(),
  };
  const explorer = createBarExplorer(
    canvas as unknown as HTMLCanvasElement,
    host,
  );
  owned.push(explorer);
  return { canvas, host, explorer };
}
function key(
  value: string,
  props: Record<string, unknown> = {},
  type = 'keydown',
  target?: TestElement,
) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    key: value,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    ...props,
  });
  if (target) Object.defineProperty(event, 'target', { value: target });
  doc.dispatchEvent(event);
  return event;
}
it('captures once, maps walking aliases, clears keyup and emits no movement after stop', async () => {
  const { canvas, host, explorer } = setup();
  key('w');
  explorer.step(0.02);
  expect(host.pose).not.toHaveBeenCalled();
  expect(await explorer.begin()).toBe(true);
  expect(await explorer.begin()).toBe(true);
  expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  key('z');
  key('d');
  explorer.step(0.05);
  expect(explorer.diagnostics.z).toBeGreaterThan(-3);
  expect(explorer.diagnostics.x).toBeGreaterThan(0);
  key('z', {}, 'keyup');
  key('d', {}, 'keyup');
  const before = explorer.diagnostics;
  explorer.step(0.05);
  expect(explorer.diagnostics).toEqual(before);
  key('e');
  key('e', { repeat: true });
  expect(host.enterCabinet).toHaveBeenCalledTimes(1);
  explorer.stop();
  const count = host.pose.mock.calls.length;
  key('w');
  explorer.step(0.05);
  expect(host.pose).toHaveBeenCalledTimes(count);
  expect(doc.pointerLockElement).toBeNull();
  expect(host.stopped).not.toHaveBeenCalled();
});
it('looks only from trusted captured events, supports backwards/arrows and refuses entry from far away', async () => {
  const { canvas, explorer, host } = setup();
  await explorer.begin();
  const raw = new Event('mousemove');
  Object.assign(raw, { movementX: 50, movementY: 20 });
  canvas.dispatchEvent(raw);
  expect(explorer.diagnostics.yaw).toBe(0);
  const trusted = new Event('mousemove');
  Object.assign(trusted, { movementX: 50, movementY: 20 });
  Object.defineProperty(trusted, 'isTrusted', { value: true });
  canvas.dispatchEvent(trusted);
  expect(explorer.diagnostics.yaw).toBeCloseTo(0.1);
  key('s');
  key('ArrowLeft');
  for (let i = 0; i < 30; i++) explorer.step(0.05);
  key('s', {}, 'keyup');
  key('ArrowLeft', {}, 'keyup');
  key('e');
  expect(host.enterCabinet).not.toHaveBeenCalled();
  doc.pointerLockElement = null;
  canvas.dispatchEvent(trusted);
  expect(explorer.diagnostics.yaw).toBeCloseTo(0.1);
});
it.each(['ctrlKey', 'altKey', 'metaKey', 'isComposing'])(
  'does not walk with %s',
  async (modifier) => {
    const { explorer } = setup();
    await explorer.begin();
    key('w', { [modifier]: true });
    explorer.step(0.05);
    expect(explorer.diagnostics.z).toBe(-3);
  },
);
it('ignores editable fields and unrelated keys, consumes Space and releases on Escape', async () => {
  const { explorer, host } = setup();
  await explorer.begin();
  const field = new TestElement();
  field.editable = true;
  key('w', {}, 'keydown', field);
  key('5');
  key(' ');
  explorer.step(0.05);
  expect(explorer.diagnostics.z).toBe(-3);
  expect(explorer.diagnostics.held).toEqual([' ']);
  key('Escape');
  expect(explorer.active).toBe(false);
  expect(explorer.diagnostics.held).toEqual([]);
  expect(host.stopped).toHaveBeenCalledTimes(1);
});
it.each(['blur', 'hidden', 'unlock'])(
  'interrupts on %s without retaining movement',
  async (reason) => {
    const { explorer, host } = setup();
    await explorer.begin();
    key('w');
    if (reason === 'blur') win.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') {
      doc.hidden = true;
      doc.dispatchEvent(new Event('visibilitychange'));
    }
    if (reason === 'unlock') {
      doc.pointerLockElement = null;
      doc.dispatchEvent(new Event('pointerlockchange'));
    }
    expect(explorer.active).toBe(false);
    expect(explorer.diagnostics.held).toEqual([]);
    expect(host.stopped).toHaveBeenCalledTimes(1);
  },
);
it('ignores visibility when still visible and preserves a lock for an immediate game handover', async () => {
  const { explorer, canvas, host } = setup();
  await explorer.begin();
  doc.dispatchEvent(new Event('visibilitychange'));
  expect(explorer.active).toBe(true);
  explorer.stop(true);
  expect(doc.pointerLockElement).toBe(canvas);
  expect(explorer.active).toBe(false);
  expect(host.stopped).not.toHaveBeenCalled();
});
it('handles refusal and focus loss', async () => {
  const { explorer, canvas, host } = setup();
  canvas.requestPointerLock.mockRejectedValueOnce(new Error('denied'));
  expect(await explorer.begin()).toBe(false);
  expect(host.stopped).toHaveBeenCalledTimes(1);
  doc.focused = false;
  expect(await explorer.begin()).toBe(false);
  expect(doc.pointerLockElement).toBeNull();
});
it('cancels a pending capture and cleans a late result after disposal', async () => {
  const { explorer, canvas, host } = setup();
  let resolve!: () => void;
  canvas.requestPointerLock.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const pending = explorer.begin();
  expect(await explorer.begin()).toBe(false);
  explorer.dispose();
  doc.pointerLockElement = canvas;
  resolve();
  expect(await pending).toBe(false);
  expect(doc.pointerLockElement).toBeNull();
  expect(await explorer.begin()).toBe(false);
  const count = host.pose.mock.calls.length;
  key('w');
  win.dispatchEvent(new Event('blur'));
  expect(host.pose).toHaveBeenCalledTimes(count);
});

it('waits for the document event when the browser returns no promise', async () => {
  const { explorer, canvas, host } = setup();
  Object.defineProperty(canvas, 'requestPointerLock', {
    value: () => undefined,
  });
  const request = explorer.begin();
  expect(explorer.diagnostics.pending).toBe(true);
  doc.pointerLockElement = canvas;
  doc.dispatchEvent(new Event('pointerlockchange'));
  expect(await request).toBe(true);
  expect(host.stopped).not.toHaveBeenCalled();
});
