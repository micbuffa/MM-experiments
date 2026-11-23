export const EMULATOR_DATA_PATH = `${import.meta.env.BASE_URL}vendor/emulatorjs/4.2.3/data/`;

/** Options vérifiées dans loader.js et emulator.js du tag v4.2.3. */
export function createEmulatorConfig(
  archive: File,
  language: 'fr' | 'en' = 'fr',
) {
  return {
    system: 'mame2003_plus',
    gameUrl: archive,
    gameName: 'marble.zip',
    dataPath: EMULATOR_DATA_PATH,
    startOnLoad: false,
    startBtnName:
      language === 'en' ? 'Start Emulation' : 'Démarrer l’émulation',
    volume: 0.5,
    threads: false,
    noAutoFocus: true,
    disableDatabases: true,
    disableLocalStorage: true,
    // Le bundle installé est la variante WebGL2, pas legacy.
    defaultOptions: {
      webgl2Enabled: 'enabled',
      'mame2003-plus_xy_device': 'mouse',
      'mame2003-plus_input_interface': 'retropad',
      // Option du cœur figé : évite l'écran bloquant qui absorbe Crédit/Start.
      'mame2003-plus_skip_disclaimer': 'enabled',
    },
    buttonOpts: {
      saveState: false,
      loadState: false,
      saveSavFiles: false,
      loadSavFiles: false,
      netplay: false,
      screenRecord: false,
      playPause: false,
      play: false,
      pause: false,
      restart: false,
      gamepad: false,
      contextMenu: false,
      diskButton: false,
      mute: false,
      unmute: false,
      volumeSlider: false,
      settings: false,
      cheat: false,
      exitEmulation: false,
      quickSave: false,
      quickLoad: false,
    },
    langJson:
      language === 'en'
        ? {
            'Loading...': 'Loading…',
            'Download Game Core': 'Loading arcade core',
            'Decompress Game Core': 'Decompressing core',
            'Download Game Data': 'Loading arcade archive',
            'Failed to start game': 'Failed to start game',
          }
        : {
            'Loading...': 'Chargement…',
            'Download Game Core': 'Chargement du cœur',
            'Decompress Game Core': 'Décompression du cœur',
            'Download Game Data': 'Lecture de l’archive locale',
            'Failed to start game':
              'Échec du lancement : consulter les diagnostics',
          },
    language,
  };
}
