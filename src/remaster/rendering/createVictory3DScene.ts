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
// Register thin-instance helpers on Mesh for single-draw-call 3D confetti shards.
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import {
  REMASTER_CREDITS,
  REMASTER_TITLE,
  computeVictoryRank,
  sanitizeInitials,
} from '../engine/remasterAttract';
import { drawArcadeText } from './arcadeBitmapFont';

export type Victory3DAction = 'replay' | 'attract' | 'saveScore' | 'none';

export interface Victory3DConfig {
  readonly gameOver?: boolean;
  readonly course?: number;
}

export interface Victory3DSceneController {
  readonly scene: Scene;
  configure(p1Score: number, p2Score?: number, config?: Victory3DConfig): void;
  readonly initials: string;
  handleKey(code: string, key: string): Victory3DAction;
  markSaved(): void;
  update(dtSeconds: number): void;
  setHover(pointerX: number, pointerY: number): void;
  pickAction(pointerX: number, pointerY: number): Victory3DAction;
  dispose(): void;
}

const AURORA_VERT = /* glsl */ `
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

const AURORA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Rotating golden-cyan starburst victory rays
    float rays = 0.5 + 0.5 * sin(a * 12.0 - uTime * 1.4);
    float rays2 = 0.5 + 0.5 * sin(a * 7.0 + uTime * 0.9);
    float glow = exp(-r * 1.45);

    vec3 deep = vec3(0.03, 0.04, 0.12);
    vec3 gold = vec3(1.0, 0.8, 0.25);
    vec3 cyan = vec3(0.14, 0.84, 1.0);
    vec3 rose = vec3(0.95, 0.3, 0.72);

    vec3 col = deep;
    col += mix(gold, cyan, rays2) * rays * glow * 0.65;
    col += rose * pow(max(0.0, 1.0 - abs(r - (0.55 + 0.12 * sin(uTime)))), 6.0) * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const GOLD_ORB_VERT = /* glsl */ `
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

const GOLD_ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  uniform vec3 uCamPos;
  uniform float uTime;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 L = normalize(vec3(-0.4, 0.85, -0.6));
    vec3 H = normalize(L + V);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 48.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float band = 0.5 + 0.5 * sin(N.y * 10.0 + N.x * 6.0 - uTime * 3.0);

    vec3 gold = mix(vec3(0.95, 0.68, 0.12), vec3(1.0, 0.94, 0.58), band);
    vec3 irid = mix(vec3(0.2, 0.88, 1.0), vec3(1.0, 0.4, 0.82), fres);
    vec3 col = gold * (0.35 + diff * 0.8) + irid * fres * 0.75 + vec3(1.0) * spec * 1.1;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VICTORY_HOLO_VERT = /* glsl */ `
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

const VICTORY_HOLO_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uTime;
  void main() {
    vec4 tex = texture2D(uTex, vUv);
    if (tex.a < 0.02) discard;
    float scan = 0.93 + 0.07 * sin(vUv.y * 240.0 - uTime * 5.0);
    float sweepPos = fract(uTime * 0.25) * 2.2 - 0.6;
    float sweep = smoothstep(0.14, 0.0, abs((vUv.x + vUv.y * 0.3) - sweepPos));
    vec3 col = tex.rgb * scan + vec3(1.0, 0.92, 0.55) * sweep * 0.25 * tex.a;
    gl_FragColor = vec4(col, tex.a);
  }
`;

