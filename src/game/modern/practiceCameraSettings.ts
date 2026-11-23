export const practiceCameraPresets = [
  'arcade',
  'follow',
  'overhead',
  'chase',
] as const;
export type PracticeCameraPreset = (typeof practiceCameraPresets)[number];

export const practiceLens = { min: 35, max: 85, initial: 55, step: 5 };

export function resolvePracticeCamera(
  preset: PracticeCameraPreset,
  twoPlayers = false,
): PracticeCameraPreset {
  return twoPlayers && preset === 'chase' ? 'arcade' : preset;
}

export function nextPracticeCamera(
  preset: PracticeCameraPreset,
  twoPlayers = false,
) {
  const choices: readonly PracticeCameraPreset[] = twoPlayers
    ? practiceCameraPresets.filter((item) => item !== 'chase')
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
