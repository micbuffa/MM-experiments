import type { RemasterEvent } from '../engine/remasterSimulation';
import { parseRomSfxBank, type RomSfxBankV1 } from './romSfxBank';
import { createRomSfxBackend, type RomSfxBackend } from './romSfxBackend';
import { DEFAULT_SFX_BANK, parseSfxBank, type SfxBankV1 } from './sfxBank';
import { createSoundCueDispatcher, type SoundCueBackend } from './soundCues';
import { createSynthCueBackend, type SynthCueBackend } from './synthCueBackend';
import { parseVgm, type ParsedVgm } from './vgmParser';

/** Which layer-(b) backend renders gameplay cues. */
export type SfxBackendKind = 'rom' | 'synth';

export interface RemasterAudioController {
  unlock(): Promise<void>;
  setMuted(muted: boolean): void;
  setMix(music: number, sfx: number): void;
  setMusicEnabled(enabled: boolean): void;
  /** Switches the cue backend: ROM-faithful streams or the remaster FM synth. */
  setSfxBackend(kind: SfxBackendKind): void;
  readonly sfxBackend: SfxBackendKind;
  playLevelTheme(): void;
  loadVgm(bytes: Uint8Array): ParsedVgm;
  clearVgm(): void;
  updateRolling(speed: number, grounded: boolean): void;
  handleEvents(events: readonly RemasterEvent[]): void;
  dispose(): void;
}

