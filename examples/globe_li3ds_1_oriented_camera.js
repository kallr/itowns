/* global itowns, document, renderer, orientedImageGUI  */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = {
    longitude: 2.423814,
    latitude: 48.844882,
    altitude: 100 };

var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
    renderer: renderer,
    handleCollision: false,
   sseSubdivisionThreshold: 10,
});

globeView.controls.minDistance = 0;

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
    sensors: [],
    // dist:'',
    dist:'_nodist',
    images: 'http://localhost:8080/examples/Li3ds/images_091117/{imageId}_{sensorId}{dist}.jpg',
    opacity:1,
    convergence:0.414,
    cameraFOV: 30,
    focaleReel: 12,
}

function updateAxisOrientation() {
    var quaternion = new itowns.THREE.Quaternion();

    layer.axis.lookAt(layer.coordView.geodesicNormal.clone().add(layer.axis.position));
    // rectification vrai NORD
    layer.axis.rotateZ(layer.convergence * Math.PI / 180.0);
    const matrixFromEuler = new itowns.THREE.Matrix4().makeRotationFromEuler(layer.orientation);
    // The three angles ω,ɸ, are computed
    // for a traditionnal image coordinate system (X=colomns left to right and Y=lines bottom up)
    // and not for a computer vision compliant geometry (X=colomns left to right and Y=lines top down)
    // so we have to multiply to rotation matrix by this matrix :
    var trix = new itowns.THREE.Matrix4().set(
        1, 0, 0, 0,
        0, -1, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 1);
    const trixQuaternion = new itowns.THREE.Quaternion().setFromRotationMatrix(trix);
    const matrixMicMac = matrixFromEuler.clone().multiply(trix);
    quaternion.setFromRotationMatrix (matrixMicMac);
    // quaternion.setFromEuler(ori.orientation);
    layer.axis.quaternion.multiply(quaternion);
    layer.axis.updateMatrixWorld();
}

function updatePlanePositionAndScale() {
    layer.Xreel = (layer.sizeX * layer.focaleReel) / layer.focaleX;
    layer.Yreel = (layer.sizeY * layer.focaleReel) / layer.focaleY;
    layer.ppaXReel = ((layer.ppaX - layer.sizeX / 2) * layer.focaleReel) / layer.focaleX;
    layer.ppaYReel = (-(layer.ppaY - layer.sizeY / 2) * layer.focaleReel) / layer.focaleY;
    layer.plane.scale.set(layer.Xreel, layer.Yreel, 1);
    layer.plane.position.set(layer.ppaXReel, layer.ppaYReel, layer.focaleReel);
    layer.plane.updateMatrixWorld();
}

