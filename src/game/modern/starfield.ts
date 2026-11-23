/** Deterministic, local sky paint: no download, clock or random singleton. */
export function starfieldPixels(width = 1024, height = 512, seed = 1984) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 16 ||
    height < 8 ||
    width > 2048 ||
    height > 1024
  )
    throw new Error('Dimensions du ciel invalides.');
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 2] = 3;
    pixels[i + 3] = 255;
  }
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(random() * width),
      y = Math.floor(random() * height);
    const radius = random() < 0.06 ? 3 : 1;
    const warmth = random();
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const py = y + dy;
        if (py < 0 || py >= height) continue;
        const glow = Math.exp(
          -(dx * dx + dy * dy) / (radius === 3 ? 2.5 : 0.65),
        );
        const at = (py * width + ((x + dx + width) % width)) * 4;
        pixels[at] = Math.max(
          pixels[at]!,
          Math.round(glow * (warmth > 0.8 ? 230 : 195)),
        );
        pixels[at + 1] = Math.max(pixels[at + 1]!, Math.round(glow * 210));
        pixels[at + 2] = Math.max(
          pixels[at + 2]!,
          Math.round(glow * (warmth > 0.8 ? 175 : 255)),
        );
      }
  }
  return pixels;
}