/**
 * WebAudio controller for the YM2151 (ymfm) + POKEY WASM worklet.
 *
 * Gameplay audio is split in two layers:
 *  (a) `soundCues.ts` maps `RemasterEvent`s to backend-agnostic cues with
 *      priority / cooldown / intensity (no chip knowledge);
 *  (b) a `SoundCueBackend` renders cues. `rom` replays the register streams of
 *      the original 6502 sound program (`rom-sfx.json`); `synth` is the earlier
 *      hand-designed FM bank (`sfx-bank.json`). A future WebAssembly-music
 *      backend plugs in here without touching (a) or game code.
 * Music (level theme VGM) and the rolling rumble (remaster-only, no arcade
 * equivalent) are continuous layers handled directly by this controller.
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
  let levelThemeVgm: ParsedVgm | null = null;
  let goalFanfareVgm: ParsedVgm | null = null;
  let goalFanfareP2Vgm: ParsedVgm | null = null;
  let gameOverVgm: ParsedVgm | null = null;
  let sfxBank: SfxBankV1 = DEFAULT_SFX_BANK;
  let romBank: RomSfxBankV1 | null = null;
  let romBackend: RomSfxBackend | null = null;
  let synthBackend: SynthCueBackend | null = null;
  let backendKind: SfxBackendKind = 'rom';
  let disposed = false;
  let lastRollReg = -1;
  const timers = new Set<number>();

  function post(msg: unknown) {
    if (ready && node && !disposed) node.port.postMessage(msg);
  }

  function audioNow(): number {
    return ctx?.currentTime ?? 0;
  }

  function activeBackend(): SoundCueBackend | null {
    if (backendKind === 'rom' && romBackend) return romBackend;
    return synthBackend;
  }

  // Indirection so switching backends never re-creates the dispatcher state.
  const dispatcher = createSoundCueDispatcher({
    playCue: (trigger, rule) => activeBackend()?.playCue(trigger, rule),
    stopCue: (cue, player) => activeBackend()?.stopCue(cue, player),
    stopAll: () => activeBackend()?.stopAll(),
  });

  function createBackends() {
    synthBackend = createSynthCueBackend(sfxBank, {
      write: (ops) => post({ type: 'batch', ops }),
      schedule: (fn, ms) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          fn();
        }, ms);
        timers.add(id);
        return () => {
          window.clearTimeout(id);
          timers.delete(id);
        };
      },
    });
    romBackend = romBank
      ? createRomSfxBackend(
          romBank,
          {
            playStreams: (streams, tickSeconds) =>
              post({
                type: 'sfxStreams',
                tickSeconds,
                streams: streams.map((s) => ({
                  slot: s.slot,
                  writes: s.writes,
                })),
              }),
            stopSlots: (slots) => post({ type: 'sfxStop', slots }),
          },
          audioNow,
        )
      : null;
    if (backendKind === 'synth' || !romBackend) synthBackend.activate();
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

  async function fetchText(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      return res.ok ? await res.text() : null;
    } catch {
      return null;
    }
  }

  async function preloadAudioAssets(prefix: string) {
    const localVgms = await listLocalVgms();
    const resolveTrackUrls = (stem: string) => {
      const urls: string[] = [];
      if (localVgms.has(`${stem}.vgz`)) urls.push(`/__local-roms/${stem}.vgz`);
      if (localVgms.has(`${stem}.vgm`)) urls.push(`/__local-roms/${stem}.vgm`);
      if (!import.meta.env.DEV) urls.push(`${prefix}assets/audio/${stem}.vgz`);
      urls.push(`${prefix}assets/audio/${stem}.vgm`);
      return urls;
    };

    const [
      bankText,
      romText,
      levelTrack,
      goalTrack,
      goalP2Track,
      gameOverTrack,
    ] = await Promise.all([
      fetchText(`${prefix}assets/audio/sfx-bank.json`),
      fetchText(`${prefix}assets/audio/rom-sfx.json`),
      fetchFirstVgm(resolveTrackUrls('level1-practice')),
      fetchFirstVgm(resolveTrackUrls('goal-fanfare')),
      localVgms.has('goal-fanfare-p2.vgz')
        ? fetchFirstVgm(['/__local-roms/goal-fanfare-p2.vgz'])
        : !import.meta.env.DEV
          ? fetchFirstVgm([`${prefix}assets/audio/goal-fanfare-p2.vgz`])
          : Promise.resolve(null),
      localVgms.has('game-over.vgz')
        ? fetchFirstVgm(['/__local-roms/game-over.vgz'])
        : !import.meta.env.DEV
          ? fetchFirstVgm([`${prefix}assets/audio/game-over.vgz`])
          : Promise.resolve(null),
    ]);
    if (bankText) {
      try {
        sfxBank = parseSfxBank(bankText);
      } catch {
        sfxBank = DEFAULT_SFX_BANK;
      }
    }
    if (romText) {
      try {
        romBank = parseRomSfxBank(romText);
      } catch (err) {
        console.warn('rom-sfx.json rejected, using synth SFX:', err);
        romBank = null;
      }
    }
    levelThemeVgm = levelTrack;
    goalFanfareVgm = goalTrack;
    goalFanfareP2Vgm = goalP2Track;
    gameOverVgm = gameOverTrack;
  }

  /** Music-side reactions; jingles come from the ROM backend when it is active. */
  function handleMusicEvent(ev: RemasterEvent) {
    const romJingles = backendKind === 'rom' && romBackend !== null;
    if (ev.type === 'goal') {
      const fanfare =
        ev.player === 2 && goalFanfareP2Vgm ? goalFanfareP2Vgm : goalFanfareVgm;
      // Arcade: level music stops and the "Goal In" jingle (0x2F/0x30) plays.
      playTrack(romJingles ? null : fanfare);
    } else if (ev.type === 'gameOver') {
      playTrack(romJingles ? null : gameOverVgm);
    }
  }

  return {
    async unlock() {
      if (disposed) return;
      if (ctx) {
        if (ctx.state === 'suspended') await ctx.resume();
        return;
      }
      ctx = new AudioContext();
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
        if (!node) return reject(new Error('AudioWorkletNode unavailable'));
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
      createBackends();
      post({ type: 'mute', muted });
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
      playTrack(customVgm ?? levelThemeVgm);
    },

    setMuted(value: boolean) {
      muted = value;
      post({ type: 'mute', muted });
    },

    setMix(music: number, sfx: number) {
      musicGain = Math.max(0, Math.min(2, music));
      sfxGain = Math.max(0, Math.min(2, sfx));
      post({ type: 'mix', music: musicGain, sfx: sfxGain });
    },

    setMusicEnabled(enabled: boolean) {
      musicEnabled = enabled;
      playTrack(enabled ? (customVgm ?? levelThemeVgm) : null);
    },

    setSfxBackend(kind: SfxBackendKind) {
      if (kind === backendKind) return;
      activeBackend()?.stopAll();
      backendKind = kind;
      dispatcher.reset();
      if (kind === 'synth' || !romBackend) synthBackend?.activate();
    },

    get sfxBackend() {
      return backendKind;
    },

    playLevelTheme() {
      playTrack(customVgm ?? levelThemeVgm);
    },

    loadVgm(bytes: Uint8Array): ParsedVgm {
      const parsed = parseVgm(bytes);
      customVgm = parsed;
      playTrack(parsed);
      return parsed;
    },

    clearVgm() {
      customVgm = null;
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
      // Chip 2 = dedicated low-passed rolling POKEY (no arcade equivalent).
      post({
        type: 'batch',
        ops: [
          [2, 0x00, audf],
          [2, 0x01, vol > 0 ? 0x80 | vol : 0x00],
        ],
      });
    },

    handleEvents(events: readonly RemasterEvent[]) {
      if (!ready || muted) return;
      for (const ev of events) handleMusicEvent(ev);
      dispatcher.handleEvents(events, audioNow());
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      node?.disconnect();
      void ctx?.close();
    },
  };
}
