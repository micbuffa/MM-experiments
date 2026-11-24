import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { createMarbleMaterial } from './createMarbleMaterial';
import { marbleRadius } from './createPracticeMarble';

interface DissolveSparkSpec {
  readonly angle: number;
  readonly delay: number;
  readonly life: number;
  readonly spread: number;
  readonly rise: number;
  readonly size: number;
  readonly palette: 0 | 1 | 2;
}

const SPARK_COUNT = 16;

// Deterministic upward fizz and droplet arcs matching the 7-frame Atari System 1
// acid-dissolve sprite progression (ROM 0x21062: 16x16 core -> 24x24 rising fizz -> vanish).
const SPARK_SPECS: readonly DissolveSparkSpec[] = Array.from(
  { length: SPARK_COUNT },
  (_, i) => ({
    angle: (i * 2.399963229728653) % (Math.PI * 2),
    delay: (i % 6) * 0.075,
    life: 0.44 + (i % 4) * 0.045,
    spread: 0.24 + ((i * 5) % 7) * 0.085,
    rise: 0.65 + ((i * 3) % 5) * 0.22,
    size: 0.55 + (i % 3) * 0.28,
    palette: (i % 3) as 0 | 1 | 2,
  }),
);

/**
 * Procedural acid-dissolve animation driven by the 68010 core's `animation === 9`
 * state (`pose.melt` in 0..1): the marble shrinks and sizzles away while rising
 * effervescent droplets and sparks pop above it, with zero per-frame allocations.
 */
export function createAcidDissolve(scene: Scene, name: string, red: boolean) {
  const core = CreateSphere(
    `${name}-acid-core`,
    { diameter: marbleRadius * 2, segments: 16 },
    scene,
  );
  core.material = createMarbleMaterial(scene, red);
  core.setEnabled(false);

  const dropletPaint = new StandardMaterial(`${name}-acid-droplet`, scene);
  if (red) {
    dropletPaint.diffuseColor.set(0.92, 0.22, 0.18);
    dropletPaint.emissiveColor.set(0.42, 0.08, 0.06);
  } else {
    dropletPaint.diffuseColor.set(0.2, 0.45, 0.98);
    dropletPaint.emissiveColor.set(0.1, 0.24, 0.55);
  }
  dropletPaint.specularColor.set(0.1, 0.1, 0.1);

  const fizzPaint = new StandardMaterial(`${name}-acid-fizz`, scene);
  fizzPaint.diffuseColor.set(0.72, 0.98, 0.35);
  fizzPaint.emissiveColor.set(0.38, 0.68, 0.12);
  fizzPaint.specularColor.set(0, 0, 0);

  const mistPaint = new StandardMaterial(`${name}-acid-mist`, scene);
  mistPaint.diffuseColor.set(0.88, 0.96, 1);
  mistPaint.emissiveColor.set(0.55, 0.72, 0.82);
  mistPaint.specularColor.set(0, 0, 0);

  const paints = [dropletPaint, fizzPaint, mistPaint] as const;

  const sparks = SPARK_SPECS.map((spec, i) => {
    const spark = CreateSphere(
      `${name}-acid-spark-${i}`,
      { diameter: 0.24, segments: 6 },
      scene,
    );
    spark.material = paints[spec.palette];
    spark.setEnabled(false);
    return spark;
  });

  return (
    position: { x: number; y: number; z: number } | null,
    progress = 0,
  ) => {
    if (!position) {
      core.setEnabled(false);
      for (const spark of sparks) spark.setEnabled(false);
      return;
    }

    const p = Math.max(0, Math.min(1, progress));
    const coreScale = Math.max(0, 1 - p / 0.78);
    if (coreScale > 0.02) {
      core.setEnabled(true);
      const sizzle = 0.032 * coreScale;
      const t = p * 42;
      core.scaling.set(
        coreScale * (1 + 0.06 * Math.sin(t)),
        coreScale * (1 - 0.08 * p),
        coreScale * (1 + 0.06 * Math.cos(t * 1.1)),
      );
      core.position.set(
        position.x + Math.sin(t * 1.7) * sizzle,
        position.y + marbleRadius * coreScale - 0.14 * p,
        position.z + Math.cos(t * 1.3) * sizzle,
      );
    } else {
      core.setEnabled(false);
    }

    for (let i = 0; i < SPARK_COUNT; i++) {
      const spec = SPARK_SPECS[i]!;
      const spark = sparks[i]!;
      const u = (p - spec.delay) / spec.life;
      if (u <= 0 || u >= 1) {
        spark.setEnabled(false);
        continue;
      }
      spark.setEnabled(true);
      const easeOut = 1 - (1 - u) * (1 - u);
      const radius = spec.spread * (0.25 + 0.75 * easeOut);
      const height = marbleRadius * 0.65 + spec.rise * easeOut;
      const scale = spec.size * Math.sin(u * Math.PI);
      spark.scaling.set(scale, scale, scale);
      spark.position.set(
        position.x + Math.cos(spec.angle + u * 0.4) * radius,
        position.y + height,
        position.z + Math.sin(spec.angle + u * 0.4) * radius,
      );
    }
  };
}
