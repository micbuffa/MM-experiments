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
// Register thin-instance helpers on Mesh for single-draw-call starfield.
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import {
  ATTRACT_COURSE_SHOWCASE,
  REMASTER_TITLE,
  REMASTER_TRIBUTE_SUBTITLE,
  type AttractStage,
  type HighScoreEntry,
  type RemasterCourseNumber,
} from '../engine/remasterAttract';
import { drawArcadeText } from './arcadeBitmapFont';

export type Attract3DAction = 'start1p' | 'start2p' | 'none';

export interface Attract3DSceneController {
  readonly scene: Scene;
  setHighScores(scores: readonly HighScoreEntry[]): void;
  setMode(
    stage: AttractStage,
    course: RemasterCourseNumber,
    cameraLabel: string,
  ): void;
  update(dtSeconds: number): void;
  pickAction(pointerX: number, pointerY: number): Attract3DAction;
  setHover(pointerX: number, pointerY: number): void;
  dispose(): void;
}

const GRID_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const GRID_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;
  void main() {
    vec2 coord = vPos.xz * 0.45;
    coord.y -= uTime * 0.85;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    float dist = length(vPos.xz);
    float pulse = 0.5 + 0.5 * sin(dist * 0.42 - uTime * 2.4);
    float fade = smoothstep(26.0, 3.0, dist);

    vec3 baseCol = mix(vec3(0.02, 0.03, 0.09), vec3(0.08, 0.04, 0.18), fade * 0.6);
    vec3 lineCol = mix(vec3(0.08, 0.78, 1.0), vec3(0.95, 0.25, 0.78), pulse * 0.65);
    vec3 col = baseCol + lineCol * line * fade * (0.85 + 0.35 * pulse);

    // Subtle concentric radar ring
    float ring = smoothstep(0.12, 0.0, abs(fract(dist * 0.14 - uTime * 0.22) - 0.5));
    col += vec3(1.0, 0.82, 0.28) * ring * fade * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const HOLO_VERT = /* glsl */ `
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

const HOLO_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uTime;
  void main() {
    vec4 tex = texture2D(uTex, vUv);
    if (tex.a < 0.02) discard;

    // Subtle retro CRT scanlines + diagonal chrome specular sweep
    float scan = 0.92 + 0.08 * sin(vUv.y * 260.0 - uTime * 6.0);
    float sweepPos = fract(uTime * 0.22) * 2.2 - 0.6;
    float sweep = smoothstep(0.16, 0.0, abs((vUv.x + vUv.y * 0.35) - sweepPos));

    vec3 col = tex.rgb * scan + vec3(0.65, 0.88, 1.0) * sweep * 0.24 * tex.a;
    gl_FragColor = vec4(col, tex.a);
  }
`;

const FRESNEL_VERT = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 world;
  uniform mat4 worldViewProjection;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 wp = world * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(world) * normal);
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  uniform vec3 uCamPos;
  uniform float uTime;
  void main() {
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 N = normalize(vWorldNormal);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float wave = 0.5 + 0.5 * sin(vWorldPos.x * 0.9 + vWorldPos.y * 1.1 + uTime * 2.6);
    vec3 col = mix(vec3(0.12, 0.82, 1.0), vec3(1.0, 0.78, 0.25), wave);
    col = mix(col, vec3(0.95, 0.3, 0.82), fresnel * 0.55);
    gl_FragColor = vec4(col * (0.45 + fresnel * 1.25), 0.35 + fresnel * 0.65);
  }
