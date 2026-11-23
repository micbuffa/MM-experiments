/** Converts screen-relative motion to the arcade trackball's isometric axes. */
export function createCameraRelativeMotion() {
  let cosine = 1;
  let sine = 0;
  return {
    setForward(x: number, z: number) {
      const length = Math.hypot(x, z);
      if (!Number.isFinite(length) || length < 0.001) {
        cosine = 1;
        sine = 0;
        return;
      }
      cosine = -(x + z) / (length * Math.SQRT2);
      sine = (x - z) / (length * Math.SQRT2);
    },
    transform(x: number, y: number): readonly [number, number] {
      return [x * cosine + y * sine, y * cosine - x * sine];
    },
  };
}
