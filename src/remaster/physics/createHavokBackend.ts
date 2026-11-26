// Side-effect imports required in @babylonjs/core 9.33.2 to register
// Scene.prototype.enablePhysics() and TransformNode.prototype.physicsBody.
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import HavokPhysics from '@babylonjs/havok';
import havokWasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import {
  PhysicsMotionType,
  PhysicsShapeType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { Scene } from '@babylonjs/core/scene';
import { REMASTER_PHYSICS } from '../engine/physicsConstants';
import type {
  PhysicsMarbleSnapshot,
  RemasterPhysicsBackend,
} from '../engine/remasterSimulation';
import {
  sampleLayerHeight,
  type RemasterLevelV1,
  type RemasterSurfaceKind,
  type Vec3,
} from '../levels/remasterLevel';
import { buildLayerCollisionMesh } from './buildCollisionMesh';

export interface HavokRemasterBackend extends RemasterPhysicsBackend {
  dispose(): void;
}

export async function createHavokBackend(
  scene: Scene,
  level: RemasterLevelV1,
  twoPlayers: boolean,
): Promise<HavokRemasterBackend> {
  const havokInstance = await HavokPhysics({
    locateFile: () => havokWasmUrl,
  });
  const plugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, REMASTER_PHYSICS.gravityY, 0), plugin);

  const ownedMeshes: Mesh[] = [];
  const ownedAggregates: PhysicsAggregate[] = [];

  // 1. Build separate welded static collision meshes for floor (0 bounce) and cliffs (wall bounce).
  for (const layer of level.heightLayers) {
    const { floor, cliffs } = buildLayerCollisionMesh(layer, level.killY - 4);
    const surfaceProps = REMASTER_PHYSICS.surfaces[layer.defaultSurface];

    const addStaticPart = (
      name: string,
      part: { readonly positions: Float32Array; readonly indices: Uint32Array },
      friction: number,
      restitution: number,
    ) => {
      if (part.indices.length === 0) return;
      const mesh = new Mesh(name, scene);
      const data = new VertexData();
      data.positions = part.positions;
      data.indices = part.indices;
      const normals: number[] = [];
      VertexData.ComputeNormals(part.positions, part.indices, normals);
      data.normals = normals;
      data.applyToMesh(mesh, false);
      mesh.isVisible = false;
      mesh.isPickable = false;
      const aggregate = new PhysicsAggregate(
        mesh,
        PhysicsShapeType.MESH,
        { mass: 0, friction, restitution },
        scene,
      );
      ownedMeshes.push(mesh);
      ownedAggregates.push(aggregate);
    };

    addStaticPart(
      `remaster-floor-${layer.id}`,
      floor,
      surfaceProps.friction,
      0,
    );
    addStaticPart(
      `remaster-cliffs-${layer.id}`,
      cliffs,
      0.08,
      REMASTER_PHYSICS.wallRestitution,
    );
  }

  // 2. Build Hamsterball-ready 3D volume colliders.
  for (const volume of level.volumes) {
    const mesh =
      volume.shape === 'cylinder'
        ? CreateCylinder(
            `remaster-vol-${volume.id}`,
            { diameter: volume.size.x, height: volume.size.y },
            scene,
          )
        : CreateBox(
            `remaster-vol-${volume.id}`,
            {
              width: volume.size.x,
              height: volume.size.y,
              depth: volume.size.z,
            },
            scene,
          );
    mesh.position.set(volume.position.x, volume.position.y, volume.position.z);
    if (volume.rotation) {
      mesh.rotation.set(
        volume.rotation.x,
        volume.rotation.y,
        volume.rotation.z,
      );
    }
    mesh.isVisible = false;
    mesh.isPickable = false;
    const surfaceProps = REMASTER_PHYSICS.surfaces[volume.surface];
    const volumeRestitution =
      volume.surface === 'booster'
        ? REMASTER_PHYSICS.wallRestitution
        : surfaceProps.restitution;
    const aggregate = new PhysicsAggregate(
      mesh,
      volume.shape === 'cylinder'
        ? PhysicsShapeType.CYLINDER
        : PhysicsShapeType.BOX,
      {
        mass: 0,
        friction: surfaceProps.friction,
        restitution: volumeRestitution,
      },
      scene,
    );
    if (volume.kinematic) {
      aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
    }
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
  }

  // 2b. Attach static Havok colliders to all level landmarks (guardrails, pyramids, spikes, Level 2 towers).
  for (const rootName of ['practice-landmarks', 'intermediate-landmarks']) {
    const landmarkRoot = scene.getTransformNodeByName(rootName);
    if (!landmarkRoot) continue;
    for (const child of landmarkRoot.getChildMeshes(false)) {
      if (child.getTotalVertices() === 0 || child.getTotalIndices() === 0) {
        continue;
      }
      child.computeWorldMatrix(true);
      const aggregate = new PhysicsAggregate(
        child,
        PhysicsShapeType.MESH,
        {
          mass: 0,
          friction: 0.1,
          restitution: REMASTER_PHYSICS.wallRestitution,
        },
        scene,
      );
      // Track aggregate only (visual landmark meshes are owned by the scene).
      ownedAggregates.push(aggregate);
    }
  }

  // 3. Create dynamic marble physics bodies (invisible proxy spheres; visuals follow simulation).
  const radius = REMASTER_PHYSICS.marbleRadius;
  const count = twoPlayers ? 2 : 1;
  const marbles: {
    mesh: Mesh;
    aggregate: PhysicsAggregate;
    prevVx: number;
    prevVy: number;
    prevVz: number;
    lastImpact: number;
    lastWallImpact: number;
    wallCooldown: number;
    surface: RemasterSurfaceKind;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const mesh = CreateSphere(
      `remaster-marble-body-${i}`,
      { diameter: radius * 2, segments: 8 },
      scene,
    );
    mesh.isVisible = false;
    mesh.isPickable = false;
    const spawn = i === 0 ? level.spawns.player1 : level.spawns.player2;
    mesh.position.set(spawn.x, spawn.y + radius, spawn.z);
    // Zero marble restitution so floor contacts (max(0, 0) = 0) never hop on
    // tile seams or stairs, while walls (max(0, 0.42) = 0.42) still bounce crisply.
    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: REMASTER_PHYSICS.marbleMass,
        friction: REMASTER_PHYSICS.surfaces.stone.friction,
        restitution: 0,
      },
      scene,
    );
    aggregate.body.setLinearDamping(
      REMASTER_PHYSICS.surfaces.stone.linearDamping,
    );
    aggregate.body.setAngularDamping(2.0);
    aggregate.body.disablePreStep = false;
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
    marbles.push({
      mesh,
      aggregate,
      prevVx: 0,
      prevVy: 0,
      prevVz: 0,
      lastImpact: 0,
      lastWallImpact: 0,
      wallCooldown: 0,
      surface: 'stone',
    });
  }

  // 3b. Create dynamic Havok bodies for enemy Black Marbles so players can physically
  // collide, wrestle, and shove them off edges.
  const enemyBodies: {
    mesh: Mesh;
    aggregate: PhysicsAggregate;
  }[] = [];
  for (let i = 0; i < level.enemies.length; i++) {
    const enemy = level.enemies[i]!;
    const mesh = CreateSphere(
      `remaster-enemy-body-${i}`,
      { diameter: radius * 2, segments: 8 },
      scene,
    );
    mesh.isVisible = false;
    mesh.isPickable = false;
    const spawnH = level.heightLayers[0]
      ? (sampleLayerHeight(
          level.heightLayers[0],
          enemy.position.x,
          enemy.position.z,
        ) ?? enemy.position.y)
      : enemy.position.y;
    mesh.position.set(enemy.position.x, spawnH + radius, enemy.position.z);
    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: REMASTER_PHYSICS.marbleMass * 0.88,
        friction: REMASTER_PHYSICS.surfaces.stone.friction,
        restitution: 0,
      },
      scene,
    );
    aggregate.body.setLinearDamping(1.35);
    aggregate.body.setAngularDamping(2.0);
    aggregate.body.disablePreStep = false;
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
    enemyBodies.push({ mesh, aggregate });
  }

  const tmpForce = Vector3.Zero();
  const tmpVel = Vector3.Zero();
  const mainLayer = level.heightLayers[0];
  let disposed = false;

  return {
    applyPlayerForce(playerIndex: 0 | 1, fx: number, fz: number) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      m.aggregate.body.getLinearVelocityToRef(tmpVel);
      const speed = Math.hypot(tmpVel.x, tmpVel.z);
      const forceMag = Math.hypot(fx, fz);
      // Detect boost from force magnitude exceeding base inputAcceleration.
      const boosting = forceMag > REMASTER_PHYSICS.inputAcceleration * 1.05;
      const limit = boosting
        ? REMASTER_PHYSICS.boostSpeedLimit
        : REMASTER_PHYSICS.flatSpeedLimit;
      const scale =
        speed > limit ? Math.max(0.2, 1 - (speed - limit) * 0.12) : 1;

      // Project uphill push force along the local terrain tangent so steep ramps
      // (~39° side-jump launchers) don't wedge the marble into the slope.
      let fy = 0;
      let uphillScale = 1;
      if (forceMag > 0.01 && mainLayer) {
        const px = m.mesh.position.x;
        const pz = m.mesh.position.z;
        const h0 = sampleLayerHeight(mainLayer, px, pz);
        const bottomY = m.mesh.position.y - radius;
        if (h0 !== null && Math.abs(bottomY - h0) < 0.45) {
          const dirX = fx / forceMag;
          const dirZ = fz / forceMag;
          const hAhead = sampleLayerHeight(
            mainLayer,
            px + dirX * 0.35,
            pz + dirZ * 0.35,
          );
          if (hAhead !== null) {
            const slope = (hAhead - h0) / 0.35;
            if (slope > 0.08 && slope < 1.5) {
              // Apply force tangent to the ramp + mild climbing assist on steep ramps.
              uphillScale = 1 + Math.min(0.65, slope * 0.65);
              fy = forceMag * scale * uphillScale * Math.min(0.95, slope);
            }
          }
        }
      }

      tmpForce.set(fx * scale * uphillScale, fy, fz * scale * uphillScale);
      m.aggregate.body.applyForce(tmpForce, m.mesh.position);
    },

    teleportMarble(playerIndex: 0 | 1, position: Vec3) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      m.mesh.position.set(position.x, position.y + radius, position.z);
      m.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      m.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
      m.prevVx = 0;
      m.prevVy = 0;
      m.prevVz = 0;
      m.lastImpact = 0;
      m.lastWallImpact = 0;
      m.wallCooldown = 0;
    },

    setMarbleKinematic(playerIndex: 0 | 1, kinematic: boolean) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      m.aggregate.body.setMotionType(
        kinematic ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC,
      );
      if (kinematic) {
        m.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
        m.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
      }
    },

    setMarbleSurface(playerIndex: 0 | 1, surface: RemasterSurfaceKind) {
      const m = marbles[playerIndex];
      if (!m || disposed || m.surface === surface) return;
      m.surface = surface;
      const props = REMASTER_PHYSICS.surfaces[surface];
      m.aggregate.shape.material = {
        friction: props.friction,
        restitution: 0,
      };
    },

    step(dt: number) {
      if (disposed) return;
      for (const m of marbles) {
        m.aggregate.body.getLinearVelocityToRef(tmpVel);
        m.prevVx = tmpVel.x;
        m.prevVy = tmpVel.y;
        m.prevVz = tmpVel.z;
        if (m.wallCooldown > 0)
          m.wallCooldown = Math.max(0, m.wallCooldown - dt);
      }
      const engine = scene.getPhysicsEngine();
      if (engine) {
        engine._step(dt);
      }
      for (const m of marbles) {
        m.aggregate.body.getLinearVelocityToRef(tmpVel);
        // Sudden upward velocity change after falling indicates a landing impact.
        const deltaVy = tmpVel.y - m.prevVy;
        m.lastImpact =
          m.prevVy < -2.0 && deltaVy > 2.5 ? Math.abs(m.prevVy) : 0;
        // Sharp horizontal velocity reversal/impulse indicates a wall or obstacle bounce.
        const horizDelta = Math.hypot(tmpVel.x - m.prevVx, tmpVel.z - m.prevVz);
        if (horizDelta > 3.2 && m.wallCooldown <= 0) {
          m.lastWallImpact = horizDelta;
          m.wallCooldown = 0.14;
        } else {
          m.lastWallImpact = 0;
        }
        const groundH = mainLayer
          ? sampleLayerHeight(mainLayer, m.mesh.position.x, m.mesh.position.z)
          : null;
        const bottomY = m.mesh.position.y - radius;
        const grounded = groundH !== null && Math.abs(bottomY - groundH) < 0.35;
        // Keep full horizontal momentum while airborne; use ice/stone damping when grounded.
        const surfaceDamping =
          REMASTER_PHYSICS.surfaces[m.surface].linearDamping;
        m.aggregate.body.setLinearDamping(
          grounded ? surfaceDamping : REMASTER_PHYSICS.airLinearDamping,
        );
        // Suppress tiny internal-edge ghost hops ONLY when rolling downhill (never on uphill launch ramps).
        if (grounded && m.prevVy < -0.25 && tmpVel.y > 0.35 && tmpVel.y < 2.2) {
          tmpVel.y = 0;
          m.aggregate.body.setLinearVelocity(tmpVel);
        }
      }
    },

    readMarble(playerIndex: 0 | 1): PhysicsMarbleSnapshot {
      const m = marbles[playerIndex];
      if (!m) {
        return {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: false,
          impactSpeed: 0,
        };
      }
      m.aggregate.body.getLinearVelocityToRef(tmpVel);
      const bottomY = m.mesh.position.y - radius;
      const groundH = mainLayer
        ? sampleLayerHeight(mainLayer, m.mesh.position.x, m.mesh.position.z)
        : null;
      const grounded = groundH !== null && Math.abs(bottomY - groundH) < 0.35;
      return {
        position: { x: m.mesh.position.x, y: bottomY, z: m.mesh.position.z },
        velocity: { x: tmpVel.x, y: tmpVel.y, z: tmpVel.z },
        grounded,
        impactSpeed: m.lastImpact,
        wallImpactSpeed: m.lastWallImpact,
      };
    },

    applyEnemyForce(enemyIndex: number, fx: number, fz: number) {
      const e = enemyBodies[enemyIndex];
      if (!e || disposed) return;
      // Project uphill force along the local ramp tangent (same as player climb)
      // so the Black Marble can climb the Level 2 ramp onto the upper plateau.
      let fy = 0;
      let uphillScale = 1;
      const forceMag = Math.hypot(fx, fz);
      if (forceMag > 0.01 && mainLayer) {
        const px = e.mesh.position.x;
        const pz = e.mesh.position.z;
        const h0 = sampleLayerHeight(mainLayer, px, pz);
        const bottomY = e.mesh.position.y - radius;
        if (h0 !== null && Math.abs(bottomY - h0) < 0.5) {
          const dirX = fx / forceMag;
          const dirZ = fz / forceMag;
          const hAhead = sampleLayerHeight(
            mainLayer,
            px + dirX * 0.35,
            pz + dirZ * 0.35,
          );
          if (hAhead !== null) {
            const slope = (hAhead - h0) / 0.35;
            if (slope > 0.06 && slope < 1.6) {
              uphillScale = 1 + Math.min(0.85, slope * 0.9);
              fy = forceMag * uphillScale * Math.min(0.95, slope);
            }
          }
        }
      }
      tmpForce.set(fx * uphillScale, fy, fz * uphillScale);
      e.aggregate.body.applyForce(tmpForce, e.mesh.position);
    },

    resolveBilliardCollision(
      playerIndex: 0 | 1,
      enemyIndex: number,
      restitution = 0.85,
    ): number {
      const m = marbles[playerIndex];
      const e = enemyBodies[enemyIndex];
      if (!m || !e || disposed) return 0;
      const dx = m.mesh.position.x - e.mesh.position.x;
      const dz = m.mesh.position.z - e.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius * 2.02;
      if (dist <= 0.0001 || dist >= minDist) return 0;
      const nx = dx / dist;
      const nz = dz / dist;

      // Read current velocities
      const v1 = Vector3.Zero();
      const v2 = Vector3.Zero();
      m.aggregate.body.getLinearVelocityToRef(v1);
      e.aggregate.body.getLinearVelocityToRef(v2);

      // Separate overlap slightly so Havok never glues the spheres together
      const overlap = (minDist - dist) * 0.55;
      m.mesh.position.x += nx * overlap;
      m.mesh.position.z += nz * overlap;
      e.mesh.position.x -= nx * overlap;
      e.mesh.position.z -= nz * overlap;

      // Exact 2D elastic billiard-ball impulse along collision normal
      const rvx = v1.x - v2.x;
      const rvz = v1.z - v2.z;
      const velAlongNormal = rvx * nx + rvz * nz;
      // Ensure even a slow sumo push transfers a crisp knock rather than sticking
      const closing = velAlongNormal < 0 ? velAlongNormal : -2.2;
      const invM1 = 1 / REMASTER_PHYSICS.marbleMass;
      const invM2 = 1 / (REMASTER_PHYSICS.marbleMass * 0.88);
      const j = (-(1 + restitution) * closing) / (invM1 + invM2);

      v1.x += j * invM1 * nx;
      v1.z += j * invM1 * nz;
      v2.x -= j * invM2 * nx;
      v2.z -= j * invM2 * nz;
      m.aggregate.body.setLinearVelocity(v1);
      e.aggregate.body.setLinearVelocity(v2);
      return Math.abs(closing);
    },

    resolvePlayerBilliardCollision(restitution = 0.85): number {
      const m0 = marbles[0];
      const m1 = marbles[1];
      if (!m0 || !m1 || disposed) return 0;
      const dx = m0.mesh.position.x - m1.mesh.position.x;
      const dz = m0.mesh.position.z - m1.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius * 2.02;
      if (dist <= 0.0001 || dist >= minDist) return 0;
      const nx = dx / dist;
      const nz = dz / dist;

      const v0 = Vector3.Zero();
      const v1 = Vector3.Zero();
      m0.aggregate.body.getLinearVelocityToRef(v0);
      m1.aggregate.body.getLinearVelocityToRef(v1);

      const overlap = (minDist - dist) * 0.55;
      m0.mesh.position.x += nx * overlap;
      m0.mesh.position.z += nz * overlap;
      m1.mesh.position.x -= nx * overlap;
      m1.mesh.position.z -= nz * overlap;

      const rvx = v0.x - v1.x;
      const rvz = v0.z - v1.z;
      const velAlongNormal = rvx * nx + rvz * nz;
      if (velAlongNormal >= 0) return 0;
      const j = (-(1 + restitution) * velAlongNormal) / 2;
      v0.x += j * nx;
      v0.z += j * nz;
      v1.x -= j * nx;
      v1.z -= j * nz;
      m0.aggregate.body.setLinearVelocity(v0);
      m1.aggregate.body.setLinearVelocity(v1);
      return Math.abs(velAlongNormal);
    },

    teleportEnemy(enemyIndex: number, position: Vec3) {
      const e = enemyBodies[enemyIndex];
      if (!e || disposed) return;
      e.mesh.position.set(position.x, position.y + radius, position.z);
      e.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      e.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    },

    readEnemy(enemyIndex: number): PhysicsMarbleSnapshot {
      const e = enemyBodies[enemyIndex];
      if (!e) {
        return {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: false,
          impactSpeed: 0,
        };
      }
      e.aggregate.body.getLinearVelocityToRef(tmpVel);
      const bottomY = e.mesh.position.y - radius;
      const groundH = mainLayer
        ? sampleLayerHeight(mainLayer, e.mesh.position.x, e.mesh.position.z)
        : null;
      const grounded = groundH !== null && Math.abs(bottomY - groundH) < 0.35;
      return {
        position: { x: e.mesh.position.x, y: bottomY, z: e.mesh.position.z },
        velocity: { x: tmpVel.x, y: tmpVel.y, z: tmpVel.z },
        grounded,
        impactSpeed: 0,
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const agg of ownedAggregates) agg.dispose();
      for (const mesh of ownedMeshes) mesh.dispose();
      scene.disablePhysicsEngine();
    },
  };
}