`;

let shadersRegistered = false;
function ensureAttractShaders() {
  if (shadersRegistered) return;
  Effect.ShadersStore['attractGridVertexShader'] = GRID_VERT;
  Effect.ShadersStore['attractGridFragmentShader'] = GRID_FRAG;
  Effect.ShadersStore['attractHoloVertexShader'] = HOLO_VERT;
  Effect.ShadersStore['attractHoloFragmentShader'] = HOLO_FRAG;
  Effect.ShadersStore['attractFresnelVertexShader'] = FRESNEL_VERT;
  Effect.ShadersStore['attractFresnelFragmentShader'] = FRESNEL_FRAG;
  shadersRegistered = true;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 100% 3D WebGL Attract Mode & Tribute Title scene built with BabylonJS + custom GLSL shaders
 * (procedural retro-neon horizon grid, Fresnel energy rings, stepped isometric marble pedestal,
 * orbiting glossy marbles, thin-instanced starfield, holographic marquee & 3D raycasted buttons).
 */
export function createAttract3DScene(
  engine: Engine,
  initialScores: readonly HighScoreEntry[],
): Attract3DSceneController {
  ensureAttractShaders();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.025, 0.065, 1);

  const camera = new FreeCamera(
    'attract-cam',
    new Vector3(0, 5.2, -13.2),
    scene,
  );
  camera.mode = Camera.PERSPECTIVE_CAMERA;
  camera.fov = 0.72;
  camera.minZ = 0.2;
  camera.maxZ = 120;
  camera.setTarget(new Vector3(0, 1.85, 0));

  const hemi = new HemisphericLight(
    'attract-hemi',
    new Vector3(0.2, 1, -0.4),
    scene,
  );
  hemi.intensity = 0.85;
  hemi.diffuse = new Color3(0.82, 0.9, 1.0);
  hemi.groundColor = new Color3(0.18, 0.1, 0.28);

  const keyLight = new PointLight('attract-key', new Vector3(-5, 8, -7), scene);
  keyLight.diffuse = new Color3(0.45, 0.85, 1.0);
  keyLight.intensity = 1.6;

  const warmLight = new PointLight(
    'attract-warm',
    new Vector3(6, 5, -5),
    scene,
  );
  warmLight.diffuse = new Color3(1.0, 0.78, 0.35);
  warmLight.intensity = 1.3;

  // 1. Custom GLSL retro-futuristic neon horizon grid
  const gridGround = CreateGround(
    'attract-grid',
    { width: 64, height: 64, subdivisions: 2 },
    scene,
  );
  gridGround.position.y = -1.6;
  const gridMat = new ShaderMaterial(
    'attract-grid-mat',
    scene,
    { vertex: 'attractGrid', fragment: 'attractGrid' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uTime'],
    },
  );
  gridMat.backFaceCulling = false;
  gridGround.material = gridMat;
  gridGround.isPickable = false;

  // 2. Thin-instanced 3D starfield (single draw call)
  const starProto = CreateSphere(
    'attract-star-proto',
    { diameter: 0.11, segments: 4 },
    scene,
  );
  const starMat = new StandardMaterial('attract-star-mat', scene);
  starMat.disableLighting = true;
  starMat.emissiveColor = new Color3(0.88, 0.94, 1.0);
  starProto.material = starMat;
  starProto.isPickable = false;
  const starCount = 140;
  const starMatrices = new Float32Array(starCount * 16);
  const tmpMat = Matrix.Identity();
  const idQuat = Quaternion.Identity();
  for (let i = 0; i < starCount; i++) {
    const angle = (i * 2.39996) % (Math.PI * 2);
    const radius = 14 + (i % 22) * 1.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius + 6;
    const y = 1.2 + ((i * 19) % 16);
    const s = 0.6 + (i % 4) * 0.35;
    Matrix.ComposeToRef(
      new Vector3(s, s, s),
      idQuat,
      new Vector3(x, y, z),
      tmpMat,
    );
    tmpMat.copyToArray(starMatrices, i * 16);
  }
  starProto.thinInstanceSetBuffer('matrix', starMatrices, 16, true);

  // 3. Rotating 3D isometric stepped marble pedestal + glowing Fresnel rings
  const arenaRoot = new TransformNode('attract-arena', scene);
  arenaRoot.position.set(0, -0.5, 0.8);

  const stoneMat = new StandardMaterial('attract-stone', scene);
  stoneMat.diffuseColor = new Color3(0.16, 0.2, 0.34);
  stoneMat.specularColor = new Color3(0.55, 0.72, 1.0);
  stoneMat.specularPower = 48;

  const trimMat = new StandardMaterial('attract-trim', scene);
  trimMat.diffuseColor = new Color3(0.08, 0.65, 0.95);
  trimMat.emissiveColor = new Color3(0.08, 0.55, 0.9);

  const tiers = [
    { size: 6.2, height: 0.45, y: 0.0 },
    { size: 4.5, height: 0.45, y: 0.45 },
    { size: 2.8, height: 0.45, y: 0.9 },
  ];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]!;
    const slab = CreateBox(
      `attract-tier-${i}`,
      { width: t.size, height: t.height, depth: t.size },
      scene,
    );
    slab.parent = arenaRoot;
    slab.position.y = t.y;
    slab.material = stoneMat;
    slab.isPickable = false;

    const rim = CreateBox(
      `attract-rim-${i}`,
      { width: t.size + 0.08, height: 0.06, depth: t.size + 0.08 },
      scene,
    );
    rim.parent = arenaRoot;
    rim.position.y = t.y + t.height * 0.5;
    rim.material = trimMat;
    rim.isPickable = false;
  }

  const fresnelMat = new ShaderMaterial(
    'attract-fresnel-mat',
    scene,
    { vertex: 'attractFresnel', fragment: 'attractFresnel' },
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'uCamPos', 'uTime'],
      needAlphaBlending: true,
    },
  );
  fresnelMat.backFaceCulling = false;

  const outerRing = CreateTorus(
    'attract-ring-outer',
    { diameter: 8.6, thickness: 0.12, tessellation: 48 },
    scene,
  );
  outerRing.parent = arenaRoot;
  outerRing.position.y = 1.6;
  outerRing.material = fresnelMat;
  outerRing.isPickable = false;

  const innerRing = CreateTorus(
    'attract-ring-inner',
    { diameter: 6.2, thickness: 0.09, tessellation: 44 },
    scene,
  );
  innerRing.parent = arenaRoot;
  innerRing.position.y = 2.0;
  innerRing.material = fresnelMat;
  innerRing.isPickable = false;

  // 4. Three glossy 3D orbiting marbles (P1 Blue, P2 Red, Black Rival)
  const makeMarbleMat = (
    name: string,
    diffuse: Color3,
    emissive: Color3,
    specular: Color3,
  ) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = diffuse;
    m.emissiveColor = emissive;
    m.specularColor = specular;
    m.specularPower = 96;
    return m;
  };
  const blueMarble = CreateSphere(
    'attract-marble-blue',
    { diameter: 0.92, segments: 24 },
    scene,
  );
  blueMarble.material = makeMarbleMat(
    'attract-blue-mat',
    new Color3(0.12, 0.45, 1.0),
    new Color3(0.05, 0.18, 0.45),
    new Color3(0.95, 0.98, 1.0),
  );
  blueMarble.isPickable = false;

  const redMarble = CreateSphere(
    'attract-marble-red',
    { diameter: 0.92, segments: 24 },
    scene,
  );
  redMarble.material = makeMarbleMat(
    'attract-red-mat',
    new Color3(0.96, 0.18, 0.22),
    new Color3(0.38, 0.04, 0.08),
    new Color3(1.0, 0.92, 0.92),
  );
  redMarble.isPickable = false;

  const blackMarble = CreateSphere(
    'attract-marble-black',
    { diameter: 0.86, segments: 24 },
    scene,
  );
  blackMarble.material = makeMarbleMat(
    'attract-black-mat',
    new Color3(0.06, 0.06, 0.09),
    new Color3(0.02, 0.02, 0.04),
    new Color3(0.9, 0.94, 1.0),
  );
  blackMarble.isPickable = false;

  // 5. Holographic 3D Title & Tribute Marquee Slab (custom GLSL scanline + chrome sweep)
  const marqueeTex = new DynamicTexture(
    'attract-marquee-tex',
    { width: 1024, height: 512 },
    scene,
    true,
  );
  marqueeTex.hasAlpha = true;
  const marqueeMat = new ShaderMaterial(
    'attract-marquee-mat',
    scene,
    { vertex: 'attractHolo', fragment: 'attractHolo' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uTime'],
      samplers: ['uTex'],
      needAlphaBlending: true,
    },
  );
  marqueeMat.setTexture('uTex', marqueeTex);
  marqueeMat.backFaceCulling = false;

  const marqueePlane = CreatePlane(
    'attract-marquee-plane',
    { width: 9.6, height: 4.8 },
    scene,
  );
  marqueePlane.position.set(0, 3.65, -2.2);
  marqueePlane.material = marqueeMat;
  marqueePlane.isPickable = false;

  // 6. Two Interactive 3D Beveled Arcade Push-Buttons (raycasted in WebGL!)
  const makeButton3D = (
    name: string,
    label: string,
    sub: string,
    x: number,
    accentHex: string,
    glowHex: string,
  ) => {
    const tex = new DynamicTexture(
      `${name}-tex`,
      { width: 512, height: 160 },
      scene,
      true,
    );
    tex.hasAlpha = true;
    const draw = (hovered: boolean) => {
      const ctx = tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 512, 160);
      drawRoundedRect(ctx, 10, 10, 492, 140, 22);
      const grad = ctx.createLinearGradient(0, 0, 512, 160);
      grad.addColorStop(0, hovered ? accentHex : '#0f1c38');
      grad.addColorStop(1, hovered ? glowHex : '#182b54');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = hovered ? 6 : 4;
      ctx.strokeStyle = hovered ? '#fef08a' : accentHex;
      ctx.stroke();

      drawArcadeText(ctx, label, 256, 64, {
        pixelSize: 5.2,
        fillStyle: '#ffffff',
        shadowColor: 'rgba(6, 10, 24, 0.9)',
        shadowOffset: 4,
      });
      drawArcadeText(ctx, sub, 256, 118, {
        pixelSize: 2.4,
        fillStyle: hovered ? '#0b1020' : '#bae6fd',
      });
      tex.update();
    };
    draw(false);

    const mat = new ShaderMaterial(
      `${name}-mat`,
      scene,
      { vertex: 'attractHolo', fragment: 'attractHolo' },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'uTime'],
        samplers: ['uTex'],
        needAlphaBlending: true,
      },
    );
    mat.setTexture('uTex', tex);
    mat.backFaceCulling = false;

    const mesh = CreatePlane(
      `${name}-mesh`,
      { width: 3.6, height: 1.12 },
      scene,
    );
    mesh.position.set(x, 0.72, -4.6);
    mesh.material = mat;
    mesh.isPickable = true;
    return { mesh, mat, tex, draw, hovered: false };
  };

  const btn1P = makeButton3D(
    'attract-btn-1p',
    '1 PLAYER',
    'SPACE / ENTER',
    -2.05,
    '#38bdf8',
    '#2563eb',
  );
  const btn2P = makeButton3D(
    'attract-btn-2p',
    '2 PLAYERS',
    'PRESS 2',
    2.05,
    '#f472b6',
    '#db2777',
  );

  let highScores: readonly HighScoreEntry[] = [...initialScores];
  let activeStage: AttractStage = 'flyover';
  let activeCourse: RemasterCourseNumber = 1;
  let activeCameraLabel = 'Arcade';
  let elapsed = 0;
  let lastPanelKey = '';

  const showcaseMeshes = [
    gridGround,
    starProto,
    blueMarble,
    redMarble,
    blackMarble,
  ];

  function applyStageVisibility() {
    const isShowcase = activeStage === 'showcase';
    // In flyover & aiDemo modes, composite 3D GLSL holographic title & buttons
    // directly over the live 3D BabylonJS course scene (no opaque clear!).
    scene.autoClear = isShowcase;
    scene.autoClearDepthAndStencil = true;
    arenaRoot.setEnabled(isShowcase);
    for (const m of showcaseMeshes) {
      m.setEnabled(isShowcase);
    }
    // Keep generous safe margins below the top HUD and above the bottom toolbar.
    if (isShowcase) {
      marqueePlane.scaling.set(0.82, 0.78, 1);
      marqueePlane.position.set(0, 3.65, -1.8);
      btn1P.mesh.scaling.set(0.78, 0.78, 1);
      btn2P.mesh.scaling.set(0.78, 0.78, 1);
      btn1P.mesh.position.set(-1.85, 0.85, -3.8);
      btn2P.mesh.position.set(1.85, 0.85, -3.8);
    } else {
      marqueePlane.scaling.set(0.66, 0.52, 1);
      marqueePlane.position.set(0, 3.85, -1.6);
      btn1P.mesh.scaling.set(0.74, 0.74, 1);
      btn2P.mesh.scaling.set(0.74, 0.74, 1);
      btn1P.mesh.position.set(-1.85, 0.35, -3.6);
      btn2P.mesh.position.set(1.85, 0.35, -3.6);
    }
  }

  function redrawMarquee(courseIdx: number, showScores: boolean) {
    const key = `${activeStage}:${activeCourse}:${activeCameraLabel}:${courseIdx}:${showScores ? 'S' : 'C'}:${highScores
      .map((s) => `${s.initials}${s.score}`)
      .join(',')}`;
    if (key === lastPanelKey) return;
    lastPanelKey = key;

    const ctx = marqueeTex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 1024, 512);

    // Translucent dark-glass holographic backing frame
    drawRoundedRect(ctx, 20, 16, 984, 480, 28);
    ctx.fillStyle =
      activeStage === 'showcase'
        ? 'rgba(7, 12, 28, 0.78)'
        : 'rgba(6, 10, 24, 0.62)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(96, 195, 255, 0.68)';
    ctx.stroke();

    // Tribute ribbon (1984 Atari System 1 bitmap font)
    drawArcadeText(ctx, REMASTER_TRIBUTE_SUBTITLE, 512, 54, {
      pixelSize: 2.1,
      fillStyle: '#fde047',
      shadowColor: 'rgba(4, 8, 20, 0.9)',
      shadowOffset: 2,
    });

    // Chrome gradient title in authentic 8x8 arcade bitmap glyphs
    const titleGrad = ctx.createLinearGradient(80, 92, 940, 152);
    titleGrad.addColorStop(0, '#7dd3fc');
    titleGrad.addColorStop(0.35, '#ffffff');
    titleGrad.addColorStop(0.55, '#fde047');
    titleGrad.addColorStop(0.8, '#60a5fa');
    titleGrad.addColorStop(1, '#f472b6');
    drawArcadeText(ctx, REMASTER_TITLE, 512, 124, {
      pixelSize: 5.4,
      fillStyle: titleGrad,
      shadowColor: 'rgba(8, 12, 28, 0.95)',
      shadowOffset: 5,
      letterSpacing: 0.6,
    });

    // Divider line
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 174);
    ctx.lineTo(928, 174);
    ctx.stroke();

    const liveCourse =
      ATTRACT_COURSE_SHOWCASE[activeCourse - 1] ?? ATTRACT_COURSE_SHOWCASE[0]!;

    if (activeStage === 'flyover') {
      drawArcadeText(
        ctx,
        `LIVE 3D FLYOVER · COURSE ${liveCourse.course}/6 · ${liveCourse.difficulty}`,
        512,
        222,
        { pixelSize: 2.2, fillStyle: '#5eead4' },
      );
      drawArcadeText(ctx, liveCourse.name, 512, 284, {
        pixelSize: 4.4,
        fillStyle: '#ffffff',
        shadowColor: 'rgba(6, 10, 24, 0.9)',
        shadowOffset: 4,
      });
      drawArcadeText(ctx, liveCourse.subtitle, 512, 342, {
        pixelSize: 1.9,
        fillStyle: '#c8daf8',
      });
      drawArcadeText(ctx, 'PRESS SPACE TO PLAY · ← / → SWITCH MODE', 512, 420, {
        pixelSize: 2.1,
        fillStyle: '#fde68a',
      });
    } else if (activeStage === 'aiDemo') {
      drawArcadeText(
        ctx,
        `LIVE 3D AI DEMO · CAMERA: ${activeCameraLabel}`,
        512,
        222,
        { pixelSize: 2.3, fillStyle: '#f472b6' },
      );
      drawArcadeText(
        ctx,
        `COURSE ${liveCourse.course}: ${liveCourse.name}`,
        512,
        284,
        {
          pixelSize: 3.6,
          fillStyle: '#ffffff',
          shadowColor: 'rgba(6, 10, 24, 0.9)',
          shadowOffset: 4,
        },
      );
      drawArcadeText(
        ctx,
        'REAL-TIME 3D PHYSICS · MULTI-CAMERA SHOWCASE',
        512,
        342,
        { pixelSize: 2.0, fillStyle: '#c8daf8' },
      );
      drawArcadeText(
        ctx,
        'PRESS SPACE TO TAKE CONTROL · ← / → SWITCH MODE',
        512,
        420,
        { pixelSize: 2.0, fillStyle: '#fde68a' },
      );
    } else if (!showScores) {
      const course =
        ATTRACT_COURSE_SHOWCASE[courseIdx % ATTRACT_COURSE_SHOWCASE.length]!;
      drawArcadeText(
        ctx,
        `3D ARCADE SHOWCASE · COURSE ${course.course}/6 · ${course.difficulty}`,
        512,
        218,
        { pixelSize: 2.0, fillStyle: '#5eead4' },
      );
      drawArcadeText(ctx, course.name, 512, 274, {
        pixelSize: 4.2,
        fillStyle: '#ffffff',
        shadowColor: 'rgba(6, 10, 24, 0.9)',
        shadowOffset: 4,
      });
      drawArcadeText(ctx, course.subtitle, 512, 326, {
        pixelSize: 1.85,
        fillStyle: '#c8daf8',
      });
      drawArcadeText(
        ctx,
        'TRIBUTE: MARK CERNY · BOB FLANAGAN · BRAD FULLER · HAL CANON',
        512,
        396,
        { pixelSize: 1.65, fillStyle: '#9bb4de' },
      );
      drawArcadeText(
        ctx,
        'REMASTER: MICHEL BUFFA · MUSIC: PETER SALOMONSEN · 3D: LUCA ELIA',
        512,
        436,
        { pixelSize: 1.65, fillStyle: '#fde68a' },
      );
    } else {
      drawArcadeText(ctx, 'HALL OF FAME — TOP MARBLE MASTERS', 512, 214, {
        pixelSize: 2.6,
        fillStyle: '#fde047',
      });

      const rows = highScores.slice(0, 6);
      for (let i = 0; i < rows.length; i++) {
        const e = rows[i]!;
        const y = 262 + i * 36;
        drawArcadeText(ctx, `${i + 1}.`, 220, y, {
          pixelSize: 2.5,
          fillStyle: i === 0 ? '#fde047' : '#7dd3fc',
          align: 'left',
        });
        drawArcadeText(ctx, e.initials, 290, y, {
          pixelSize: 2.5,
          fillStyle: '#ffffff',
          align: 'left',
        });
        drawArcadeText(ctx, e.score.toLocaleString('en-US'), 680, y, {
          pixelSize: 2.5,
          fillStyle: '#5eead4',
          align: 'right',
        });
        drawArcadeText(ctx, `LVL ${e.course}`, 820, y, {
          pixelSize: 2.5,
          fillStyle: '#f472b6',
          align: 'right',
        });
      }
    }

    marqueeTex.update();
  }

  applyStageVisibility();
  redrawMarquee(0, false);

  return {
    scene,

    setHighScores(scores: readonly HighScoreEntry[]) {
      highScores = [...scores];
      lastPanelKey = '';
    },

    setMode(
      stage: AttractStage,
      course: RemasterCourseNumber,
      cameraLabel: string,
    ) {
      const changed =
        stage !== activeStage ||
        course !== activeCourse ||
        cameraLabel !== activeCameraLabel;
      activeStage = stage;
      activeCourse = course;
      activeCameraLabel = cameraLabel;
      if (changed) {
        applyStageVisibility();
        lastPanelKey = '';
      }
    },

    update(dtSeconds: number) {
      elapsed += Math.min(0.1, Math.max(0, dtSeconds));
      gridMat.setFloat('uTime', elapsed);
      marqueeMat.setFloat('uTime', elapsed);
      btn1P.mat.setFloat('uTime', elapsed);
      btn2P.mat.setFloat('uTime', elapsed);
      fresnelMat.setFloat('uTime', elapsed);
      fresnelMat.setVector3('uCamPos', camera.position);

      if (activeStage === 'showcase') {
        camera.position.x = Math.sin(elapsed * 0.32) * 2.2;
        camera.position.y = 4.9 + Math.sin(elapsed * 0.48) * 0.4;
        camera.position.z = -14.2;
        camera.setTarget(new Vector3(0, 2.0, 0));

        arenaRoot.rotation.y = elapsed * 0.28;
        outerRing.rotation.x = 0.55 + Math.sin(elapsed * 0.7) * 0.25;
        outerRing.rotation.z = elapsed * 0.45;
        innerRing.rotation.x = -0.65 + Math.cos(elapsed * 0.6) * 0.28;
        innerRing.rotation.y = -elapsed * 0.62;

        const a1 = elapsed * 1.15;
        blueMarble.position.set(
          Math.cos(a1) * 3.8,
          0.95 + Math.sin(a1 * 2) * 0.42,
          0.8 + Math.sin(a1) * 3.8,
        );
        blueMarble.rotation.y = a1 * 2.2;
        blueMarble.rotation.x = a1 * 1.7;

        const a2 = a1 + Math.PI;
        redMarble.position.set(
          Math.cos(a2) * 3.8,
          0.95 + Math.cos(a2 * 2) * 0.42,
          0.8 + Math.sin(a2) * 3.8,
        );
        redMarble.rotation.y = -a2 * 2.2;
        redMarble.rotation.z = a2 * 1.5;

        const a3 = -elapsed * 0.85;
        blackMarble.position.set(
          Math.cos(a3) * 5.2,
          0.35 + Math.sin(a3 * 3) * 0.35,
          0.8 + Math.sin(a3) * 5.2,
        );

        marqueePlane.position.y = 3.65 + Math.sin(elapsed * 1.3) * 0.08;
        marqueePlane.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
        btn1P.mesh.position.y =
          0.85 + (btn1P.hovered ? 0.1 : 0) + Math.sin(elapsed * 2.1) * 0.03;
        btn2P.mesh.position.y =
          0.85 + (btn2P.hovered ? 0.1 : 0) + Math.cos(elapsed * 2.1) * 0.03;
      } else {
        camera.position.set(0, 2.2, -13.6);
        camera.setTarget(new Vector3(0, 2.2, 0));
        marqueePlane.position.y = 3.85 + Math.sin(elapsed * 1.4) * 0.05;
        marqueePlane.rotation.y = Math.sin(elapsed * 0.55) * 0.03;
        btn1P.mesh.position.y =
          0.35 + (btn1P.hovered ? 0.1 : 0) + Math.sin(elapsed * 2.1) * 0.025;
        btn2P.mesh.position.y =
          0.35 + (btn2P.hovered ? 0.1 : 0) + Math.cos(elapsed * 2.1) * 0.025;
      }

      const slot = Math.floor(elapsed / 4.5);
      const showScores = activeStage === 'showcase' && slot % 2 === 1;
      const courseIdx = (activeCourse - 1 + Math.floor(slot / 2)) % 6;
      redrawMarquee(courseIdx, showScores);
    },

    setHover(pointerX: number, pointerY: number) {
      const hit = scene.pick(pointerX, pointerY);
      const hit1 = hit?.pickedMesh === btn1P.mesh;
      const hit2 = hit?.pickedMesh === btn2P.mesh;
      if (hit1 !== btn1P.hovered) {
        btn1P.hovered = hit1;
        btn1P.draw(hit1);
      }
      if (hit2 !== btn2P.hovered) {
        btn2P.hovered = hit2;
        btn2P.draw(hit2);
      }
    },

    pickAction(pointerX: number, pointerY: number): Attract3DAction {
      const hit = scene.pick(pointerX, pointerY);
      if (hit?.pickedMesh === btn1P.mesh) return 'start1p';
      if (hit?.pickedMesh === btn2P.mesh) return 'start2p';
      return 'none';
    },

    dispose() {
      marqueeTex.dispose();
      btn1P.tex.dispose();
      btn2P.tex.dispose();
      scene.dispose();
    },
  };
}
