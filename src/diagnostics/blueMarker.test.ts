import { expect, it } from 'vitest';
import { locateBlueMarker } from './blueMarker';

function frame() {
  const bytes = new Uint8Array(100 * 100 * 4);
  const put = (x: number, y: number, color: number[]) =>
    bytes.set(color, ((99 - y) * 100 + x) * 4);
  return { bytes, put };
}
it('mesure centroïde et bornes en coordonnées écran depuis RGBA bottom-up', () => {
  const f = frame();
  f.put(40, 30, [0, 0, 255, 255]);
  f.put(42, 30, [0, 0, 200, 255]);
  f.put(41, 33, [30, 10, 220, 255]);
  expect(locateBlueMarker(f.bytes, 100, 100)).toEqual({
    x: 41,
    y: 31,
    pixels: 3,
    bounds: [40, 30, 42, 33],
  });
});
it('ignore le HUD, les bords et les couleurs du décor', () => {
  const f = frame();
  for (const [x, y] of [
    [50, 5],
    [5, 50],
    [95, 50],
    [50, 90],
  ])
    f.put(x!, y!, [0, 0, 255, 255]);
  f.put(30, 30, [255, 0, 0, 255]);
  f.put(40, 40, [128, 128, 128, 255]);
  f.put(45, 45, [20, 20, 90, 255]);
  f.put(60, 40, [0, 100, 140, 255]);
  f.put(55, 40, [100, 0, 170, 255]);
  f.put(60, 60, [0, 160, 200, 255]);
  expect(locateBlueMarker(f.bytes, 100, 100)).toBeNull();
});
it.each([0, -1, NaN, 1.5, Infinity])(
  'refuse une dimension invalide %s',
  (value) => {
    expect(() => locateBlueMarker(new Uint8Array(), value, 100)).toThrow(
      RangeError,
    );
    expect(() => locateBlueMarker(new Uint8Array(), 100, value)).toThrow(
      RangeError,
    );
  },
);
it('refuse un buffer incomplet', () => {
  expect(() => locateBlueMarker(new Uint8Array(3), 1, 1)).toThrow(RangeError);
});
