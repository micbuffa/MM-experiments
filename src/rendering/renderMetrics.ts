// Classic extension registers GPU timestamp capture on the installed Engine.
import '@babylonjs/core/Engines/AbstractEngine/abstractEngine.timeQuery';
import '@babylonjs/core/Engines/Extensions/engine.query';
import { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';

export function createRenderMetrics(engine: Engine, scene: Scene) {
  const gpu = new EngineInstrumentation(engine);
  const instrumentation = new SceneInstrumentation(scene);
  const supported = Boolean(engine.getCaps().timerQuery);
  gpu.captureGPUFrameTime = supported;
  let frames = 0,
    total = 0,
    max = 0;
  function snapshot() {
    const counter = gpu.gpuFrameTimeCounter;
    const sampled = supported && counter.count > 0;
    return {
      frames,
      cpuMeanMs: frames ? total / frames : 0,
      cpuMaxMs: max,
      drawCalls: instrumentation.drawCallsCounter.current,
      gpuStatus: !supported ? 'unsupported' : sampled ? 'available' : 'pending',
      gpuMeanMs: sampled ? counter.average / 1e6 : null,
      gpuSamples: sampled ? counter.count : 0,
      width: engine.getRenderWidth(),
      height: engine.getRenderHeight(),
      hardwareScaling: engine.getHardwareScalingLevel(),
      meshes: scene.meshes.length,
      materials: scene.materials.length,
      textures: scene.textures.length,
    };
  }
  let saved: ReturnType<typeof snapshot> | undefined;
  return {
    render() {
      if (saved) return;
      const begin = performance.now();
      engine.beginFrame();
      try {
        scene.render();
      } finally {
        engine.endFrame();
      }
      const elapsed = performance.now() - begin;
      frames++;
      total += elapsed;
      max = Math.max(max, elapsed);
    },
    get diagnostics() {
      return saved
        ? {
            ...saved,
            disposed: true,
            meshes: scene.meshes.length,
            materials: scene.materials.length,
            textures: scene.textures.length,
          }
        : snapshot();
    },
    dispose() {
      if (saved) return;
      saved = snapshot();
      gpu.dispose();
      instrumentation.dispose();
    },
  };
}
