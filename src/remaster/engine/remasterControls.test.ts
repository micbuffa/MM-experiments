import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMASTER_CONTROLS,
  parseRemasterControlMode,
  readKeyboardScreenInput,
  resolveRemasterControls,
} from './remasterControls';

describe('remasterControls', () => {
  it('defaults P1 to trackpad and P2 to keyboard (AZERTY/QWERTY)', () => {
    expect(DEFAULT_REMASTER_CONTROLS).toEqual({
      p1: 'trackpad',
      p2: 'keyboard',
    });
    expect(parseRemasterControlMode('wasd')).toBe('wasd');
    expect(parseRemasterControlMode('unknown')).toBe('trackpad');
  });

  it('prevents P1 and P2 from claiming the same physical device', () => {
    // P2 picks trackpad -> swaps with P1
    expect(
      resolveRemasterControls(DEFAULT_REMASTER_CONTROLS, 2, 'trackpad'),
    ).toEqual({ p1: 'keyboard', p2: 'trackpad' });

    // P1 picks arrows while P2 has keyboard -> splits cleanly to arrows / wasd
    expect(
      resolveRemasterControls(DEFAULT_REMASTER_CONTROLS, 1, 'arrows'),
    ).toEqual({ p1: 'arrows', p2: 'trackpad' });

    expect(
      resolveRemasterControls({ p1: 'keyboard', p2: 'arrows' }, 1, 'arrows'),
    ).toEqual({ p1: 'arrows', p2: 'wasd' });

    expect(
      resolveRemasterControls({ p1: 'keyboard', p2: 'wasd' }, 1, 'wasd'),
    ).toEqual({ p1: 'wasd', p2: 'arrows' });

    expect(
      resolveRemasterControls({ p1: 'arrows', p2: 'wasd' }, 2, 'keyboard'),
    ).toEqual({ p1: 'trackpad', p2: 'keyboard' });

    expect(
      resolveRemasterControls(
        { p1: 'gamepad1', p2: 'gamepad1' },
        2,
        'gamepad1',
      ),
    ).toEqual({ p1: 'keyboard', p2: 'gamepad1' });
  });

  it('reads physical KeyW/A/S/D (AZERTY ZQSD + QWERTY WASD) and Arrow keys independently', () => {
    const held = new Set(['KeyW', 'KeyD', 'ArrowLeft', 'ShiftLeft']);
    expect(readKeyboardScreenInput(held, 'wasd')).toEqual({
      x: 1,
      y: -1,
      boost: true,
    });
    expect(readKeyboardScreenInput(held, 'arrows')).toEqual({
      x: -1,
      y: 0,
      boost: false,
    });
    expect(
      readKeyboardScreenInput(new Set(['ArrowDown', 'Space']), 'keyboard'),
    ).toEqual({ x: 0, y: 1, boost: true });
  });
});
