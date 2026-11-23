import { afterEach, expect, it, vi } from 'vitest';
import { createButtonPulses } from './buttonPulses';

afterEach(() => vi.useRealTimers());
it('transmet une pression puis un relâchement, sans répéter un crédit maintenu', () => {
  vi.useFakeTimers();
  const send = vi.fn();
  const buttons = createButtonPulses(send);
  buttons.pulse(2);
  buttons.pulse(2);
  expect(send.mock.calls).toEqual([[2, 1]]);
  expect(buttons.held).toEqual([2]);
  vi.advanceTimersByTime(120);
  expect(send.mock.calls).toEqual([
    [2, 1],
    [2, 0],
  ]);
  expect(buttons.held).toEqual([]);
});
it('libère crédit et Start immédiatement à l’interruption et annule les timers', () => {
  vi.useFakeTimers();
  const send = vi.fn();
  const buttons = createButtonPulses(send);
  buttons.pulse(2);
  buttons.pulse(3);
  buttons.releaseAll();
  buttons.releaseAll();
  vi.runAllTimers();
  expect(send.mock.calls).toEqual([
    [2, 1],
    [3, 1],
    [2, 0],
    [3, 0],
  ]);
  buttons.pulse(2);
  expect(buttons.held).toEqual([2]);
  buttons.releaseAll();
});

it('keeps two player ports independent and releases both on interruption', () => {
  vi.useFakeTimers();
  const send = vi.fn();
  const first = createButtonPulses((button, down) => send(0, button, down));
  const second = createButtonPulses((button, down) => send(1, button, down));
  first.pulse(3);
  second.pulse(3);
  second.pulse(3);
  expect(send.mock.calls).toEqual([
    [0, 3, 1],
    [1, 3, 1],
  ]);
  first.releaseAll();
  second.releaseAll();
  vi.runAllTimers();
  expect(send.mock.calls).toEqual([
    [0, 3, 1],
    [1, 3, 1],
    [0, 3, 0],
    [1, 3, 0],
  ]);
  expect(first.held).toEqual([]);
  expect(second.held).toEqual([]);
});
