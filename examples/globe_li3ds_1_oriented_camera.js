/* global itowns, document, renderer */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = {
    longitude: 2.423814,
    latitude: 48.844882,
    altitude: 100 };

// var positionOnGlobe = {
//     longitude: 2.33481381638492,
//     latitude: 48.850602961052147,
//     altitude: 20 };
var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
//    immersiveControls: true,
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});

globeView.controls.minDistance = 0;

// speed up controls
// globeView.controls.moveSpeed = 10;

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));


var layer = {
    orientationType: 'Stereopolis2',
    sensors: [],
}

function orientedImagesInit(orientedImages) {
    // console.log('SENSORS : ', layer.sensors);
    var i;
    var j = 0;
    var ori;
    var axis;
    var camera;
    var cameraHelper;
    var listOrientation;
    var quaternion = new itowns.THREE.Quaternion();
    var quaternionSensor = new itowns.THREE.Quaternion();
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var offset = { x: 657000, y: 6860000, z: -0.4 };
    // var offset = new itowns.THREE.Vector3(657000, 6860000, -0.4 );
    itowns.oiMicMac.offset = offset;
    // decode oriented images list
    listOrientation = itowns.OrientedImageDecoder.decode(orientedImages, itowns.oiMicMac);

    for (i = 0; i < listOrientation.length; i++) {

        ori = listOrientation[i];
        
        // if (ori.source.id != 'StMande_20171109_1_074')
        //     continue;
        // console.log('source: ', ori);
        ori.coord.as(globeView.referenceCrs, coordView);
        // console.log('coord: ', ori.coord);

        // add axis helper
        axis = new itowns.THREE.AxesHelper(2);
        axis.position.copy(coordView.xyz());
        //console.log(axis.position);
        axis.lookAt(coordView.geodesicNormal.clone().add(axis.position));
        
        // PENSEZ à mettre le Y vers le Nord cartho avec proj4

        quaternion.setFromEuler(ori.orientation);
        axis.quaternion.multiply(quaternion);

        // add a mini camera oriented on Z
        camera = new itowns.THREE.PerspectiveCamera(45, 1, 0.2, 0.8);
        camera.position.set(0, 0, 0);
        camera.lookAt(new itowns.THREE.Vector3(0, 1, 0));
        axis.add(camera);

        /*
        for (j = 0; j < layer.sensors.length; j++) {
            var sensor = layer.sensors[j];
            // console.log('SENSOR :', sensor);
            var sensorHelper = new itowns.THREE.AxesHelper(0.5);
            // console.log('SENSOR POSITION', sensor.centerCameraInPano);
            sensorHelper.position.copy(sensor.centerCameraInPano);

            quaternionSensor.setFromRotationMatrix(sensor.rotPano2Camera);
            sensorHelper.quaternion.multiply(quaternionSensor);

            axis.add(sensorHelper);
        }
*/
        // add axis to scene and update matrix world
        globeView.scene.add(axis);
        axis.updateMatrixWorld();

        // add a camera helper on the camera (to see it)
        // cameraHelper = new itowns.THREE.CameraHelper(camera);
        // globeView.scene.add(cameraHelper);
        // cameraHelper.updateMatrixWorld(true);

        break;
    }
}

var THREE = itowns.THREE;

function getMatrix4FromRotation(Rot) {
    var M4 = new THREE.Matrix4();
    M4.elements[0] = Rot.elements[0];
    M4.elements[1] = Rot.elements[1];
    M4.elements[2] = Rot.elements[2];
    M4.elements[4] = Rot.elements[3];
    M4.elements[5] = Rot.elements[4];
    M4.elements[6] = Rot.elements[5];
    M4.elements[8] = Rot.elements[6];
    M4.elements[9] = Rot.elements[7];
    M4.elements[10] = Rot.elements[8];
    return M4;
}

// initialize a sensor for each camera and create the material (and the shader)
function sensorsInit(res) {
    let i;
    console.log(res);
    var withDistort = false;
    for (const s of res) {
        var sensor = {};
        sensor.id = s.id;

        var rotCamera2Pano = new THREE.Matrix3().fromArray(s.rotation);
        var rotPano2Camera = rotCamera2Pano.clone().transpose();

        sensor.rotCamera2Pano = getMatrix4FromRotation(rotCamera2Pano);
        sensor.rotPano2Camera = getMatrix4FromRotation(rotPano2Camera);

        var centerCameraInPano = new THREE.Vector3().fromArray(s.position);
        sensor.centerCameraInPano = centerCameraInPano;

        layer.sensors.push(sensor);        
    }
    console.log(layer.sensors[0].mp2t);
}

// itowns.Fetcher.json('http://www.itowns-project.org/itowns-sample-data/panoramicsMetaData.json',
// { crossOrigin: '' }).then(orientedImagesInit);

// function calibrationInit(cameras) {
//     console.log(cameras);
// }

// itowns.Fetcher.json('http://localhost:8080/examples/cameraCalibration.json',
// { crossOrigin: '' }).then(sensorsInit);


var promises = [];

// promises.push(itowns.Fetcher.json('http://localhost:8080/examples/cameraCalibration.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_camera.json', { crossOrigin: '' }));

// promises.push(itowns.Fetcher.json('http://www.itowns-project.org/itowns-sample-data/panoramicsMetaData.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_pano.json', { crossOrigin: '' }));

Promise.all(promises).then((res) => { 
    sensorsInit(res[0]); 
    orientedImagesInit(res[1]); 
    
});

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
