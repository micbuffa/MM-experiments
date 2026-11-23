/** World units are metres, derived from the converted Atari System I model. */
export const CABINET = {
  width: 0.64135,
  height: 1.774735,
  frontZ: -0.438,
  backZ: 0.45,
  screenY: 1.37637,
  screenZ: 0.00135,
  screenHalfHeight: 0.1515,
  screenAspect: 4 / 3,
  screenTilt: Math.atan2(59.234, 298.989),
  trackballRadius: 0.0381,
} as const;
