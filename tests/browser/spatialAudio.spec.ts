import { expect, test } from './fixtures';

test('le bus audio réel est routé une seule fois, atténué et panoramiqué, puis restauré sans double son', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/audio/spatialOutput.ts';
    const { createSpatialOutput } = await import(/* @vite-ignore */ path);
    async function render(mode: 'spatial' | 'bypass' | 'dispose') {
      const ctx = new OfflineAudioContext(2, 16384, 48000),
        master = ctx.createGain();
      master.connect(ctx.destination);
      const output = createSpatialOutput(ctx, master),
        buffer = ctx.createBuffer(1, 16384, 48000);
      buffer.getChannelData(0).fill(0.5);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      output.update({ x: -3, y: 1.3, z: -0.2, yaw: 0 });
      output.update({ x: -3, y: 1.3, z: -0.2, yaw: 0 });
      if (mode === 'bypass') {
        output.update(null);
        output.update(null);
      }
      if (mode === 'dispose') {
        output.dispose();
        output.dispose();
      }
      source.start();
      const rendered = await ctx.startRendering();
      const average = (channel: number) => {
        const data = rendered.getChannelData(channel);
        let sum = 0;
        for (let i = data.length - 1024; i < data.length; i++) sum += data[i]!;
        return sum / 1024;
      };
      output.dispose();
      return [average(0), average(1)];
    }
    return {
      spatial: await render('spatial'),
      bypass: await render('bypass'),
      disposed: await render('dispose'),
    };
  });
  expect(result.spatial[0]).toBeCloseTo(0, 2);
  expect(result.spatial[1]).toBeCloseTo(0.3125, 2);
  for (const channels of [result.bypass, result.disposed])
    for (const sample of channels) expect(sample).toBeCloseTo(0.5, 5);
});
