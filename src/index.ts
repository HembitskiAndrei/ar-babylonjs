import { Engine, HemisphericLight, Mesh, Scene, Vector3 } from '@babylonjs/core';
import * as ZapparBabylon from '@zappar/zappar-babylonjs-es6';

// Setup BabylonJS in the usual way
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
});

export const scene = new Scene(engine);
new HemisphericLight('light1', new Vector3(0, 1, 0), scene);
// Setup a Zappar camera instead of one of Babylon's cameras
export const camera = new ZapparBabylon.Camera('camera', scene);

// Request the necessary permission from the user
ZapparBabylon.permissionRequestUI().then((granted) => {
    if (granted) camera.start();
    else ZapparBabylon.permissionDeniedUI();
});


const imageTracker = new ZapparBabylon.ImageTrackerLoader().load(require("file-loader!./example-tracking-image.zpt").default);
const trackerTransformNode = new ZapparBabylon.ImageAnchorTransformNode('tracker', camera, imageTracker, scene);

// Add some content to the image tracker
const box = Mesh.CreateBox('box', 1, scene, false, Mesh.DOUBLESIDE)
box.parent = trackerTransformNode;
box.visibility = 0;

imageTracker.onVisible.bind(() => {
    box.visibility = 1;
});

imageTracker.onNotVisible.bind(() => {
    box.visibility = 0;
});


window.addEventListener('resize', () => {
    engine.resize();
});

// Set up our render loop
engine.runRenderLoop(() => {
    camera.updateFrame();
    scene.render();
});