import { expect, it } from 'vitest';
import { safariAudioLatency, setAudioLatency } from './retroArchAudio';

it('uses a wider audio buffer for Safari and leaves Chromium and Firefox defaults intact', () => {
  expect(
    safariAudioLatency('AppleWebKit/605.1 Version/17.4 Safari/605.1'),
  ).toBe(128);
  expect(
    safariAudioLatency('AppleWebKit/537.36 Chrome/157.0 Safari/537.36'),
  ).toBeUndefined();
  expect(safariAudioLatency('Gecko/20100101 Firefox/144.0')).toBeUndefined();
});

it('updates default and overriding latency entries without touching other settings', () => {
  expect(
    setAudioLatency(
      'audio_latency = 64\nvideo_vsync = true\naudio_latency = 32\n',
      128,
    ),
  ).toBe('audio_latency = 128\nvideo_vsync = true\naudio_latency = 128\n');
});
