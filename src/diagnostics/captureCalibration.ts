export type MotionPair = [number, number];
export interface CapturedProfile {
  sourceGain: number;
  profile: MotionPair[];
}
export interface CalibrationCase {
  label: string;
  scope: 'neutral' | 'full' | 'peak';
  gain: number | null;
  profile: MotionPair[];
  sampleFrames: number[];
  startFrame: number;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid capture object');
  return value as Record<string, unknown>;
}
/** Numeric evidence only; never execute text from a diagnostic document. */
export function readCapturedProfile(value: unknown): CapturedProfile {
  const data = record(value);
  const sourceGain = record(data.capture).gain;
  const input = record(data.webReplay).profile;
  if (
    typeof sourceGain !== 'number' ||
    !Number.isFinite(sourceGain) ||
    sourceGain < 0.25 ||
    sourceGain > 4 ||
    !Array.isArray(input) ||
    input.length < 1 ||
    input.length > 128
  )
    throw new Error('Invalid captured profile');
  const profile = (input as unknown[]).map((value): MotionPair => {
    if (!Array.isArray(value) || value.length !== 2)
      throw new Error('Invalid motion pair');
    const pair: unknown[] = value;
    const [x, y] = pair;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      ![x, y].every((n) => Number.isInteger(n) && n >= -32768 && n <= 32767)
    )
      throw new Error('Motion pair outside int16');
    return [x, y];
  });
  return { sourceGain, profile };
}
/** Preserve timing and cumulative displacement within one count per axis. Diagnostic only. */
export function scaleCapturedProfile(
  profile: readonly MotionPair[],
  factor: number,
): MotionPair[] {
  if (!Number.isFinite(factor) || factor < 0)
    throw new RangeError('Invalid calibration factor');
  const total: MotionPair = [0, 0],
    sent: MotionPair = [0, 0];
  return profile.map((pair): MotionPair => {
    const scaled: MotionPair = [0, 0];
    for (const axis of [0, 1] as const) {
      total[axis] += pair[axis];
      const target = Math.trunc(total[axis] * factor);
      const delta = target - sent[axis];
      if (!Number.isSafeInteger(delta) || delta < -32768 || delta > 32767)
        throw new RangeError('Calibration would saturate native input');
      scaled[axis] = delta || 0;
      sent[axis] = target;
    }
    return scaled;
  });
}
function peakWindow(profile: readonly MotionPair[]): MotionPair[] {
  let peak = 0;
  for (let i = 1; i < profile.length; i++) {
    if (
      Math.abs(profile[i]![0]) + Math.abs(profile[i]![1]) >
      Math.abs(profile[peak]![0]) + Math.abs(profile[peak]![1])
    )
      peak = i;
  }
  // Fixed window: three iterations before the strongest input, then peak and four after.
  const from = Math.max(0, Math.min(peak - 3, profile.length - 8));
  return profile.slice(from, from + 8);
}

export function makeCalibrationCases(
  source: CapturedProfile,
  quick = false,
): CalibrationCase[] {
  const burst = peakWindow(source.profile);
  const lastInput = 1200 + source.profile.length - 1;
  const fullFrames = [
    ...new Set([
      1199,
      ...[1212, 1248, 1264].filter((frame) => frame < lastInput),
      lastInput,
      lastInput + 12,
      lastInput + 24,
    ]),
  ].sort((a, b) => a - b);
  const neutral = (label: string): CalibrationCase => ({
    label,
    scope: 'neutral',
    gain: null,
    profile: source.profile.map(() => [0, 0]),
    sampleFrames: fullFrames,
    startFrame: 1200,
  });
  const cases: CalibrationCase[] = [neutral('neutral-before')];
  for (const scope of ['full', 'peak'] as const) {
    for (const gain of quick
      ? [0.425, 0.85, 1.7]
      : [0.425, 0.85, 1.275, 1.7, 2.125]) {
      cases.push({
        label: `${scope}-${gain}`,
        startFrame: 1200,
        scope,
        gain,
        profile: scaleCapturedProfile(
          scope === 'full' ? source.profile : burst,
          gain / source.sourceGain,
        ),
        sampleFrames:
          scope === 'full' ? fullFrames : [1199, 1204, 1208, 1212, 1224, 1236],
      });
    }
  }
  cases.push(neutral('neutral-after'));
  return cases;
}

/** A one-iteration timing control, using the same gains and profile shape. */
export function makeCalibrationPhaseCases(
  source: CapturedProfile,
): CalibrationCase[] {
  return makeCalibrationCases(source, true)
    .filter((entry) => entry.scope !== 'full')
    .map((entry) => ({
      ...entry,
      label: `phase1-${entry.label}`,
      startFrame: 1201,
      sampleFrames: entry.sampleFrames.map((frame) => frame + 1),
    }));
}

/** UI-selectable gains around the stable coarse point, checked at both timings. */
export function makeCalibrationRefinementCases(
  source: CapturedProfile,
): CalibrationCase[] {
  const controls = makeCalibrationCases(source, true).filter(
    (entry) => entry.scope === 'neutral',
  );
  const cases: CalibrationCase[] = [controls[0]!];
  const burst = peakWindow(source.profile);
  for (const gain of [0.4, 0.45, 0.5]) {
    for (const phase of [0, 1])
      cases.push({
        label: `refine-${gain}-phase${phase}`,
        scope: 'peak',
        gain,
        profile: scaleCapturedProfile(burst, gain / source.sourceGain),
        startFrame: 1200 + phase,
        sampleFrames: [1199, 1204, 1208, 1212, 1224, 1236].map(
          (frame) => frame + phase,
        ),
      });
  }
  cases.push(controls[1]!);
  return cases;
}
