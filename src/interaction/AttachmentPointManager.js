import * as THREE from 'three';
import { StitchType, getStitchDefinition } from '../core/StitchTypes.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { AttachmentConstants } from '../utils/Constants.js';

/**
 * AttachmentPointManager - Manages clickable attachment points for adding stitches
 *
 * Shows ghost stitches at valid attachment locations that users can click to add stitches.
 */

export class AttachmentPointManager {
    constructor(sceneManager, pattern) {
        this.sceneManager = sceneManager;
        this.pattern = pattern;

        // Group for attachment indicators
        this.group = new THREE.Group();
        this.group.name = 'attachmentPoints';
        this.sceneManager.scene.add(this.group);

        // Current attachment point meshes
        this.pointMeshes = [];

        // Ghost material for preview stitches
        this.ghostMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.GHOST_COLOR,
            transparent: true,
            opacity: AttachmentConstants.GHOST_OPACITY,
            emissive: AttachmentConstants.GHOST_COLOR,
            emissiveIntensity: AttachmentConstants.GHOST_EMISSIVE_INTENSITY
        });

        this.hoverMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.HOVER_COLOR,
            transparent: true,
            opacity: AttachmentConstants.HOVER_OPACITY,
            emissive: AttachmentConstants.HOVER_COLOR,
            emissiveIntensity: AttachmentConstants.HOVER_EMISSIVE_INTENSITY
        });

        // Currently hovered point
        this.hoveredPoint = null;

        // Current stitch type to preview
        this.previewStitchType = StitchType.SINGLE_CROCHET;

        // Geometry cache for ghost stitches
        this.geometryCache = new Map();

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);

        // Setup
        this.setupEventListeners();
        this.setupPatternListeners();
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        const canvas = this.sceneManager.domElement;
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('click', this.onClick);
    }

    /**
     * Setup pattern event listeners
     */
    setupPatternListeners() {
        EventBus.on(Events.STITCH_ADDED, () => this.updateAttachmentPoints());
        EventBus.on(Events.STITCH_REMOVED, () => this.updateAttachmentPoints());
        EventBus.on(Events.PATTERN_LOADED, () => this.updateAttachmentPoints());
        EventBus.on(Events.PATTERN_CLEARED, () => this.clearPoints());
        EventBus.on(Events.ROW_ADDED, () => this.updateAttachmentPoints());
        EventBus.on(Events.STITCH_TYPE_SELECTED, ({ type }) => {
            this.previewStitchType = type;
            this.updateAttachmentPoints();
        });
    }

    /**
     * Update attachment points based on current pattern state
     */
    updateAttachmentPoints() {
        this.clearPoints();

        const attachPoints = this.pattern.getAttachmentPoints();

        attachPoints.forEach((point, index) => {
            const mesh = this.createPointMesh(point, index);
            if (mesh) {
                this.pointMeshes.push(mesh);
                this.group.add(mesh);
            }
        });
    }

    /**
     * Create a mesh for an attachment point
     */
    createPointMesh(point, index) {
        const geometry = this.getGeometry(this.previewStitchType);
        // Use shared material instead of cloning - disposed in dispose() not clearPoints()
        const mesh = new THREE.Mesh(geometry, this.ghostMaterial);

        // Calculate position above the attachment stitch
        const def = getStitchDefinition(this.previewStitchType);
        const attachStitch = point.stitch;

        let x = attachStitch.position.x;
        let y = attachStitch.position.y + (attachStitch.height + def.height) / 2;
        let z = attachStitch.position.z;

        // Offset for working direction
        const rowStitches = this.pattern.graph.getRow(this.pattern.currentRow);
        if (rowStitches.length > 0) {
            const lastInRow = rowStitches[rowStitches.length - 1];
            x = lastInRow.position.x + (lastInRow.width + def.width) / 2;
        }

        mesh.position.set(x, y, z);

        // Store reference data
        mesh.userData.attachmentPoint = point;
        mesh.userData.index = index;
        mesh.userData.isAttachmentPoint = true;

        // Scale down slightly for ghost effect
        mesh.scale.setScalar(AttachmentConstants.GHOST_SCALE);

        return mesh;
    }

    /**
     * Get geometry for a stitch type (cached)
     */
    getGeometry(type) {
        if (this.geometryCache.has(type)) {
            return this.geometryCache.get(type);
        }

        const def = getStitchDefinition(type);
        let geometry;

        if (!def || !def.geometry) {
            geometry = new THREE.SphereGeometry(
                AttachmentConstants.DEFAULT_SPHERE_RADIUS,
                AttachmentConstants.DEFAULT_SPHERE_SEGMENTS,
                AttachmentConstants.DEFAULT_SPHERE_SEGMENTS
            );
        } else if (def.geometry.type === 'torus') {
            geometry = new THREE.TorusGeometry(
                def.geometry.radius,
                def.geometry.tube,
                def.geometry.radialSegments,
                def.geometry.tubularSegments
            );
            if (def.geometry.rotationX) {
                geometry.rotateX(def.geometry.rotationX);
            }
        } else {
            // Simple sphere for custom geometries in ghost mode
            geometry = new THREE.SphereGeometry(def.height * 0.4, 16, 16);
        }

        this.geometryCache.set(type, geometry);
        return geometry;
    }

    /**
     * Handle mouse move for hover detection
     */
    onMouseMove(event) {
        if (this.pointMeshes.length === 0) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const rect = this.sceneManager.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, this.sceneManager.camera);
        const intersects = raycaster.intersectObjects(this.pointMeshes);

        // Reset previous hover - reuse base material instead of cloning
        if (this.hoveredPoint) {
            this.hoveredPoint.material = this.ghostMaterial;
            this.hoveredPoint.scale.setScalar(AttachmentConstants.GHOST_SCALE);
            this.hoveredPoint = null;
        }

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            // Reuse base material instead of cloning to prevent memory leak
            mesh.material = this.hoverMaterial;
            mesh.scale.setScalar(AttachmentConstants.HOVER_SCALE);
            this.hoveredPoint = mesh;
            this.sceneManager.domElement.style.cursor = 'pointer';
        } else {
            this.sceneManager.domElement.style.cursor = 'default';
        }
    }

    /**
     * Handle click on attachment points
     */
    onClick(event) {
        if (!this.hoveredPoint) return;

        const point = this.hoveredPoint.userData.attachmentPoint;
        if (!point) return;

        // Add stitch at this attachment point
        this.pattern.addStitch(this.previewStitchType, point.stitch);

        // Update attachment points after adding
        this.updateAttachmentPoints();
    }

    /**
     * Clear all attachment point meshes
     * Note: Materials are shared and reused, so we don't dispose them here.
     * They are disposed in dispose() when the manager is destroyed.
     */
    clearPoints() {
        this.pointMeshes.forEach(mesh => {
            this.group.remove(mesh);
            // Don't dispose material - it's shared (ghostMaterial or hoverMaterial)
        });
        this.pointMeshes = [];
        this.hoveredPoint = null;
    }

    /**
     * Show/hide attachment points
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Dispose resources
     */
    dispose() {
        const canvas = this.sceneManager.domElement;
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('click', this.onClick);

        this.clearPoints();

        this.geometryCache.forEach(g => g.dispose());
        this.geometryCache.clear();

        this.ghostMaterial.dispose();
        this.hoverMaterial.dispose();

        this.sceneManager.scene.remove(this.group);
    }
}
