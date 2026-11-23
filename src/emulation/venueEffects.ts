import type { SpatialPose } from '../game/spatialMix';
export interface VenueEffects {
  setInputCamera?(forwardX: number, forwardZ: number): void;
  subscribeMotion(
    listener: (x: number, y: number, player: 0 | 1) => void,
  ): () => void;
  setSpatialListener(pose: SpatialPose | null): void;
}
