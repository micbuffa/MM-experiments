import { readPreference, savePreference } from '../input/preferences';
import type { CrtSettings } from '../rendering/createCrtMaterial';

export function mountCrtControls(
  options: AddEventListenerOptions,
  onChange: (value: CrtSettings) => void,
) {
  const fieldset = document.querySelector<HTMLFieldSetElement>('#crt-options')!;
  const checkbox = document.querySelector<HTMLInputElement>('#render-crt')!;
  const hud = document.querySelector<HTMLInputElement>('#game-crt')!;
  const storage = {
    getItem: (key: string) => window.localStorage.getItem(key),
    setItem: (key: string, value: string) =>
      window.localStorage.setItem(key, value),
  };
  const sliders = {
    curvature: document.querySelector<HTMLInputElement>('#crt-curvature')!,
    scanlines: document.querySelector<HTMLInputElement>('#crt-scanlines')!,
    interference:
      document.querySelector<HTMLInputElement>('#crt-interference')!,
  };
  const entries = Object.entries(sliders);
  function settings(): CrtSettings {
    return {
      enabled: checkbox.checked,
      curvature: sliders.curvature.valueAsNumber / 100,
      scanlines: sliders.scanlines.valueAsNumber / 100,
      interference: sliders.interference.valueAsNumber / 100,
    };
  }
  function sync() {
    hud.checked = checkbox.checked;
    for (const [, input] of entries) input.disabled = !checkbox.checked;
  }
  checkbox.checked = readPreference(storage, 'crt.enabled', 0, 0, 1) === 1;
  for (const [key, input] of entries) {
    input.value = String(
      readPreference(storage, `crt.${key}`, input.valueAsNumber, 0, 100),
    );
    input.addEventListener(
      'input',
      () => {
        savePreference(storage, `crt.${key}`, input.valueAsNumber);
        onChange(settings());
      },
      options,
    );
  }
  for (const control of [checkbox, hud]) {
    control.addEventListener(
      'change',
      () => {
        checkbox.checked = control.checked;
        savePreference(storage, 'crt.enabled', Number(control.checked));
        sync();
        onChange(settings());
      },
      options,
    );
  }
  sync();
  return {
    settings,
    setAvailable(value: boolean) {
      fieldset.disabled = hud.disabled = !value;
    },
  };
}
