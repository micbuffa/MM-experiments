import { createLevel5Terrain } from './createLevel5Terrain';
import { level4LandingNormals } from './level4LandingNormals';
import { splitLevel4LandingWalls } from './level4LandingWalls';
import {
  openLevel4Bridge,
  createLevel4ArchBridge,
} from './createLevel4ArchBridge';
import { createRollingCatapult } from './createRollingCatapult';
import { createRollingHammers } from './createRollingHammers';
import type { RollingActors } from '../emulation/rollingActors';
import { createStarfield } from './createStarfield';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  practiceFinishScroll,
} from '../game/modern/practiceProjection';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh } from '../game/modern/terrainMesh';
import { createPracticeCamera } from './createPracticeCamera';
import {
  createPracticeGoalFlags,
  createPracticeGoalMaterial,
} from './createPracticeGoal';
import {
  createPracticeLandmarks,
  practiceDisplayTerrain,
} from './createPracticeLandmarks';
import {
  createPracticeSurfaceMaterial,
  splitPracticePitWalls,
  stylePracticeWalls,
  extendPracticePitRims,
} from './createPracticeSurfaceMaterial';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  intermediateOpeningScroll,
  level3OpeningScroll,
  level4OpeningScroll,
  level5OpeningScroll,
  type PracticeTerrain,
} from '../game/modern/practiceTerrain';
import { createIntermediateCliffMaterial } from './createIntermediateCliffMaterial';
import {
  createLevel4CliffMaterial,
  createLevel4FloorMaterial,
  createLevel4Landmarks,
  createLevel4TopFloorMaterial,
  isLevel4TopRamp,
  level4CliffColors,
  level4DisplayTerrain,
  level4Goal,
} from './createLevel4Materials';
import {
  carveLevel3WallNiches,
  createLevel3CliffMaterial,
  createLevel3FloorMaterial,
  createLevel3OpeningTowers,
  createLevel3Pipe,
  createLevel3TurquoiseCurbMaterial,
  createLevel3TurquoiseSpike,
  createLevel3Wave,
  isLevel3TurquoiseCurb,
  level3CurbColors,
  level3DisplayTerrain,
  level3Goal,
  stripLevel3OpeningCliffs,
  waveRegion,
} from './createLevel3Materials';
import { createIntermediatePipes } from './createIntermediatePipes';
import { intermediatePipeFloorIndices } from './intermediatePipeSurfaces';
import {
  intermediateFinishContains,
  intermediateFinishSurface,
  intermediateGoal,
  intermediateIce,
} from './intermediateFinish';
import {
  createIntermediateIceMaterial,
  createIntermediateIceWallMaterial,
} from './intermediateIceMaterial';
import { splitIntermediateIceWalls } from './intermediateIceWalls';
import {
  createIntermediateBridge,
  hasIntermediateBridge,
} from './createIntermediateBridge';
import {
  carveIntermediateAlcove,
  createIntermediateAlcoveShelf,
  createIntermediateTowers,
  intermediateDisplayTerrain,
  intermediateSlopeColors,
} from './intermediateLandmarks';

import {
  createPracticeArrowMaterial,
  practiceArrowMesh,
  practiceCenterArrowMesh,
} from './createPracticeMarkings';

import { createPracticeSun } from './createPracticeSun';
import { extendPracticeDescentCliffs } from './practiceChannelTerrain';
import {
  createPracticeNumberSignMaterial,
  practiceNumberSignMesh,
  practiceNumberSignPlacements,
} from './createPracticeNumberSigns';

const upper = [1.5, 1.5, 1.5, 1.5] as const;
const slope = [1.5, 1.5, 0.75, 0.75] as const;
const lower = [0.75, 0.75, 0.75, 0.75] as const;
const cells: readonly (readonly TerrainCell[])[] = [
  [null, null, upper, upper, upper, null, null],
  [upper, null, upper, upper, upper, null, upper],
  [upper, null, slope, slope, slope, null, upper],
  [null, null, lower, lower, lower, null, null],
  [null, lower, lower, lower, lower, lower, null],
  [null, null, lower, lower, lower, null, null],
];

