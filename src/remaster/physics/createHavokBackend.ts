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
import { isIceAtWorld } from '../engine/romSurfaceZones';
import {
  MARBLE_ANGULAR_DAMPING,
  surfaceAngularDamping,
  surfaceLinearDamping,
} from '../engine/surfaceRules';
import type {
  PhysicsMarbleSnapshot,
  RemasterPhysicsBackend,
} from '../engine/remasterSimulation';
import {
  sampleLayerHeight,
  type RemasterLevelV1,
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
    const aggregate = new PhysicsAggregate(
      mesh,
      volume.shape === 'cylinder'
        ? PhysicsShapeType.CYLINDER
        : PhysicsShapeType.BOX,
      {
        mass: 0,
        friction: surfaceProps.friction,
        restitution: surfaceProps.restitution,
      },
      scene,
    );
    if (volume.kinematic) {
      aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
    }
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
  }

  // 2b. Attach static Havok colliders to all level landmarks (guardrails, pyramids, spikes).
  const landmarkRoot = scene.getTransformNodeByName('practice-landmarks');
  if (landmarkRoot) {
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
    prevVy: number;
    lastImpact: number;
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
    aggregate.body.setAngularDamping(MARBLE_ANGULAR_DAMPING);
    aggregate.body.disablePreStep = false;
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
    marbles.push({ mesh, aggregate, prevVy: 0, lastImpact: 0 });
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
      m.prevVy = 0;
      m.lastImpact = 0;
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

    step(dt: number) {
      if (disposed) return;
      for (const m of marbles) {
        m.aggregate.body.getLinearVelocityToRef(tmpVel);
        m.prevVy = tmpVel.y;
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
        const groundH = mainLayer
          ? sampleLayerHeight(mainLayer, m.mesh.position.x, m.mesh.position.z)
          : null;
        const bottomY = m.mesh.position.y - radius;
        const grounded = groundH !== null && Math.abs(bottomY - groundH) < 0.35;
        // Keep full horizontal momentum while airborne so ramp jumps clear side gaps naturally.
        // Arcade ice zones have no friction at all (romSurfaceZones.ts).
        const surface = isIceAtWorld(
          level,
          m.mesh.position.x,
          m.mesh.position.z,
        )
          ? 'ice'
          : 'normal';
        m.aggregate.body.setLinearDamping(
          surfaceLinearDamping(surface, grounded),
        );
        m.aggregate.body.setAngularDamping(surfaceAngularDamping(surface));
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
