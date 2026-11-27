import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
// Register thin-instance helpers on Mesh for 48-sphere single-draw-call vectorballs.
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import {
  AMIGA_BOTTOM_SCROLL_METRICS,
  AMIGA_BOTTOM_SCROLL_TEXT,
  AMIGA_TOP_SCROLL_METRICS,
  AMIGA_TOP_SCROLL_TEXT,
} from '../engine/amigaScrollTexts';
import {
  REMASTER_TITLE,
  computeVectorballPosition,
} from '../engine/remasterAttract';
import { drawArcadeText } from './arcadeBitmapFont';
import type { Attract3DAction } from './createAttract3DScene';

export interface AmigaDemo3DSceneController {
  readonly scene: Scene;
  setScanlines(enabled: boolean): void;
  resetScroll(): void;
  update(dtSeconds: number): void;
  setHover(pointerX: number, pointerY: number): void;
  pickAction(pointerX: number, pointerY: number): Attract3DAction;
  dispose(): void;
}

const COPPER_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// Authentic Amiga OCS/ECS Copper Bars + Boing Checkerboard Floor + CRT Glitches + Optional Scanlines
const COPPER_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScanlines;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  void main() {
    vec2 uv = vUv;

    // Periodic old-school raster slice glitch burst (~every 3.5s)
    float glitchGate = step(0.86, fract(uTime * 0.28 + sin(uTime * 1.7) * 0.08));
    float sliceId = floor(uv.y * 36.0 + floor(uTime * 18.0));
    float sliceShift = (hash11(sliceId) - 0.5) * 0.055 * glitchGate;
    uv.x += sliceShift;

    // Sinusoidal background warp
    float sineWarp = sin(uv.y * 16.0 - uTime * 3.8) * 0.015;
    float y = uv.y + sineWarp;

    // Deep Amiga indigo-cobalt sky
    vec3 col = mix(vec3(0.02, 0.01, 0.08), vec3(0.06, 0.02, 0.20), y);

    // 7 animated horizontal Amiga Copper raster bars
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float barY = 0.56 + 0.24 * sin(uTime * 1.75 + fi * 0.62)
                        + 0.07 * cos(uTime * 3.1 + fi * 1.1);
      float d = abs(y - barY);
      float bar = smoothstep(0.036, 0.0, d);
      float highlight = smoothstep(0.010, 0.0, d);
      vec3 hue = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + fi * 0.85 + uTime * 0.6);
      col = mix(col, hue * 0.92 + vec3(0.55) * highlight, bar * 0.92);
    }

    // Classic Amiga sinusoidal perspective checkerboard floor (lower 38%)
    if (uv.y < 0.38) {
      float depth = max(0.04, 0.38 - uv.y);
      float z = 0.72 / depth;
      float x = (uv.x - 0.5) * z * 1.85 + sin(z * 0.7 - uTime * 2.6) * 0.45;
      float cx = floor(x);
      float cz = floor(z - uTime * 3.6);
      float checker = mod(cx + cz, 2.0);
      vec3 cA = vec3(0.92, 0.14, 0.22); // Boing Ball red
      vec3 cB = vec3(0.95, 0.95, 0.98); // Boing Ball white
      vec3 floorCol = mix(cA, cB, checker);
      float fog = smoothstep(0.38, 0.02, uv.y);
      col = mix(vec3(0.14, 0.04, 0.26), floorCol, fog * 0.88);
    }

    // Glitch RGB chroma flash
    if (glitchGate > 0.5) {
      col.r += 0.12 * hash11(sliceId + 7.0);
      col.b += 0.10 * hash11(sliceId + 19.0);
    }

    // Optional CRT scanlines (ON by default, toggled with S)
    if (uScanlines > 0.5) {
      float scan = 0.78 + 0.22 * sin(vUv.y * 420.0);
      col *= scan;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Sinusoidal Deformed 3D Vertex-Waved Scroller & Waving Amiga Logo Shader
const SINE_SCROLL_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveFreq;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y += sin(p.x * uWaveFreq + uTime * 4.4) * uWaveAmp;
    p.z += cos(p.x * (uWaveFreq * 0.7) - uTime * 3.1) * (uWaveAmp * 0.55);
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }
`;

const SINE_SCROLL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uScrollSpeed;
  uniform float uScanlines;
  void main() {
    vec2 uv = vec2(fract(vUv.x + uTime * uScrollSpeed), vUv.y);
    // Subtle RGB chromatic split on glitch pulses
    float glitch = step(0.88, fract(uTime * 0.31)) * 0.008;
    float r = texture2D(uTex, uv + vec2(glitch, 0.0)).r;
    float g = texture2D(uTex, uv).g;
    float b = texture2D(uTex, uv - vec2(glitch, 0.0)).b;
    float a = texture2D(uTex, uv).a;
    if (a < 0.04) discard;

    // Classic Amiga copper-gradient tint across text height
    vec3 copper = mix(vec3(1.0, 0.92, 0.35), vec3(0.2, 0.88, 1.0), vUv.y);
    vec3 col = vec3(r, g, b) * mix(vec3(1.0), copper, 0.35);
    if (uScanlines > 0.5) {
      col *= 0.82 + 0.18 * sin(vUv.y * 120.0);
    }
    gl_FragColor = vec4(col, a);
  }
`;

