import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/core/Loading/loadingScreen";
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AssetsManager } from '@babylonjs/core/Misc/assetsManager';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import '@babylonjs/loaders';
import * as ZapparBabylon from '@zappar/zappar-babylonjs-es6';
import target from '../assets/targets/image.zpt';
import model from '../assets/models/room.glb';
import maskModel from '../assets/models/roomMask.glb';

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
light.intensity = 20;

const hemisphericLight = new HemisphericLight('hem02', new Vector3(0, -1, 0), scene);
hemisphericLight.intensity = 15;

const camera = new ZapparBabylon.Camera('zapparCamera', scene);
camera.userCameraMirrorMode = ZapparBabylon.CameraMirrorMode.CSS;
camera.poseMode = ZapparBabylon.CameraPoseMode.Default;
scene.activeCameras.push(camera);
scene.activeCamera = camera;

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

const previousStencilMask = engine.getStencilMask();
const previousStencilFunction = engine.getStencilFunction();

const roomMeshTask = assetsManager.addContainerTask("roomMeshTask", "", "", model);
roomMeshTask.onSuccess = task => {
    const roomRoot = task.loadedContainer.instantiateModelsToScene(name => name, false).rootNodes[0] as Mesh;
    roomRoot.position.y -= 1.0625;
    roomRoot.position.z += 1.58;
    roomRoot.scaling = Vector3.One().scale(0.9);
    roomRoot.scaling.x *= -1;
    roomRoot.parent = trackerTransformNode;
    light.setDirectionToTarget(roomRoot.absolutePosition);
    roomRoot.getChildMeshes().forEach(mesh => {
        (mesh.material as PBRMaterial).metallic = 0.5;
        (mesh.material as PBRMaterial).roughness = 0.5;
        (mesh.material as PBRMaterial).metallicF0Factor = 0;
        mesh.renderingGroupId = 1;
        // @ts-ignore
        mesh.onBeforeRenderObservable.add(function () {
            engine.setStencilMask(0x00);
            engine.setStencilBuffer(true);
            engine.setStencilFunctionReference(1);
            engine.setStencilFunction(Engine.EQUAL);
        });
        // @ts-ignore
        mesh.onAfterRenderObservable.add(function () {
            engine.setStencilBuffer(false);
            engine.setStencilMask(previousStencilMask);
            engine.setStencilFunction(previousStencilFunction);
        });
    });
}
scene.setRenderingAutoClearDepthStencil(1, false);
const roomMaskMeshTask = assetsManager.addContainerTask("roomMaskMeshTask", "", "", maskModel);
roomMaskMeshTask.onSuccess = task => {
    const roomMaskRoot = task.loadedContainer.instantiateModelsToScene(name => name, false).rootNodes[0] as Mesh;
    roomMaskRoot.position.y -= 1.0625;
    roomMaskRoot.position.z += 1.58;
    roomMaskRoot.scaling = Vector3.One().scale(0.9);
    roomMaskRoot.parent = trackerTransformNode;
    roomMaskRoot.getChildMeshes().forEach(mesh => {
        mesh.visibility = 0.001;
        // @ts-ignore
        mesh.onBeforeRenderObservable.add(function () {
            engine.setStencilBuffer(true);
            engine.setStencilFunctionReference(1);
        });
        // @ts-ignore
        mesh.onAfterRenderObservable.add(function () {
            engine.setStencilBuffer(false);
        });
    });
}

window.addEventListener('resize', () => {
    engine.resize();
});

assetsManager.load();

engine.runRenderLoop(() => {
    camera.updateFrame();
    scene.render();
});