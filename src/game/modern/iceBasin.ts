// Native NW samples match these six concentric hexagonal bands exactly.
const profile = [16097, 16099, 16103, 16109, 16113, 16115, 16116] as const;
export function iceBasinHeight(x: number, z: number) {
  const dx = x - 99,
    dz = z - 101;
  const radius = Math.min(
    6,
    Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx - dz)),
  );
  const band = Math.floor(radius);
  const a = profile[band]!;
  const b = profile[Math.min(6, band + 1)]!;
  return a + (b - a) * (radius - band);
}
