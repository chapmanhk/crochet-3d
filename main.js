import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

// Set up the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Set up the camera
const camera = new THREE.PerspectiveCamera(
    75, // field of view
    window.innerWidth / window.innerHeight, // aspect ratio
    0.1, // near clipping plane
    1000 // far clipping plane
);
camera.position.z = 5;

// Set up the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Add a light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const stitches = [];

// Make a chain of 5 stitches
for (let i = 0; i < 5; i++) {
    const geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    const material = new THREE.MeshPhongMaterial({ color: 0x8B4513});
    const stitch = new THREE.Mesh(geometry, material);

    // Position them in a line
    stitch.position.x = i * 0.7 - 1.4; // space them out and center
    scene.add(stitch);
    stitches.push(stitch); // save reference
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);


    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});