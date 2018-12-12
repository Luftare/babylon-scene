import {
  Axis,
  Scene,
  Engine,
  Mesh,
  Color3,
  Vector3,
  Matrix,
  FreeCamera,
  PointLight,
  DirectionalLight,
  StandardMaterial,
} from 'babylonjs';

import heightmap from './heightmap.png';

const canvas = document.querySelector('canvas');
const engine = new Engine(canvas);
const scene = new Scene(engine);
const camera = new FreeCamera('camera', new Vector3(0, 20, 0), scene);
const light = new PointLight('light', new Vector3(0, 100, 0), scene);

const groundMaterial = new StandardMaterial('ground', scene);
const ground = Mesh.CreateGroundFromHeightMap(
  'ground',
  heightmap,
  250, //width
  250, //height
  50, //subdivisions count
  0, //min height
  30, //max height
  scene,
  false
);

light.intensity = 0.5;
scene.clearColor = new Color3(0.9, 0.95, 1);
groundMaterial.diffuseColor = new Color3(0.8, 0.4, 1);
ground.material = groundMaterial;

const keysDown = {};

canvas.addEventListener('click', () => {
  canvas.requestPointerLock();
});

canvas.addEventListener('mousemove', ({ movementX, movementY }) => {
  camera.rotation.y += movementX * 0.002;
  camera.rotation.x += movementY * 0.002;
});

window.addEventListener('keydown', ({ key }) => {
  keysDown[key] = true;
});

window.addEventListener('keyup', ({ key }) => {
  keysDown[key] = false;
});

const gravity = 0.1;
let cameraVelocityY = 0;

function rotateVectorY(vector, angle) {
  return Vector3.TransformCoordinates(
    vector,
    Matrix.RotationAxis(Axis.Y, angle)
  );
}

engine.runRenderLoop(() => {
  const { a: left, d: right, w: up, s: down, ' ': space } = keysDown;

  const inputVector = new Vector3(0, 0, 0);
  if (right) inputVector.addInPlace(new Vector3(1, 0, 0));
  if (left) inputVector.addInPlace(new Vector3(-1, 0, 0));
  if (up) inputVector.addInPlace(new Vector3(0, 0, 1));
  if (down) inputVector.addInPlace(new Vector3(0, 0, -1));
  if (space) cameraVelocityY = 2;

  const walkVelocity = rotateVectorY(
    inputVector,
    camera.rotation.y
  ).normalize();

  cameraVelocityY -= gravity;

  camera.position.addInPlace(walkVelocity);
  camera.position.y += cameraVelocityY;

  ground.updateCoordinateHeights();

  const height = ground.getHeightAtCoordinates(
    camera.position.x,
    camera.position.z
  );

  if (height) {
    camera.position.y = Math.max(camera.position.y, 5 + height);
  }

  scene.render();
});