const OLD_SCHOOL_POLY_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 world;
  uniform mat4 worldViewProjection;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    // Sinusoidal vertex wobble + retro glitch jitter
    vec3 p = position;
    p.x += sin(p.y * 3.5 + uTime * 5.0) * 0.11;
    p.z += cos(p.y * 3.5 - uTime * 4.2) * 0.11;
    vNormal = normalize(mat3(world) * normal);
    vPos = (world * vec4(p, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }
`;

const OLD_SCHOOL_POLY_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uScanlines;
  void main() {
    // Stepped 4-level Amiga HAM/flat-shaded lighting quantization
    vec3 L = normalize(vec3(-0.5, 0.8, -0.6));
    float ndl = max(dot(normalize(vNormal), L), 0.0);
    float stepped = floor(ndl * 4.0) / 4.0;
    vec3 base = mix(vec3(0.14, 0.18, 0.58), vec3(0.95, 0.35, 0.85), stepped);
    base += vec3(0.25, 0.88, 1.0) * pow(stepped, 2.0) * 0.55;
    if (uScanlines > 0.5) {
      base *= 0.84 + 0.16 * sin(gl_FragCoord.y * 1.4);
    }
    gl_FragColor = vec4(base, 0.82);
  }
`;

let amigaShadersRegistered = false;
function ensureAmigaShaders() {
  if (amigaShadersRegistered) return;
  Effect.ShadersStore['amigaCopperVertexShader'] = COPPER_VERT;
  Effect.ShadersStore['amigaCopperFragmentShader'] = COPPER_FRAG;
  Effect.ShadersStore['amigaSineScrollVertexShader'] = SINE_SCROLL_VERT;
  Effect.ShadersStore['amigaSineScrollFragmentShader'] = SINE_SCROLL_FRAG;
  Effect.ShadersStore['amigaPolyVertexShader'] = OLD_SCHOOL_POLY_VERT;
  Effect.ShadersStore['amigaPolyFragmentShader'] = OLD_SCHOOL_POLY_FRAG;
  amigaShadersRegistered = true;
}

interface ScrollingStrip {
  readonly text: string;
  readonly tex: DynamicTexture;
  readonly width: number;
  readonly height: number;
  readonly pixelSize: number;
  readonly letterSpacing: number;
  readonly stepPx: number;
  readonly totalWidthPx: number;
  readonly fillStyle: string;
  readonly shadowColor: string;
  readonly shadowOffset: number;
  readonly speedPxPerSec: number;
  readonly startOffsetRatio: number;
  lastOffsetPx: number;
}

function drawScrollingStrip(
  strip: ScrollingStrip,
  scrollElapsed: number,
  force = false,
): void {
  const offset =
    (((scrollElapsed * strip.speedPxPerSec) % strip.totalWidthPx) +
      strip.totalWidthPx) %
    strip.totalWidthPx;
  if (!force && Math.abs(offset - strip.lastOffsetPx) < 0.75) return;
  strip.lastOffsetPx = offset;

  const ctx = strip.tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, strip.width, strip.height);

  // Start near the right-center on t=0 so the opening words enter immediately
  let baseX = strip.width * strip.startOffsetRatio - offset;
  while (baseX + strip.totalWidthPx < 0) {
    baseX += strip.totalWidthPx;
  }
  while (baseX < strip.width) {
    const first = Math.max(0, Math.floor(-baseX / strip.stepPx) - 1);
    const last = Math.min(
      strip.text.length,
      Math.ceil((strip.width - baseX) / strip.stepPx) + 1,
    );
    if (last > first) {
      drawArcadeText(
        ctx,
        strip.text.slice(first, last),
        baseX + first * strip.stepPx,
        strip.height * 0.5,
        {
          pixelSize: strip.pixelSize,
          fillStyle: strip.fillStyle,
          align: 'left',
          shadowColor: strip.shadowColor,
          shadowOffset: strip.shadowOffset,
          letterSpacing: strip.letterSpacing,
        },
      );
    }
    baseX += strip.totalWidthPx;
  }
  strip.tex.update();
}

