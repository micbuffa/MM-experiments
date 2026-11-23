/** Presentation of the measured eight-pose step, never locomotion/physics. */
export interface WormPose {
  tailY: number;
  tailZ: number;
  headY: number;
  headX: number;
  headZ: number;
  arch: number;
  heading: number;
  mouth: number;
  tongue: number;
  flare: number;
}
const walkHeadings: Readonly<Partial<Record<number, number>>> = {
  0x20c48: Math.PI / 2,
  0x20c6c: 0,
  0x20c90: Math.PI,
  0x20cb4: -Math.PI / 2,
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => n * n * (3 - 2 * n);

/** Endpoints alternate: the older planted end lifts after both have landed. */
export function updateWormPose(
  result: WormPose,
  state: number,
  script: number,
  frame: number,
  phase: number,
  fallbackHeading: number,
) {
  const step = Math.max(0, frame + clamp(phase));
  result.heading = walkHeadings[script] ?? fallbackHeading;
  result.tailY = 0;
  result.tailZ = 0;
  result.headX = 0;
  result.headY = 1.05;
  result.headZ = 0;
  result.arch = 0;
  result.mouth = result.tongue = result.flare = 0;
  if (walkHeadings[script] !== undefined && (state === 0 || state === 3)) {
    const t = clamp(step / 8);
    if (t <= 0.5) {
      const p = ease(t * 2);
      result.headZ = p;
      result.headY = (1 - p) * 1.05;
    } else {
      const p = ease((t - 0.5) * 2);
      result.headZ = 1;
      result.headY = 0;
      result.tailZ = p;
      result.tailY = p * 1.05;
    }
    result.arch = Math.sin(Math.PI * t) * 0.95;
    return;
  }
  if (state === 0 && script === 0x20c18) {
    const t = clamp(step / 10);
    result.headX = t <= 0 || t >= 1 ? 0 : -0.22 * Math.sin(t * Math.PI * 2);
    return;
  }
  if (state === 1) {
    // Measured native attack: unfold, rise, open a flat mouth, then a bell.
    if (step < 8) {
      const bend = 1 - ease(clamp(step / 8));
      result.headY = 1.05 * (1 - bend);
      result.headZ = 0.95 * bend;
      result.arch = 0.55 * bend;
    } else if (step < 18) {
      result.headY = 1.05;
    } else if (step < 24) {
      result.headY = 1.05 * (1 - ease(clamp((step - 18) / 5)));
      result.mouth = 1;
    } else {
      result.headY = 0.08 + 0.75 * ease(clamp((step - 24) / 8));
      result.flare = 1;
    }
  } else if (state === 5) {
    // The swallowing bell closes before the upright mouth/tongue gesture.
    result.flare = 1 - ease(clamp(step / 15));
    result.headY = 0.83 + (1.05 - 0.83) * (1 - result.flare);
    result.mouth = step < 18 ? 0 : 1;
    result.tongue =
      step < 21
        ? 0
        : step < 24
          ? (step - 21) / 3
          : step < 28
            ? 1
            : clamp((30 - step) / 2);
  } else if (state === 6) {
    const bend = 1 - ease(clamp(step / 26));
    result.headY = 1.05 * (1 - bend);
    result.headZ = 0.95 * bend;
    result.arch = 0.55 * bend;
  } else if (state === 4) {
    result.headY = 0.7;
    result.headZ = 0.2;
    result.arch = 0.15;
  } else if (state === 2) {
    result.headY = 0.85;
    result.headZ = 0.2;
    result.arch = 0.12;
  }
}
