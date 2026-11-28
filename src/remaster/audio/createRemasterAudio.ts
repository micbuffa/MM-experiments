import type { RemasterEvent } from '../engine/remasterSimulation';
import {
  createAmigaTrackerMusic,
  type AmigaTrackerTrack,
} from './createAmigaTrackerMusic';
import {
  DEFAULT_SFX_BANK,
  parseSfxBank,
  type FmChannelPatch,
  type SfxBankV1,
} from './sfxBank';
import { parseVgm, type ParsedVgm } from './vgmParser';

// YM2151 Key Code helper: MIDI note (e.g. 60 = C4) -> OPM KC byte.
const MIDI_TO_OPM_NOTE = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] as const;

function midiToKc(midi: number): number {
  const clamped = Math.max(12, Math.min(107, Math.round(midi)));
  const octave = Math.max(0, Math.min(7, Math.floor((clamped - 12) / 12)));
  const note = MIDI_TO_OPM_NOTE[(clamped - 12) % 12]!;
  return (octave << 4) | note;
}

type ChipOp = readonly [0 | 1, number, number]; // 0=OPM, 1=POKEY

function loadFmPatch(patch: FmChannelPatch): ChipOp[] {
  const ch = patch.channel & 7;
  const batch: ChipOp[] = [
    [0, 0x20 + ch, (0b11 << 6) | ((patch.fb & 7) << 3) | (patch.alg & 7)],
  ];
  const slotOffsets = [0x00, 0x10, 0x08, 0x18] as const; // M1, C1, M2, C2
  for (let i = 0; i < 4; i++) {
    const o = patch.ops[i]!;
    const s = slotOffsets[i]! + ch;
    batch.push(
      [0, 0x40 + s, o.mul & 0x0f],
      [0, 0x60 + s, o.tl & 0x7f],
      [0, 0x80 + s, o.ar & 0x1f],
      [0, 0xa0 + s, o.d1r & 0x1f],
      [0, 0xc0 + s, 0],
      [0, 0xe0 + s, ((o.d1l & 0x0f) << 4) | (o.rr & 0x0f)],
    );
  }
  return batch;
}

export interface RemasterAudioController {
  unlock(): Promise<void>;
  setMuted(muted: boolean): void;
  setMix(music: number, sfx: number): void;
  setMusicEnabled(enabled: boolean): void;
  playLevelTheme(courseIndex?: number): void;
  playAmigaTracker(track: AmigaTrackerTrack): void;
  stopAmigaTracker(): void;
  loadVgm(bytes: Uint8Array): ParsedVgm;
  clearVgm(): void;
  updateRolling(speed: number, grounded: boolean): void;
  handleEvents(events: readonly RemasterEvent[]): void;
  dispose(): void;
}

/**
 * Autonomous WebAudio controller for the Yamaha YM2151 (OPM) + Atari POKEY WASM worklet.
 * Preloads editable `sfx-bank.json`, `level1-practice.vgm`, and `goal-fanfare.vgm`.
 * Channels 0..3 (+ POKEY ch 2): Music bus (preloaded or user-dropped .vgm/.vgz).
 * Channels 4..7 (+ POKEY ch 0..1): Real-time SFX bus driven by `sfx-bank.json`.
 */
