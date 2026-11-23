import { PATCHED_ITERATION_MARKER } from './coreInputPatch';

// Appels uniques vérifiés dans le glue au SHA-256 figé de coreInputPatch.ts.
export const VIDEO_DRAW_MARKERS = [
  'GLctx.drawArrays(mode,first,count);',
  'GLctx.drawElements(mode,count,type,indices);',
] as const;

/** Une itération sans dessin ne doit pas recopier un drawing buffer déjà effacé. */
export function patchCoreVideo(source: string): string {
  for (const marker of [...VIDEO_DRAW_MARKERS, PATCHED_ITERATION_MARKER]) {
    if (source.split(marker).length !== 2)
      throw new Error('Présentation vidéo différente du glue vérifié.');
  }
  let patched = source;
  for (const marker of VIDEO_DRAW_MARKERS) {
    patched = patched.replace(
      marker,
      `${marker}
if(GLctx.canvas===Module.canvas&&GLctx.getParameter(GLctx.FRAMEBUFFER_BINDING)===null)Module.marbleVideoDrawn=true;`,
    );
  }
  return patched.replace(
    PATCHED_ITERATION_MARKER,
    'Module.marbleVideoDrawn=false;' +
      PATCHED_ITERATION_MARKER.replace(
        'for(var post of MainLoop.postMainLoop)',
        'if(Module.marbleVideoDrawn&&Module.marbleOnVideoFrame)Module.marbleOnVideoFrame();for(var post of MainLoop.postMainLoop)',
      ),
  );
}
