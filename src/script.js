import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { CCDIKSolver, CCDIKHelper } from "three/examples/jsm/animation/CCDIKSolver.js";
import * as dat from 'lil-gui'
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js"

const state = {
    ikSolverAutoUpdate: true
};

/**
 * Base
 */
// Debug
const gui = new dat.GUI();

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight()
ambientLight.color = new THREE.Color(0xffffff)
ambientLight.intensity = 0.5
scene.add(ambientLight);


// Point light
const pointLight = new THREE.PointLight(0xff9000, 0.5, 10, 2)
pointLight.position.set(1, - 0.5, 1)
scene.add(pointLight)


/**
 * Objects
 */
// Material
const material = new THREE.MeshStandardMaterial({wireframe: true, side: THREE.DoubleSide})
material.roughness = 0.4;

// Objects
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    material
)
sphere.position.x = - 1.5

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    material
)
plane.rotation.x = - Math.PI * 0.5
plane.position.y = - 0.65

scene.add(sphere, plane);

/**
 *********************************************************** Skeletons
 */


/**
 * Sizing
 * */
const segmentHeight = 8;
const segmentCount = 4;
const height = segmentHeight * segmentCount;
const halfHeight = height * 0.5;

const sizing = {
    segmentHeight: segmentHeight,
    segmentCount: segmentCount,
    height: height,
    halfHeight: halfHeight
};

let ikSolver;

//
// Bones hierarchy:
//
//   root
//     ├── bone0
//     │    └── bone1
//     │          └── bone2
//     │                └── bone3
//     └── target
//
// Positioned as follows on the cylinder:
//
//        o      <- target      (y =  20)
//
//   +----o----+ <- bone3       (y =  12)
//   |         |
//   |    o    | <- bone2       (y =   4)
//   |         |
//   |    o    | <- bone1       (y =  -4)
//   |         |
//   +----oo---+ <- root, bone0 (y = -12)
//



const bones = [];

const rootBone = new THREE.Bone();
rootBone.name = 'root';
rootBone.position.y = - sizing.halfHeight;
bones.push( rootBone );

//
// "bone0", "bone1", "bone2", "bone3"
//

// "bone0"
let prevBone = new THREE.Bone();
prevBone.position.y = 0;
rootBone.add( prevBone );
bones.push( prevBone );

// "bone1", "bone2", "bone3"
for ( let i = 1; i <= sizing.segmentCount; i ++ ) {

    const bone = new THREE.Bone();
    bone.position.y = sizing.segmentHeight;
    bones.push( bone );
    bone.name = `bone${i}`;
    prevBone.add( bone );
    prevBone = bone;

}

// "target"
const targetBone = new THREE.Bone();
targetBone.name = 'target';
targetBone.position.y = sizing.height + sizing.segmentHeight; // relative to parent: rootBone
rootBone.add( targetBone );
bones.push( targetBone );
console.log(bones);

const geometry = new THREE.CylinderGeometry( 5, 5, sizing.height, 8, sizing.segmentCount * 1, true );

//scene.add(mesh2);


const position = geometry.attributes.position;

const vertex = new THREE.Vector3();

const skinIndices = [];
const skinWeights = [];

for ( let i = 0; i < position.count; i ++ ) {

	vertex.fromBufferAttribute( position, i );

	//compute skinIndex and skinWeight based on some configuration data
	const y = ( vertex.y + sizing.halfHeight );

	const skinIndex = Math.floor( y / sizing.segmentHeight );
	const skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

	skinIndices.push( skinIndex, skinIndex + 1, 0, 0 );
	skinWeights.push( 1 - skinWeight, skinWeight, 0, 0 );

}

geometry.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
geometry.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );


// create skinned mesh and skeleton

const mesh = new THREE.SkinnedMesh( geometry, material );
const skeleton = new THREE.Skeleton( bones );

mesh.add( bones[ 0 ] );
mesh.bind( skeleton );
scene.add( mesh );




// Skeleton Helper
const skeletonHelper = new THREE.SkeletonHelper( mesh );
skeletonHelper.material.linewidth = 2;
scene.add( skeletonHelper );

//
// ikSolver
//

const iks = [
    {
        target: 6,
        effector: 5,
        links: [ {index: 4},{index: 5},{index:3},
            { index: 2,
              //rotationMin: new THREE.Vector3( 1.2, - 1.8, - .4 ),
              //rotationMax: new THREE.Vector3( 1.7, - 1.1, .3 )
            
            },
             { index: 1,
               //rotationMin: new THREE.Vector3( 1.2, - 1.8, - .4 ),
               //rotationMax: new THREE.Vector3( 1.7, - 1.1, .3 )
            
            } ]
    }
];

ikSolver = new CCDIKSolver( mesh, iks );
scene.add( new CCDIKHelper( mesh, iks ) );

console.log(mesh);

/****************************************************** End of Skeletons */

// Debug Gui

gui.add( mesh, 'pose' ).name( 'mesh.pose()' );

mesh.skeleton.bones
    .filter( ( bone ) => bone.name === 'target' )
    .forEach( function ( bone ) {

        const folder = gui.addFolder( bone.name );

        const delta = 20;
        folder.add( bone.position, 'x', - delta + bone.position.x, delta + bone.position.x );
        folder.add( bone.position, 'y', - bone.position.y, bone.position.y );
        folder.add( bone.position, 'z', - delta + bone.position.z, delta + bone.position.z );

    } );
gui.add(material.wireframe, 'true');
gui.add( ikSolver, 'update' ).name( 'ikSolver.update()' );
gui.add( state, 'ikSolverAutoUpdate' );







/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 1
camera.position.y = 1
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))




/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();


    // Updating the skeleton and IK
    if (state.ikSolverAutoUpdate){
        ikSolver?.update();
    }

    // Updating the skeleton
    // skeleton.bones[ 0 ].rotation.x = THREE.Math.degToRad( 90*Math.cos(3*elapsedTime) );
    // skeleton.bones[ 1 ].rotation.x = THREE.Math.degToRad( 90*Math.cos(3*elapsedTime) );
    // skeleton.bones[ 2 ].rotation.x = THREE.Math.degToRad( 90*Math.cos(3*elapsedTime) );
    //skeleton.bones[ 3 ].rotation.x += 0.01;


    //console.log(skeleton.bones[2].rotation.x);

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