function orientedImagesInit(orientedImages) {
    // console.log('SENSORS : ', layer.sensors);
    var i;

    var ori;
    var axis;
    var camera;
    var cameraHelper;
    var listOrientation;
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var offset = { x: 657000, y: 6860000, z: -0.4 };
    // var offset = new itowns.THREE.Vector3(657000, 6860000, -0.4 );
    itowns.oiMicMac.offset = offset;
    // decode oriented images list
    listOrientation = itowns.OrientedImageDecoder.decode(orientedImages, itowns.oiMicMac);

    for (i = 0; i < listOrientation.length; i++) {

        if (i%5 != 0) {
            continue;
        }
        ori = listOrientation[i];
        ori.coord.as(globeView.referenceCrs, coordView);

        // get a threeJs layer
        var layerTHREEjs = globeView.mainLoop.gfxEngine.getUniqueThreejsLayer();
        globeView.camera.camera3D.layers.enable(layerTHREEjs);

        // add axis helper
        axis = new itowns.THREE.AxesHelper(2);
        axis.layers.set(layerTHREEjs);
        axis.position.copy(coordView.xyz());
        layer.coordView = coordView;

        //console.log(axis.position);
        axis.lookAt(coordView.geodesicNormal.clone().add(axis.position));

        layer.axis = axis;
        layer.orientation = ori.orientation;

        updateAxisOrientation();

        var projectionMatrix = layer.sensors[0].projection;
        var size = layer.sensors[0].size;
        layer.focaleX = projectionMatrix[0];
        layer.ppaX = projectionMatrix[2];
        layer.focaleY = projectionMatrix[4];
        layer.ppaY = projectionMatrix[5];
        layer.sizeX = size[0];
        layer.sizeY = size[1];

        var ouverture = (2 * Math.atan((layer.sizeY / 2) / layer.focaleY)) / Math.PI * 180; //2 * demiAngleDegree
        // add a mini camera oriented on Z
        camera = new itowns.THREE.PerspectiveCamera(ouverture, layer.sizeX / layer.sizeY, layer.focaleReel, layer.focaleReel * 2);

        // On se met dans le repère de l'image orientée (l'axis helper)
        axis.add(camera);
        // Dans notre repère de l'image orientée, l'axe des Z va vers la visée de caméra
        // Dans ThreeJS, la camera vise vers l'opposé de l'axe des Z
        // Donc on retourne la camera autour de l'axe Y
        camera.rotateY(Math.PI);
        camera.updateMatrixWorld(true);

        
        layer.camera = camera;
        // camera.layers = globeView.camera.camera3D.layers;
        // camera.layers.enable(layerTHREEjs);

        // var url = itowns.format(layer.images, { imageId: oiInfo.id, sensorId: sensor.id });
        var url = itowns.format(layer.images, { imageId:ori.source.id, sensorId: 'CAM24', dist:layer.dist });

        console.log('URL de l image:', url);
        var texture = new itowns.THREE.TextureLoader().load( url );

        console.log('LAYER : ', layer);
        var geometry = new itowns.THREE.PlaneGeometry( 1, 1, 32 );
        var material = new itowns.THREE.MeshBasicMaterial( {
            map: texture,
            color: 0xffffff,
            side: itowns.THREE.DoubleSide,
            transparent: true, opacity: layer.opacity,
        } );
        var plane = new itowns.THREE.Mesh( geometry, material );
        plane.layers.set(layerTHREEjs);
        
        plane.rotateX(Math.PI);
        axis.add( plane );

        layer.plane = plane;

        updatePlanePositionAndScale();

        // add axis to scene and update matrix world
        globeView.scene.add(axis);
        axis.updateMatrixWorld();

        // add a camera helper on the camera (to see it)
        // camera.matrixWorld.multiply(trix);
        cameraHelper = new itowns.THREE.CameraHelper(camera);
        cameraHelper.layers.set(layerTHREEjs);
        globeView.scene.add(cameraHelper);
        cameraHelper.updateMatrixWorld(true);

        break;
    }
}

function sensorsInit(res) {
    for (const s of res) {
        var sensor = {};
        sensor.id = s.id;
        sensor.projection = s.projection;
        sensor.size = s.size;
        layer.sensors.push(sensor);
    }
}

function cibleInit(res) {
    var geometry = new itowns.THREE.SphereGeometry(0.05, 32, 32);
    var material = new itowns.THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (const s of res) {
        const coord = new itowns.Coordinates('EPSG:2154', s.long, s.lat, s.alt);
        var sphere = new itowns.THREE.Mesh(geometry, material);
        coord.as('EPSG:4978').xyz(sphere.position);
        globeView.scene.add(sphere);
        sphere.updateMatrixWorld();
    }
}

var promises = [];

promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/cibles.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_camera.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_pano.json', { crossOrigin: '' }));

Promise.all(promises).then((res) => {
    cibleInit(res[0])
    sensorsInit(res[1]);
    orientedImagesInit(res[2]);
});


function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings }),
    // onMeshCreated: function setMaterial(res) { res.children[0].material = result.shaderMat; },
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 16,
    projection: 'EPSG:4326',
    // extent: {
    //     west: 2.334,
    //     east: 2.335,
    //     south: 48.849,
    //     north: 48.851,
    // },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
    wireframe: true,
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
