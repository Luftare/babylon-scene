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
  SceneLoader,
  HemisphericLight,
  MeshBuilder,
} from 'babylonjs';

import heightmap from './heightmap.png';
import heightmap3 from './heightmap3.png';
import pineMesh from './assets/pine.babylon';

const WIDTH = 1023;
const HEIGHT = 1023;

const canvas = document.querySelector('canvas');
const engine = new Engine(canvas);
const scene = new Scene(engine);
scene.collisionsEnabled = true;

const cameraCollider = new Mesh.CreateSphere('cameraCollider', 32, 2, scene);
cameraCollider.checkCollisions = true;

const camera = new FreeCamera('camera', new Vector3(0, 30, 0), scene);

const hemisphericLight = new HemisphericLight(
  'hemiLight',
  new Vector3(0, 1, 0),
  scene
);
hemisphericLight.intensity = 1;
const directionalLight = new DirectionalLight(
  'directionalLight',
  new Vector3(1, 1, 1),
  scene
);
directionalLight.intensity = 0.3;

const pines = [];

const groundMaterial = new StandardMaterial('ground', scene);
const ground = Mesh.CreateGroundFromHeightMap(
  'ground',
  heightmap3,
  WIDTH, //width
  HEIGHT, //height
  400, //subdivisions count
  0, //min height
  150, //max height
  scene,
  false,
  () => {
    SceneLoader.ImportMesh('', '/', pineMesh.substr(1), scene, newMeshes => {
      ground.updateCoordinateHeights();
      for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * WIDTH;
        const z = (Math.random() - 0.5) * HEIGHT;
        const y = ground.getHeightAtCoordinates(x, z);
        const position = new Vector3(x, y, z);
        const pine = new MeshBuilder.CreateCylinder(
          `pine-${i}`,
          { height: 16, diameter: 5 },
          scene
        );

        pine.checkCollisions = true;

        pines.push(pine);

        newMeshes.forEach((mesh, i) => {
          const clonedMesh = mesh.clone();
          clonedMesh.parent = pine;
        });
        pine.position.addInPlace(position);
        pine.isVisible = false;
      }
    });

    init();
  }
);

scene.clearColor = new Color3(0.9, 0.95, 1);
groundMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
ground.material = groundMaterial;
engine.enableOfflineSupport = false;

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

const gravity = 0.03;
let cameraVelocityY = 0;

function rotateVectorY(vector, angle) {
  return Vector3.TransformCoordinates(
    vector,
    Matrix.RotationAxis(Axis.Y, angle)
  );
}

function handleCollisions() {
  cameraCollider.position = camera.position.clone();
  pines.forEach(pine => {
    const roughlyIntersects = cameraCollider.intersectsMesh(pine, false);
    if (roughlyIntersects) {
      const intersects = cameraCollider.intersectsMesh(pine, true);
      if (intersects) {
        const fromPineToCamera = camera.position.subtract(pine.position);
        const projectedDistance = fromPineToCamera
          .clone()
          .set(fromPineToCamera.x, 0, fromPineToCamera.z)
          .length();

        const pineRadius = 3;
        const playerRadius = 2;
        const intersectionDepth = Math.max(
          0,
          pineRadius + playerRadius - projectedDistance
        );
        camera.position.addInPlace(
          fromPineToCamera.normalize().scaleInPlace(intersectionDepth * 0.2)
        );
      }
    }
  });
}

function applyPhysics() {
  cameraVelocityY -= gravity;
  camera.position.y += cameraVelocityY;

  const groundY = ground.getHeightAtCoordinates(
    camera.position.x,
    camera.position.z
  );

  const cameraOffsetY = 2;
  const isTouchingGround = camera.position.y - cameraOffsetY <= groundY;

  if (isTouchingGround) {
    cameraVelocityY = 0;
    camera.position.y = groundY + cameraOffsetY;
    camera.grounded = true;
  }
}

function handleInput() {
  const { a: left, d: right, w: up, s: down, ' ': space } = keysDown;

  const inputVector = new Vector3(0, 0, 0);
  if (right) inputVector.addInPlace(new Vector3(1, 0, 0));
  if (left) inputVector.addInPlace(new Vector3(-1, 0, 0));
  if (up) inputVector.addInPlace(new Vector3(0, 0, 1));
  if (down) inputVector.addInPlace(new Vector3(0, 0, -1));
  if (space && camera.grounded) {
    cameraVelocityY = 0.5;
    camera.grounded = false;
  }

  const walkVelocity = rotateVectorY(inputVector, camera.rotation.y)
    .normalize()
    .scaleInPlace(0.2);
  camera.position.addInPlace(walkVelocity);
}

function init() {
  scene.registerBeforeRender(() => {
    handleInput();
    applyPhysics();
    handleCollisions();
  });

  engine.runRenderLoop(() => {
    scene.render();
  });
}
