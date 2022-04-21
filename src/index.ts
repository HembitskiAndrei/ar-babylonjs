import {
    ArcRotateCamera,
    AssetsManager,
    Camera,
    DirectionalLight,
    Engine,
    Mesh,
    MeshBuilder,
    RenderTargetTexture,
    Scene,    
    StandardMaterial,
    Vector3
} from '@babylonjs/core';
import '@babylonjs/loaders';
import * as ZapparBabylon from '@zappar/zappar-babylonjs-es6';
import target from '../assets/targets/image.zpt';
import model from '../assets/models/room.glb';

if (ZapparBabylon.browserIncompatible()) {
    ZapparBabylon.browserIncompatibleUI();
    throw new Error('Unsupported browser');
}

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.activeCameras = [];

const assetsManager = new AssetsManager(scene);

const light = new DirectionalLight('dir02', new Vector3(0, -10, 0), scene);

const camera = new ZapparBabylon.Camera('zapparCamera', scene);
camera.userCameraMirrorMode = ZapparBabylon.CameraMirrorMode.CSS;
camera.poseMode = ZapparBabylon.CameraPoseMode.Attitude;
scene.activeCameras.push(camera);
scene.activeCamera = camera;
const envMap = new ZapparBabylon.CameraEnvironmentMap(camera, engine);
// scene.environmentTexture = envMap.cubeTexture;

ZapparBabylon.permissionRequestUI().then((granted) => {
    if (granted) camera.start();
    else ZapparBabylon.permissionDeniedUI();
});

const imageTracker = new ZapparBabylon.ImageTrackerLoader().load(target, () => {console.log("loaded")}, () => {console.log("error")});
const trackerTransformNode = new ZapparBabylon.ImageAnchorTransformNode('tracker', camera, imageTracker, scene);

imageTracker.onVisible.bind(() => {
    trackerTransformNode.setEnabled(true);
});
imageTracker.onNotVisible.bind(() => {
    trackerTransformNode.setEnabled(false);
});

const secondCamera = new ArcRotateCamera("secondCamera", 0, Math.PI / 2, 5.75, new Vector3(0, 1, 5), scene);
secondCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
secondCamera.fov = 1.5;
secondCamera.layerMask = 0x20000000;
secondCamera.position = new Vector3(0, 0, 5.75);
secondCamera.minZ = 0.0;
secondCamera.maxZ = 100;
secondCamera.lowerRadiusLimit = 5.75;
secondCamera.upperRadiusLimit = 5.75;
secondCamera.upperBetaLimit = Math.PI / 2;
secondCamera.lowerBetaLimit = Math.PI / 5;
secondCamera.upperAlphaLimit = -Math.PI / 3;
secondCamera.lowerAlphaLimit = -Math.PI / 1.35;
// secondCamera.lowerAlphaLimit = -Math.PI / 3;
secondCamera.setTarget(Vector3.Zero());
secondCamera.attachControl();
// scene.activeCameras.push(secondCamera);

const renderTarget = new RenderTargetTexture("depth", {width: 1920, height: 1080}, scene, true);
renderTarget.activeCamera = secondCamera;
renderTarget.renderList = [];
scene.customRenderTargets.push(renderTarget);


const roomMeshTask = assetsManager.addContainerTask("roomMeshTask", "", "", model);
roomMeshTask.onSuccess = task => {
    const roomRoot = task.loadedContainer.instantiateModelsToScene(name => name, false).rootNodes[0] as Mesh;
    // roomRoot.rotate(Axis.Y, Math.PI, Space.LOCAL);
    roomRoot.position.y -= 0.65 * 1.25;
    roomRoot.scaling = Vector3.One().scale(0.25);
    roomRoot.layerMask = 0x20000000;
    roomRoot.getChildMeshes().forEach(mesh => {
        mesh.layerMask = 0x20000000;
        // @ts-ignore
        renderTarget.renderList.push(mesh);
    });
    // @ts-ignore
    renderTarget.renderList.push(roomRoot);
}

// const materialBlue = new StandardMaterial("blue", scene);
// materialBlue.diffuseColor = Color3.Blue();
// const spheresCount = 20;
// let alpha = 0;
// const circleNode = new AbstractMesh("circleNode", scene);
// circleNode.layerMask = 0x20000000;
// renderTarget.renderList.push(circleNode);
// for (let index = 0; index < spheresCount; index += 1) {
//     const sphere = MeshBuilder.CreateSphere("Sphere" + index, {segments: 2, diameter: 1}, scene);
//     sphere.convertToFlatShadedMesh();
//     sphere.layerMask = 0x20000000;
//     sphere.position.x = 3 * Math.cos(alpha);
//     sphere.position.z = 3 * Math.sin(alpha);
//     sphere.material = materialBlue;
//     alpha += (2 * Math.PI) / spheresCount;
//     sphere.setParent(circleNode);
//     renderTarget.renderList.push(sphere);
// }
// scene.registerBeforeRender(() => {
//     circleNode.rotate(Axis.Y, scene.getAnimationRatio() * 0.01, Space.LOCAL)
// })
const planeMaterial = new StandardMaterial("RTT material", scene);
planeMaterial.emissiveTexture = renderTarget;
planeMaterial.disableLighting = true;
const plane = MeshBuilder.CreatePlane("plane", {width: 3.2, height: 3.2 * 0.75, sideOrientation: Mesh.DEFAULTSIDE}, scene);
plane.material = planeMaterial;
plane.parent = trackerTransformNode;
light.setDirectionToTarget(plane.absolutePosition);

window.addEventListener('resize', () => {
    engine.resize();
});

assetsManager.onFinish = () => {
    scene.executeWhenReady(() => {

    });
};
assetsManager.load();
// secondCamera.parent = camera;
engine.runRenderLoop(() => {
    envMap.update();
    camera.updateFrame();
    secondCamera.position = trackerTransformNode.absolutePosition.negate();
    scene.render();
});