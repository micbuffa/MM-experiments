import { safariVersion } from '../browser/safariVersion';

/** Safari gets a larger RetroArch audio buffer to tolerate irregular delivery. */
export function safariAudioLatency(userAgent: string): number | undefined {
  return safariVersion(userAgent) ? 128 : undefined;
}

export function setAudioLatency(config: string, milliseconds: number): string {
  return config.replace(
    /^audio_latency = .*$/gm,
    `audio_latency = ${milliseconds}`,
  );
}
