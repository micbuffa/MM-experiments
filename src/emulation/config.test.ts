import { expect, it } from 'vitest';
import { createEmulatorConfig, EMULATOR_DATA_PATH } from './config';

it('transmet le fichier local au cœur explicite, sans démarrage ni persistance automatiques', () => {
  const archive = new File(['synthetic'], 'test.zip');
  const config = createEmulatorConfig(archive);
  expect(config.gameUrl).toBe(archive);
  expect(config.system).toBe('mame2003_plus');
  expect(config.defaultOptions['mame2003-plus_xy_device']).toBe('mouse');
  expect(config.defaultOptions['mame2003-plus_input_interface']).toBe(
    'retropad',
  );
  expect(config.gameName).toBe('marble.zip');
  expect(config.startOnLoad).toBe(false);
  expect(config.noAutoFocus).toBe(true);
  expect(config.disableDatabases).toBe(true);
  expect(config.disableLocalStorage).toBe(true);
  expect(config.dataPath).toBe(EMULATOR_DATA_PATH);
  expect(config.dataPath).not.toMatch(/https?:|latest|stable/);
  expect(config.defaultOptions.webgl2Enabled).toBe('enabled');
});

it('passe le disclaimer de démarrage sans masquer les avertissements de compatibilité', () => {
  const config = createEmulatorConfig(new File(['synthetic'], 'test.zip'));
  expect(config.defaultOptions['mame2003-plus_skip_disclaimer']).toBe(
    'enabled',
  );
  expect(config.defaultOptions).not.toHaveProperty(
    'mame2003-plus_skip_warnings',
  );
});