/**
 * 100% 3D WebGL Amiga 500 Demoscene Attract Mode:
 * - Animated Copper Bars + Boing-Ball sinusoidal checkerboard floor + periodic CRT glitches
 * - 48 thin-instanced morphing 3D Vectorballs (Cube -> Torus -> DNA Helix -> Sphere)
 * - Old-school flat-stepped + wireframe spinning sinusoidal-deformed 3D polyhedron
 * - Classic Amiga sinusoidal vertex-waved horizontal scrolltext + waving chrome logo
 * - Optional CRT scanlines (ON by default, toggled via S) & raycasted 3D Start buttons
 */
export function createAmigaDemo3DScene(
  engine: Engine,
): AmigaDemo3DSceneController {
  ensureAmigaShaders();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.01, 0.08, 1);

  const camera = new FreeCamera('amiga-cam', new Vector3(0, 0.8, -13.4), scene);
  camera.mode = Camera.PERSPECTIVE_CAMERA;
  camera.fov = 0.72;
  camera.minZ = 0.2;
  camera.maxZ = 100;
  camera.setTarget(new Vector3(0, 0.6, 0));

  const hemi = new HemisphericLight(
    'amiga-hemi',
    new Vector3(0.2, 1, -0.5),
    scene,
  );
  hemi.intensity = 0.85;
  const key = new PointLight('amiga-key', new Vector3(-5, 6, -7), scene);
  key.diffuse = new Color3(0.55, 0.9, 1.0);
  key.intensity = 1.9;
  const magenta = new PointLight('amiga-mag', new Vector3(6, -2, -5), scene);
  magenta.diffuse = new Color3(1.0, 0.35, 0.85);
  magenta.intensity = 1.4;

  // 1. Copper Bars + Boing Checkerboard + Glitches full-bleed backdrop
  const copperPlane = CreatePlane(
    'amiga-copper-bg',
    { width: 42, height: 26 },
    scene,
  );
  copperPlane.position.set(0, 0.8, 11.5);
  const copperMat = new ShaderMaterial(
    'amiga-copper-mat',
    scene,
    { vertex: 'amigaCopper', fragment: 'amigaCopper' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uTime', 'uScanlines'],
    },
  );
  copperMat.backFaceCulling = false;
  copperPlane.material = copperMat;
  copperPlane.isPickable = false;

  // 2. 48 Thin-Instanced Morphing 3D Vectorballs (single draw call)
  const vballRoot = new TransformNode('amiga-vball-root', scene);
  vballRoot.position.set(0, 0.55, 0.2);

  const vballProto = CreateSphere(
    'amiga-vball-proto',
    { diameter: 0.56, segments: 14 },
    scene,
  );
  vballProto.parent = vballRoot;
  const vballMat = new StandardMaterial('amiga-vball-mat', scene);
  vballMat.diffuseColor = new Color3(0.2, 0.78, 1.0);
  vballMat.emissiveColor = new Color3(0.08, 0.24, 0.48);
  vballMat.specularColor = new Color3(1.0, 0.98, 0.92);
  vballMat.specularPower = 96;
  vballProto.material = vballMat;
  vballProto.isPickable = false;

  const vballCount = 48;
  const vballMatrices = new Float32Array(vballCount * 16);
  const tmpScale = Vector3.One();
  const tmpPos = Vector3.Zero();
  const idQuat = Quaternion.Identity();
  const tmpMat = Matrix.Identity();

  // 3. Old-School Flat-Stepped + Wireframe Sinusoidally-Deformed 3D Polyhedron
  const oldPoly = CreatePolyhedron(
    'amiga-old-poly',
    { type: 3, size: 1.45 },
    scene,
  );
  oldPoly.parent = vballRoot;
  const oldPolyMat = new ShaderMaterial(
    'amiga-old-poly-mat',
    scene,
    { vertex: 'amigaPoly', fragment: 'amigaPoly' },
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'uTime', 'uScanlines'],
      needAlphaBlending: true,
    },
  );
  oldPoly.material = oldPolyMat;
  oldPoly.isPickable = false;

  const wirePoly = CreatePolyhedron(
    'amiga-wire-poly',
    { type: 3, size: 1.54 },
    scene,
  );
  wirePoly.parent = vballRoot;
  const wireMat = new StandardMaterial('amiga-wire-mat', scene);
  wireMat.wireframe = true;
  wireMat.disableLighting = true;
  wireMat.emissiveColor = new Color3(1.0, 0.88, 0.25);
  wirePoly.material = wireMat;
  wirePoly.isPickable = false;

  // 4. Sinusoidally Waving Amiga Chrome Logo Banner (top)
  const logoTex = new DynamicTexture(
    'amiga-logo-tex',
    { width: 1024, height: 192 },
    scene,
    true,
  );
  logoTex.hasAlpha = true;
  {
    const ctx = logoTex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 1024, 192);
    const g = ctx.createLinearGradient(0, 20, 0, 148);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#fde047');
    g.addColorStop(0.52, '#0ea5e9');
    g.addColorStop(1, '#f472b6');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawArcadeText(ctx, REMASTER_TITLE, 512, 98, {
      pixelSize: 5.6,
      fillStyle: g,
      shadowColor: '#090d1e',
      shadowOffset: 6,
      letterSpacing: 0.6,
    });
    logoTex.update();
  }
  const logoMat = new ShaderMaterial(
    'amiga-logo-mat',
    scene,
    { vertex: 'amigaSineScroll', fragment: 'amigaSineScroll' },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'worldViewProjection',
        'uTime',
        'uWaveAmp',
        'uWaveFreq',
        'uScrollSpeed',
        'uScanlines',
      ],
      samplers: ['uTex'],
      needAlphaBlending: true,
    },
  );
  logoMat.setTexture('uTex', logoTex);
  logoMat.setFloat('uWaveAmp', 0.16);
  logoMat.setFloat('uWaveFreq', 0.85);
  logoMat.setFloat('uScrollSpeed', 0.0);
  logoMat.backFaceCulling = false;

  // Subdivided plane so vertex shader produces smooth sinusoidal wave deformation
  const logoMesh = CreatePlane(
    'amiga-logo-mesh',
    { width: 8.6, height: 1.6 },
    scene,
  );
  logoMesh.position.set(0, 3.05, -2.0);
  logoMesh.material = logoMat;
  logoMesh.isPickable = false;

  // 4b. Gently bouncing Amiga 1986 arcade-port tribute scroller right under the logo
  // Rendered via a sliding-window Canvas2D strip so arbitrarily long messages never clip.
  const tributeTex = new DynamicTexture(
    'amiga-tribute-tex',
    {
      width: AMIGA_TOP_SCROLL_METRICS.canvasWidth,
      height: AMIGA_TOP_SCROLL_METRICS.canvasHeight,
    },
    scene,
    true,
  );
  tributeTex.hasAlpha = true;
  const tributeStepPx =
    (8 + AMIGA_TOP_SCROLL_METRICS.letterSpacing) *
    AMIGA_TOP_SCROLL_METRICS.pixelSize;
  const tributeStripState: ScrollingStrip = {
    text: AMIGA_TOP_SCROLL_TEXT,
    tex: tributeTex,
    width: AMIGA_TOP_SCROLL_METRICS.canvasWidth,
    height: AMIGA_TOP_SCROLL_METRICS.canvasHeight,
    pixelSize: AMIGA_TOP_SCROLL_METRICS.pixelSize,
    letterSpacing: AMIGA_TOP_SCROLL_METRICS.letterSpacing,
    stepPx: tributeStepPx,
    totalWidthPx: AMIGA_TOP_SCROLL_TEXT.length * tributeStepPx,
    fillStyle: '#7dd3fc',
    shadowColor: '#070a18',
    shadowOffset: 2,
    speedPxPerSec: AMIGA_TOP_SCROLL_METRICS.speedPxPerSec,
    startOffsetRatio: AMIGA_TOP_SCROLL_METRICS.startOffsetRatio,
    lastOffsetPx: -9999,
  };
  drawScrollingStrip(tributeStripState, 0, true);
  const tributeMat = new ShaderMaterial(
    'amiga-tribute-mat',
    scene,
    { vertex: 'amigaSineScroll', fragment: 'amigaSineScroll' },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'worldViewProjection',
        'uTime',
        'uWaveAmp',
        'uWaveFreq',
        'uScrollSpeed',
        'uScanlines',
      ],
      samplers: ['uTex'],
      needAlphaBlending: true,
    },
  );
  tributeMat.setTexture('uTex', tributeTex);
  tributeMat.setFloat('uWaveAmp', 0.08);
  tributeMat.setFloat('uWaveFreq', 0.95);
  tributeMat.setFloat('uScrollSpeed', 0.0);
  tributeMat.backFaceCulling = false;

  const tributeStrip = CreatePlane(
    'amiga-tribute-strip',
    { width: 12.6, height: 0.42 },
    scene,
  );
  tributeStrip.increaseVertices(20);
  tributeStrip.position.set(0, 2.08, -2.2);
  tributeStrip.material = tributeMat;
  tributeStrip.isPickable = false;

  // 5. Classic Sinusoidal Scrolling Text Ribbon (bottom, 32-segment waving strip!)
  const scrollTex = new DynamicTexture(
    'amiga-scroll-tex',
    {
      width: AMIGA_BOTTOM_SCROLL_METRICS.canvasWidth,
      height: AMIGA_BOTTOM_SCROLL_METRICS.canvasHeight,
    },
    scene,
    true,
  );
  scrollTex.hasAlpha = true;
  const scrollStepPx =
    (8 + AMIGA_BOTTOM_SCROLL_METRICS.letterSpacing) *
    AMIGA_BOTTOM_SCROLL_METRICS.pixelSize;
  const scrollStripState: ScrollingStrip = {
    text: AMIGA_BOTTOM_SCROLL_TEXT,
    tex: scrollTex,
    width: AMIGA_BOTTOM_SCROLL_METRICS.canvasWidth,
    height: AMIGA_BOTTOM_SCROLL_METRICS.canvasHeight,
    pixelSize: AMIGA_BOTTOM_SCROLL_METRICS.pixelSize,
    letterSpacing: AMIGA_BOTTOM_SCROLL_METRICS.letterSpacing,
    stepPx: scrollStepPx,
    totalWidthPx: AMIGA_BOTTOM_SCROLL_TEXT.length * scrollStepPx,
    fillStyle: '#fef08a',
    shadowColor: '#070a18',
    shadowOffset: 4,
    speedPxPerSec: AMIGA_BOTTOM_SCROLL_METRICS.speedPxPerSec,
    startOffsetRatio: AMIGA_BOTTOM_SCROLL_METRICS.startOffsetRatio,
    lastOffsetPx: -9999,
  };
  drawScrollingStrip(scrollStripState, 0, true);
  const scrollMat = new ShaderMaterial(
    'amiga-scroll-mat',
    scene,
    { vertex: 'amigaSineScroll', fragment: 'amigaSineScroll' },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'worldViewProjection',
        'uTime',
        'uWaveAmp',
        'uWaveFreq',
        'uScrollSpeed',
        'uScanlines',
      ],
      samplers: ['uTex'],
      needAlphaBlending: true,
    },
  );
  scrollMat.setTexture('uTex', scrollTex);
  scrollMat.setFloat('uWaveAmp', 0.26);
  scrollMat.setFloat('uWaveFreq', 1.15);
  scrollMat.setFloat('uScrollSpeed', 0.0);
  scrollMat.backFaceCulling = false;

  // Build subdivided horizontal strip (40 columns) for smooth sinusoidal waving!
  const scrollStrip = CreatePlane(
    'amiga-scroll-strip',
    { width: 13.0, height: 0.95 },
    scene,
  );
  scrollStrip.increaseVertices(24);
  scrollStrip.position.set(0, -1.05, -2.8);
  scrollStrip.material = scrollMat;
  scrollStrip.isPickable = false;

  // 6. Raycasted 3D PLAY 1P / 2P buttons
  const makeBtn = (name: string, label: string, x: number, color: string) => {
    const tex = new DynamicTexture(
      `${name}-tex`,
      { width: 320, height: 96 },
      scene,
      true,
    );
    tex.hasAlpha = true;
    const draw = (hovered: boolean) => {
      const ctx = tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 320, 96);
      ctx.fillStyle = hovered ? color : 'rgba(8, 12, 30, 0.85)';
      ctx.fillRect(6, 6, 308, 84);
      ctx.lineWidth = hovered ? 6 : 4;
      ctx.strokeStyle = hovered ? '#ffffff' : color;
      ctx.strokeRect(6, 6, 308, 84);
      drawArcadeText(ctx, label, 160, 48, {
        pixelSize: 3.4,
        fillStyle: hovered ? '#070a18' : '#ffffff',
        ...(hovered ? {} : { shadowColor: '#070a18', shadowOffset: 3 }),
      });
      tex.update();
    };
    draw(false);
    const mat = new StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    const mesh = CreatePlane(
      `${name}-mesh`,
      { width: 2.3, height: 0.7 },
      scene,
    );
    mesh.position.set(x, -2.05, -2.8);
    mesh.material = mat;
    mesh.isPickable = true;
    return { mesh, tex, draw, hovered: false };
  };
  const btn1P = makeBtn('amiga-btn-1p', 'PLAY 1P', -1.65, '#38bdf8');
  const btn2P = makeBtn('amiga-btn-2p', 'PLAY 2P', 1.65, '#f472b6');

  let scanlinesEnabled = true;
  let elapsed = 0;
  let scrollElapsed = 0;

  return {
    scene,

    setScanlines(enabled: boolean) {
      scanlinesEnabled = enabled;
    },

    resetScroll() {
      scrollElapsed = 0;
      drawScrollingStrip(tributeStripState, 0, true);
      drawScrollingStrip(scrollStripState, 0, true);
    },

    update(dtSeconds: number) {
      const dt = Math.min(0.1, Math.max(0, dtSeconds));
      elapsed += dt;
      scrollElapsed += dt;
      const scanVal = scanlinesEnabled ? 1.0 : 0.0;

      copperMat.setFloat('uTime', elapsed);
      copperMat.setFloat('uScanlines', scanVal);
      logoMat.setFloat('uTime', elapsed);
      logoMat.setFloat('uScanlines', scanVal);
      tributeMat.setFloat('uTime', elapsed);
      tributeMat.setFloat('uScanlines', scanVal);
      drawScrollingStrip(tributeStripState, scrollElapsed);
      // Gentle arcade bounce under the waving logo
      tributeStrip.position.y = 2.0 + Math.abs(Math.sin(elapsed * 3.1)) * 0.18;
      scrollMat.setFloat('uTime', elapsed);
      scrollMat.setFloat('uScanlines', scanVal);
      drawScrollingStrip(scrollStripState, scrollElapsed);
      oldPolyMat.setFloat('uTime', elapsed);
      oldPolyMat.setFloat('uScanlines', scanVal);

      // Rotate morphing vectorballs & inner old-school polyhedron
      vballRoot.rotation.y = elapsed * 0.78;
      vballRoot.rotation.x = Math.sin(elapsed * 0.55) * 0.45;
      oldPoly.rotation.y = -elapsed * 1.15;
      oldPoly.rotation.z = elapsed * 0.65;
      wirePoly.rotation.copyFrom(oldPoly.rotation);

      // Morph 48 vectorballs (Cube -> Torus -> Helix -> Sphere) with zero allocations
      for (let i = 0; i < vballCount; i++) {
        const p = computeVectorballPosition(i, vballCount, elapsed);
        const pulse = 0.85 + 0.25 * Math.sin(elapsed * 4.0 + i * 0.35);
        tmpScale.set(pulse, pulse, pulse);
        tmpPos.set(p.x, p.y, p.z);
        Matrix.ComposeToRef(tmpScale, idQuat, tmpPos, tmpMat);
        tmpMat.copyToArray(vballMatrices, i * 16);
      }
      vballProto.thinInstanceSetBuffer('matrix', vballMatrices, 16, false);

      // Gentle retro camera breathing
      camera.position.x = Math.sin(elapsed * 0.42) * 1.1;
      camera.position.y = 0.75 + Math.cos(elapsed * 0.6) * 0.22;
      camera.setTarget(new Vector3(0, 0.55, 0));
    },

    setHover(pointerX: number, pointerY: number) {
      const hit = scene.pick(pointerX, pointerY);
      const h1 = hit?.pickedMesh === btn1P.mesh;
      const h2 = hit?.pickedMesh === btn2P.mesh;
      if (h1 !== btn1P.hovered) {
        btn1P.hovered = h1;
        btn1P.draw(h1);
      }
      if (h2 !== btn2P.hovered) {
        btn2P.hovered = h2;
        btn2P.draw(h2);
      }
    },

    pickAction(pointerX: number, pointerY: number): Attract3DAction {
      const hit = scene.pick(pointerX, pointerY);
      if (hit?.pickedMesh === btn1P.mesh) return 'start1p';
      if (hit?.pickedMesh === btn2P.mesh) return 'start2p';
      return 'none';
    },

    dispose() {
      logoTex.dispose();
      tributeTex.dispose();
      scrollTex.dispose();
      btn1P.tex.dispose();
      btn2P.tex.dispose();
      scene.dispose();
    },
  };
}
