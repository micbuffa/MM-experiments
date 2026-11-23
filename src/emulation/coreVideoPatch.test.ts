import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PATCHED_ITERATION_MARKER } from './coreInputPatch';
import { patchCoreVideo, VIDEO_DRAW_MARKERS } from './coreVideoPatch';

const fixtureSource = `
function drawArrays(){${VIDEO_DRAW_MARKERS[0]}}
function drawElements(){${VIDEO_DRAW_MARKERS[1]}}
function iteration(){${PATCHED_ITERATION_MARKER}}
({drawArrays,drawElements,iteration});`;

describe('présentation WebGL du cœur figé', () => {
  it.each([...VIDEO_DRAW_MARKERS, PATCHED_ITERATION_MARKER])(
    'refuse un marqueur absent ou ambigu : %s',
    (marker) => {
      expect(() => patchCoreVideo(fixtureSource.replace(marker, ''))).toThrow(
        'glue vérifié',
      );
      expect(() => patchCoreVideo(fixtureSource + marker)).toThrow(
        'glue vérifié',
      );
    },
  );
  function fixture() {
    const canvas = {};
    const events: string[] = [];
    let framebuffer: object | null = null;
    let action = () => {};
    const Module: {
      canvas: object;
      marbleOnVideoFrame?: () => void;
      marbleAfterIteration?: () => void;
    } = {
      canvas,
      marbleOnVideoFrame: () => events.push('video'),
      marbleAfterIteration: () => events.push('input'),
    };
    const GLctx = {
      canvas,
      FRAMEBUFFER_BINDING: 36006,
      getParameter: (key: number) => {
        expect(key).toBe(36006);
        return framebuffer;
      },
      drawArrays: () => events.push('draw-arrays'),
      drawElements: () => events.push('draw-elements'),
    };
    const runtime = runInNewContext(patchCoreVideo(fixtureSource), {
      Module,
      GLctx,
      mode: 4,
      first: 0,
      count: 6,
      type: 5123,
      indices: 0,
      func: () => action(),
      callUserCallback: (fn: () => void) => fn(),
      MainLoop: { postMainLoop: [() => events.push('post')] },
    }) as { drawArrays(): void; drawElements(): void; iteration(): void };
    return {
      runtime,
      Module,
      GLctx,
      events,
      step(draw = () => {}) {
        action = draw;
        runtime.iteration();
      },
      offscreen(value: object | null) {
        framebuffer = value;
      },
    };
  }
  it('conserve la dernière texture pendant les itérations sans dessin, sans perdre le poll', () => {
    const f = fixture();
    f.step(() => f.runtime.drawArrays());
    expect(f.events).toEqual(['draw-arrays', 'input', 'video', 'post']);
    f.events.length = 0;
    f.step();
    f.step();
    expect(f.events).toEqual(['input', 'post', 'input', 'post']);
    f.step(() => f.runtime.drawElements());
    expect(f.events.slice(-4)).toEqual([
      'draw-elements',
      'input',
      'video',
      'post',
    ]);
  });
  it('ne publie pas les dessins de framebuffer intermédiaire ou autre canvas', () => {
    const f = fixture();
    f.offscreen({});
    f.step(() => f.runtime.drawArrays());
    f.offscreen(null);
    f.GLctx.canvas = {};
    f.step(() => f.runtime.drawElements());
    expect(f.events).not.toContain('video');
  });
  it('publie une seule fois après plusieurs dessins, sans imposer de consommateur', () => {
    const f = fixture();
    f.step(() => {
      f.runtime.drawArrays();
      f.runtime.drawElements();
    });
    expect(f.events.filter((event) => event === 'video')).toHaveLength(1);
    delete f.Module.marbleOnVideoFrame;
    delete f.Module.marbleAfterIteration;
    expect(() => f.step(() => f.runtime.drawArrays())).not.toThrow();
  });
});
