import { loadLocalRoms } from '../emulation/localRoms';
import type { LocalRoms } from '../emulation/localRoms';
import { loadRollingActors } from '../emulation/rollingActors';
import {
  loadIntermediateCheckpoint,
  loadIntermediateTerrain,
  loadLevel3Checkpoint,
  loadLevel3Terrain,
  loadLevel4Checkpoint,
  loadLevel4Terrain,
  loadLevel5Terrain,
  loadLevel5Checkpoint,
  loadPracticeTerrain,
} from '../emulation/localStudy';
import { bindDiagnosticActions } from './diagnosticActions';
import { mountGamePresentation } from './gamePresentation';
import { mountPlayControls } from './playControls';
import { mountVideoComparison } from './videoComparison';
import { prepareEmulator } from '../emulation/emulatorjs';
import type { ProbeSession } from '../emulation/emulatorjs';
import {
  MARBLE_ROMS,
  MAX_ARCHIVE_BYTES,
  assembleRomArchive,
} from '../emulation/romArchive';

export function mountFeasibility(): () => void {
  const files = document.querySelector<HTMLInputElement>('#archive')!;
  const biosFiles = document.querySelector<HTMLInputElement>('#bios')!;
  const prepare = document.querySelector<HTMLButtonElement>('#prepare')!;
  const status = document.querySelector<HTMLElement>('#status')!;
  const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;
  let disposePresentation: (() => void) | undefined;
  let disposeControls: (() => void) | undefined;
  let comparison: ReturnType<typeof mountVideoComparison> | undefined;
  const restart = document.querySelector<HTMLButtonElement>('#new-session')!;
  const intermediateButton = document.querySelector<HTMLButtonElement>(
    '#start-intermediate',
  )!;
  const level3Button =
    document.querySelector<HTMLButtonElement>('#start-level3');
  const level4Button =
    document.querySelector<HTMLButtonElement>('#start-level4');
  const level5Button =
    document.querySelector<HTMLButtonElement>('#start-level5');
  let session: ProbeSession | undefined;
  let localRoms: LocalRoms | null = null;
  let disposed = false;
  let attempted = false;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const studyParam = import.meta.env.DEV
    ? new URLSearchParams(location.search).get('study')
    : null;
  const autoStudy = studyParam === 'intermediate';
  const autoLevel3 = studyParam === 'level3';
  const autoLevel4 = studyParam === 'level4';
  const autoLevel5 = studyParam === 'level5';
  const studyFiles = import.meta.env.DEV
    ? Promise.all([
        loadIntermediateCheckpoint().catch(() => undefined),
        loadIntermediateTerrain().catch(() => undefined),
        loadPracticeTerrain().catch(() => undefined),
        loadRollingActors().catch(() => undefined),
        loadLevel3Terrain().catch(() => undefined),
        loadLevel3Checkpoint().catch(() => undefined),
        loadLevel4Terrain().catch(() => undefined),
        loadLevel4Checkpoint().catch(() => undefined),
        loadLevel5Terrain().catch(() => undefined),
        loadLevel5Checkpoint().catch(() => undefined),
      ])
    : Promise.resolve(undefined);
  let restoring = false;
  async function startCheckpoint(
    level: 'intermediate' | 'level3' | 'level4' | 'level5',
    pauseAfter: boolean,
  ) {
    if (!session?.started || !comparison || restoring) return;
    restoring = true;
    try {
      const files = await studyFiles;
      const checkpoint =
        level === 'level5'
          ? files?.[9]
          : level === 'level4'
            ? files?.[7]
            : level === 'level3'
              ? files?.[5]
              : files?.[0];
      const terrain =
        level === 'level5'
          ? files?.[8]
          : level === 'level4'
            ? files?.[6]
            : level === 'level3'
              ? files?.[4]
              : files?.[1];
      if (disposed || !checkpoint || !terrain) return;
      const label =
        level === 'level5'
          ? 'du niveau 5'
          : level === 'level4'
            ? 'du niveau 4'
            : level === 'level3'
              ? 'du niveau 3'
              : 'd’Intermediate Race';
      status.textContent = `Restauration du départ ${label}…`;
      if (disposed || !(await session.restoreIntermediate?.(checkpoint, level)))
        throw new Error(`Le cœur n’a pas rétabli le départ ${label}.`);
      if (disposed) return;
      if (pauseAfter) session.pause();
      comparison.restartOpening();
      status.textContent =
        level === 'level5'
          ? 'Niveau 5 · Silly Race prêt. F5 reprend au départ.'
          : level === 'level4'
            ? 'Niveau 4 (Aerial Race) prêt. Capturer le trackpad pour jouer. F4 reprend au départ.'
            : level === 'level3'
              ? 'Niveau 3 prêt. Capturer le trackpad pour jouer. F3 reprend au départ.'
              : 'Intermediate Race prêt. Capturer le trackpad pour jouer. F2 reprend au départ.';
    } catch (error) {
      if (!disposed) status.textContent = String(error);
    } finally {
      restoring = false;
    }
  }
  intermediateButton.addEventListener(
    'click',
    () => void startCheckpoint('intermediate', true),
    options,
  );
  level3Button?.addEventListener(
    'click',
    () => void startCheckpoint('level3', true),
    options,
  );
  level4Button?.addEventListener(
    'click',
    () => void startCheckpoint('level4', true),
    options,
  );
  level5Button?.addEventListener(
    'click',
    () => void startCheckpoint('level5', true),
    options,
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'F5' && level5Button && !level5Button.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat)
          void startCheckpoint(
            'level5',
            document.pointerLockElement !== session?.canvas,
          );
      } else if (event.key === 'F2' && !intermediateButton.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat)
          void startCheckpoint(
            'intermediate',
            document.pointerLockElement !== session?.canvas,
          );
      } else if (event.key === 'F3' && level3Button && !level3Button.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat)
          void startCheckpoint(
            'level3',
            document.pointerLockElement !== session?.canvas,
          );
      } else if (event.key === 'F4' && level4Button && !level4Button.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat)
          void startCheckpoint(
            'level4',
            document.pointerLockElement !== session?.canvas,
          );
      }
    },
    { ...options, capture: true },
  );
  const details = [
    'Frontend : EmulatorJS 4.2.3 (local)',
    'Cœur candidat : mame2003_plus ; wrapper 2.0.2 ; build 14 juin 2025',
    `Navigateur : ${navigator.userAgent}`,
    'Commandes relatives : driver natif avec gain et purge ; confort à valider par Michel.',
  ];
  const report = () => {
    const snapshot = session?.started ? session.diagnostics : null;
    const timeline = snapshot?.motionTimeline;
    const state =
      timeline && typeof timeline === 'object' && 'status' in timeline
        ? timeline.status
        : null;
    document.querySelector<HTMLElement>('#motion-measure-status')!.textContent =
      state === 'complete'
        ? 'Mesure terminée : clique sur Copier les diagnostics.'
        : state === 'recording'
          ? 'Mesure en cours : fais une accélération, puis Échap.'
          : state === 'armed'
            ? snapshot?.captured
              ? 'Mesure prête : fais une accélération, puis Échap.'
              : 'Essai prêt : clique sur Capturer, puis fais une accélération.'
            : session?.started
              ? 'Capturer démarre automatiquement la mesure.'
              : '';
    diagnostics.textContent =
      snapshot && session
        ? `${details.join('\n')}\nCanvas : ${session.canvas.width} × ${session.canvas.height}\nPointer Lock : ${document.pointerLockElement === session.canvas ? 'actif' : 'inactif'}\n${JSON.stringify({ ...snapshot, videoView: comparison?.diagnostics }, null, 2)}`
        : details.join('\n');
  };
  report();
  document.querySelector<HTMLElement>('#rom-list')!.textContent =
    MARBLE_ROMS.map((rom) => `${rom.name} · ${rom.size} octets`).join('\n');

  async function prepareSelected() {
    if (attempted) return;
    const manualGame = files.files?.[0];
    const archive = manualGame ?? localRoms?.game;
    if (!archive) {
      status.textContent =
        'Sélectionner une archive marble.zip locale avant de préparer le test.';
      return;
    }
    prepare.disabled = true;
    files.disabled = true;
    biosFiles.disabled = true;
    status.textContent =
      'Vérification locale des 30 fichiers et de leurs empreintes…';
    const verificationStart = performance.now();
    try {
      if (!archive.name.toLowerCase().endsWith('.zip'))
        throw new Error(
          'Le banc d’essai accepte une archive ZIP complète du set marble.',
        );
      if (archive.size > MAX_ARCHIVE_BYTES)
        throw new Error('Archive trop volumineuse : limite de 16 Mio.');
      const bios = biosFiles.files?.[0] ?? localRoms?.bios;
      if (
        bios &&
        (!bios.name.toLowerCase().endsWith('.zip') ||
          bios.size > MAX_ARCHIVE_BYTES)
      ) {
        throw new Error('Le BIOS doit être une archive ZIP de 16 Mio maximum.');
      }
      const [gameBuffer, biosBuffer] = await Promise.all([
        archive.arrayBuffer(),
        bios?.arrayBuffer(),
      ]);
      const assembled = await assembleRomArchive(
        new Uint8Array(gameBuffer),
        biosBuffer ? new Uint8Array(biosBuffer) : undefined,
      );
      if (disposed) return;
      attempted = true;
      details.push(
        'Jeu et BIOS : 30 fichiers vérifiés par taille et SHA-1, réunis sous les noms MAME dans un ZIP mémoire. Les originaux restent inchangés.',
        `Lecture, vérification et assemblage des ZIP : ${Math.round(performance.now() - verificationStart)} ms.`,
      );
      status.textContent = 'Chargement du frontend local…';
      const frontendStart = performance.now();
      let coreStart: number | undefined;
      const emulator = document.querySelector('#emulator')!;
      emulator.addEventListener(
        'click',
        () => {
          coreStart = performance.now();
        },
        { ...options, capture: true, once: true },
      );
      session = await prepareEmulator(
        new File([assembled], 'marble.zip', { type: 'application/zip' }),
        () => {
          if (disposed) return;
          status.textContent =
            'Émulation lancée. Attendre l’écran du jeu, puis Crédit → Start joueur 1 → Capturer le trackpad.';
          details.push(
            'Événement start reçu ; mode attract, son et commandes restent à vérifier.',
          );
          if (coreStart !== undefined)
            details.push(
              `Du clic de démarrage au lancement du cœur : ${Math.round(performance.now() - coreStart)} ms.`,
            );
          session!.canvas.addEventListener(
            'webglcontextlost',
            () => {
              document.querySelector<HTMLButtonElement>('#pause')?.click();
              details.push('Contexte graphique du cœur perdu.');
              status.textContent =
                'Le contexte graphique de l’émulateur a été perdu. Si l’image reste noire, utiliser « Nouvelle session ».';
              report();
            },
            options,
          );
          disposeControls = mountPlayControls(session!, {
            beforeCapture: () => comparison?.enterGame(),
            isExploring: () => comparison?.isExploring ?? false,
            interrupted: () => comparison?.stopExploration(),
          });
          comparison = mountVideoComparison(session!.video, session!);
          disposePresentation = mountGamePresentation();
          document.querySelector<HTMLButtonElement>(
            '#reset-metrics',
          )!.disabled = false;
          report();
          void studyFiles.then(async (files) => {
            if (disposed) return;
            if (files?.[3]) comparison?.setActors(files[3]);
            if (files?.[2]) await comparison?.setTerrain(files[2], !autoStudy);
            if (files?.[1])
              await comparison?.setTerrain(files[1], autoStudy || !files[2]);
            if (files?.[4]) await comparison?.setTerrain(files[4], autoLevel3);
            if (files?.[6]) await comparison?.setTerrain(files[6], autoLevel4);
            if (files?.[8]) await comparison?.setTerrain(files[8], autoLevel5);
            if (disposed) return;
            if (files?.[9] && files?.[8] && level5Button) {
              level5Button.hidden = false;
              if (autoLevel5) void startCheckpoint('level5', true);
            }
            if (files?.[5] && files?.[4] && level3Button) {
              level3Button.hidden = false;
              if (autoLevel3) void startCheckpoint('level3', true);
            }
            if (files?.[7] && files?.[6] && level4Button) {
              level4Button.hidden = false;
              if (autoLevel4) void startCheckpoint('level4', true);
            }
            if (!files?.[0] || !files[1]) {
              if (autoStudy)
                status.textContent =
                  'Départ direct indisponible. Vérifier le relevé et le point de reprise locaux. Practice Race reste accessible par la borne.';
              return;
            }
            intermediateButton.hidden = false;
            if (autoStudy) void startCheckpoint('intermediate', true);
          });
        },
      );
      if (disposed) {
        session.pause();
        return;
      }
      status.textContent =
        'Archive vérifiée. Cliquer sur « Démarrer l’émulation » dans le cadre pour lancer le cœur et activer l’audio.';
      details.push(
        `Préparation du frontend : ${Math.round(performance.now() - frontendStart)} ms.`,
      );
    } catch (error) {
      if (disposed) return;
      status.textContent =
        error instanceof Error ? error.message : String(error);
      details.push(`Échec : ${status.textContent}`);
      prepare.disabled = attempted;
      files.disabled = attempted;
      biosFiles.disabled = attempted;
    }
    report();
  }
  if (import.meta.env.DEV) {
    const preloadStatus =
      document.querySelector<HTMLElement>('#local-rom-status')!;
    preloadStatus.hidden = false;
    prepare.disabled = true;
    preloadStatus.textContent = 'Recherche des archives du dossier roms/…';
    void loadLocalRoms()
      .then((archives) => {
        if (disposed) return;
        localRoms = archives;
        if (archives)
          status.textContent =
            'Archives locales préchargées. Cliquer sur Vérifier et préparer.';
        preloadStatus.textContent = archives
          ? `Préchargé depuis roms/ : marble.zip${archives.bios ? ' et atarisy1.zip' : ''}. Cliquer sur Vérifier et préparer ; aucune sélection nécessaire.`
          : 'Pas de jeu local préchargé. Ajouter marble.zip (et si nécessaire atarisy1.zip) dans roms/ puis recharger, ou utiliser les sélecteurs.';
      })
      .catch((error) => {
        if (!disposed)
          preloadStatus.textContent = `Préchargement local indisponible : ${String(error)}`;
      })
      .finally(() => {
        if (!disposed && !attempted) {
          prepare.disabled = false;
          if ((autoStudy || autoLevel3 || autoLevel4) && localRoms)
            void prepareSelected();
        }
      });
  }
  prepare.addEventListener(
    'click',
    () => {
      void prepareSelected();
    },
    options,
  );
  restart.addEventListener(
    'click',
    () => {
      if (
        session?.started &&
        !window.confirm('Terminer la session en cours et recharger ?')
      )
        return;
      location.reload();
    },
    options,
  );
  bindDiagnosticActions(
    () => {
      report();
      return diagnostics.textContent ?? '';
    },
    () => {
      if (!session?.started) return false;
      session.resetMetrics();
      report();
      return true;
    },
    controller.signal,
  );
  // Diagnostic temporaire de l'incrément A, sans prétendre mesurer la vitesse du cœur.
  const timer = window.setInterval(() => {
    if (session?.failed) {
      status.textContent =
        'Le frontend signale un échec de lancement. Consulter le message dans le cadre et la console ; recommencer avec « Nouvelle session ».';
    }
    if (session?.started) report();
  }, 500);
  return () => {
    disposed = true;
    localRoms = null;
    controller.abort();
    clearInterval(timer);
    disposePresentation?.();
    disposeControls?.();
    comparison?.dispose();
    if (!disposeControls) session?.dispose();
  };
}
