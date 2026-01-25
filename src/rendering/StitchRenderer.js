import * as THREE from 'three';
import { StitchType, getStitchDefinition } from '../core/StitchTypes.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { yarnMaterialInstance } from './YarnMaterial.js';

/**
 * StitchRenderer - Creates and manages 3D meshes for stitches
 *
 * Handles:
 * - Generating geometry for each stitch type
 * - Material creation and management (using YarnMaterial for realistic appearance)
 * - Mesh creation and updates
 * - Selection/highlight visual feedback
 */

export class StitchRenderer {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        // Geometry cache (reuse geometries for performance)
        this.geometryCache = new Map();

        // Use yarn material system for realistic appearance
        this.yarnMaterial = yarnMaterialInstance;

        // Node to mesh mapping
        this.meshMap = new Map();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on(Events.STITCH_ADDED, ({ node }) => {
            this.createMeshForNode(node);
        });

        EventBus.on(Events.STITCH_REMOVED, ({ node }) => {
            this.removeMeshForNode(node);
        });

        EventBus.on(Events.PATTERN_CLEARED, () => {
            this.clearAllMeshes();
        });

        EventBus.on(Events.PATTERN_LOADED, ({ pattern }) => {
            this.renderPattern(pattern);
        });

        EventBus.on(Events.STITCH_TYPE_CHANGED, ({ node }) => {
            this.updateMeshForNode(node);
        });
    }

    /**
     * Get or create geometry for a stitch type
     */
    getGeometry(type) {
        if (this.geometryCache.has(type)) {
            return this.geometryCache.get(type);
        }

        const geometry = this.createGeometry(type);
        this.geometryCache.set(type, geometry);
        return geometry;
    }

    /**
     * Create geometry for a stitch type
     */
    createGeometry(type) {
        const def = getStitchDefinition(type);
        if (!def) {
            return new THREE.SphereGeometry(0.2, 16, 16);
        }

        const geomDef = def.geometry;

        switch (geomDef.type) {
            case 'torus':
                return this.createTorusGeometry(geomDef);
            case 'custom':
                return this.createCustomGeometry(geomDef);
            default:
                return new THREE.SphereGeometry(0.2, 16, 16);
        }
    }

    /**
     * Create torus geometry (for chains, slip stitches)
     */
    createTorusGeometry(geomDef) {
        const geometry = new THREE.TorusGeometry(
            geomDef.radius,
            geomDef.tube,
            geomDef.radialSegments,
            geomDef.tubularSegments
        );

        if (geomDef.rotationX) {
            geometry.rotateX(geomDef.rotationX);
        }

        return geometry;
    }

    /**
     * Create custom geometry for different stitch types
     */
    createCustomGeometry(geomDef) {
        switch (geomDef.shape) {
            case 'single_crochet':
                return this.createSingleCrochetGeometry(geomDef);
            case 'half_double':
                return this.createHalfDoubleGeometry(geomDef);
            case 'double_crochet':
                return this.createDoubleCrochetGeometry(geomDef);
            case 'triple_crochet':
                return this.createTripleCrochetGeometry(geomDef);
            case 'increase':
                return this.createIncreaseGeometry(geomDef);
            case 'decrease':
                return this.createDecreaseGeometry(geomDef);
            default:
                return new THREE.SphereGeometry(0.2, 16, 16);
        }
    }

    /**
     * Create single crochet geometry - a V-shaped loop
     */
    createSingleCrochetGeometry(geomDef) {
        const shape = new THREE.Shape();
        const r = geomDef.baseRadius;
        const h = geomDef.height;

        // Create a V-shape profile
        shape.moveTo(-r, 0);
        shape.quadraticCurveTo(-r * 0.5, h * 0.3, 0, h);
        shape.quadraticCurveTo(r * 0.5, h * 0.3, r, 0);
        shape.quadraticCurveTo(r * 0.8, -h * 0.1, 0, -h * 0.15);
        shape.quadraticCurveTo(-r * 0.8, -h * 0.1, -r, 0);

        const extrudeSettings = {
            depth: r * 1.5,
            bevelEnabled: true,
            bevelThickness: r * 0.3,
            bevelSize: r * 0.2,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);

        return geometry;
    }

    /**
     * Create half double crochet geometry
     */
    createHalfDoubleGeometry(geomDef) {
        const shape = new THREE.Shape();
        const r = geomDef.baseRadius;
        const h = geomDef.height;

        shape.moveTo(-r, 0);
        shape.quadraticCurveTo(-r * 0.6, h * 0.5, 0, h);
        shape.quadraticCurveTo(r * 0.6, h * 0.5, r, 0);
        shape.quadraticCurveTo(r * 0.7, -h * 0.1, 0, -h * 0.12);
        shape.quadraticCurveTo(-r * 0.7, -h * 0.1, -r, 0);

        const extrudeSettings = {
            depth: r * 1.5,
            bevelEnabled: true,
            bevelThickness: r * 0.3,
            bevelSize: r * 0.2,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);

        return geometry;
    }

    /**
     * Create double crochet geometry - taller post
     */
    createDoubleCrochetGeometry(geomDef) {
        const shape = new THREE.Shape();
        const r = geomDef.baseRadius;
        const h = geomDef.height;

        // Taller V-shape with post
        shape.moveTo(-r, 0);
        shape.lineTo(-r * 0.8, h * 0.4);
        shape.quadraticCurveTo(-r * 0.5, h * 0.8, 0, h);
        shape.quadraticCurveTo(r * 0.5, h * 0.8, r * 0.8, h * 0.4);
        shape.lineTo(r, 0);
        shape.quadraticCurveTo(r * 0.6, -h * 0.08, 0, -h * 0.1);
        shape.quadraticCurveTo(-r * 0.6, -h * 0.08, -r, 0);

        const extrudeSettings = {
            depth: r * 1.5,
            bevelEnabled: true,
            bevelThickness: r * 0.25,
            bevelSize: r * 0.15,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);

        return geometry;
    }

    /**
     * Create triple crochet geometry - very tall post
     */
    createTripleCrochetGeometry(geomDef) {
        const shape = new THREE.Shape();
        const r = geomDef.baseRadius;
        const h = geomDef.height;

        shape.moveTo(-r, 0);
        shape.lineTo(-r * 0.85, h * 0.3);
        shape.lineTo(-r * 0.7, h * 0.6);
        shape.quadraticCurveTo(-r * 0.4, h * 0.9, 0, h);
        shape.quadraticCurveTo(r * 0.4, h * 0.9, r * 0.7, h * 0.6);
        shape.lineTo(r * 0.85, h * 0.3);
        shape.lineTo(r, 0);
        shape.quadraticCurveTo(r * 0.5, -h * 0.05, 0, -h * 0.08);
        shape.quadraticCurveTo(-r * 0.5, -h * 0.05, -r, 0);

        const extrudeSettings = {
            depth: r * 1.5,
            bevelEnabled: true,
            bevelThickness: r * 0.2,
            bevelSize: r * 0.12,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);

        return geometry;
    }

    /**
     * Create increase geometry - branching Y shape
     */
    createIncreaseGeometry(geomDef) {
        const group = new THREE.Group();

        // Base single crochet
        const baseGeom = this.createSingleCrochetGeometry(geomDef);

        // Create two branches
        const leftBranch = new THREE.Mesh(baseGeom);
        leftBranch.position.set(-geomDef.baseRadius * 0.8, geomDef.height * 0.3, 0);
        leftBranch.rotation.z = Math.PI * 0.1;

        const rightBranch = new THREE.Mesh(baseGeom);
        rightBranch.position.set(geomDef.baseRadius * 0.8, geomDef.height * 0.3, 0);
        rightBranch.rotation.z = -Math.PI * 0.1;

        // Merge into single geometry
        const merged = new THREE.BufferGeometry();

        // For simplicity, use a compound visual
        return this.createSingleCrochetGeometry({
            ...geomDef,
            baseRadius: geomDef.baseRadius * 1.3
        });
    }

    /**
     * Create decrease geometry - merging shape
     */
    createDecreaseGeometry(geomDef) {
        return this.createSingleCrochetGeometry({
            ...geomDef,
            baseRadius: geomDef.baseRadius * 0.9
        });
    }

    /**
     * Get or create material for a color using YarnMaterial system
     */
    getMaterial(color, options = {}) {
        return this.yarnMaterial.getMaterial(color, options);
    }

    /**
     * Create mesh for a stitch node
     */
    createMeshForNode(node) {
        if (this.meshMap.has(node.id)) {
            return this.meshMap.get(node.id);
        }

        const geometry = this.getGeometry(node.type);
        const material = this.getMaterial(node.color);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(node.position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store reference to node on mesh for raycasting
        mesh.userData.nodeId = node.id;
        mesh.userData.node = node;

        // Store reference to mesh on node
        node.mesh = mesh;

        this.meshMap.set(node.id, mesh);
        this.sceneManager.addStitchMesh(mesh);

        return mesh;
    }

    /**
     * Remove mesh for a stitch node
     */
    removeMeshForNode(node) {
        const mesh = this.meshMap.get(node.id);
        if (!mesh) return;

        this.sceneManager.removeStitchMesh(mesh);
        this.meshMap.delete(node.id);

        // Don't dispose geometry (it's cached and shared)
        // Material is also cached
    }

    /**
     * Update mesh for a node (after type change)
     */
    updateMeshForNode(node) {
        const mesh = this.meshMap.get(node.id);
        if (!mesh) {
            this.createMeshForNode(node);
            return;
        }

        // Update geometry
        mesh.geometry = this.getGeometry(node.type);

        // Update material
        mesh.material = this.getMaterial(node.color, {
            selected: node.isSelected,
            highlighted: node.isHighlighted
        });

        // Update position
        mesh.position.copy(node.position);
    }

    /**
     * Update selection visual for a node
     */
    updateSelectionVisual(node) {
        const mesh = this.meshMap.get(node.id);
        if (!mesh) return;

        mesh.material = this.getMaterial(node.color, {
            selected: node.isSelected,
            highlighted: node.isHighlighted
        });
    }

    /**
     * Clear all meshes
     */
    clearAllMeshes() {
        this.meshMap.forEach((mesh, id) => {
            this.sceneManager.removeStitchMesh(mesh);
        });
        this.meshMap.clear();
    }

    /**
     * Render entire pattern
     */
    renderPattern(pattern) {
        this.clearAllMeshes();

        pattern.graph.getAllNodes().forEach(node => {
            this.createMeshForNode(node);
        });
    }

    /**
     * Get mesh for a node
     */
    getMesh(nodeOrId) {
        const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
        return this.meshMap.get(id);
    }

    /**
     * Get all meshes as array
     */
    getAllMeshes() {
        return Array.from(this.meshMap.values());
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Dispose cached geometries
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();

        // YarnMaterial handles its own disposal

        // Clear mesh map
        this.clearAllMeshes();
    }
}
