import { describe, expect, it, vi } from 'vitest';
import { createGamePresentation, togglePracticeView } from './gamePresentation';

it.each([
  ['direct', false, 'modern'],
  ['stage', false, 'modern'],
  ['modern', false, 'modern-compare'],
  ['modern-compare', false, 'direct'],
  ['direct', true, 'modern-compare'],
  ['modern', true, 'modern-compare'],
  ['modern-compare', true, 'direct'],
] as const)(
  'switches the practice display from %s with comparison %s',
  (mode, compare, expected) => {
    expect(togglePracticeView(mode, compare)).toBe(expected);
  },
);

function setup(requestFullscreen = vi.fn(async () => {})) {
  const host = {
    requestFullscreen,
    pause: vi.fn(),
    setActive: vi.fn(),
    exitFullscreen: vi.fn(),
    report: vi.fn(),
  };
  return { host, presentation: createGamePresentation(host) };
}

describe('game presentation', () => {
  it('enters once, pauses before fullscreen and never resumes', async () => {
    const { host, presentation } = setup();
    await presentation.enter();
    await presentation.enter();
    expect(host.pause).toHaveBeenCalledTimes(1);
    expect(host.setActive).toHaveBeenCalledWith(true);
    expect(host.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(host.pause.mock.invocationCallOrder[0]).toBeLessThan(
      host.requestFullscreen.mock.invocationCallOrder[0]!,
    );
  });
  it('keeps an immersive fallback when fullscreen is refused', async () => {
    const { host, presentation } = setup(
      vi.fn(async () => {
        throw new Error('denied');
      }),
    );
    await presentation.enter();
    expect(host.report).toHaveBeenLastCalledWith(
      expect.stringContaining('vue immersive'),
    );
    expect(host.setActive).not.toHaveBeenCalledWith(false);
    presentation.leave();
    expect(host.setActive).toHaveBeenLastCalledWith(false);
  });
  it('ignores unrelated fullscreen events then pauses on native exit', async () => {
    const { host, presentation } = setup();
    await presentation.enter();
    presentation.fullscreenChanged(false);
    expect(host.pause).toHaveBeenCalledTimes(1);
    presentation.fullscreenChanged(true);
    presentation.fullscreenChanged(false);
    presentation.leave();
    expect(host.pause).toHaveBeenCalledTimes(2);
    expect(host.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(host.setActive).toHaveBeenLastCalledWith(false);
  });
  it('cancels a pending entry on disposal and cleans up a late fullscreen result', async () => {
    let resolve!: () => void;
    const { host, presentation } = setup(
      vi.fn(
        () =>
          new Promise<void>((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = presentation.enter();
    presentation.dispose();
    resolve();
    await pending;
    await presentation.enter();
    presentation.fullscreenChanged(true);
    expect(host.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(host.setActive.mock.calls).toEqual([[true], [false]]);
    expect(host.exitFullscreen).toHaveBeenCalledTimes(2);
  });
  it('ignores stale rejection and permits a later entry after leaving', async () => {
    let reject!: (error: Error) => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValue(undefined);
    const { host, presentation } = setup(request);
    const pending = presentation.enter();
    presentation.leave();
    reject(new Error('cancelled'));
    await pending;
    expect(host.report).toHaveBeenCalledTimes(1);
    await presentation.enter();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not let an old completion close a newer active presentation', async () => {
    let resolve!: () => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValue(undefined);
    const { host, presentation } = setup(request);
    const pending = presentation.enter();
    presentation.leave();
    await presentation.enter();
    resolve();
    await pending;
    expect(host.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(host.setActive).toHaveBeenLastCalledWith(true);
  });
});

it('opens immersive play directly when native fullscreen and capture cannot be combined', async () => {
  const host = {
    pause: vi.fn(),
    setActive: vi.fn(),
    exitFullscreen: vi.fn(),
    report: vi.fn(),
  };
  const presentation = createGamePresentation(host);
  await presentation.enter();
  presentation.fullscreenChanged(false);
  expect(host.pause).toHaveBeenCalledTimes(1);
  expect(host.setActive.mock.calls).toEqual([[true]]);
  expect(host.report).toHaveBeenLastCalledWith(
    expect.stringContaining('vue immersive'),
  );
  presentation.leave();
  expect(host.pause).toHaveBeenCalledTimes(2);
});
