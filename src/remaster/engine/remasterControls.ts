export type RemasterControlMode =
  'trackpad' | 'keyboard' | 'arrows' | 'wasd' | 'gamepad1' | 'gamepad2';

export interface RemasterPlayerControls {
  readonly p1: RemasterControlMode;
  readonly p2: RemasterControlMode;
}

export const DEFAULT_REMASTER_CONTROLS: RemasterPlayerControls = {
  p1: 'trackpad',
  p2: 'keyboard',
};

export function parseRemasterControlMode(value: string): RemasterControlMode {
  switch (value) {
    case 'trackpad':
    case 'keyboard':
    case 'arrows':
    case 'wasd':
    case 'gamepad1':
    case 'gamepad2':
      return value;
    default:
      return 'trackpad';
  }
}

function modesConflict(
  a: RemasterControlMode,
  b: RemasterControlMode,
): boolean {
  if (a === b) return true;
  if (
    (a === 'keyboard' && (b === 'arrows' || b === 'wasd')) ||
    (b === 'keyboard' && (a === 'arrows' || a === 'wasd'))
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve player control selections so P1 and P2 never fight over the same
 * physical input device in 2P mode.
 */
export function resolveRemasterControls(
  current: RemasterPlayerControls,
  player: 1 | 2,
  next: RemasterControlMode,
): RemasterPlayerControls {
  const other = player === 1 ? current.p2 : current.p1;
  const previous = player === 1 ? current.p1 : current.p2;
  let resolvedOther = other;

  if (modesConflict(next, other)) {
    if (!modesConflict(next, previous)) {
      resolvedOther = previous;
    } else if (next === 'arrows') {
      resolvedOther = 'wasd';
    } else if (next === 'wasd') {
      resolvedOther = 'arrows';
    } else if (next === 'keyboard') {
      resolvedOther = 'trackpad';
    } else {
      resolvedOther = 'keyboard';
    }
  }

  return player === 1
    ? { p1: next, p2: resolvedOther }
    : { p1: resolvedOther, p2: next };
}

/**
 * Sample normalized screen-space direction (-1..1) from physical KeyboardEvent.code
 * keys. Using `KeyW/KeyA/KeyS/KeyD` automatically supports both QWERTY (WASD)
 * and AZERTY (ZQSD) layouts identically.
 */
export function readKeyboardScreenInput(
  heldCodes: ReadonlySet<string>,
  mode: 'keyboard' | 'arrows' | 'wasd',
): { readonly x: number; readonly y: number; readonly boost: boolean } {
  let x = 0;
  let y = 0;
  let boost = false;

  if (mode === 'keyboard' || mode === 'arrows') {
    if (heldCodes.has('ArrowLeft')) x -= 1;
    if (heldCodes.has('ArrowRight')) x += 1;
    if (heldCodes.has('ArrowUp')) y -= 1;
    if (heldCodes.has('ArrowDown')) y += 1;
    if (heldCodes.has('ShiftRight')) boost = true;
  }
  if (mode === 'keyboard' || mode === 'wasd') {
    if (heldCodes.has('KeyA')) x -= 1;
    if (heldCodes.has('KeyD')) x += 1;
    if (heldCodes.has('KeyW')) y -= 1;
    if (heldCodes.has('KeyS')) y += 1;
    if (heldCodes.has('ShiftLeft')) boost = true;
  }
  if (mode === 'keyboard' && heldCodes.has('Space')) {
    boost = true;
  }

  return {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y)),
    boost,
  };
}
