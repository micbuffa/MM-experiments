import { requestPointerCapture } from './requestPointerCapture';
import {
  initialBarPose,
  lookInBar,
  walkInBar,
  canEnterCabinet,
} from '../game/barNavigation';
import type { BarPose } from '../game/barNavigation';

interface ExplorerHost {
  pose(value: BarPose): void;
  stopped(): void;
  enterCabinet(): void;
}
/** Owns only walking input on the Babylon canvas, never arcade deltas. */
export function createBarExplorer(
  canvas: HTMLCanvasElement,
  host: ExplorerHost,
) {
  const controller = new AbortController(),
    options = { signal: controller.signal };
  const keys = new Set<string>();
  let pose = initialBarPose(),
    active = false,
    pending = false,
    disposed = false,
    epoch = 0;
  const editable = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest('input,textarea,select,[contenteditable]');
  function stop(notify = true, keepLock = false) {
    const existed = active || pending;
    epoch++;
    active = pending = false;
    keys.clear();
    if (existed && !keepLock && document.pointerLockElement === canvas)
      document.exitPointerLock();
    if (existed && notify) host.stopped();
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (!active) return;
      if (event.key === 'Escape') {
        stop();
        return;
      }
      if (
        editable(event.target) ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.isComposing
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          'w',
          'z',
          's',
          'a',
          'q',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
          'e',
        ].includes(key)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (key === 'e') {
          if (!event.repeat && canEnterCabinet(pose)) host.enterCabinet();
        } else keys.add(key);
      }
    },
    { ...options, capture: true },
  );
  document.addEventListener(
    'keyup',
    (event) => keys.delete(event.key.toLowerCase()),
    options,
  );
  canvas.addEventListener(
    'mousemove',
    (event) => {
      if (!active || document.pointerLockElement !== canvas || !event.isTrusted)
        return;
      pose = lookInBar(pose, event.movementX, event.movementY);
      host.pose(pose);
    },
    options,
  );
  document.addEventListener(
    'pointerlockchange',
    () => {
      if (active && document.pointerLockElement !== canvas) stop();
    },
    options,
  );
  window.addEventListener('blur', () => stop(), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
    },
    options,
  );
  return {
    async begin() {
      if (disposed) return false;
      if (active || pending) return active;
      const attempt = ++epoch;
      pending = true;
      try {
        canvas.scrollIntoView({ block: 'center' });
        await requestPointerCapture(canvas);
        if (
          disposed ||
          attempt !== epoch ||
          document.hidden ||
          !document.hasFocus() ||
          document.pointerLockElement !== canvas
        ) {
          if (document.pointerLockElement === canvas)
            document.exitPointerLock();
          stop();
          return false;
        }
        pending = false;
        active = true;
        canvas.tabIndex = 0;
        canvas.focus({ preventScroll: true });
        host.pose(pose);
        return true;
      } catch {
        stop();
        return false;
      }
    },
    step(seconds: number) {
      if (!active) return;
      const forward =
        Number(keys.has('w') || keys.has('z') || keys.has('arrowup')) -
        Number(keys.has('s') || keys.has('arrowdown'));
      const right =
        Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('q') || keys.has('arrowleft'));
      pose = walkInBar(pose, forward, right, seconds);
      host.pose(pose);
    },
    stop: (keepLock = false) => stop(false, keepLock),
    get active() {
      return active;
    },
    get diagnostics() {
      return {
        active,
        pending,
        ...pose,
        canEnter: canEnterCabinet(pose),
        held: [...keys],
      };
    },
    dispose() {
      stop(false);
      disposed = true;
      controller.abort();
    },
  };
}
