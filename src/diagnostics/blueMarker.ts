/** Mesure optique pour le départ du niveau 1, pas des coordonnées mémoire du jeu.
 * RGBA bottom-up (readPixels WebGL) ; ignore le HUD et les bords noirs.
 * Non adapté à une scène avec plusieurs objets bleus dans la zone observée.
 */
export function locateBlueMarker(
  pixels: Uint8Array,
  width: number,
  height: number,
) {
  if (
    ![width, height].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    pixels.length !== width * height * 4
  )
    throw new RangeError('Image RGBA invalide.');
  let count = 0,
    sumX = 0,
    sumY = 0;
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  for (let y = Math.floor(height * 0.12); y < height * 0.8; y++) {
    for (let x = Math.floor(width * 0.1); x < width * 0.9; x++) {
      const i = ((height - 1 - y) * width + x) * 4;
      const r = pixels[i]!,
        g = pixels[i + 1]!,
        b = pixels[i + 2]!;
      if (b > 100 && b > r * 1.5 + 30 && b > g * 1.3 + 20) {
        count++;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return count
    ? {
        x: sumX / count,
        y: sumY / count,
        pixels: count,
        bounds: [minX, minY, maxX, maxY],
      }
    : null;
}
