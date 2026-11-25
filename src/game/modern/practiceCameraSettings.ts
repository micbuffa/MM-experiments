export const practiceCameraPresets = [
  'arcade',
  'follow',
  'overhead',
  'chase',
  'chaseHigh',
] as const;
export type PracticeCameraPreset = (typeof practiceCameraPresets)[number];

export const practiceLens = { min: 35, max: 85, initial: 55, step: 5 };

export function isChasePracticeCamera(preset: PracticeCameraPreset) {
  return preset === 'chase' || preset === 'chaseHigh';
}

export function resolvePracticeCamera(
  preset: PracticeCameraPreset,
  twoPlayers = false,
): PracticeCameraPreset {
  return twoPlayers && isChasePracticeCamera(preset) ? 'arcade' : preset;
}

export function nextPracticeCamera(
  preset: PracticeCameraPreset,
  twoPlayers = false,
) {
  const choices: readonly PracticeCameraPreset[] = twoPlayers
    ? practiceCameraPresets.filter((item) => !isChasePracticeCamera(item))
    : practiceCameraPresets;
  const current = resolvePracticeCamera(preset, twoPlayers);
  return choices[(choices.indexOf(current) + 1) % choices.length]!;
}

export function clampPracticeFov(degrees: number) {
  return Number.isFinite(degrees)
    ? Math.min(practiceLens.max, Math.max(practiceLens.min, degrees))
    : practiceLens.initial;
}

export function practiceArcadeZoomScale(degrees: number) {
  return (
    Math.tan((degrees * Math.PI) / 360) /
    Math.tan((practiceLens.initial * Math.PI) / 360)
  );
}

export function practiceOpeningBlend(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

/**
 * Gate the pre-flyover curtain so a wrapped 68010 countdown byte (`0x00..0x41`
 * -> `opening` in `0.75..1.0`) never flashes the final arcade frame before the
 * real flyover begins at `0x42` (`opening = 0`).
 */
export function stepOpeningCurtain(
  armed: boolean,
  opening: number | undefined,
): { readonly armed: boolean; readonly hidden: boolean } {
  if (opening === undefined) return { armed: false, hidden: false };
  const nextArmed = armed || opening < 0.5;
  return { armed: nextArmed, hidden: !nextArmed || opening <= 0.02 };
}
