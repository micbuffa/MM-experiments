/** The four beak faces share the pointed UV at U≈0.0004, V=1.49 in all
 * extracted bird poses. A separate paint keeps the thin yellow feature
 * from disappearing into the purple atlas mip levels.
 */
export function splitBirdBeak(
  indices: readonly number[],
  uvs: readonly number[],
) {
  const body: number[] = [],
    beak: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = indices.slice(i, i + 3);
    const pointed = triangle.some(
      (v) =>
        Math.abs(uvs[v * 2]!) < 0.001 &&
        Math.abs(uvs[v * 2 + 1]! - Math.floor(uvs[v * 2 + 1]!) - 0.49) < 0.025,
    );
    (pointed ? beak : body).push(...triangle);
  }
  return { body, beak };
}

/** Retain the native-driven flap poses, broaden the beak's cross-section,
 * and give the three wing feathers shorter, more even tips like the sprites.
 */
export function fitBirdPoses(
  poses: readonly { readonly positions: readonly number[] }[],
  beak: readonly number[],
) {
  const beakVertices = new Set(beak);
  const reference = poses[0]!.positions;
  return poses.map((pose) => {
    const out = Float32Array.from(pose.positions);
    for (let v = 0; v < out.length / 3; v++) {
      if (beakVertices.has(v)) {
        out[v * 3] = out[v * 3]! * 1.8;
        out[v * 3 + 1] = out[v * 3 + 1]! * 1.8;
        continue;
      }
      const wing = Math.abs(reference[v * 3]!);
      if (wing > 6) {
        const tip = wing > 9 ? 0.9 : wing > 8.5 ? 1.03 : 1;
        out[v * 3] = out[v * 3]! * tip;
        if (wing > 6.5)
          out[v * 3 + 2] =
            out[v * 3 + 2]! - (reference[v * 3 + 2]! - 3.6) * 0.15;
      }
    }
    return out;
  });
}
