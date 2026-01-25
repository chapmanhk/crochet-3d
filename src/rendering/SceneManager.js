import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * SceneManager - Three.js scene setup and management
 *
 * Handles:
 * - Scene, camera, renderer setup
 * - Lighting
 * - Animation loop
 * - Window resize handling
 * - Grid/guide rendering
 */

export class SceneManager {
    constructor(container = document.body) {
        this.container = container;

        // Core Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Scene objects groups
        this.stitchGroup = null;
        this.helperGroup = null;
        this.uiGroup = null;

        // Animation
        this.animationId = null;
        this.isRunning = false;

        // Callbacks for render loop
        this.updateCallbacks = [];

        this.init();
    }

    /**
     * Initialize the scene
     */
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createControls();
        this.createGroups();
        this.createHelpers();
        this.setupEventListeners();
    }

    /**
     * Create the Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
    }

    /**
     * Create the camera
     */
    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            60,     // FOV
            aspect, // Aspect ratio
            0.1,    // Near plane
            1000    // Far plane
        );

        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Create the WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Create scene lighting
     */
    createLights() {
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);

        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
    }

    /**
     * Create orbit controls
     */
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.target.set(0, 1, 0);
        this.controls.update();
    }

    /**
     * Create object groups
     */
    createGroups() {
        this.stitchGroup = new THREE.Group();
        this.stitchGroup.name = 'stitches';
        this.scene.add(this.stitchGroup);

        this.helperGroup = new THREE.Group();
        this.helperGroup.name = 'helpers';
        this.scene.add(this.helperGroup);

        this.uiGroup = new THREE.Group();
        this.uiGroup.name = 'ui';
        this.scene.add(this.uiGroup);
    }

    /**
     * Create visual helpers
     */
    createHelpers() {
        const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xe0e0e0);
        gridHelper.position.y = -0.01;
        this.helperGroup.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(1);
        axesHelper.position.set(-9, 0, -9);
        this.helperGroup.add(axesHelper);
    }

    /**
     * Setup window event listeners
     */
    setupEventListeners() {
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.onWindowResize);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Add a callback to be called each frame
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
        return () => {
            const idx = this.updateCallbacks.indexOf(callback);
            if (idx !== -1) this.updateCallbacks.splice(idx, 1);
        };
    }

    /**
     * Add an object to the stitch group
     */
    addStitchMesh(mesh) {
        this.stitchGroup.add(mesh);
    }

    /**
     * Remove an object from the stitch group
     */
    removeStitchMesh(mesh) {
        this.stitchGroup.remove(mesh);
    }

    /**
     * Add an object to the UI group
     */
    addUIObject(object) {
        this.uiGroup.add(object);
    }

    /**
     * Remove an object from the UI group
     */
    removeUIObject(object) {
        this.uiGroup.remove(object);
    }

    /**
     * Clear all stitch meshes
     */
    clearStitches() {
        while (this.stitchGroup.children.length > 0) {
            const child = this.stitchGroup.children[0];
            this.stitchGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    }

    /**
     * Set camera to look at a specific point
     */
    lookAt(x, y, z) {
        this.controls.target.set(x, y, z);
        this.controls.update();
    }

    /**
     * Reset camera to default view
     */
    resetCamera() {
        this.camera.position.set(0, 5, 8);
        this.controls.target.set(0, 1, 0);
        this.controls.update();
    }

    /**
     * Set view mode
     */
    setViewMode(mode) {
        switch (mode) {
            case 'top':
                this.camera.position.set(0, 15, 0.1);
                this.controls.target.set(0, 0, 0);
                break;
            case 'front':
                this.camera.position.set(0, 2, 10);
                this.controls.target.set(0, 2, 0);
                break;
            case 'side':
                this.camera.position.set(10, 2, 0);
                this.controls.target.set(0, 2, 0);
                break;
            case 'perspective':
            default:
                this.resetCamera();
                break;
        }
        this.controls.update();
    }

    /**
     * Toggle helper visibility
     */
    setHelpersVisible(visible) {
        this.helperGroup.visible = visible;
    }

    /**
     * Start the animation loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.updateCallbacks.forEach(cb => cb());
        this.renderer.render(this.scene, this.camera);
        EventBus.emit(Events.RENDER_FRAME, { time: performance.now() });
    }

    /**
     * Get the renderer's DOM element
     */
    get domElement() {
        return this.renderer.domElement;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize);
        this.controls.dispose();
        this.clearStitches();
        this.renderer.dispose();

        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }
}
