import type { PracticePose } from './practicePose';

/** Émission seulement après un dessin dans le canvas source, avant restitution au navigateur. */
export interface VideoSource {
  readonly canvas: HTMLCanvasElement;
  readonly geometry: { width: number; height: number; aspect: number };
  modernPhase?(): 'loading' | 'level' | 'arcade';
  practicePose?(): PracticePose | null;
  subscribe(listener: () => void): () => void;
}
