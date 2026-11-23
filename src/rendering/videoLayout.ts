/** Cadre orthographique conservant l'aspect du canvas source, bandes incluses. */
export function videoFrustum(sourceAspect: number, viewportAspect: number) {
  if (
    ![sourceAspect, viewportAspect].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    throw new RangeError('Rapport vidéo invalide.');
  const top = Math.max(1, sourceAspect / viewportAspect) * 1.04;
  return {
    top,
    bottom: -top,
    right: top * viewportAspect,
    left: -top * viewportAspect,
  };
}
/** Scales centred UVs so a mismatched framebuffer keeps its shape inside the tube. */
export function videoFit(sourceAspect: number, screenAspect: number) {
  return {
    x: Math.max(1, screenAspect / sourceAspect),
    y: Math.max(1, sourceAspect / screenAspect),
  };
}
