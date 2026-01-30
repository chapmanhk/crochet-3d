import * as THREE from 'three';
import { StitchType, getStitchDefinition } from '../core/StitchTypes.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
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

        // Event subscriptions for cleanup
        this.eventSubs = new EventSubscriptions();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners with error handling
     */
    setupEventListeners() {
        this.eventSubs.on(Events.STITCH_ADDED, ({ node }) => {
            try {
                if (node) this.createMeshForNode(node);
            } catch (err) {
                console.error('Error creating mesh for added node:', err);
            }
        });

        this.eventSubs.on(Events.STITCH_REMOVED, ({ node }) => {
            try {
                if (node) this.removeMeshForNode(node);
            } catch (err) {
                console.error('Error removing mesh for node:', err);
            }
        });

        this.eventSubs.on(Events.PATTERN_CLEARED, () => {
            try {
                this.clearAllMeshes();
            } catch (err) {
                console.error('Error clearing meshes:', err);
            }
        });

        this.eventSubs.on(Events.PATTERN_LOADED, ({ pattern }) => {
            try {
                if (pattern) this.renderPattern(pattern);
            } catch (err) {
                console.error('Error rendering pattern:', err);
            }
        });

        this.eventSubs.on(Events.STITCH_TYPE_CHANGED, ({ node }) => {
            try {
                if (node) this.updateMeshForNode(node);
            } catch (err) {
                console.error('Error updating mesh for type change:', err);
            }
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
     * Create increase geometry - wider stitch to represent two stitches in one
     */
    createIncreaseGeometry(geomDef) {
        // Use a wider single crochet to visually represent the increase
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
     * @param {StitchNode} node - The node to create a mesh for
     * @returns {THREE.Mesh|null} The created mesh, or null if creation failed
     */
    createMeshForNode(node) {
        // Validate input
        if (!node || !node.id) {
            console.warn('Cannot create mesh: invalid node');
            return null;
        }

        // Return existing mesh if already created
        if (this.meshMap.has(node.id)) {
            return this.meshMap.get(node.id);
        }

        try {
            const geometry = this.getGeometry(node.type);
            const material = this.getMaterial(node.color);

            if (!geometry || !material) {
                console.warn('Failed to get geometry or material for node:', node.id);
                return null;
            }

            const mesh = new THREE.Mesh(geometry, material);

            // Safety check for position
            if (node.position) {
                mesh.position.copy(node.position);
            }

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
        } catch (err) {
            console.error('Error creating mesh for node:', node.id, err);
            return null;
        }
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
     *
     * Note: Geometry and materials are cached and shared across meshes,
     * so we don't dispose old references - they may be used by other meshes.
     * The caches are cleaned up in dispose().
     */
    updateMeshForNode(node) {
        const mesh = this.meshMap.get(node.id);
        if (!mesh) {
            this.createMeshForNode(node);
            return;
        }

        // Update geometry (cached/shared - don't dispose old reference)
        mesh.geometry = this.getGeometry(node.type);

        // Update material (cached by YarnMaterial - don't dispose old reference)
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
        // Clean up event subscriptions
        this.eventSubs.dispose();

        // Dispose cached geometries
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();

        // YarnMaterial handles its own disposal

        // Clear mesh map
        this.clearAllMeshes();
    }
}
