import * as THREE from 'three';
import { StitchType, getStitchDefinition } from '../core/StitchTypes.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
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

        // New row indicator materials (distinct orange color)
        this.newRowMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.NEW_ROW_COLOR,
            transparent: true,
            opacity: AttachmentConstants.NEW_ROW_OPACITY,
            emissive: AttachmentConstants.NEW_ROW_COLOR,
            emissiveIntensity: AttachmentConstants.NEW_ROW_EMISSIVE_INTENSITY
        });

        this.newRowHoverMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.NEW_ROW_HOVER_COLOR,
            transparent: true,
            opacity: AttachmentConstants.HOVER_OPACITY,
            emissive: AttachmentConstants.NEW_ROW_HOVER_COLOR,
            emissiveIntensity: AttachmentConstants.HOVER_EMISSIVE_INTENSITY
        });

        // Chain marker materials
        this.chainStartMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.CHAIN_START_COLOR,
            transparent: true,
            opacity: 0.85,
            emissive: AttachmentConstants.CHAIN_START_COLOR,
            emissiveIntensity: 0.5
        });

        this.chainEndMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.CHAIN_END_COLOR,
            transparent: true,
            opacity: 0.85,
            emissive: AttachmentConstants.CHAIN_END_COLOR,
            emissiveIntensity: 0.5
        });

        this.workingPositionMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.WORKING_POSITION_COLOR,
            transparent: true,
            opacity: 0.9,
            emissive: AttachmentConstants.WORKING_POSITION_COLOR,
            emissiveIntensity: 0.6
        });

        // Currently hovered point
        this.hoveredPoint = null;

        // Current stitch type to preview
        this.previewStitchType = StitchType.SINGLE_CROCHET;

        // Marker meshes for chain navigation
        this.markerMeshes = [];

        // Geometry cache for ghost stitches
        this.geometryCache = new Map();

        // Event subscriptions for cleanup
        this.eventSubs = new EventSubscriptions();

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
        this.eventSubs.on(Events.STITCH_ADDED, () => this.updateAttachmentPoints());
        this.eventSubs.on(Events.STITCH_REMOVED, () => this.updateAttachmentPoints());
        this.eventSubs.on(Events.PATTERN_LOADED, () => this.updateAttachmentPoints());
        this.eventSubs.on(Events.PATTERN_CLEARED, () => this.clearPoints());
        this.eventSubs.on(Events.ROW_ADDED, () => this.updateAttachmentPoints());
        this.eventSubs.on(Events.STITCH_TYPE_SELECTED, ({ type }) => {
            this.previewStitchType = type;
            this.updateAttachmentPoints();
        });
    }

    /**
     * Update attachment points based on current pattern state
     */
    updateAttachmentPoints() {
        this.clearPoints();
        this.clearMarkers();

        const attachPoints = this.pattern.getAttachmentPoints();

        // Only show ghosts for available attachment points
        // (not ones that already have stitches worked into them)
        const availablePoints = attachPoints.filter(p => p.available);

        availablePoints.forEach((point, index) => {
            const mesh = this.createPointMesh(point, index);
            if (mesh) {
                this.pointMeshes.push(mesh);
                this.group.add(mesh);
            }
        });

        // If no available points in current row, show "new row" indicator
        // This allows the user to turn and start a new row
        if (availablePoints.length === 0 && this.pattern.currentRow >= 0) {
            this.addNewRowIndicator();
        }

        // Update navigation markers (chain start/end, working position)
        this.updateNavigationMarkers(availablePoints);
    }

    /**
     * Update navigation markers to help user understand chain orientation
     * Shows markers for: chain start (green), chain end (blue), working position (yellow)
     */
    updateNavigationMarkers(availablePoints) {
        // Get foundation chain (row 0)
        const foundationRow = this.pattern.graph.getRowSorted(0);
        if (foundationRow.length === 0) return;

        // Chain start marker (leftmost chain stitch)
        const chainStart = foundationRow[0];
        this.addMarker(chainStart, this.chainStartMaterial, AttachmentConstants.CHAIN_START_SCALE, 'start');

        // Chain end marker (rightmost chain stitch - where you begin working)
        const chainEnd = foundationRow[foundationRow.length - 1];
        this.addMarker(chainEnd, this.chainEndMaterial, AttachmentConstants.CHAIN_END_SCALE, 'end');

        // Working position marker - show at suggested next stitch position
        const suggestedPoint = availablePoints.find(p => p.suggested);
        if (suggestedPoint) {
            this.addMarker(
                suggestedPoint.stitch,
                this.workingPositionMaterial,
                AttachmentConstants.WORKING_POSITION_SCALE,
                'working'
            );
        }
    }

    /**
     * Add a navigation marker above a stitch
     */
    addMarker(stitch, material, scale, type) {
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const mesh = new THREE.Mesh(geometry, material);

        // Position marker above the stitch
        mesh.position.set(
            stitch.position.x,
            stitch.position.y + stitch.height + 0.3,
            stitch.position.z
        );

        mesh.scale.setScalar(scale);
        mesh.userData.markerType = type;

        this.markerMeshes.push(mesh);
        this.group.add(mesh);
    }

    /**
     * Clear all navigation marker meshes
     */
    clearMarkers() {
        this.markerMeshes.forEach(mesh => {
            this.group.remove(mesh);
            mesh.geometry.dispose();
        });
        this.markerMeshes = [];
    }

    /**
     * Add a "new row" indicator at the end of the current row
     * This appears when all stitches in the previous row have been worked into
     */
    addNewRowIndicator() {
        // Get the last stitch in the current working row
        const currentRowStitches = this.pattern.graph.getRowSorted(this.pattern.currentRow);
        if (currentRowStitches.length === 0) return;

        // Find the end stitch (where we'd turn)
        const endStitch = this.pattern.workingDirection === 'left'
            ? currentRowStitches[0]
            : currentRowStitches[currentRowStitches.length - 1];

        const geometry = this.getGeometry(this.previewStitchType);
        const mesh = new THREE.Mesh(geometry, this.newRowMaterial);

        // Position above and slightly to the side to indicate "turn"
        const def = getStitchDefinition(this.previewStitchType);
        const offsetX = this.pattern.workingDirection === 'left' ? -0.3 : 0.3;

        mesh.position.set(
            endStitch.position.x + offsetX,
            endStitch.position.y + (endStitch.height + def.height) / 2,
            endStitch.position.z
        );

        // Mark as new row indicator
        mesh.userData.isNewRowIndicator = true;
        mesh.userData.isAttachmentPoint = true;
        mesh.scale.setScalar(AttachmentConstants.GHOST_SCALE * 1.1);

        this.pointMeshes.push(mesh);
        this.group.add(mesh);
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

        // Position the ghost stitch directly above the attachment point
        const x = attachStitch.position.x;
        const y = attachStitch.position.y + (attachStitch.height + def.height) / 2;
        const z = attachStitch.position.z;

        mesh.position.set(x, y, z);

        // Store reference data
        mesh.userData.attachmentPoint = point;
        mesh.userData.index = index;
        mesh.userData.isAttachmentPoint = true;

        // Scale down slightly for ghost effect
        mesh.scale.setScalar(AttachmentConstants.GHOST_SCALE);

        // Highlight suggested attachment point
        if (point.suggested) {
            mesh.scale.setScalar(AttachmentConstants.GHOST_SCALE * 1.2);
        }

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
            // Use appropriate base material based on whether it's a new row indicator
            const baseMaterial = this.hoveredPoint.userData.isNewRowIndicator
                ? this.newRowMaterial
                : this.ghostMaterial;
            this.hoveredPoint.material = baseMaterial;
            this.hoveredPoint.scale.setScalar(AttachmentConstants.GHOST_SCALE);
            this.hoveredPoint = null;
        }

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            // Use appropriate hover material based on whether it's a new row indicator
            const hoverMat = mesh.userData.isNewRowIndicator
                ? this.newRowHoverMaterial
                : this.hoverMaterial;
            mesh.material = hoverMat;
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

        // Handle new row indicator click
        if (this.hoveredPoint.userData.isNewRowIndicator) {
            // Start a new row, which will add turning chain and flip direction
            this.pattern.startNewRow({ stitchType: this.previewStitchType });
            // Update attachment points after starting new row
            this.updateAttachmentPoints();
            return;
        }

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
        // Also clear markers when clearing points
        this.clearMarkers();
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
        // Clean up all event subscriptions
        this.eventSubs.dispose();

        const canvas = this.sceneManager.domElement;
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('click', this.onClick);

        this.clearPoints();

        this.geometryCache.forEach(g => g.dispose());
        this.geometryCache.clear();

        this.ghostMaterial.dispose();
        this.hoverMaterial.dispose();
        this.newRowMaterial.dispose();
        this.newRowHoverMaterial.dispose();
        this.chainStartMaterial.dispose();
        this.chainEndMaterial.dispose();
        this.workingPositionMaterial.dispose();

        this.sceneManager.scene.remove(this.group);
    }
}