export function createRemasterAudio(baseUrl = '/'): RemasterAudioController {
  let ctx: AudioContext | undefined;
  let node: AudioWorkletNode | undefined;
  let ready = false;
  let muted = false;
  let musicGain = 0.75;
  let sfxGain = 1.0;
  let musicEnabled = true;
  let customVgm: ParsedVgm | null = null;
  let currentCourse = 1;
  let levelThemeVgm: ParsedVgm | null = null;
  let level2ThemeVgm: ParsedVgm | null = null;
  let level3ThemeVgm: ParsedVgm | null = null;
  let level4ThemeVgm: ParsedVgm | null = null;
  let level5ThemeVgm: ParsedVgm | null = null;
  let level6ThemeVgm: ParsedVgm | null = null;
  let congratulationsVgm: ParsedVgm | null = null;
  let goalFanfareVgm: ParsedVgm | null = null;
  let goalFanfareP2Vgm: ParsedVgm | null = null;
  let gameOverVgm: ParsedVgm | null = null;
  const romSfx: Partial<Record<string, ParsedVgm>> = {};
  let sfxBank: SfxBankV1 = DEFAULT_SFX_BANK;
  let disposed = false;
  let lastRollReg = -1;
  let shatterTimeout: number | undefined;
  let prioritySfxUntil = 0;
  let pendingAmigaTrack: AmigaTrackerTrack | null = null;
  const amigaTracker = createAmigaTrackerMusic();

  function post(msg: unknown) {
    if (ready && node && !disposed) node.port.postMessage(msg);
  }

  function applySfxPatches() {
    const ops: ChipOp[] = [
      ...loadFmPatch(sfxBank.patches.impact),
      ...loadFmPatch(sfxBank.patches.chime),
      ...loadFmPatch(sfxBank.patches.fall),
      ...loadFmPatch(
        sfxBank.patches.wallBounce ?? DEFAULT_SFX_BANK.patches.wallBounce!,
      ),
      ...loadFmPatch(
        sfxBank.patches.marbleClack ?? DEFAULT_SFX_BANK.patches.marbleClack!,
      ),
    ];
    post({ type: 'batch', ops });
  }

  function silenceMusicChannels() {
    post({
      type: 'batch',
      ops: [
        [0, 0x08, 0x00],
        [0, 0x08, 0x01],
        [0, 0x08, 0x02],
        [0, 0x08, 0x03],
        [1, 0x05, 0x00],
      ],
    });
  }

  function playTrack(track: ParsedVgm | null) {
    silenceMusicChannels();
    if (musicEnabled && track) {
      post({ type: 'vgm', vgm: track });
    } else {
      post({ type: 'vgm', vgm: null });
    }
  }

  function triggerNote(ch: number, midi: number, durationMs = 140) {
    post({
      type: 'batch',
      ops: [
        [0, 0x08, ch],
        [0, 0x28 + ch, midiToKc(midi)],
        [0, 0x08, 0x78 | ch],
      ],
    });
    window.setTimeout(() => {
      post({ type: 'opm', reg: 0x08, val: ch });
    }, durationMs);
  }

  async function listLocalVgms(): Promise<Set<string>> {
    if (!import.meta.env.DEV) return new Set();
    try {
      const res = await fetch('/__local-roms/vgm-list');
      if (!res.ok) return new Set();
      const json = (await res.json()) as { files?: unknown };
      if (!Array.isArray(json.files)) return new Set();
      return new Set(
        json.files.filter((item): item is string => typeof item === 'string'),
      );
    } catch {
      return new Set();
    }
  }

  async function fetchFirstVgm(
    urls: readonly string[],
  ): Promise<ParsedVgm | null> {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) return parseVgm(new Uint8Array(await res.arrayBuffer()));
      } catch {
        // Try next candidate.
      }
    }
    return null;
  }

  async function preloadAudioAssets(prefix: string) {
    const localVgms = await listLocalVgms();
    const resolveTrackUrls = (stem: string) => {
      const urls: string[] = [];
      if (import.meta.env.DEV) {
        if (localVgms.has(`${stem}.vgz`))
          urls.push(`/__local-roms/${stem}.vgz`);
        if (localVgms.has(`${stem}.vgm`))
          urls.push(`/__local-roms/${stem}.vgm`);
      } else {
        urls.push(`${prefix}assets/audio/${stem}.vgz`);
      }
      urls.push(`${prefix}assets/audio/${stem}.vgm`);
      return urls;
    };
    const loadOptionalVgz = (name: string): Promise<ParsedVgm | null> => {
      if (import.meta.env.DEV) {
        return localVgms.has(name)
          ? fetchFirstVgm([`/__local-roms/${name}`])
          : Promise.resolve(null);
      }
      return fetchFirstVgm([`${prefix}assets/audio/${name}`]);
    };

    const [
      bankRes,
      levelTrack,
      level2Track,
      level3Track,
      level4Track,
      level5Track,
      level6Track,
      congratulationsTrack,
      goalTrack,
      goalP2Track,
      gameOverTrack,
    ] = await Promise.all([
      fetch(`${prefix}assets/audio/sfx-bank.json`, { cache: 'no-cache' }).catch(
        () => null,
      ),
      fetchFirstVgm(resolveTrackUrls('level1-practice')),
      loadOptionalVgz('level2-beginner.vgz'),
      loadOptionalVgz('level3-intermediate.vgz'),
      loadOptionalVgz('level4-aerial.vgz'),
      loadOptionalVgz('level5-silly.vgz'),
      loadOptionalVgz('level6-ultimate.vgz'),
      loadOptionalVgz('congratulations.vgz'),
      fetchFirstVgm(resolveTrackUrls('goal-fanfare')),
      loadOptionalVgz('goal-fanfare-p2.vgz'),
      loadOptionalVgz('game-over.vgz'),
    ]);
    if (bankRes?.ok) {
      try {
        sfxBank = parseSfxBank(await bankRes.text());
      } catch {
        sfxBank = DEFAULT_SFX_BANK;
      }
    }
    levelThemeVgm = levelTrack;
    level2ThemeVgm = level2Track;
    level3ThemeVgm = level3Track;
    level4ThemeVgm = level4Track;
    level5ThemeVgm = level5Track;
    level6ThemeVgm = level6Track;
    congratulationsVgm = congratulationsTrack;
    goalFanfareVgm = goalTrack;
    goalFanfareP2Vgm = goalP2Track;
    gameOverVgm = gameOverTrack;

    // Preload bit-exact original Atari System 1 ROM SFX (.vgm) mapped in sfx-bank.json.
    const defaultSfxNames = [
      'sfx-wall-bounce.vgm',
      'sfx-marble-clack.vgm',
      'sfx-pvp-clack.vgm',
      'sfx-impact.vgm',
      'sfx-fall.vgm',
      'sfx-void-fall.vgm',
      'sfx-dizzy.vgm',
      'sfx-shatter.vgm',
      'sfx-broom.vgm',
      'sfx-respawn.vgm',
      'sfx-worm-eat.vgm',
      'sfx-pipe.vgm',
      'sfx-ice-enter.vgm',
      'sfx-ice-leave.vgm',
      'sfx-acid-dissolve.vgm',
      'sfx-mini-squash-acid.vgm',
      'sfx-mini-squash-worm.vgm',
      'sfx-mini-squash-black.vgm',
      'sfx-countdown.vgm',
    ];
    const mappedNames = sfxBank.romSfx
      ? Object.values(sfxBank.romSfx).map((entry) => entry.file)
      : [];
    const sfxNames = [...new Set([...defaultSfxNames, ...mappedNames])];
    await Promise.all(
      sfxNames.map(async (name) => {
        const urls: string[] = [];
        if (import.meta.env.DEV) {
          if (localVgms.has(name)) urls.push(`/__local-roms/${name}`);
        } else {
          urls.push(`${prefix}assets/audio/${name}`);
        }
        if (urls.length === 0) return;
        const parsed = await fetchFirstVgm(urls);
        if (parsed) romSfx[name] = parsed;
      }),
    );
  }

  return {
    async unlock() {
      if (disposed) return;
      if (ctx) {
        if (ctx.state === 'suspended') await ctx.resume();
        return;
      }
      ctx = new AudioContext();
      amigaTracker.attachContext(ctx);
      amigaTracker.setVolume(musicGain);
      amigaTracker.setMuted(muted);
      const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const [, wasmResponse] = await Promise.all([
        ctx.audioWorklet.addModule(
          `${prefix}assets/audio/opm-pokey-worklet.js`,
        ),
        fetch(`${prefix}assets/audio/opm-pokey.wasm`),
        preloadAudioAssets(prefix),
      ]);
      const wasmBytes = await wasmResponse.arrayBuffer();
      if (disposed) return;
      node = new AudioWorkletNode(ctx, 'opm-pokey-worklet', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      node.connect(ctx.destination);
      await new Promise<void>((resolve, reject) => {
        if (!node) return reject(new Error('AudioWorkletNode indisponible'));
        node.port.onmessage = (event) => {
          if (event.data?.type === 'ready') {
            ready = true;
            resolve();
          } else if (event.data?.type === 'error') {
            reject(new Error(String(event.data.error)));
          }
        };
        node.port.postMessage({ type: 'init', wasmBytes }, [wasmBytes]);
      });
      applySfxPatches();
      post({ type: 'mute', muted });
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
      if (pendingAmigaTrack && !customVgm) {
        playTrack(null);
        amigaTracker.play(pendingAmigaTrack);
      } else {
        playTrack(customVgm ?? levelThemeVgm);
      }
    },

    setMuted(value: boolean) {
      muted = value;
      amigaTracker.setMuted(muted);
      post({ type: 'mute', muted });
    },

    setMix(music: number, sfx: number) {
      musicGain = Math.max(0, Math.min(2, music));
      sfxGain = Math.max(0, Math.min(2, sfx));
      amigaTracker.setVolume(musicGain);
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
    },

    setMusicEnabled(enabled: boolean) {
      musicEnabled = enabled;
      if (!enabled) amigaTracker.stop();
      playTrack(enabled ? (customVgm ?? levelThemeVgm) : null);
    },

    playLevelTheme(courseIndex = currentCourse) {
      pendingAmigaTrack = null;
      amigaTracker.stop();
      currentCourse = courseIndex;
      const track =
        courseIndex === 6 && level6ThemeVgm
          ? level6ThemeVgm
          : courseIndex === 5 && level5ThemeVgm
            ? level5ThemeVgm
            : courseIndex === 4 && level4ThemeVgm
              ? level4ThemeVgm
              : courseIndex === 3 && level3ThemeVgm
                ? level3ThemeVgm
                : courseIndex === 2 && level2ThemeVgm
                  ? level2ThemeVgm
                  : levelThemeVgm;
      playTrack(customVgm ?? track);
    },

    playAmigaTracker(track: AmigaTrackerTrack) {
      pendingAmigaTrack = track;
      if (customVgm) return;
      playTrack(null);
      if (musicEnabled) {
        amigaTracker.play(track);
      }
    },

    stopAmigaTracker() {
      pendingAmigaTrack = null;
      amigaTracker.stop();
    },

    loadVgm(bytes: Uint8Array): ParsedVgm {
      pendingAmigaTrack = null;
      amigaTracker.stop();
      const parsed = parseVgm(bytes);
      customVgm = parsed;
      playTrack(parsed);
      return parsed;
    },

    clearVgm() {
      customVgm = null;
      applySfxPatches();
      playTrack(levelThemeVgm);
    },

    updateRolling(speed: number, grounded: boolean) {
      if (!ready || muted) return;
      const r = sfxBank.rolling;
      const effective =
        grounded && speed > r.speedThreshold ? speed - r.speedThreshold : 0;
      const vol = Math.min(r.maxVolume, Math.floor(effective * r.volumeSlope));
      const audf = Math.max(
        r.minAudf,
        Math.min(r.maxAudf, Math.round(r.baseAudf - effective * r.audfSlope)),
      );
      const packed = (audf << 8) | vol;
      if (packed === lastRollReg) return;
      lastRollReg = packed;
      post({
        type: 'batch',
        ops: [
          [1, 0x00, audf],
          [1, 0x01, vol > 0 ? 0x80 | vol : 0x00],
        ],
      });
    },

    handleEvents(events: readonly RemasterEvent[]) {
      if (!ready || muted) return;
      const cfg = sfxBank.events;
      const playTriggerSfx = (
        trigger: string,
        fallbackFile: string,
      ): boolean => {
        const file = sfxBank.romSfx?.[trigger]?.file ?? fallbackFile;
        const clip = romSfx[file];
        if (!clip) return false;
        post({ type: 'sfxVgm', vgm: clip });
        return true;
      };
      const hasImpactInBatch = events.some((e) => e.type === 'impact');
      const hasPriorityInBatch = events.some(
        (e) =>
          e.type === 'pipeEnter' ||
          e.type === 'catapult' ||
          e.type === 'miniSquash' ||
          e.type === 'wormEat' ||
          e.type === 'acidDissolve' ||
          e.type === 'shatter' ||
          e.type === 'birdDeath',
      );
      const protectPriority = (ms: number) => {
        prioritySfxUntil = Math.max(prioritySfxUntil, performance.now() + ms);
      };
      for (const ev of events) {
        if (ev.type === 'impact') {
          if (hasPriorityInBatch || performance.now() < prioritySfxUntil)
            continue;
          if (!playTriggerSfx('impact', 'sfx-impact.vgm')) {
            const midi =
              cfg.impact.baseMidi +
              Math.round(ev.intensity * cfg.impact.intensitySpan);
            triggerNote(cfg.impact.channel, midi, cfg.impact.durationMs);
          }
        } else if (ev.type === 'wallBounce') {
          if (hasPriorityInBatch || performance.now() < prioritySfxUntil)
            continue;
          if (!playTriggerSfx('wallBounce', 'sfx-wall-bounce.vgm')) {
            const wb = cfg.wallBounce ?? DEFAULT_SFX_BANK.events.wallBounce!;
            const midi =
              wb.baseMidi + Math.round(ev.intensity * wb.intensitySpan);
            triggerNote(wb.channel, midi, wb.durationMs);
          }
        } else if (ev.type === 'marbleClack') {
          if (!playTriggerSfx('marbleClack', 'sfx-marble-clack.vgm')) {
            const mc = cfg.marbleClack ?? DEFAULT_SFX_BANK.events.marbleClack!;
            const midi =
              mc.baseMidi + Math.round(ev.intensity * mc.intensitySpan);
            triggerNote(mc.channel, midi, mc.durationMs);
          }
        } else if (ev.type === 'pvpClack') {
          if (!playTriggerSfx('pvpClack', 'sfx-pvp-clack.vgm')) {
            const mc = cfg.marbleClack ?? DEFAULT_SFX_BANK.events.marbleClack!;
            const midi =
              mc.baseMidi + Math.round(ev.intensity * mc.intensitySpan);
            triggerNote(mc.channel, midi, mc.durationMs);
          }
        } else if (ev.type === 'wormEat') {
          protectPriority(700);
          if (!playTriggerSfx('wormEat', 'sfx-worm-eat.vgm')) {
            triggerNote(cfg.impact.channel, 34, 220);
          }
        } else if (ev.type === 'pipeEnter') {
          protectPriority(850);
          if (!playTriggerSfx('pipeEnter', 'sfx-pipe.vgm')) {
            triggerNote(cfg.respawn.channel, 68, 180);
          }
        } else if (ev.type === 'iceEnter') {
          if (!playTriggerSfx('iceEnter', 'sfx-ice-enter.vgm')) {
            triggerNote(cfg.respawn.channel, 84, 140);
          }
        } else if (ev.type === 'iceLeave') {
          playTriggerSfx('iceLeave', 'sfx-ice-leave.vgm');
        } else if (ev.type === 'acidDissolve' || ev.type === 'suction') {
          protectPriority(900);
          if (!playTriggerSfx('acidDissolve', 'sfx-acid-dissolve.vgm')) {
            post({
              type: 'batch',
              ops: [
                [1, 0x02, 18],
                [1, 0x03, 0x89],
              ],
            });
            window.clearTimeout(shatterTimeout);
            shatterTimeout = window.setTimeout(() => {
              post({ type: 'pokey', reg: 0x03, val: 0x00 });
            }, 650);
          }
        } else if (ev.type === 'catapult') {
          protectPriority(850);
          if (!playTriggerSfx('pipeEnter', 'sfx-pipe.vgm')) {
            triggerNote(cfg.respawn.channel, 74, 180);
          }
        } else if (ev.type === 'miniSquash') {
          const trigger =
            ev.kind === 'black'
              ? 'miniSquashBlack'
              : ev.kind === 'worm'
                ? 'miniSquashWorm'
                : 'miniSquashAcid';
          const fallbackFile =
            ev.kind === 'black'
              ? 'sfx-mini-squash-black.vgm'
              : ev.kind === 'worm'
                ? 'sfx-mini-squash-worm.vgm'
                : 'sfx-mini-squash-acid.vgm';
          protectPriority(650);
          if (!playTriggerSfx(trigger, fallbackFile)) {
            triggerNote(cfg.respawn.channel, 76, 120);
          }
        } else if (ev.type === 'birdDeath') {
          protectPriority(900);
          // Special Level 5 bird death plays shatter crash WITHOUT the broom sweep!
          if (!playTriggerSfx('shatter', 'sfx-shatter.vgm')) {
            triggerNote(
              cfg.shatter.fmChannel,
              cfg.shatter.fmMidi,
              cfg.shatter.fmDurationMs,
            );
          }
        } else if (ev.type === 'shatter') {
          protectPriority(900);
          if (playTriggerSfx('shatter', 'sfx-shatter.vgm')) {
            const broomFile =
              sfxBank.romSfx?.broomSweep?.file ?? 'sfx-broom.vgm';
            if (romSfx[broomFile]) {
              window.clearTimeout(shatterTimeout);
              // Let the full 693 ms ROM shatter crash (0x38) play uncut before
              // switching the SFX VGM slot to the POKEY broom sweep (0x5f).
              shatterTimeout = window.setTimeout(() => {
                playTriggerSfx('broomSweep', 'sfx-broom.vgm');
              }, 680);
            }
          } else {
            post({
              type: 'batch',
              ops: [
                [1, 0x02, cfg.shatter.pokeyAudf],
                [1, 0x03, cfg.shatter.pokeyAudc],
              ],
            });
            triggerNote(
              cfg.shatter.fmChannel,
              cfg.shatter.fmMidi,
              cfg.shatter.fmDurationMs,
            );
            window.clearTimeout(shatterTimeout);
            shatterTimeout = window.setTimeout(() => {
              post({ type: 'pokey', reg: 0x03, val: 0x00 });
            }, cfg.shatter.pokeyDurationMs);
            const broom = cfg.broomSweep ?? DEFAULT_SFX_BANK.events.broomSweep!;
            broom.strokes.forEach((audf, idx) => {
              const startMs = broom.delayMs + idx * broom.stepMs;
              window.setTimeout(() => {
                post({
                  type: 'batch',
                  ops: [
                    [1, 0x02, audf],
                    [1, 0x03, broom.pokeyAudc],
                  ],
                });
              }, startMs);
              window.setTimeout(() => {
                post({ type: 'pokey', reg: 0x03, val: 0x00 });
              }, startMs + broom.strokeMs);
            });
          }
        } else if (ev.type === 'dizzy') {
          const playDizzy = () => {
            protectPriority(1250);
            if (!playTriggerSfx('dizzy', 'sfx-dizzy.vgm')) {
              const dz = cfg.dizzy ?? DEFAULT_SFX_BANK.events.dizzy!;
              dz.notes.forEach((n, idx) => {
                window.setTimeout(
                  () => triggerNote(dz.channel, n, dz.durationMs),
                  idx * dz.stepMs,
                );
              });
            }
          };
          // On a <3-cell drop landing, let the landing thud (0x5d) play first before dizzy (0x39).
          if (hasImpactInBatch) {
            window.setTimeout(playDizzy, 180);
          } else {
            playDizzy();
          }
        } else if (ev.type === 'fall') {
          if (!playTriggerSfx('fall', 'sfx-fall.vgm')) {
            if (!playTriggerSfx('voidFall', 'sfx-void-fall.vgm')) {
              cfg.fall.notes.forEach((n, idx) => {
                window.setTimeout(
                  () => triggerNote(cfg.fall.channel, n, cfg.fall.durationMs),
                  idx * cfg.fall.stepMs,
                );
              });
            }
          }
        } else if (ev.type === 'respawn') {
          if (!playTriggerSfx('respawn', 'sfx-respawn.vgm')) {
            cfg.respawn.notes.forEach((n, idx) => {
              window.setTimeout(
                () =>
                  triggerNote(cfg.respawn.channel, n, cfg.respawn.durationMs),
                idx * cfg.respawn.stepMs,
              );
            });
          }
        } else if (ev.type === 'catchUp') {
          // Crisp descending warning chirp for "-5 SEC" 2P catch-up penalty.
          [72, 66, 60].forEach((n, idx) => {
            window.setTimeout(() => triggerNote(5, n, 95), idx * 80);
          });
        } else if (ev.type === 'magicWand') {
          // Dedicated WebAudio shimmering harp/bell arpeggio for the arcade Magic Wand (+10 SEC),
          // played directly on AudioContext so low-time countdown ticks never interrupt it.
          if (ctx && !muted) {
            const audioCtx = ctx;
            const now = audioCtx.currentTime;
            const notes = [84, 88, 91, 95, 96, 100, 103, 96, 100, 103, 108];
            notes.forEach((midi, idx) => {
              const start = now + idx * 0.095;
              const freq = 440 * Math.pow(2, (midi - 69) / 12);
              const osc = audioCtx.createOscillator();
              const harm = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'triangle';
              harm.type = 'sine';
              osc.frequency.setValueAtTime(freq, start);
              harm.frequency.setValueAtTime(freq * 2, start);
              gain.gain.setValueAtTime(0.0001, start);
              gain.gain.linearRampToValueAtTime(0.22, start + 0.014);
              gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
              osc.connect(gain);
              harm.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(start);
              harm.start(start);
              osc.stop(start + 0.45);
              harm.stop(start + 0.45);
            });
          }
        } else if (ev.type === 'countdownTick') {
          if (!playTriggerSfx('countdownTick', 'sfx-countdown.vgm')) {
            triggerNote(
              cfg.countdownTick.channel,
              cfg.countdownTick.midi,
              cfg.countdownTick.durationMs,
            );
          }
        } else if (ev.type === 'goal') {
          const fanfare =
            currentCourse === 6 && congratulationsVgm
              ? congratulationsVgm
              : ev.player === 2 && goalFanfareP2Vgm
                ? goalFanfareP2Vgm
                : goalFanfareVgm;
          if (fanfare) {
            playTrack(fanfare);
          }
        } else if (ev.type === 'gameOver') {
          if (gameOverVgm) {
            playTrack(gameOverVgm);
          }
        }
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(shatterTimeout);
      amigaTracker.dispose();
      node?.disconnect();
      void ctx?.close();
    },
  };
}
