import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { EventBus, Events } from '../utils/EventBus.js';
import { SceneConstants } from '../utils/Constants.js';

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

        // Controls interaction tracking (for camera follow)
        this.isUserInteracting = false;
        this.lastControlInteraction = 0;

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
        this.scene.background = new THREE.Color(SceneConstants.BACKGROUND_COLOR);
    }

    /**
     * Create the camera
     */
    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            SceneConstants.CAMERA_FOV,
            aspect,
            SceneConstants.CAMERA_NEAR,
            SceneConstants.CAMERA_FAR
        );

        const pos = SceneConstants.DEFAULT_CAMERA_POSITION;
        this.camera.position.set(pos.x, pos.y, pos.z);
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SceneConstants.MAX_PIXEL_RATIO));

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = SceneConstants.TONE_MAPPING_EXPOSURE;

        // Wrap canvas in semantic <main> element
        const mainElement = document.createElement('main');
        mainElement.setAttribute('role', 'main');
        mainElement.setAttribute('aria-label', '3D crochet pattern visualization');
        mainElement.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;';

        // Set aria-label on canvas for accessibility
        this.renderer.domElement.setAttribute('role', 'img');
        this.renderer.domElement.setAttribute('aria-label', '3D crochet pattern canvas');

        mainElement.appendChild(this.renderer.domElement);
        this.container.appendChild(mainElement);

        // Store reference to main element for cleanup
        this.mainElement = mainElement;
    }

    /**
     * Create scene lighting
     */
    createLights() {
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, SceneConstants.MAIN_LIGHT_INTENSITY);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = SceneConstants.SHADOW_MAP_SIZE;
        mainLight.shadow.mapSize.height = SceneConstants.SHADOW_MAP_SIZE;
        mainLight.shadow.camera.near = SceneConstants.SHADOW_CAMERA_NEAR;
        mainLight.shadow.camera.far = SceneConstants.SHADOW_CAMERA_FAR;
        mainLight.shadow.camera.left = -SceneConstants.SHADOW_CAMERA_SIZE;
        mainLight.shadow.camera.right = SceneConstants.SHADOW_CAMERA_SIZE;
        mainLight.shadow.camera.top = SceneConstants.SHADOW_CAMERA_SIZE;
        mainLight.shadow.camera.bottom = -SceneConstants.SHADOW_CAMERA_SIZE;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, SceneConstants.FILL_LIGHT_INTENSITY);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, SceneConstants.AMBIENT_LIGHT_INTENSITY);
        this.scene.add(ambientLight);

        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, SceneConstants.HEMISPHERE_LIGHT_INTENSITY);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
    }

    /**
     * Create orbit controls
     */
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = SceneConstants.DAMPING_FACTOR;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = SceneConstants.MIN_DISTANCE;
        this.controls.maxDistance = SceneConstants.MAX_DISTANCE;
        this.controls.maxPolarAngle = Math.PI * SceneConstants.MAX_POLAR_ANGLE_RATIO;
        const target = SceneConstants.DEFAULT_CAMERA_TARGET;
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();

        this.controls.addEventListener('start', () => {
            this.isUserInteracting = true;
            this.lastControlInteraction = performance.now();
        });

        this.controls.addEventListener('end', () => {
            this.isUserInteracting = false;
            this.lastControlInteraction = performance.now();
        });
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
        const gridHelper = new THREE.GridHelper(
            SceneConstants.GRID_SIZE,
            SceneConstants.GRID_DIVISIONS,
            SceneConstants.GRID_CENTER_COLOR,
            SceneConstants.GRID_LINE_COLOR
        );
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
     * Handle window resize with safety checks
     */
    onWindowResize() {
        try {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Safety check for valid dimensions
            if (!Number.isFinite(width) || width <= 0 ||
                !Number.isFinite(height) || height <= 0) {
                console.warn('Invalid window dimensions for resize');
                return;
            }

            if (this.camera) {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }

            if (this.renderer) {
                this.renderer.setSize(width, height);
            }
        } catch (err) {
            console.error('Error during window resize:', err);
        }
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
        const pos = SceneConstants.DEFAULT_CAMERA_POSITION;
        const target = SceneConstants.DEFAULT_CAMERA_TARGET;
        this.camera.position.set(pos.x, pos.y, pos.z);
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
    }

    /**
     * Set view mode
     * @param {string} mode - View mode ('top', 'front', 'side', 'perspective')
     * @returns {boolean} Whether the mode was set successfully
     */
    setViewMode(mode) {
        // Validate mode
        const validModes = ['top', 'front', 'side', 'perspective'];
        if (!validModes.includes(mode)) {
            console.warn(`Invalid view mode: ${mode}. Using 'perspective'.`);
            mode = 'perspective';
        }

        let pos, target;
        switch (mode) {
            case 'top':
                pos = SceneConstants.VIEW_TOP_POSITION;
                target = SceneConstants.VIEW_TOP_TARGET;
                break;
            case 'front':
                pos = SceneConstants.VIEW_FRONT_POSITION;
                target = SceneConstants.VIEW_FRONT_TARGET;
                break;
            case 'side':
                pos = SceneConstants.VIEW_SIDE_POSITION;
                target = SceneConstants.VIEW_SIDE_TARGET;
                break;
            case 'perspective':
            default:
                this.resetCamera();
                return true;
        }

        // Safety check for position and target
        if (!pos || !target) {
            console.warn('View mode constants not defined, using defaults');
            this.resetCamera();
            return false;
        }

        try {
            this.camera.position.set(pos.x ?? 0, pos.y ?? 5, pos.z ?? 8);
            this.controls.target.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
            this.controls.update();
            return true;
        } catch (err) {
            console.error('Error setting view mode:', err);
            return false;
        }
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
     * Animation loop with error handling to prevent crashes
     */
    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate.bind(this));

        try {
            this.controls.update();

            // Call update callbacks with error handling
            this.updateCallbacks.forEach(cb => {
                try {
                    cb();
                } catch (err) {
                    console.error('Error in update callback:', err);
                }
            });

            this.renderer.render(this.scene, this.camera);
            EventBus.emit(Events.RENDER_FRAME, { time: performance.now() });
        } catch (err) {
            console.error('Error in animation loop:', err);
            // Continue running - don't crash the animation loop
        }
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

        // Remove the main element wrapper
        if (this.mainElement && this.mainElement.parentElement) {
            this.mainElement.parentElement.removeChild(this.mainElement);
        } else if (this.renderer.domElement.parentElement) {
            // Fallback for backwards compatibility
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }
}
