import { expect, test } from '@playwright/test';

test('opm-pokey worklet renders a ROM-derived SFX stream (wall bump 0x34) through ymfm', async ({
  page,
}) => {
  await page.goto('/remaster.html');
  const peak = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(2, 48000, 48000);
    await ctx.audioWorklet.addModule('/assets/audio/opm-pokey-worklet.js');
    const wasm = await (
      await fetch('/assets/audio/opm-pokey.wasm')
    ).arrayBuffer();
    const bank = await (await fetch('/assets/audio/rom-sfx.json')).json();
    const node = new AudioWorkletNode(ctx, 'opm-pokey-worklet', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    node.connect(ctx.destination);
    await new Promise<void>((resolve) => {
      node.port.onmessage = (e) => {
        if (e.data?.type === 'ready') resolve();
      };
      node.port.postMessage({ type: 'init', wasmBytes: wasm }, [wasm]);
    });
    const w = bank.commands['34'].writes
      .filter(
        ([, chip, reg]: number[]) =>
          chip === 0 && (reg === 8 || (reg ?? 0) >= 0x20),
      )
      .flat();
    node.port.postMessage({
      type: 'sfxStreams',
      tickSeconds: bank.tickSeconds,
      streams: [{ slot: 6, writes: Uint16Array.from(w) }],
    });
    const buf = await ctx.startRendering();
    let p = 0;
    for (const v of buf.getChannelData(0)) p = Math.max(p, Math.abs(v));
    return p;
  });
  expect(peak).toBeGreaterThan(0.05);
});
