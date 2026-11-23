import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Scene } from '@babylonjs/core/scene';

export function createScene(
  engine: AbstractEngine,
  canvas?: HTMLCanvasElement,
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.07, 0.09, 0.15, 1);
  const camera = new ArcRotateCamera(
    'camera',
    -Math.PI / 2,
    Math.PI / 3,
    12,
    Vector3.Zero(),
    scene,
  );
  if (canvas) camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 25;
  new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);

  const board = CreateGround('board', { width: 8, height: 8 }, scene);
  const boardMaterial = new StandardMaterial('board-material', scene);
  boardMaterial.diffuseColor = new Color3(0.2, 0.35, 0.5);
  board.material = boardMaterial;

  const marble = CreateSphere('marble', { diameter: 1 }, scene);
  marble.position.y = 0.5;
  const marbleMaterial = new StandardMaterial('marble-material', scene);
  marbleMaterial.diffuseColor = new Color3(0.95, 0.6, 0.2);
  marble.material = marbleMaterial;
  return scene;
}