export function createTerrainStudy(
  engine: AbstractEngine,
  canvas?: HTMLCanvasElement,
  measured?: PracticeTerrain,
  live = false,
  actors?: RollingActors,
) {
  const scene = new Scene(engine);
  if (measured) createStarfield(scene);
  const surveySize = measured
    ? Math.max(measured.cells.length, measured.cells[0]!.length)
    : 0;
  scene.clearColor = measured
    ? new Color4(0, 0, 0, 1)
    : new Color4(0.035, 0.055, 0.09, 1);
  const camera = new ArcRotateCamera(
    'terrain-camera',
    measured ? Math.PI / 4 : -Math.PI / 3,
    Math.PI / 3,
    measured ? surveySize * 1.55 : 12,
    new Vector3(0, measured ? 0 : 0.8, 0),
    scene,
  );
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = measured ? Math.max(65, surveySize * 2) : 22;
  if (canvas) camera.attachControl(canvas, true);
  const fill = new HemisphericLight('sky', Vector3.Up(), scene);
  fill.intensity = measured ? 0.22 : 0.55;
  if (measured) fill.groundColor.set(0.34, 0.34, 0.34);
  else {
    const key = new DirectionalLight('key', new Vector3(-0.9, -1, 0.45), scene);
    key.intensity = 1.2;
    key.diffuse = new Color3(1, 0.89, 0.74);
  }

  function createMesh(name: string, geometry: ReturnType<typeof terrainMesh>) {
    const mesh = new Mesh(name, scene);
    const data = new VertexData();
    Object.assign(data, geometry);
    data.normals = [];
    VertexData.ComputeNormals(
      geometry.positions,
      geometry.indices,
      data.normals,
    );
    data.applyToMesh(mesh);
    return mesh;
  }
  const intermediate = measured?.level === 'intermediate';
  const level3 = measured?.level === 'level3';
  const level4 = measured?.level === 'level4';
  if (measured?.level === 'level5') {
    createPracticeCamera(
      scene,
      measured.cells[0]!.length,
      measured.cells.length,
      measured.origin,
      level5OpeningScroll,
    );
    fill.intensity = 0.18;
    createLevel5Terrain(scene, measured, actors);
    return scene;
  }
  const displayCells = !measured
    ? cells
    : intermediate
      ? intermediateDisplayTerrain(measured)
      : level3
        ? level3DisplayTerrain(measured.cells)
        : level4
          ? level4DisplayTerrain(measured.cells)
          : practiceDisplayTerrain(measured);
  const surface = terrainMesh(displayCells);
  const baseSurfaceVertices = surface.positions.length / 3;
  if (measured) {
    createPracticeCamera(
      scene,
      measured.cells[0]!.length,
      measured.cells.length,
      measured.origin,
      intermediate
        ? intermediateOpeningScroll
        : level3
          ? level3OpeningScroll
          : level4
            ? level4OpeningScroll
            : undefined,
    );
    let lowest = 0;
    for (let index = 1; index < surface.positions.length; index += 3)
      lowest = Math.min(lowest, surface.positions[index]!);
    const base = lowest - (intermediate || level3 || level4 ? 18 : 10);
    const walls = terrainCliffs(
      surface,
      measured.cells[0]!.length,
      measured.cells.length,
      base,
    );
    if (level4) {
      fill.intensity = 0.3;
      fill.groundColor.set(0.25, 0.25, 0.25);
      const splitWalls = splitLevel4LandingWalls(
        openLevel4Bridge(
          walls,
          measured.cells[0]!.length,
          measured.cells.length,
        ),
        measured.cells[0]!.length,
        measured.cells.length,
      );
      const cliffs = createMesh('terrain-cliffs', splitWalls.cliffs);
      cliffs.setVerticesData(
        VertexBuffer.ColorKind,
        level4CliffColors(
          walls.positions,
          measured.cells[0]!.length,
          measured.cells.length,
        ),
      );
      cliffs.material = createLevel4CliffMaterial(scene);
      cliffs.receiveShadows = true;
      const shadows = createPracticeSun(
        scene,
        Math.hypot(measured.cells[0]!.length, measured.cells.length),
        'intermediate',
      );
      shadows.darkness = 0.1;
      shadows.bias = 0.0005;
      shadows.normalBias = 0.02;
      shadows.usePercentageCloserFiltering = true;
      shadows.addShadowCaster(cliffs, false);
      if (splitWalls.landing.indices.length) {
        const landing = createMesh('level4-landing-cliffs', splitWalls.landing);
        landing.setVerticesData(
          VertexBuffer.ColorKind,
          level4CliffColors(
            splitWalls.landing.positions,
            measured.cells[0]!.length,
            measured.cells.length,
          ),
        );
        landing.material = cliffs.material;
        // Receive the curved silhouette of the opposite arch on the landing wall.
        landing.receiveShadows = true;
        shadows.addShadowCaster(landing, false);
      }
      const yWalkway =
        ((16320 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
      const mainSurface = terrainMesh(
        displayCells.map((row, z) =>
          row.map((cell, x) => {
            if (x === 22 && z === 23) return null;
            if (x >= 87 && x < 90 && z >= 88 && z < 97) return null;
            if (
              (x === 22 && z >= 24 && z <= 26) ||
              (z === 23 && x >= 23 && x <= 27)
            )
              return [yWalkway, yWalkway, yWalkway, yWalkway];
            return isLevel4TopRamp(cell, x, z) ? null : cell;
          }),
        ),
      );
      const topSurface = terrainMesh(
        displayCells.map((row, z) =>
          row.map((cell, x) => (isLevel4TopRamp(cell, x, z) ? cell : null)),
        ),
      );
      const floor = createMesh('terrain-surface', mainSurface);
      const floorNormals = floor.getVerticesData(VertexBuffer.NormalKind);
      if (floorNormals) {
        const landingNormals = level4LandingNormals(
          mainSurface,
          floorNormals,
          measured.cells[0]!.length,
          measured.cells.length,
        );
        floor.setVerticesData(VertexBuffer.NormalKind, landingNormals);
        floor.setVerticesData(
          VertexBuffer.ColorKind,
          intermediateSlopeColors(landingNormals),
        );
      }
      floor.material = createLevel4FloorMaterial(scene);
      floor.receiveShadows = true;
      if (topSurface.indices.length) {
        const topFloor = createMesh('level4-top-surface', topSurface);
        topFloor.material = createLevel4TopFloorMaterial(scene);
        topFloor.receiveShadows = true;
        shadows.addShadowCaster(topFloor, false);
      }
      const goal = intermediateFinishSurface(displayCells, level4Goal, 'goal');
      if (goal.indices.length) {
        const finish = createMesh('level4-finish', goal);
        finish.position.y = 0.015;
        finish.receiveShadows = true;
        finish.material = createPracticeGoalMaterial(scene, 'intermediate');
        createPracticeGoalFlags(scene, measured);
      }
      for (const arch of createLevel4ArchBridge(scene, displayCells))
        shadows.addShadowCaster(arch, false);
      const lowerUnderpass = terrainMesh(
        displayCells.map((row, z) =>
          row.map((_, x) => {
            if (x < 87 || x >= 90 || z < 88 || z >= 97) return null;
            const y =
              ((16228 - arcadeGroundHeight) * arcadeHeightScale) /
              arcadeCellUnits;
            return [y, y, y, y];
          }),
        ),
      );
      if (lowerUnderpass.indices.length) {
        const underpassFloor = createMesh(
          'level4-underpass-surface',
          lowerUnderpass,
        );
        const underpassNormals = underpassFloor.getVerticesData(
          VertexBuffer.NormalKind,
        );
        if (underpassNormals)
          underpassFloor.setVerticesData(
            VertexBuffer.ColorKind,
            intermediateSlopeColors(underpassNormals),
          );
        underpassFloor.material = floor.material;
        underpassFloor.receiveShadows = true;
        const underpassWalls = terrainCliffs(
          lowerUnderpass,
          measured.cells[0]!.length,
          measured.cells.length,
          base,
        );
        // Keep only the two outer side walls of the lower underpass corridor (X=87 and X=90 across Z=91..95)
        const filteredUnderpassIndices: number[] = [];
        const cols = measured.cells[0]!.length;
        const rowsCount = measured.cells.length;
        for (let i = 0; i < underpassWalls.indices.length; i += 3) {
          const tri = underpassWalls.indices.slice(i, i + 3);
          const xs = tri.map(
            (v) => underpassWalls.positions[v * 3]! + cols / 2,
          );
          const zs = tri.map(
            (v) => underpassWalls.positions[v * 3 + 2]! + rowsCount / 2,
          );
          const onOuterSides =
            (xs.every((v) => Math.abs(v - 87) < 0.01) ||
              xs.every((v) => Math.abs(v - 90) < 0.01)) &&
            Math.min(...zs) >= 90.99 &&
            Math.max(...zs) <= 95.01;
          if (onOuterSides) filteredUnderpassIndices.push(...tri);
        }
        if (filteredUnderpassIndices.length) {
          const underpassCliffs = createMesh('level4-underpass-cliffs', {
            ...underpassWalls,
            indices: filteredUnderpassIndices,
          });
          underpassCliffs.setVerticesData(
            VertexBuffer.ColorKind,
            level4CliffColors(
              underpassWalls.positions,
              measured.cells[0]!.length,
              measured.cells.length,
            ),
          );
          underpassCliffs.material = cliffs.material;
          underpassCliffs.receiveShadows = true;
          shadows.addShadowCaster(underpassCliffs, false);
        }
      }
      for (const landmark of createLevel4Landmarks(scene, displayCells, live)) {
        shadows.addShadowCaster(landmark, false);
      }
      if (actors) {
        createRollingCatapult(scene, actors);
        createRollingHammers(scene, actors, live);
      }
      return scene;
    }
    if (level3) {
      fill.intensity = 0.18;
      fill.groundColor.set(0.14, 0.12, 0.1);
      const cliffMaterial = createLevel3CliffMaterial(scene);
      const hasOpeningTowers = displayCells[7]?.[20] != null;
      const strippedWalls = hasOpeningTowers
        ? stripLevel3OpeningCliffs(
            walls,
            measured.cells[0]!.length,
            measured.cells.length,
          )
        : walls;
      const level3Walls = carveLevel3WallNiches(
        strippedWalls,
        measured.cells[0]!.length,
        measured.cells.length,
      );
      const cliffs = createMesh('terrain-cliffs', level3Walls);
      cliffs.material = cliffMaterial;
      cliffs.receiveShadows = true;
      const shadows = createPracticeSun(
        scene,
        Math.hypot(measured.cells[0]!.length, measured.cells.length),
        'intermediate',
      );
      shadows.darkness = 0.1;
      shadows.usePercentageCloserFiltering = true;
      shadows.normalBias = 0.02;
      shadows.addShadowCaster(cliffs, false);
      if (hasOpeningTowers) {
        const towers = createLevel3OpeningTowers(
          scene,
          measured.cells[0]!.length,
          measured.cells.length,
          base,
        );
        shadows.addShadowCaster(towers, false);
      }
      if (measured.pipes) {
        const [shell, interior] = createLevel3Pipe(scene, measured.pipes);
        shadows.addShadowCaster(shell, false);
        shadows.addShadowCaster(interior, false);
      }
      const stoneSurface = terrainMesh(
        displayCells.map((row, z) =>
          row.map((cell, x) =>
            isLevel3TurquoiseCurb(x, z) ||
            (x >= waveRegion.x &&
              x < waveRegion.x + waveRegion.width &&
              z >= waveRegion.z &&
              z < waveRegion.z + waveRegion.length)
              ? null
              : cell,
          ),
        ),
      );
      const curbSurface = terrainMesh(
        displayCells.map((row, z) =>
          row.map((cell, x) => (isLevel3TurquoiseCurb(x, z) ? cell : null)),
        ),
      );
      const floor = createMesh('terrain-surface', stoneSurface);
      const floorNormals = floor.getVerticesData(VertexBuffer.NormalKind);
      if (floorNormals)
        floor.setVerticesData(
          VertexBuffer.ColorKind,
          intermediateSlopeColors(floorNormals),
        );
      floor.material = createLevel3FloorMaterial(scene);
      floor.receiveShadows = true;
      if (curbSurface.indices.length) {
        const curbMaterial = createLevel3TurquoiseCurbMaterial(scene);
        const curbs = createMesh('level3-turquoise-curbs', curbSurface);
        const curbNormals = curbs.getVerticesData(VertexBuffer.NormalKind);
        if (curbNormals)
          curbs.setVerticesData(
            VertexBuffer.ColorKind,
            level3CurbColors(curbNormals),
          );
        curbs.material = curbMaterial;
        curbs.receiveShadows = false;
        const spike = createLevel3TurquoiseSpike(scene, displayCells);
        if (spike) shadows.addShadowCaster(spike, false);
      }
      const wave = createLevel3Wave(scene, displayCells, live);
      if (wave) shadows.addShadowCaster(wave, false);
      const goal = intermediateFinishSurface(displayCells, level3Goal, 'goal');
      if (goal.indices.length) {
        const finish = createMesh('level3-finish', goal);
        finish.position.y = 0.015;
        finish.receiveShadows = true;
        finish.material = createPracticeGoalMaterial(scene, 'intermediate');
        createPracticeGoalFlags(scene, measured);
      }
      return scene;
    }
    if (intermediate) {
      const { cliffs: rawBlueCliffs, lip } = splitIntermediateIceWalls(
        walls,
        measured.cells[0]!.length,
        measured.cells.length,
      );
      const { cliffs: blueCliffs, carved: hasAlcove } = carveIntermediateAlcove(
        rawBlueCliffs,
        measured.cells[0]!.length,
        measured.cells.length,
      );
      const cliffs = createMesh('terrain-cliffs', blueCliffs);
      cliffs.material = createIntermediateCliffMaterial(scene);
      cliffs.receiveShadows = true;
      const shadows = createPracticeSun(
        scene,
        Math.hypot(measured.cells[0]!.length, measured.cells.length),
        'intermediate',
      );
      shadows.usePercentageCloserFiltering = true;
      shadows.normalBias = 0.02;
      shadows.addShadowCaster(cliffs, false);
      for (const tower of createIntermediateTowers(scene, measured))
        shadows.addShadowCaster(tower, false);
      const ice = intermediateFinishSurface(
        displayCells,
        intermediateIce,
        'ice',
      );
      const tiles = terrainMesh(
        displayCells.map((row, z) =>
          row.map((cell, x) =>
            intermediateFinishContains(intermediateIce, x, z) ? null : cell,
          ),
        ),
      );
      if (measured.pipes) {
        const split = intermediatePipeFloorIndices(
          tiles.positions,
          tiles.indices,
        );
        tiles.indices = split.paving;
        const liningPositions = [...tiles.positions];
        const liningIndices = [...split.lining];
        // Add a tapered dark interior floor strictly inside the Y-pipe outlet funnel
        // without protruding past the narrowing barrel or generating a cliff beneath it.
        const yOutlet =
          ((16128 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
        const xOff = measured.cells[0]!.length / 2;
        const zOff = measured.cells.length / 2;
        const baseIdx = liningPositions.length / 3;
        liningPositions.push(
          82.75 - xOff,
          yOutlet,
          92.9 - zOff,
          84.25 - xOff,
          yOutlet,
          92.9 - zOff,
          84.95 - xOff,
          yOutlet,
          95 - zOff,
          82.05 - xOff,
          yOutlet,
          95 - zOff,
        );
        liningIndices.push(
          baseIdx,
          baseIdx + 1,
          baseIdx + 2,
          baseIdx,
          baseIdx + 2,
          baseIdx + 3,
        );
        const [shell, interior] = createIntermediatePipes(
          scene,
          measured.pipes,
          {
            positions: liningPositions,
            indices: liningIndices,
          },
        );
        shadows.addShadowCaster(shell, false);
        shadows.addShadowCaster(interior, false);
      }
      const floor = createMesh('terrain-surface', tiles);
      const floorNormals = floor.getVerticesData(VertexBuffer.NormalKind);
      if (floorNormals)
        floor.setVerticesData(
          VertexBuffer.ColorKind,
          intermediateSlopeColors(floorNormals),
        );
      const paving = createPracticeSurfaceMaterial(
        scene,
        'floor',
        'intermediate',
      );
      floor.material = paving;
      floor.receiveShadows = true;
      if (hasAlcove)
        for (const shelf of createIntermediateAlcoveShelf(
          scene,
          paving,
          measured.cells[0]!.length,
          measured.cells.length,
        ))
          shadows.addShadowCaster(shelf, false);
      if (ice.indices.length) {
        const bowl = createMesh('intermediate-ice', ice);
        bowl.convertToFlatShadedMesh();
        bowl.material = createIntermediateIceMaterial(scene, displayCells);
        bowl.receiveShadows = true;
        if (lip.indices.length) {
          const mesh = createMesh('intermediate-ice-lip', lip);
          mesh.material = createIntermediateIceWallMaterial(scene);
          mesh.receiveShadows = true;
          shadows.addShadowCaster(mesh, false);
        }
      }
      const goal = intermediateFinishSurface(
        displayCells,
        intermediateGoal,
        'goal',
      );
      if (goal.indices.length) {
        const finish = createMesh('intermediate-finish', goal);
        finish.position.y = 0.015;
        finish.receiveShadows = true;
        finish.material = createPracticeGoalMaterial(scene, 'intermediate');
        createPracticeGoalFlags(scene, measured);
      }
      if (hasIntermediateBridge(measured))
        shadows.addShadowCaster(
          createIntermediateBridge(scene, measured, paving, live),
          false,
        );
      return scene;
    }
    let practiceCliffs: Mesh | undefined;
    if (walls.indices.length) {
      extendPracticePitRims(
        surface,
        walls.positions,
        measured.origin,
        measured.cells[0]!.length,
        measured.cells.length,
        base,
      );
      if (measured.lastScroll === practiceFinishScroll) {
        extendPracticeDescentCliffs(
          walls.positions,
          base,
          measured.origin.x + measured.cells[0]!.length / 2,
          measured.origin.z + measured.cells.length / 2,
        );
      }
      const xOrigin = measured.origin.x + measured.cells[0]!.length / 2;
      const zOrigin = measured.origin.z + measured.cells.length / 2;
      const wallColors = stylePracticeWalls(
        walls.positions,
        walls.uvs,
        xOrigin,
        zOrigin,
      );
      const wallMaterial = createPracticeSurfaceMaterial(scene, 'wall');
      const { cliffs: cliffWalls, pits: pitWalls } = splitPracticePitWalls(
        walls,
        wallColors,
        xOrigin,
        zOrigin,
      );
      if (cliffWalls.indices.length) {
        practiceCliffs = createMesh('terrain-cliffs', cliffWalls);
        practiceCliffs.setVerticesData(
          VertexBuffer.ColorKind,
          cliffWalls.colors,
        );
        practiceCliffs.material = wallMaterial;
        practiceCliffs.receiveShadows = true;
      }
      if (pitWalls.indices.length) {
        const pits = createMesh('terrain-pit-walls', pitWalls);
        pits.setVerticesData(VertexBuffer.ColorKind, pitWalls.colors);
        pits.material = wallMaterial;
        pits.receiveShadows = false;
      }
    }
    const props = createPracticeLandmarks(scene, measured, displayCells);
    const shadows = createPracticeSun(
      scene,
      Math.hypot(measured.cells[0]!.length, measured.cells.length),
    );
    shadows.usePercentageCloserFiltering = true;
    shadows.normalBias = 0.02;
    if (practiceCliffs) shadows.addShadowCaster(practiceCliffs, false);
    for (const mesh of props.getChildMeshes())
      shadows.addShadowCaster(mesh, false);
    const arrowPaint = createPracticeArrowMaterial(scene);
    for (const acrossX of [false, true]) {
      const arrow = practiceArrowMesh(measured, acrossX);
      if (!arrow.indices.length) continue;
      const mark = createMesh(
        acrossX ? 'practice-arrow-x' : 'practice-arrow-z',
        arrow,
      );
      mark.position.y = 0.012;
      mark.material = arrowPaint;
      mark.receiveShadows = true;
    }
    const centerArrow = practiceCenterArrowMesh(measured);
    if (centerArrow.indices.length) {
      const mark = createMesh('practice-arrow-center', centerArrow);
      mark.position.y = 0.012;
      mark.material = createPracticeArrowMaterial(scene, true);
      mark.receiveShadows = true;
    }
    const signs = practiceNumberSignPlacements.map((placement) =>
      practiceNumberSignMesh(
        { origin: measured.origin, cells: displayCells },
        placement,
      ),
    );
    let signPaint: StandardMaterial | undefined;
    let leftSignPaint: StandardMaterial | undefined;
    for (const [index, geometry] of signs.entries()) {
      if (!geometry.indices.length) continue;
      const sign = createMesh(`practice-number-sign-${index}`, geometry);
      sign.position.y = 0.016;
      sign.material = practiceNumberSignPlacements[index]!.acrossX
        ? (leftSignPaint ??= createPracticeNumberSignMaterial(scene, true))
        : (signPaint ??= createPracticeNumberSignMaterial(scene, false));
      sign.receiveShadows = true;
    }
    if (measured.lastScroll === practiceFinishScroll) {
      // The GOAL banner crosses the full width of the chute.
      const finishCells = displayCells.map((row, z) =>
        row.map((cell, x) =>
          x >= 72 && x <= 79 && z >= 64 && z <= 67 ? cell : null,
        ),
      );
      const banner = terrainMesh(finishCells);
      if (banner.indices.length) {
        for (let index = 0; index < banner.uvs.length; index += 2) {
          banner.uvs[index] = (80 - banner.uvs[index]!) / 8;
          banner.uvs[index + 1] = (banner.uvs[index + 1]! - 64) / 4;
        }
        const finish = createMesh('practice-finish', banner);
        finish.position.y = 0.015;
        finish.receiveShadows = true;
        finish.material = createPracticeGoalMaterial(scene, 'idle');
        createPracticeGoalMaterial(scene, 'blue');
        createPracticeGoalMaterial(scene, 'red');
        createPracticeGoalFlags(scene, measured);
      }
    }
  }
  const floor = createMesh('terrain-surface', surface);
  if (surface.positions.length / 3 > baseSurfaceVertices) {
    const normals = floor.getVerticesData(VertexBuffer.NormalKind);
    if (normals) {
      for (let i = baseSurfaceVertices * 3; i < normals.length; i += 3) {
        normals[i] = 0;
        normals[i + 1] = 1;
        normals[i + 2] = 0;
      }
      floor.setVerticesData(VertexBuffer.NormalKind, normals);
    }
  }
  floor.material = createPracticeSurfaceMaterial(scene, 'floor');
  floor.receiveShadows = measured !== undefined;
  return scene;
}
