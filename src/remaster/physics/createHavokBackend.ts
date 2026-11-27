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
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMaterialCombineMode } from '@babylonjs/core/Physics/v2/physicsMaterial';
import { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';
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
  type RemasterSurfaceKind,
  type Vec3,
} from '../levels/remasterLevel';
import {
  level6DisplayTerrain,
  level6PhaseGrid,
} from '../../rendering/level6DisplayTerrain';
import { sampleLevel6SurfaceMode } from '../level6/level6Mechanics';
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
  const ownedBodies: PhysicsBody[] = [];
  const ownedShapes: PhysicsShapeMesh[] = [];
  let level6MazeFloorBody: PhysicsBody | undefined;
  let level6MazeCliffBody: PhysicsBody | undefined;
  const level6MazeFloorShapes: (PhysicsShapeMesh | null)[] = [];
  const level6MazeCliffShapes: (PhysicsShapeMesh | null)[] = [];
  const level6MazePhaseLayers: (typeof level.heightLayers)[number][] = [];
  let activeLevel6Phase: 0 | 1 | 2 | 3 = 0;

  // 1. Build separate welded static collision meshes for floor (0 bounce) and cliffs (wall bounce).
  for (const layer of level.heightLayers) {
    const hasLevel6Phases =
      level.courseIndex === 6 &&
      level.mazePhases !== undefined &&
      level.mazePhases.length === 4;
    // Partition Level 6 cleanly into static pre-maze terrain and the self-contained
    // disappearing-block maze region (x >= 76 && z >= 78) so EVERY transition between
    // static landings (e.g. x=102..106, z=104..109) and dynamic ramps/bridges
    // (e.g. gable ramp x=94..101, z=104..106) is 100% welded with zero phantom seam cliffs
    // and zero invisible holes.
    const isInLevel6MazeRegion = (x: number, z: number): boolean =>
      hasLevel6Phases && x >= 76 && z >= 78;
    const walkwayBaseY = ((16352 - 16384) * Math.sqrt(2 / 3)) / 8;
    const baseLayer =
      level.courseIndex === 6
        ? {
            ...layer,
            cells: layer.cells.map((row, z) =>
              row.map((cell, x) => {
                if (isInLevel6MazeRegion(x, z)) return null;
                if (!cell) return null;
                // Soften collision-only amplitude of the 2 narrow-walkway 3-face angle bumps
                // (x=67..68, z=59..62 and x=59..62, z=69..70) to 45% around walkwayBaseY so
                // the double angle-change bridges remain fair without throwing the marble sideways.
                const onAngleBump =
                  (x >= 67 && x <= 68 && z >= 59 && z <= 62) ||
                  (x >= 59 && x <= 62 && z >= 69 && z <= 70);
                if (!onAngleBump) return cell;
                return [
                  cell[0] === null
                    ? null
                    : walkwayBaseY + (cell[0] - walkwayBaseY) * 0.45,
                  cell[1] === null
                    ? null
                    : walkwayBaseY + (cell[1] - walkwayBaseY) * 0.45,
                  cell[2] === null
                    ? null
                    : walkwayBaseY + (cell[2] - walkwayBaseY) * 0.45,
                  cell[3] === null
                    ? null
                    : walkwayBaseY + (cell[3] - walkwayBaseY) * 0.45,
                ] as const;
              }),
            ),
          }
        : layer;
    const { floor, cliffs } = buildLayerCollisionMesh(
      baseLayer,
      level.killY - 4,
    );
    const surfaceProps = REMASTER_PHYSICS.surfaces[layer.defaultSurface];

    const addStaticPart = (
      name: string,
      part: { readonly positions: Float32Array; readonly indices: Uint32Array },
      friction: number,
      restitution: number,
      restitutionCombine: PhysicsMaterialCombineMode,
      membershipMask = 1,
    ): PhysicsAggregate | undefined => {
      if (part.indices.length === 0) return undefined;
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
      aggregate.shape.material = {
        friction,
        restitution,
        restitutionCombine,
      };
      aggregate.shape.filterMembershipMask = membershipMask;
      ownedMeshes.push(mesh);
      ownedAggregates.push(aggregate);
      return aggregate;
    };

    // Floor uses MULTIPLY combine (highest Havok priority): 0 * marbleRestitution = 0
    // so marbles never hop on tile seams, while walls & marbles bounce elastically.
    addStaticPart(
      `remaster-floor-${layer.id}`,
      floor,
      surfaceProps.friction,
      0,
      PhysicsMaterialCombineMode.MULTIPLY,
    );
    // On Level 5 (Silly Race), open the Escher archway cliffs at Z=21, Z=24 (X=29..35)
    // and X=35 (Z=21..24) so the marble passes freely underneath the bridge to the '?' seam!
    let finalCliffs = cliffs;
    if (level.courseIndex === 5) {
      const deckY = ((16416 - 16384) * Math.sqrt(2 / 3)) / 8;
      const halfX = layer.columns / 2;
      const halfZ = layer.rows / 2;
      const filtered: number[] = [];
      for (let i = 0; i < cliffs.indices.length; i += 3) {
        const i0 = cliffs.indices[i]!;
        const i1 = cliffs.indices[i + 1]!;
        const i2 = cliffs.indices[i + 2]!;
        const xs = [
          cliffs.positions[i0 * 3]! + halfX,
          cliffs.positions[i1 * 3]! + halfX,
          cliffs.positions[i2 * 3]! + halfX,
        ];
        const ys = [
          cliffs.positions[i0 * 3 + 1]!,
          cliffs.positions[i1 * 3 + 1]!,
          cliffs.positions[i2 * 3 + 1]!,
        ];
        const zs = [
          cliffs.positions[i0 * 3 + 2]! + halfZ,
          cliffs.positions[i1 * 3 + 2]! + halfZ,
          cliffs.positions[i2 * 3 + 2]! + halfZ,
        ];
        const side = [21, 24].some((s) =>
          zs.every((v) => Math.abs(v - s) < 0.05),
        );
        const seamEnd =
          xs.every((v) => Math.abs(v - 35) < 0.05) &&
          Math.min(...zs) >= 20.95 &&
          Math.max(...zs) <= 24.05;
        const lowerSeam =
          xs.every((v) => Math.abs(v - 29) < 0.05) &&
          Math.min(...zs) >= 14.95 &&
          Math.max(...zs) <= 18.05;
        if (
          ((side && Math.min(...xs) >= 28.95 && Math.max(...xs) <= 35.05) ||
            seamEnd ||
            lowerSeam) &&
          Math.max(...ys) <= deckY + 0.05
        ) {
          continue;
        }
        filtered.push(i0, i1, i2);
      }
      finalCliffs = {
        positions: cliffs.positions,
        indices: new Uint32Array(filtered),
      };

      // Add static Havok floor for the lower passage underneath the Escher arch (X=29..35, Z=21..24, H=16368)
      // and the lower '?' teleport seam (X=27..29.2, Z=15..18, H=16368) so the marble crosses X=29 cleanly.
      const passageY = ((16368 - 16384) * Math.sqrt(2 / 3)) / 8;
      for (const box of [
        {
          name: 'remaster-level5-escher-passage',
          w: 6.2,
          d: 3.4,
          cx: 32,
          cz: 22.5,
        },
        {
          name: 'remaster-level5-escher-lower-seam',
          w: 2.4,
          d: 3.4,
          cx: 28.1,
          cz: 16.5,
        },
      ]) {
        const passageMesh = CreateBox(
          box.name,
          { width: box.w, height: 0.4, depth: box.d },
          scene,
        );
        passageMesh.position.set(
          box.cx - halfX,
          passageY - 0.2,
          box.cz - halfZ,
        );
        passageMesh.isVisible = false;
        passageMesh.isPickable = false;
        const passageAgg = new PhysicsAggregate(
          passageMesh,
          PhysicsShapeType.BOX,
          { mass: 0, friction: surfaceProps.friction, restitution: 0 },
          scene,
        );
        passageAgg.shape.material = {
          friction: surfaceProps.friction,
          restitution: 0,
          restitutionCombine: PhysicsMaterialCombineMode.MULTIPLY,
        };
        ownedMeshes.push(passageMesh);
        ownedAggregates.push(passageAgg);
      }
    }
    addStaticPart(
      `remaster-cliffs-${layer.id}`,
      finalCliffs,
      0.0,
      REMASTER_PHYSICS.wallRestitution,
      PhysicsMaterialCombineMode.MAXIMUM,
    );

    // Level 6 (Ultimate Race): pre-build 4 PhysicsShapeMesh pairs and swap them via
    // body.shape = shapes[phase] on a single STATIC floor body + STATIC cliff body.
    // Guaranteed immediate Havok broadphase update with zero per-frame preStep cost!
    if (hasLevel6Phases && level.mazePhases) {
      const makePhaseShape = (
        name: string,
        part: {
          readonly positions: Float32Array;
          readonly indices: Uint32Array;
        },
        friction: number,
        restitution: number,
        restitutionCombine: PhysicsMaterialCombineMode,
      ): PhysicsShapeMesh | null => {
        if (part.indices.length === 0) return null;
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
        ownedMeshes.push(mesh);
        const shape = new PhysicsShapeMesh(mesh, scene);
        shape.material = { friction, restitution, restitutionCombine };
        ownedShapes.push(shape);
        return shape;
      };
      for (let p = 0; p < 4; p++) {
        const fullPhase = level6DisplayTerrain(
          level6PhaseGrid(layer.cells, level.mazePhases[p]!),
        );
        level6MazePhaseLayers.push({ ...layer, cells: fullPhase });
        const mazeRegionLayer = {
          ...layer,
          cells: fullPhase.map((row, z) =>
            row.map((cell, x) => (isInLevel6MazeRegion(x, z) ? cell : null)),
          ),
        };
        const phaseCollision = buildLayerCollisionMesh(
          mazeRegionLayer,
          level.killY - 4,
        );
        level6MazeFloorShapes.push(
          makePhaseShape(
            `remaster-l6-maze-floor-${p}`,
            phaseCollision.floor,
            surfaceProps.friction,
            0,
            PhysicsMaterialCombineMode.MULTIPLY,
          ),
        );
        level6MazeCliffShapes.push(
          makePhaseShape(
            `remaster-l6-maze-cliffs-${p}`,
            phaseCollision.cliffs,
            0.0,
            REMASTER_PHYSICS.wallRestitution,
            PhysicsMaterialCombineMode.MAXIMUM,
          ),
        );
      }
      const floorAnchor = new Mesh('remaster-l6-maze-floor-body', scene);
      floorAnchor.isVisible = false;
      floorAnchor.isPickable = false;
      ownedMeshes.push(floorAnchor);
      level6MazeFloorBody = new PhysicsBody(
        floorAnchor,
        PhysicsMotionType.STATIC,
        false,
        scene,
      );
      if (level6MazeFloorShapes[0]) {
        level6MazeFloorBody.shape = level6MazeFloorShapes[0];
      }
      ownedBodies.push(level6MazeFloorBody);

      const cliffAnchor = new Mesh('remaster-l6-maze-cliffs-body', scene);
      cliffAnchor.isVisible = false;
      cliffAnchor.isPickable = false;
      ownedMeshes.push(cliffAnchor);
      level6MazeCliffBody = new PhysicsBody(
        cliffAnchor,
        PhysicsMotionType.STATIC,
        false,
        scene,
      );
      if (level6MazeCliffShapes[0]) {
        level6MazeCliffBody.shape = level6MazeCliffShapes[0];
      }
      ownedBodies.push(level6MazeCliffBody);
    }
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
  // 2c. Attach static Havok colliders to standalone Level 6 hexagonal pyramids on the cyan ice diamond.
  if (level.courseIndex === 6) {
    for (const mesh of scene.meshes) {
      if (
        !mesh.name.startsWith('level6-pyramid-') ||
        mesh.getTotalVertices() === 0 ||
        mesh.getTotalIndices() === 0
      ) {
        continue;
      }
      mesh.computeWorldMatrix(true);
      const aggregate = new PhysicsAggregate(
        mesh,
        PhysicsShapeType.MESH,
        {
          mass: 0,
          friction: 0.1,
          restitution: REMASTER_PHYSICS.wallRestitution,
        },
        scene,
      );
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
    bridgeGrounded: boolean;
    surface: RemasterSurfaceKind;
    onRomIce: boolean;
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
    // High marble restitution with MAXIMUM combine gives crisp native Havok
    // billiard bounces against walls & other marbles, while floor uses MULTIPLY(0) = 0.
    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: REMASTER_PHYSICS.marbleMass,
        friction: REMASTER_PHYSICS.surfaces.stone.friction,
        restitution: REMASTER_PHYSICS.marbleRestitution,
      },
      scene,
    );
    aggregate.shape.material = {
      friction: REMASTER_PHYSICS.surfaces.stone.friction,
      restitution: REMASTER_PHYSICS.marbleRestitution,
      restitutionCombine: PhysicsMaterialCombineMode.MAXIMUM,
    };
    aggregate.body.setLinearDamping(
      REMASTER_PHYSICS.surfaces.stone.linearDamping,
    );
    aggregate.body.setAngularDamping(MARBLE_ANGULAR_DAMPING);
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
      bridgeGrounded: false,
      surface: 'stone',
      onRomIce: false,
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
        mass: REMASTER_PHYSICS.marbleMass * 0.62,
        friction: REMASTER_PHYSICS.surfaces.stone.friction,
        restitution: 0.92,
      },
      scene,
    );
    aggregate.shape.material = {
      friction: REMASTER_PHYSICS.surfaces.stone.friction,
      restitution: 0.92,
      restitutionCombine: PhysicsMaterialCombineMode.MAXIMUM,
    };
    aggregate.body.setLinearDamping(0.75);
    aggregate.body.setAngularDamping(2.0);
    aggregate.body.disablePreStep = false;
    ownedMeshes.push(mesh);
    ownedAggregates.push(aggregate);
    enemyBodies.push({ mesh, aggregate });
  }

  const tmpForce = Vector3.Zero();
  const tmpVel = Vector3.Zero();
  const tmpV1 = Vector3.Zero();
  const tmpV2 = Vector3.Zero();
  const mainLayer = level.heightLayers[0];
  let disposed = false;
  const tmpGrad = { gx: 0, gz: 0 };

  const readCellGradInto = (
    layer: NonNullable<typeof mainLayer>,
    wx: number,
    wz: number,
  ): void => {
    const cx = Math.floor(wx + layer.origin.x + layer.columns / 2);
    const cz = Math.floor(wz + layer.origin.z + layer.rows / 2);
    const cell = layer.cells[cz]?.[cx];
    if (!cell) {
      tmpGrad.gx = 0;
      tmpGrad.gz = 0;
      return;
    }
    const [nw, ne, se, sw] = cell;
    if (nw === null || ne === null || se === null || sw === null) {
      tmpGrad.gx = 0;
      tmpGrad.gz = 0;
      return;
    }
    const gx = (ne - nw + (se - sw)) * 0.5;
    const gz = (sw - nw + (se - ne)) * 0.5;
    if (Math.abs(gx) >= 1.8 || Math.abs(gz) >= 1.8) {
      tmpGrad.gx = 0;
      tmpGrad.gz = 0;
      return;
    }
    tmpGrad.gx = gx;
    tmpGrad.gz = gz;
  };

  const sampleCellSlopeVy = (
    layer: NonNullable<typeof mainLayer>,
    wx: number,
    wz: number,
    vx: number,
    vz: number,
  ): number => {
    readCellGradInto(layer, wx, wz);
    return tmpGrad.gx * vx + tmpGrad.gz * vz;
  };

  return {
    applyPlayerForce(
      playerIndex: 0 | 1,
      fx: number,
      fz: number,
      boosting = false,
      agility = 1,
    ) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      m.aggregate.body.getLinearVelocityToRef(tmpVel);
      const speed = Math.hypot(tmpVel.x, tmpVel.z);
      const forceMag = Math.hypot(fx, fz);
      const isBoosting =
        boosting || forceMag > REMASTER_PHYSICS.inputAcceleration * 1.05;
      const speedScale = Math.max(0.35, Math.min(1.75, agility));
      // Keep full boostSpeedLimit when holding Space so Level 1 side jumps remain
      // clearable regardless of the normal-driving Nervosité slider.
      const limit = isBoosting
        ? REMASTER_PHYSICS.boostSpeedLimit
        : REMASTER_PHYSICS.flatSpeedLimit * speedScale;
      // Only throttle forward acceleration above speed limit; never throttle braking / counter-spin!
      const isBraking = fx * tmpVel.x + fz * tmpVel.z < 0;
      const scale =
        !isBraking && speed > limit
          ? Math.max(0.2, 1 - (speed - limit) * 0.12)
          : 1;

      // Project uphill push force along the local terrain tangent so steep ramps
      // (~39° side-jump launchers & Level 6 dynamic gable ramps) don't wedge the marble.
      let fy = 0;
      let uphillScale = 1;
      const activeHeightLayer =
        level6MazePhaseLayers[activeLevel6Phase] ?? mainLayer;
      if (forceMag > 0.01 && activeHeightLayer) {
        const px = m.mesh.position.x;
        const pz = m.mesh.position.z;
        const h0 = sampleLayerHeight(activeHeightLayer, px, pz);
        const bottomY = m.mesh.position.y - radius;
        if (h0 !== null && Math.abs(bottomY - h0) < 0.45) {
          const dirX = fx / forceMag;
          const dirZ = fz / forceMag;
          const hAhead = sampleLayerHeight(
            activeHeightLayer,
            px + dirX * 0.35,
            pz + dirZ * 0.35,
          );
          if (hAhead !== null) {
            const slope = (hAhead - h0) / 0.35;
            const maxClimbSlope =
              level.direction === -1 || level.courseIndex === 6 ? 1.8 : 0.95;
            if (slope > 0.08 && slope < maxClimbSlope) {
              // Apply force tangent to climbable ramps (not vertical walls or well rims).
              uphillScale =
                level.courseIndex === 6
                  ? 1 + Math.min(1.45, slope * 1.15)
                  : 1 + Math.min(0.85, slope * 0.65);
              fy =
                forceMag * scale * uphillScale * Math.min(maxClimbSlope, slope);
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

    setMarblePosition(playerIndex: 0 | 1, position: Vec3) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      // With disablePreStep = false, updating mesh.position syncs the Havok body
      // cleanly on the next step without setTargetTransform's artificial launch impulse.
      m.mesh.position.set(position.x, position.y + radius, position.z);
      m.bridgeGrounded = true;
    },

    setMarbleKinematic(playerIndex: 0 | 1, kinematic: boolean) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      m.aggregate.body.setMotionType(
        kinematic ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC,
      );
      m.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      m.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    },

    setMarbleVelocity(playerIndex: 0 | 1, velocity: Vec3) {
      const m = marbles[playerIndex];
      if (!m || disposed) return;
      tmpVel.set(velocity.x, velocity.y, velocity.z);
      m.aggregate.body.setLinearVelocity(tmpVel);
    },

    setMarbleSurface(playerIndex: 0 | 1, surface: RemasterSurfaceKind) {
      const m = marbles[playerIndex];
      if (!m || disposed || m.surface === surface) return;
      m.surface = surface;
      const props = REMASTER_PHYSICS.surfaces[surface];
      m.aggregate.shape.material = {
        friction: props.friction,
        restitution: REMASTER_PHYSICS.marbleRestitution,
        restitutionCombine: PhysicsMaterialCombineMode.MAXIMUM,
      };
    },

    setLevel6MazePhase(phase: 0 | 1 | 2 | 3) {
      if (disposed || level.courseIndex !== 6) return;
      activeLevel6Phase = phase;
      const floorShape = level6MazeFloorShapes[phase];
      if (level6MazeFloorBody && floorShape) {
        level6MazeFloorBody.shape = floorShape;
      }
      const cliffShape = level6MazeCliffShapes[phase];
      if (level6MazeCliffBody && cliffShape) {
        level6MazeCliffBody.shape = cliffShape;
      }
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

        // Level 5 (Silly Race, direction === -1): exact ramp-tangent inverted gravity.
        // Gravity's tangent component along the cell plane is g_t = -|g|*(gx, gx^2+gz^2, gz)/denom.
        // Adding -3.8 * g_t has EXACTLY ZERO normal component (dot(F, n) === 0, so it never
        // lifts the sphere off the ramp and never increases normal friction) and produces a crisp
        // net UPHILL acceleration so the marble climbs every ramp on its own!
        if (
          level.direction === -1 &&
          mainLayer &&
          m.aggregate.body.getMotionType() === PhysicsMotionType.DYNAMIC
        ) {
          const px = m.mesh.position.x;
          const pz = m.mesh.position.z;
          const h0 = sampleLayerHeight(mainLayer, px, pz);
          const bottomY = m.mesh.position.y - radius;
          if (h0 !== null && Math.abs(bottomY - h0) < 0.65) {
            readCellGradInto(mainLayer, px, pz);
            let gx = tmpGrad.gx;
            let gz = tmpGrad.gz;
            // At the bottom crease of an uphill ramp, the sphere's front rim (r = 0.35) touches
            // the ramp while its center is still on the flat tile. Probe both along velocity AND
            // the 4 cardinal directions (0.44 cells) so even a slow/stopped marble gently touching
            // a steep ramp (e.g. 49°-60° white ramps) hooks effortlessly without Space boost.
            if (Math.abs(gx) <= 0.02 && Math.abs(gz) <= 0.02) {
              const hSpeed = Math.hypot(tmpVel.x, tmpVel.z);
              if (hSpeed > 0.15) {
                const probeX = px + (tmpVel.x / hSpeed) * 0.42;
                const probeZ = pz + (tmpVel.z / hSpeed) * 0.42;
                readCellGradInto(mainLayer, probeX, probeZ);
                if (tmpGrad.gx * tmpVel.x + tmpGrad.gz * tmpVel.z > 0.02) {
                  gx = tmpGrad.gx;
                  gz = tmpGrad.gz;
                }
              }
              if (Math.abs(gx) <= 0.02 && Math.abs(gz) <= 0.02) {
                // Cardinal rim-contact check (no allocations) for steep ramp creases at low speed.
                for (let dir = 0; dir < 4; dir++) {
                  const dx = dir === 0 ? 1 : dir === 1 ? -1 : 0;
                  const dz = dir === 2 ? 1 : dir === 3 ? -1 : 0;
                  const probeX = px + dx * 0.44;
                  const probeZ = pz + dz * 0.44;
                  readCellGradInto(mainLayer, probeX, probeZ);
                  if (tmpGrad.gx * dx + tmpGrad.gz * dz > 0.25) {
                    const hEdge = sampleLayerHeight(
                      mainLayer,
                      px + dx * 0.26,
                      pz + dz * 0.26,
                    );
                    if (hEdge !== null && Math.abs(hEdge - h0) < 0.45) {
                      gx = tmpGrad.gx;
                      gz = tmpGrad.gz;
                      break;
                    }
                  }
                }
              }
            }
            if (Math.abs(gx) > 0.02 || Math.abs(gz) > 0.02) {
              const denom = 1 + gx * gx + gz * gz;
              const accelScale =
                (3.8 * Math.abs(REMASTER_PHYSICS.gravityY)) / denom;
              // Apply directly to linear velocity so Havok sleep/static friction never stalls a stopped marble on a ramp.
              tmpVel.x += gx * accelScale * dt;
              tmpVel.y += (gx * gx + gz * gz) * accelScale * dt;
              tmpVel.z += gz * accelScale * dt;
              m.aggregate.body.setLinearVelocity(tmpVel);
            }
          }
        }
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
          !m.bridgeGrounded && m.prevVy < -2.0 && deltaVy > 2.5
            ? Math.abs(m.prevVy)
            : 0;
        // Sharp horizontal velocity reversal/impulse indicates a wall or obstacle bounce.
        const horizDelta = Math.hypot(tmpVel.x - m.prevVx, tmpVel.z - m.prevVz);
        if (horizDelta > 1.8 && m.wallCooldown <= 0) {
          m.lastWallImpact = horizDelta;
          m.wallCooldown = 0.14;
        } else {
          m.lastWallImpact = 0;
        }
        const activeHeightLayer =
          level6MazePhaseLayers[activeLevel6Phase] ?? mainLayer;
        const groundH = activeHeightLayer
          ? sampleLayerHeight(
              activeHeightLayer,
              m.mesh.position.x,
              m.mesh.position.z,
            )
          : null;
        const bottomY = m.mesh.position.y - radius;
        const grounded =
          m.bridgeGrounded ||
          (groundH !== null && Math.abs(bottomY - groundH) < 0.35);
        // PR #10: Arcade ice zones have zero friction & zero damping (decoded in romSurfaceZones.ts).
        const onIce = isIceAtWorld(level, m.mesh.position.x, m.mesh.position.z);
        const romSurface = onIce ? 'ice' : 'normal';
        if (onIce !== m.onRomIce) {
          m.onRomIce = onIce;
          const baseFriction = REMASTER_PHYSICS.surfaces[m.surface].friction;
          m.aggregate.shape.material = {
            friction: onIce ? 0.0 : baseFriction,
            staticFriction: onIce ? 0.0 : baseFriction,
            restitution: REMASTER_PHYSICS.marbleRestitution,
            restitutionCombine: PhysicsMaterialCombineMode.MAXIMUM,
          };
        }
        m.aggregate.body.setLinearDamping(
          surfaceLinearDamping(romSurface, grounded),
        );
        m.aggregate.body.setAngularDamping(surfaceAngularDamping(romSurface));
        // Level 6 (Ultimate Race) authentic 68010 ROM surface friction modes (0x12744..0x127EA):
        // - 'sand'    (0x2d, 0x2e): 4x drag (heavy amber sand slows the marble strongly).
        // - 'ribbed'  (0x2f..0x31): anisotropic washboard (5x drag across X grooves, 1x along Z).
        // - 'shimmer' (0x38..0x3a): negative drag speed += f/4 (lively hyper-slick peach plateaus).
        if (
          level.courseIndex === 6 &&
          mainLayer &&
          grounded &&
          !onIce &&
          m.aggregate.body.getMotionType() === PhysicsMotionType.DYNAMIC
        ) {
          const cellX =
            m.mesh.position.x + mainLayer.origin.x + mainLayer.columns / 2;
          const cellZ =
            m.mesh.position.z + mainLayer.origin.z + mainLayer.rows / 2;
          const mode = sampleLevel6SurfaceMode(cellX, cellZ);
          if (mode === 'sand') {
            m.aggregate.body.setLinearDamping(1.55);
          } else if (mode === 'ribbed') {
            // Anisotropic: strong drag across metallic ribs (X), normal along grooves (Z).
            const xDamp = Math.exp(-3.6 * dt);
            tmpVel.x *= xDamp;
            m.aggregate.body.setLinearVelocity(tmpVel);
          } else if (mode === 'shimmer') {
            m.aggregate.body.setLinearDamping(0.06);
            const hSpeed = Math.hypot(tmpVel.x, tmpVel.z);
            if (hSpeed > 0.35 && hSpeed < 14.5) {
              const boost = Math.min(14.5, hSpeed + 0.95 * dt) / hSpeed;
              tmpVel.x *= boost;
              tmpVel.z *= boost;
              m.aggregate.body.setLinearVelocity(tmpVel);
            }
          }
        }
        // Cap downward fall speed (matches 68010 terminal velocity) so jumps keep crisp
        // -30 gravity arcs while deep falls stay calm and readable.
        if (!grounded && tmpVel.y < -REMASTER_PHYSICS.maxFallSpeed) {
          tmpVel.y = -REMASTER_PHYSICS.maxFallSpeed;
          m.aggregate.body.setLinearVelocity(tmpVel);
        }
        // Suppress tiny internal-edge ghost hops ONLY when rolling downhill (never on uphill launch ramps).
        if (grounded && m.prevVy < -0.25 && tmpVel.y > 0.35 && tmpVel.y < 2.2) {
          tmpVel.y = 0;
          m.aggregate.body.setLinearVelocity(tmpVel);
        }
        // Level 5 (Silly Race) & Level 6 (Ultimate Race): keep the marble glued to the floor
        // when cresting ramps (like Level 6's steep white start mound) onto flat tiles,
        // while NEVER clamping vy when approaching or climbing an uphill ramp (slopeVyAhead > 0.05)!
        if (
          (level.direction === -1 || level.courseIndex === 6) &&
          activeHeightLayer &&
          groundH !== null &&
          bottomY - groundH > -0.15 &&
          bottomY - groundH < 0.45 &&
          m.aggregate.body.getMotionType() === PhysicsMotionType.DYNAMIC
        ) {
          const slopeVyAhead = sampleCellSlopeVy(
            activeHeightLayer,
            m.mesh.position.x + tmpVel.x * 0.05,
            m.mesh.position.z + tmpVel.z * 0.05,
            tmpVel.x,
            tmpVel.z,
          );
          if (slopeVyAhead <= 0.05 && tmpVel.y > 0.08) {
            tmpVel.y = bottomY > groundH + 0.02 ? -1.2 : 0;
            m.aggregate.body.setLinearVelocity(tmpVel);
          }
        }
        m.bridgeGrounded = false;
      }
    },

    readMarble(playerIndex: 0 | 1): PhysicsMarbleSnapshot {
      const m = marbles[playerIndex];
      if (!m || disposed) {
        return {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: false,
          impactSpeed: 0,
        };
      }
      m.aggregate.body.getLinearVelocityToRef(tmpVel);
      const bottomY = m.mesh.position.y - radius;
      const activeHeightLayer =
        level6MazePhaseLayers[activeLevel6Phase] ?? mainLayer;
      const groundH = activeHeightLayer
        ? sampleLayerHeight(
            activeHeightLayer,
            m.mesh.position.x,
            m.mesh.position.z,
          )
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
      restitution = 0.9,
    ): number {
      const m = marbles[playerIndex];
      const e = enemyBodies[enemyIndex];
      if (!m || !e || disposed) return 0;
      const dx = m.mesh.position.x - e.mesh.position.x;
      const dz = m.mesh.position.z - e.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius * 2.15;
      if (dist <= 0.0001 || dist >= minDist) return 0;
      const nx = dx / dist;
      const nz = dz / dist;

      m.aggregate.body.getLinearVelocityToRef(tmpV1);
      e.aggregate.body.getLinearVelocityToRef(tmpV2);

      // Separate overlap so spheres never glue together.
      const overlap = Math.max(0, (radius * 2.04 - dist) * 0.6);
      if (overlap > 0) {
        m.mesh.position.x += nx * overlap;
        m.mesh.position.z += nz * overlap;
        e.mesh.position.x -= nx * overlap;
        e.mesh.position.z -= nz * overlap;
      }

      // 2D elastic billiard-ball impulse along collision normal (guarantees crisp recoil).
      const rvx = tmpV1.x - tmpV2.x;
      const rvz = tmpV1.z - tmpV2.z;
      const velAlongNormal = rvx * nx + rvz * nz;
      if (velAlongNormal > 3.5) return velAlongNormal;
      const closing = velAlongNormal < -1.5 ? velAlongNormal : -4.2;
      const invM1 = 1 / REMASTER_PHYSICS.marbleMass;
      const invM2 = 1 / (REMASTER_PHYSICS.marbleMass * 0.55);
      const j = (-(1 + restitution) * closing) / (invM1 + invM2);

      tmpV1.x += j * invM1 * nx;
      tmpV1.z += j * invM1 * nz;
      tmpV2.x -= j * invM2 * nx;
      tmpV2.z -= j * invM2 * nz;
      m.aggregate.body.setLinearVelocity(tmpV1);
      e.aggregate.body.setLinearVelocity(tmpV2);
      return Math.abs(closing);
    },

    resolvePlayerBilliardCollision(restitution = 0.86): number {
      const m0 = marbles[0];
      const m1 = marbles[1];
      if (!m0 || !m1 || disposed) return 0;
      const dx = m0.mesh.position.x - m1.mesh.position.x;
      const dz = m0.mesh.position.z - m1.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius * 2.12;
      if (dist <= 0.0001 || dist >= minDist) return 0;
      const nx = dx / dist;
      const nz = dz / dist;

      m0.aggregate.body.getLinearVelocityToRef(tmpV1);
      m1.aggregate.body.getLinearVelocityToRef(tmpV2);

      const overlap = Math.max(0, (radius * 2.04 - dist) * 0.6);
      if (overlap > 0) {
        m0.mesh.position.x += nx * overlap;
        m0.mesh.position.z += nz * overlap;
        m1.mesh.position.x -= nx * overlap;
        m1.mesh.position.z -= nz * overlap;
      }

      const rvx = tmpV1.x - tmpV2.x;
      const rvz = tmpV1.z - tmpV2.z;
      const velAlongNormal = rvx * nx + rvz * nz;
      if (velAlongNormal >= 0) return 0;
      const j = (-(1 + restitution) * velAlongNormal) / 2;
      tmpV1.x += j * nx;
      tmpV1.z += j * nz;
      tmpV2.x -= j * nx;
      tmpV2.z -= j * nz;
      m0.aggregate.body.setLinearVelocity(tmpV1);
      m1.aggregate.body.setLinearVelocity(tmpV2);
      return Math.abs(velAlongNormal);
    },

    teleportEnemy(enemyIndex: number, position: Vec3) {
      const e = enemyBodies[enemyIndex];
      if (!e || disposed) return;
      e.mesh.position.set(position.x, position.y + radius, position.z);
      e.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      e.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    },

    setEnemyKinematic(enemyIndex: number, kinematic: boolean) {
      const e = enemyBodies[enemyIndex];
      if (!e || disposed) return;
      e.aggregate.body.setMotionType(
        kinematic ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC,
      );
      e.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      e.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    },

    readEnemy(enemyIndex: number): PhysicsMarbleSnapshot {
      const e = enemyBodies[enemyIndex];
      if (!e || disposed) {
        return {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: false,
          impactSpeed: 0,
        };
      }
      e.aggregate.body.getLinearVelocityToRef(tmpVel);
      const bottomY = e.mesh.position.y - radius;
      const activeHeightLayer =
        level6MazePhaseLayers[activeLevel6Phase] ?? mainLayer;
      const groundH = activeHeightLayer
        ? sampleLayerHeight(
            activeHeightLayer,
            e.mesh.position.x,
            e.mesh.position.z,
          )
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
      for (const body of ownedBodies) body.dispose();
      for (const shape of ownedShapes) shape.dispose();
      for (const mesh of ownedMeshes) mesh.dispose();
      scene.disablePhysicsEngine();
    },
  };
}
