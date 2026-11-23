import { spatialMix } from '../game/spatialMix';
import type { SpatialPose } from '../game/spatialMix';

/** Route the existing OpenAL master bus, never create another source/context. */
export function createSpatialOutput(
  context: BaseAudioContext,
  master: GainNode,
) {
  const attenuation = context.createGain();
  const panner = context.createStereoPanner();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  const samples = new Float32Array(256);
  attenuation.connect(panner);
  panner.connect(context.destination);
  panner.connect(analyser);
  let routed = false,
    disposed = false;
  let mix = { distance: 0, gain: 1, pan: 0 };
  function bypass() {
    if (!routed) return;
    try {
      master.disconnect(attenuation);
    } catch {
      /* Core may already have released its context. */
    }
    if (context.state !== 'closed') master.connect(context.destination);
    routed = false;
  }
  return {
    update(pose: SpatialPose | null) {
      if (disposed) return;
      if (!pose) {
        bypass();
        return;
      }
      mix = spatialMix(pose);
      if (!routed) {
        master.disconnect(context.destination);
        master.connect(attenuation);
        routed = true;
      }
      attenuation.gain.setTargetAtTime(mix.gain, context.currentTime, 0.03);
      panner.pan.setTargetAtTime(mix.pan, context.currentTime, 0.03);
    },
    get diagnostics() {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, v) => sum + v * v, 0) / samples.length,
      );
      return {
        routed,
        ...mix,
        outputRms: Number(rms.toFixed(5)),
        kind: 'distance-and-stereo-pan',
      };
    },
    dispose() {
      if (disposed) return;
      bypass();
      disposed = true;
      attenuation.disconnect();
      panner.disconnect();
      analyser.disconnect();
    },
  };
}
