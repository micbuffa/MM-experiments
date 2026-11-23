import {
  clampPracticeFov,
  nextPracticeCamera,
  practiceCameraPresets,
  practiceLens,
  resolvePracticeCamera,
} from '../game/modern/practiceCameraSettings';
import type { PracticeCameraPreset } from '../game/modern/practiceCameraSettings';

export function mountPracticeCameraControls(
  options: AddEventListenerOptions,
  handlers: {
    select(preset: PracticeCameraPreset): void;
    lens(fov: number): void;
  },
) {
  const sections = [
    'practice-camera-controls',
    'game-practice-camera-controls',
  ].map((id) => document.getElementById(id)!);
  const cameras = sections.map((section) => section.querySelector('select')!);
  const lenses = sections.map((section) =>
    section.querySelector<HTMLInputElement>('input')!,
  );
  cameras[1]!.replaceChildren(
    ...Array.from(cameras[0]!.options, (option) => option.cloneNode(true)),
  );
  const chaseOptions = cameras
    .map((input) =>
      input.querySelector<HTMLOptionElement>('option[value="chase"]'),
    )
    .filter((option): option is HTMLOptionElement => option !== null);
  let preset: PracticeCameraPreset = 'arcade';
  let fov = practiceLens.initial;
  let twoPlayers = false;

  function select(value: PracticeCameraPreset) {
    preset = resolvePracticeCamera(value, twoPlayers);
    for (const input of cameras) input.value = preset;
    handlers.select(preset);
  }

  function syncLens() {
    for (const input of lenses) {
      input.value = String(fov);
      input.setAttribute('aria-valuetext', `${fov} degrés`);
    }
  }

  function setFov(value: number) {
    fov = clampPracticeFov(value);
    syncLens();
    handlers.lens(fov);
  }

  for (const input of cameras) {
    input.addEventListener(
      'change',
      () => {
        const value = practiceCameraPresets.find(
          (option) => option === input.value,
        );
        if (value) select(value);
      },
      options,
    );
  }
  for (const input of lenses) {
    input.min = String(practiceLens.min);
    input.max = String(practiceLens.max);
    input.step = String(practiceLens.step);
    input.addEventListener('input', () => setFov(input.valueAsNumber), options);
  }
  syncLens();

  return {
    setAvailable(available: boolean) {
      for (const section of sections) section.hidden = !available;
    },
    setTwoPlayers(duo: boolean) {
      if (duo === twoPlayers) return;
      twoPlayers = duo;
      for (const option of chaseOptions) option.disabled = duo;
      if (duo && preset === 'chase') select('arcade');
    },
    next() {
      select(nextPracticeCamera(preset, twoPlayers));
    },
    adjust(direction: 1 | -1) {
      setFov(fov + direction * practiceLens.step);
    },
  };
}