let victoryShadersRegistered = false;
function ensureVictoryShaders() {
  if (victoryShadersRegistered) return;
  Effect.ShadersStore['victoryAuroraVertexShader'] = AURORA_VERT;
  Effect.ShadersStore['victoryAuroraFragmentShader'] = AURORA_FRAG;
  Effect.ShadersStore['victoryGoldOrbVertexShader'] = GOLD_ORB_VERT;
  Effect.ShadersStore['victoryGoldOrbFragmentShader'] = GOLD_ORB_FRAG;
  Effect.ShadersStore['victoryHoloVertexShader'] = VICTORY_HOLO_VERT;
  Effect.ShadersStore['victoryHoloFragmentShader'] = VICTORY_HOLO_FRAG;
  victoryShadersRegistered = true;
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

interface ShardState {
  x: number;
  y: number;
  z: number;
  vy: number;
  rx: number;
  ry: number;
  sx: number;
  sy: number;
}

/**
 * 100% 3D WebGL Animated Final Victory / Congratulations scene built with BabylonJS + GLSL shaders:
 * - Swirling golden/cyan cosmic aurora backdrop shader
 * - Rotating 3-tier obsidian & gold podium with levitating iridescent gold Trophy Marble & 3 rings
 * - 96 thin-instanced 3D tumbling metallic confetti shards (1 draw call, zero per-frame allocations)
 * - Floating 3D holographic Victory + 3-letter arcade initials + scrolling Tribute Credits monolith
 * - Raycasted 3D PLAY AGAIN & TITLE buttons (zero HTML/CSS!)
 */
export function createVictory3DScene(engine: Engine): Victory3DSceneController {
  ensureVictoryShaders();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.025, 0.03, 0.09, 1);

  const camera = new FreeCamera(
    'victory-cam',
    new Vector3(0, 3.6, -12.8),
    scene,
  );
  camera.mode = Camera.PERSPECTIVE_CAMERA;
  camera.fov = 0.72;
  camera.minZ = 0.2;
  camera.maxZ = 120;
  camera.setTarget(new Vector3(0, 1.9, 0));

  const hemi = new HemisphericLight(
    'victory-hemi',
    new Vector3(0, 1, -0.3),
    scene,
  );
  hemi.intensity = 0.9;
  hemi.diffuse = new Color3(1.0, 0.94, 0.8);

  const goldLight = new PointLight(
    'victory-gold-l',
    new Vector3(-4, 7, -6),
    scene,
  );
  goldLight.diffuse = new Color3(1.0, 0.82, 0.35);
  goldLight.intensity = 1.9;

  const cyanLight = new PointLight(
    'victory-cyan-l',
    new Vector3(5, 5, -5),
    scene,
  );
  cyanLight.diffuse = new Color3(0.25, 0.88, 1.0);
  cyanLight.intensity = 1.5;

  // 1. Custom GLSL Golden Aurora / Starburst Backdrop
  const backdrop = CreatePlane(
    'victory-aurora',
    { width: 46, height: 28 },
    scene,
  );
  backdrop.position.set(0, 3.0, 14);
  const auroraMat = new ShaderMaterial(
    'victory-aurora-mat',
    scene,
    { vertex: 'victoryAurora', fragment: 'victoryAurora' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uTime'],
    },
  );
  auroraMat.backFaceCulling = false;
  backdrop.material = auroraMat;
  backdrop.isPickable = false;

  // 2. Rotating 3-tier obsidian & gold Trophy Podium (left side of 3D stage)
  const podiumRoot = new TransformNode('victory-podium', scene);
  podiumRoot.position.set(-4.0, -0.4, 0.5);

  const obsidianMat = new StandardMaterial('victory-obsidian', scene);
  obsidianMat.diffuseColor = new Color3(0.08, 0.1, 0.18);
  obsidianMat.specularColor = new Color3(0.85, 0.78, 0.45);
  obsidianMat.specularPower = 64;

  const goldTrimMat = new StandardMaterial('victory-gold-trim', scene);
  goldTrimMat.diffuseColor = new Color3(1.0, 0.78, 0.22);
  goldTrimMat.emissiveColor = new Color3(0.55, 0.38, 0.06);

  const podiumTiers = [
    { d: 3.4, h: 0.42, y: 0.0 },
    { d: 2.5, h: 0.42, y: 0.42 },
    { d: 1.7, h: 0.42, y: 0.84 },
  ];
  for (let i = 0; i < podiumTiers.length; i++) {
    const t = podiumTiers[i]!;
    const cyl = CreateCylinder(
      `victory-tier-${i}`,
      { diameter: t.d, height: t.h, tessellation: 24 },
      scene,
    );
    cyl.parent = podiumRoot;
    cyl.position.y = t.y;
    cyl.material = obsidianMat;
    cyl.isPickable = false;

    const rim = CreateTorus(
      `victory-tier-rim-${i}`,
      { diameter: t.d, thickness: 0.06, tessellation: 32 },
      scene,
    );
    rim.parent = podiumRoot;
    rim.position.y = t.y + t.h * 0.5;
    rim.material = goldTrimMat;
    rim.isPickable = false;
  }

  // Levitating Giant Iridescent Gold Trophy Marble + 3 spinning rings
  const goldOrbMat = new ShaderMaterial(
    'victory-gold-orb-mat',
    scene,
    { vertex: 'victoryGoldOrb', fragment: 'victoryGoldOrb' },
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'uCamPos', 'uTime'],
    },
  );
  const trophyMarble = CreateSphere(
    'victory-trophy-marble',
    { diameter: 1.65, segments: 28 },
    scene,
  );
  trophyMarble.parent = podiumRoot;
  trophyMarble.position.y = 2.65;
  trophyMarble.material = goldOrbMat;
  trophyMarble.isPickable = false;

  const rings = [2.45, 3.05, 3.65].map((diameter, idx) => {
    const ring = CreateTorus(
      `victory-ring-${idx}`,
      { diameter, thickness: 0.075, tessellation: 42 },
      scene,
    );
    ring.parent = podiumRoot;
    ring.position.y = 2.65;
    ring.material = goldTrimMat;
    ring.isPickable = false;
    return ring;
  });

  // 3. 96 Thin-Instanced 3D Tumbling Metallic Confetti Shards (1 draw call)
  const shardProto = CreatePolyhedron(
    'victory-shard-proto',
    { type: 0, sizeX: 0.18, sizeY: 0.06, sizeZ: 0.24 },
    scene,
  );
  const shardMat = new StandardMaterial('victory-shard-mat', scene);
  shardMat.diffuseColor = new Color3(1.0, 0.88, 0.42);
  shardMat.emissiveColor = new Color3(0.45, 0.34, 0.12);
  shardMat.specularColor = new Color3(1, 1, 1);
  shardProto.material = shardMat;
  shardProto.isPickable = false;

  const shardCount = 96;
  const shards: ShardState[] = Array.from({ length: shardCount }, (_, i) => ({
    x: (((i * 37) % 100) / 100 - 0.5) * 18,
    y: (((i * 61) % 100) / 100) * 11 - 1,
    z: (((i * 23) % 100) / 100 - 0.5) * 8 + 1.5,
    vy: 1.2 + ((i * 17) % 10) * 0.18,
    rx: (i * 0.4) % (Math.PI * 2),
    ry: (i * 0.7) % (Math.PI * 2),
    sx: 1.6 + (i % 5) * 0.6,
    sy: 2.0 + (i % 4) * 0.7,
  }));
  const shardMatrices = new Float32Array(shardCount * 16);
  const tmpScale = Vector3.One();
  const tmpPos = Vector3.Zero();
  const tmpQuat = Quaternion.Identity();
  const tmpMat = Matrix.Identity();

  // 4. Holographic 3D Victory + Initials + Scrolling Tribute Credits Slab (right-center)
  const holoTex = new DynamicTexture(
    'victory-holo-tex',
    { width: 1024, height: 640 },
    scene,
    true,
  );
  holoTex.hasAlpha = true;
  const holoMat = new ShaderMaterial(
    'victory-holo-mat',
    scene,
    { vertex: 'victoryHolo', fragment: 'victoryHolo' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uTime'],
      samplers: ['uTex'],
      needAlphaBlending: true,
    },
  );
  holoMat.setTexture('uTex', holoTex);
  holoMat.backFaceCulling = false;

  const holoPlane = CreatePlane(
    'victory-holo-plane',
    { width: 8.6, height: 5.38 },
    scene,
  );
  holoPlane.position.set(1.75, 2.75, -1.6);
  holoPlane.material = holoMat;
  holoPlane.isPickable = false;

  // 5. Two Interactive 3D Raycasted Arcade Buttons (PLAY AGAIN / TITLE)
  const makeButton3D = (
    name: string,
    label: string,
    sub: string,
    x: number,
    accentHex: string,
  ) => {
    const tex = new DynamicTexture(
      `${name}-tex`,
      { width: 420, height: 132 },
      scene,
      true,
    );
    tex.hasAlpha = true;
    const draw = (hovered: boolean) => {
      const ctx = tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 420, 132);
      drawRoundedRect(ctx, 8, 8, 404, 116, 20);
      ctx.fillStyle = hovered ? accentHex : 'rgba(12, 20, 42, 0.88)';
      ctx.fill();
      ctx.lineWidth = hovered ? 6 : 4;
      ctx.strokeStyle = hovered ? '#ffffff' : accentHex;
      ctx.stroke();

      drawArcadeText(ctx, label, 210, 52, {
        pixelSize: 3.6,
        fillStyle: hovered ? '#090d16' : '#ffffff',
      });
      drawArcadeText(ctx, sub, 210, 96, {
        pixelSize: 2.0,
        fillStyle: hovered ? '#090d16' : '#fde68a',
      });
      tex.update();
    };
    draw(false);

    const mat = new ShaderMaterial(
      `${name}-mat`,
      scene,
      { vertex: 'victoryHolo', fragment: 'victoryHolo' },
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
      { width: 3.1, height: 0.98 },
      scene,
    );
    mesh.position.set(x, -0.35, -3.9);
    mesh.material = mat;
    mesh.isPickable = true;
    return { mesh, mat, tex, draw, hovered: false };
  };

  const btnReplay = makeButton3D(
    'victory-btn-replay',
    'PLAY AGAIN',
    'PRESS R',
    0.0,
    '#fde047',
  );
  const btnAttract = makeButton3D(
    'victory-btn-attract',
    'TITLE 3D',
    'PRESS ESC',
    3.5,
    '#38bdf8',
  );

  // Decorative floating 3D star-cubes flanking the trophy
  const accentCube = CreateBox('victory-cube-accent', { size: 0.45 }, scene);
  accentCube.parent = podiumRoot;
  accentCube.position.set(0, 4.35, 0);
  accentCube.material = goldTrimMat;
  accentCube.isPickable = false;

  let p1Score = 0;
  let p2Score: number | undefined;
  let isGameOver = false;
  let reachedCourse = 6;
  let initials = 'MBU';
  let saved = false;
  let elapsed = 0;
  let lastDrawTick = -1;

  function redrawHolo() {
    const ctx = holoTex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 1024, 640);

    drawRoundedRect(ctx, 16, 14, 992, 612, 28);
    ctx.fillStyle = 'rgba(7, 11, 26, 0.84)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isGameOver
      ? 'rgba(248, 113, 113, 0.78)'
      : 'rgba(253, 224, 71, 0.72)';
    ctx.stroke();

    const topScore = Math.max(p1Score, p2Score ?? 0);
    const rank = computeVictoryRank(topScore);

    // Rank / Course pill
    drawRoundedRect(ctx, 312, 32, 400, 42, 21);
    ctx.fillStyle = isGameOver ? '#f87171' : '#fde047';
    ctx.fill();
    drawArcadeText(
      ctx,
      isGameOver
        ? `COURSE ${reachedCourse}/6 · TIME UP`
        : `${rank.badge} ${rank.title}`,
      512,
      54,
      { pixelSize: 2.2, fillStyle: '#0b1020' },
    );

    // Main header in authentic 1984 Atari 8x8 bitmap font
    const grad = ctx.createLinearGradient(140, 90, 880, 160);
    if (isGameOver) {
      grad.addColorStop(0, '#fca5a5');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#fde047');
    } else {
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#5eead4');
    }
    drawArcadeText(
      ctx,
      isGameOver ? 'GAME OVER' : 'CONGRATULATIONS!',
      512,
      128,
      {
        pixelSize: isGameOver ? 6.4 : 5.4,
        fillStyle: grad,
        shadowColor: 'rgba(6, 10, 24, 0.95)',
        shadowOffset: 5,
      },
    );

    drawArcadeText(
      ctx,
      isGameOver
        ? `ENTER INITIALS FOR ${REMASTER_TITLE} HALL OF FAME`
        : `YOU CONQUERED ALL 6 COURSES OF ${REMASTER_TITLE}`,
      512,
      180,
      { pixelSize: 1.9, fillStyle: '#bae6fd' },
    );

    // Score & Initials bar
    drawRoundedRect(ctx, 56, 206, 912, 92, 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.stroke();

    drawArcadeText(ctx, 'FINAL SCORE', 90, 232, {
      pixelSize: 1.8,
      fillStyle: '#9fb3d9',
      align: 'left',
    });
    const scoreText =
      p2Score !== undefined
        ? `P1 ${p1Score.toLocaleString('en-US')} · P2 ${p2Score.toLocaleString('en-US')}`
        : p1Score.toLocaleString('en-US');
    drawArcadeText(ctx, scoreText, 90, 272, {
      pixelSize: p2Score !== undefined ? 2.6 : 3.6,
      fillStyle: '#fde047',
      align: 'left',
    });

    // Interactive 3-letter arcade initials (keyboard-driven directly in 3D!)
    drawArcadeText(
      ctx,
      saved ? 'HALL OF FAME SAVED!' : 'TYPE INITIALS + ENTER',
      934,
      232,
      {
        pixelSize: 1.75,
        fillStyle: saved ? '#5eead4' : '#9fb3d9',
        align: 'right',
      },
    );
    const cursor = !saved && Math.floor(elapsed * 2.5) % 2 === 0 ? '_' : ' ';
    drawArcadeText(
      ctx,
      `${initials.padEnd(3, '.')}${saved ? '' : cursor}`,
      934,
      272,
      {
        pixelSize: 3.8,
        fillStyle: '#ffffff',
        align: 'right',
      },
    );

    // Scrolling Tribute & Credits window (clipped)
    const clipX = 56;
    const clipY = 320;
    const clipW = 912;
    const clipH = 276;
    ctx.save();
    drawRoundedRect(ctx, clipX, clipY, clipW, clipH, 16);
    ctx.fillStyle = 'rgba(4, 8, 18, 0.72)';
    ctx.fill();
    ctx.clip();

    const rowHeight = 68;
    const totalHeight = REMASTER_CREDITS.length * rowHeight;
    const scrollY = (elapsed * 38) % totalHeight;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < REMASTER_CREDITS.length; i++) {
        const c = REMASTER_CREDITS[i]!;
        const y = clipY + 46 + pass * totalHeight + i * rowHeight - scrollY;
        if (y < clipY - 40 || y > clipY + clipH + 40) continue;
        drawArcadeText(ctx, c.role, 512, y - 6, {
          pixelSize: 1.65,
          fillStyle: '#7dd3fc',
        });
        drawArcadeText(ctx, c.name, 512, y + 24, {
          pixelSize: 2.2,
          fillStyle: '#ffffff',
        });
      }
    }
    ctx.restore();

    holoTex.update();
  }

  redrawHolo();

  return {
    scene,

    get initials() {
      return sanitizeInitials(initials);
    },

    configure(score1: number, score2?: number, config?: Victory3DConfig) {
      p1Score = score1;
      p2Score = score2;
      isGameOver = Boolean(config?.gameOver);
      reachedCourse = config?.course ?? 6;
      saved = false;
      elapsed = 0;
      lastDrawTick = -1;
      redrawHolo();
    },

    markSaved() {
      saved = true;
      redrawHolo();
    },

    handleKey(code: string, key: string): Victory3DAction {
      if (!saved) {
        if (code === 'Backspace') {
          initials = initials.slice(0, -1);
          redrawHolo();
          return 'none';
        }
        if (code === 'Enter') {
          return 'saveScore';
        }
        if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
          if (initials.length >= 3) initials = '';
          initials = (initials + key.toUpperCase()).slice(0, 3);
          redrawHolo();
          return 'none';
        }
      }
      if (code === 'KeyR' || (saved && code === 'Enter')) return 'replay';
      if (code === 'Escape') return 'attract';
      return 'none';
    },

    update(dtSeconds: number) {
      const dt = Math.min(0.1, Math.max(0, dtSeconds));
      elapsed += dt;
      const aspect =
        engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
      if (aspect < 1.15) {
        camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
        camera.fov = 0.96;
      } else {
        camera.fovMode = Camera.FOVMODE_VERTICAL_FIXED;
        camera.fov = 0.72;
      }

      auroraMat.setFloat('uTime', elapsed);
      goldOrbMat.setFloat('uTime', elapsed);
      goldOrbMat.setVector3('uCamPos', camera.position);
      holoMat.setFloat('uTime', elapsed);
      btnReplay.mat.setFloat('uTime', elapsed);
      btnAttract.mat.setFloat('uTime', elapsed);

      // Gentle celebration camera orbit
      camera.position.x = Math.sin(elapsed * 0.35) * 1.4;
      camera.position.y = 3.5 + Math.sin(elapsed * 0.55) * 0.3;
      camera.setTarget(new Vector3(0.2, 2.0, 0));

      // Rotate podium, levitating trophy marble & 3 energy rings
      podiumRoot.rotation.y = elapsed * 0.35;
      trophyMarble.position.y = 2.65 + Math.sin(elapsed * 2.2) * 0.22;
      trophyMarble.rotation.y = -elapsed * 1.1;
      accentCube.rotation.y = elapsed * 1.8;
      accentCube.rotation.x = elapsed * 1.2;
      rings[0]!.rotation.x = 0.6 + elapsed * 0.9;
      rings[0]!.rotation.z = elapsed * 0.5;
      rings[1]!.rotation.y = -elapsed * 1.2;
      rings[1]!.rotation.x = -0.8;
      rings[2]!.rotation.z = elapsed * 0.8;
      rings[2]!.rotation.x = 0.35 + Math.sin(elapsed) * 0.4;

      // Update 96 thin-instanced 3D confetti shards (zero allocations)
      for (let i = 0; i < shardCount; i++) {
        const s = shards[i]!;
        s.y -= s.vy * dt;
        s.rx += s.sx * dt;
        s.ry += s.sy * dt;
        if (s.y < -3.0) {
          s.y = 9.0;
        }
        tmpPos.set(s.x + Math.sin(elapsed * 1.5 + i) * 0.35, s.y, s.z);
        Quaternion.FromEulerAnglesToRef(s.rx, s.ry, 0, tmpQuat);
        Matrix.ComposeToRef(tmpScale, tmpQuat, tmpPos, tmpMat);
        tmpMat.copyToArray(shardMatrices, i * 16);
      }
      shardProto.thinInstanceSetBuffer('matrix', shardMatrices, 16, false);

      // Refresh scrolling credits & blinking cursor at ~24 Hz
      const tick = Math.floor(elapsed * 24);
      if (tick !== lastDrawTick) {
        lastDrawTick = tick;
        redrawHolo();
      }
    },

    setHover(pointerX: number, pointerY: number) {
      const hit = scene.pick(pointerX, pointerY);
      const h1 = hit?.pickedMesh === btnReplay.mesh;
      const h2 = hit?.pickedMesh === btnAttract.mesh;
      if (h1 !== btnReplay.hovered) {
        btnReplay.hovered = h1;
        btnReplay.draw(h1);
      }
      if (h2 !== btnAttract.hovered) {
        btnAttract.hovered = h2;
        btnAttract.draw(h2);
      }
    },

    pickAction(pointerX: number, pointerY: number): Victory3DAction {
      const hit = scene.pick(pointerX, pointerY);
      if (hit?.pickedMesh === btnReplay.mesh) return 'replay';
      if (hit?.pickedMesh === btnAttract.mesh) return 'attract';
      return 'none';
    },

    dispose() {
      holoTex.dispose();
      btnReplay.tex.dispose();
      btnAttract.tex.dispose();
      scene.dispose();
    },
  };
}
