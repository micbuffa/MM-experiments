import { useOpenGLOrientationForUV } from '@babylonjs/core/Compat/compatibilityOptions';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

export interface CrtSettings {
  enabled: boolean;
  curvature: number;
  scanlines: number;
  interference: number;
}

export function createVideoMesh(scene: Scene) {
  const segments = 24;
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= segments; row++) {
    for (let column = 0; column <= segments; column++) {
      const u = column / segments;
      const v = row / segments;
      positions.push(2 * u - 1, 2 * v - 1, 0);
      normals.push(0, 0, -1);
      uvs.push(u, useOpenGLOrientationForUV ? 1 - v : v);
      if (column < segments && row < segments) {
        const bottom = row * (segments + 1) + column;
        const top = bottom + segments + 1;
        indices.push(bottom, bottom + 1, top + 1, bottom, top + 1, top);
      }
    }
  }
  const data = new VertexData();
  Object.assign(data, { positions, normals, uvs, indices });
  const mesh = new Mesh('arcade-video', scene);
  data.applyToMesh(mesh);
  return mesh;
}

const vertexSource = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
uniform float curvature;
varying vec2 videoUV;

void main() {
  videoUV = uv;
  vec3 tube = position;
  // Local depth is in metres. The middle of each edge follows the domed glass.
  float dome = max(0.0, 1.0 - 0.5 * dot(position.xy, position.xy));
  tube.z -= 0.058 * curvature * dome;
  gl_Position = worldViewProjection * vec4(tube, 1.0);
}
`;

const fragmentSource = /* glsl */ `
#ifdef CRT_DERIVATIVES
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
varying vec2 videoUV;
uniform sampler2D videoSampler;
uniform float curvature;
uniform float videoFitX;
uniform float videoFitY;
uniform float scanlines;
uniform float interference;
uniform float videoRows;
uniform float frameSeconds;

void main() {
  vec2 p = videoUV * 2.0 - 1.0;
  vec2 squared = p * p;
  // Bow horizontal and vertical lines, including lines near the centre.
  vec2 raster = p * (1.0 + curvature * (0.045 * squared + 0.24 * squared.yx));
  // Leave a little room around the raster so the curved edge retains the HUD.
  vec2 fitted = (raster / (1.0 + 0.075 * curvature)) * vec2(videoFitX, videoFitY);
  float radius = 0.32 * curvature;
  vec2 corner = abs(raster) - (1.0 - radius);
  float edge = length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - radius;
  vec2 sampleUV = fitted * 0.5 + 0.5;
  float row = sampleUV.y * videoRows;
#ifdef CRT_DERIVATIVES
  float sampling = 1.0 - smoothstep(0.34, 0.78, fwidth(row));
#else
  float sampling = 0.0;
#endif
  float beam = 0.5 + 0.5 * cos(6.2831853 * row);

  // A brief local horizontal wobble, followed by a quiet interval.
  float sweep = fract(frameSeconds * 0.23);
  float band = 1.0 - smoothstep(0.0, 0.055, abs(sampleUV.y - sweep * 4.0));
  float wobble = interference * band;
  sampleUV.x += 0.008 * wobble * sin(2.1 * row + 33.0 * frameSeconds);
  vec3 color = texture2D(videoSampler, clamp(sampleUV, 0.0, 1.0)).rgb;
  color *= step(max(abs(fitted.x), abs(fitted.y)), 1.0);
  color *= (1.0 - 0.42 * scanlines * sampling * beam) * (1.0 - 0.055 * wobble);
  color *= 1.0 - 0.17 * curvature * dot(p, p) * 0.5;
  float glass = 1.0 - smoothstep(-0.010, 0.002, edge);
  // A small rim and a broad reflection reveal the glass over black video.
  float rim = exp(-abs(edge + 0.017) * 55.0);
  float reflection = exp(-13.0 * dot(p - vec2(-0.60, 0.54), p - vec2(-0.60, 0.54)));
  color += curvature * (vec3(0.055, 0.068, 0.085) * rim + vec3(0.022) * reflection);
  gl_FragColor = vec4(curvature > 0.0 ? color * glass : color, 1.0);
}
`;

export function createCrtMaterial(scene: Scene) {
  return new ShaderMaterial(
    'arcade-crt',
    scene,
    { vertexSource, fragmentSource },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'worldViewProjection',
        'curvature',
        'videoFitX',
        'videoFitY',
        'scanlines',
        'interference',
        'videoRows',
        'frameSeconds',
      ],
      samplers: ['videoSampler'],
      defines: scene.getEngine().getCaps().standardDerivatives
        ? ['CRT_DERIVATIVES']
        : [],
    },
  );
}
