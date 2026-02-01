import * as THREE from 'three';
import { StitchType, getStitchDefinition } from '../core/StitchTypes.js';
import { StitchValidator } from '../core/StitchValidator.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
import { AttachmentConstants } from '../utils/Constants.js';
import { showAlert, showConfirm } from '../ui/Modal.js';

/**
 * AttachmentPointManager - Manages clickable attachment points for adding stitches
 *
 * Shows ghost stitches at valid attachment locations that users can click to add stitches.
 */

export class AttachmentPointManager {
    constructor(sceneManager, pattern) {
        this.sceneManager = sceneManager;
        this.pattern = pattern;
        this.sceneManager.isHoveringAttachmentPoint = false;

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

        // Chain space indicator materials
        this.chainSpaceMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.CHAIN_SPACE_COLOR,
            transparent: true,
            opacity: AttachmentConstants.CHAIN_SPACE_OPACITY,
            emissive: AttachmentConstants.CHAIN_SPACE_COLOR,
            emissiveIntensity: AttachmentConstants.GHOST_EMISSIVE_INTENSITY
        });

        this.chainSpaceHoverMaterial = new THREE.MeshStandardMaterial({
            color: AttachmentConstants.CHAIN_SPACE_HOVER_COLOR,
            transparent: true,
            opacity: AttachmentConstants.HOVER_OPACITY,
            emissive: AttachmentConstants.CHAIN_SPACE_HOVER_COLOR,
            emissiveIntensity: AttachmentConstants.HOVER_EMISSIVE_INTENSITY
        });

        // Geometry cache for different attachment point types (for accessibility)
        this.attachmentGeometries = {
            newRow: null, // Will be created as cone (pointing up)
            chainSpace: null // Will be created as ring/torus (to indicate "space")
        };

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
        this.eventSubs.on(Events.ROW_NAVIGATED, () => this.updateAttachmentPoints());
        this.eventSubs.on(Events.PHYSICS_STEP, () => this.updateDynamicPositions());
        this.eventSubs.on(Events.STITCH_TYPE_SELECTED, ({ type }) => {
            this.previewStitchType = type;
            this.updateAttachmentPoints();
        });
        this.eventSubs.on(Events.ATTACHMENT_OPTIONS_CHANGED, () => {
            this.updateAttachmentPoints();
        });
    }

    /**
     * Update attachment points based on current pattern state
     */
    updateAttachmentPoints() {
        this.clearPoints();
        this.clearMarkers();

        const useChainSpaces = Boolean(this.pattern.currentWorkIntoSpace);
        const attachPoints = useChainSpaces
            ? this.pattern.getChainSpaces()
            : this.pattern.getAttachmentPoints();

        // Only show ghosts for available attachment points
        // (not ones that already have stitches worked into them)
        const availablePoints = attachPoints.filter(p => p.available !== false);

        if (useChainSpaces && availablePoints.length > 0 && !availablePoints.some(p => p.suggested)) {
            availablePoints[0].suggested = true;
        }

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
        const hasFoundation = typeof this.pattern.hasFoundationChain === 'function'
            ? this.pattern.hasFoundationChain()
            : false;
        const foundationRow = hasFoundation ? this.pattern.graph.getRowSorted(0) : [];

        if (foundationRow.length > 0) {
            // Chain start marker (leftmost chain stitch)
            const chainStart = foundationRow[0];
            this.addMarker(chainStart, this.chainStartMaterial, AttachmentConstants.CHAIN_START_SCALE, 'start');

            // Chain end marker (rightmost chain stitch - where you begin working)
            const chainEnd = foundationRow[foundationRow.length - 1];
            this.addMarker(chainEnd, this.chainEndMaterial, AttachmentConstants.CHAIN_END_SCALE, 'end');
        }

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
        mesh.userData.stitch = stitch;

        this.markerMeshes.push(mesh);
        this.group.add(mesh);
    }

    /**
     * Update positions for existing ghosts and markers (e.g., after physics)
     */
    updateDynamicPositions() {
        if (this.pointMeshes.length === 0 && this.markerMeshes.length === 0) return;

        const def = getStitchDefinition(this.previewStitchType);
        const previewHeight = def?.height ?? 0.5;

        this.pointMeshes.forEach(mesh => {
            if (mesh.userData.isNewRowIndicator) {
                const currentRowStitches = this.pattern.graph.getRowSorted(this.pattern.currentRow);
                if (currentRowStitches.length === 0) return;

                const endStitch = this.pattern.workingDirection === 'left'
                    ? currentRowStitches[0]
                    : currentRowStitches[currentRowStitches.length - 1];

                const offsetX = this.pattern.workingDirection === 'left' ? -0.3 : 0.3;
                mesh.position.set(
                    endStitch.position.x + offsetX,
                    endStitch.position.y + (endStitch.height + previewHeight) / 2,
                    endStitch.position.z
                );
                return;
            }

            const point = mesh.userData.attachmentPoint;
            if (!point?.stitch?.position) return;

            const attachStitch = point.stitch;
            mesh.position.set(
                attachStitch.position.x,
                attachStitch.position.y + (attachStitch.height + previewHeight) / 2,
                attachStitch.position.z
            );
        });

        this.markerMeshes.forEach(mesh => {
            const stitch = mesh.userData.stitch;
            if (!stitch?.position) return;
            mesh.position.set(
                stitch.position.x,
                stitch.position.y + stitch.height + 0.3,
                stitch.position.z
            );
        });
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

        // Use cone geometry for new row indicators (accessibility: shape differentiation)
        const geometry = this.getNewRowGeometry();
        const mesh = new THREE.Mesh(geometry, this.newRowMaterial);

        // Position above and slightly to the side to indicate "turn"
        const def = getStitchDefinition(this.previewStitchType);
        const offsetX = this.pattern.workingDirection === 'left' ? -0.3 : 0.3;

        mesh.position.set(
            endStitch.position.x + offsetX,
            endStitch.position.y + (endStitch.height + def.height) / 2,
            endStitch.position.z
        );

        // Mark as new row indicator with descriptive label for accessibility
        mesh.userData.isNewRowIndicator = true;
        mesh.userData.isAttachmentPoint = true;
        mesh.userData.ariaLabel = 'New row attachment point - turn and start next row';
        const baseScale = AttachmentConstants.GHOST_SCALE * 1.1;
        mesh.userData.baseScale = baseScale;
        mesh.scale.setScalar(baseScale);

        this.pointMeshes.push(mesh);
        this.group.add(mesh);
    }

    /**
     * Create a mesh for an attachment point
     */
    createPointMesh(point, index) {
        // Use different geometries for accessibility (not just color)
        const isChainSpace = point.type === 'chain-space';
        const geometry = isChainSpace
            ? this.getChainSpaceGeometry()
            : this.getGeometry(this.previewStitchType);
        const baseMaterial = isChainSpace ? this.chainSpaceMaterial : this.ghostMaterial;
        // Use shared material instead of cloning - disposed in dispose() not clearPoints()
        const mesh = new THREE.Mesh(geometry, baseMaterial);

        // Calculate position above the attachment stitch
        const def = getStitchDefinition(this.previewStitchType);
        const attachStitch = point.stitch;

        // Position the ghost stitch directly above the attachment point
        const x = attachStitch.position.x;
        const y = attachStitch.position.y + (attachStitch.height + def.height) / 2;
        const z = attachStitch.position.z;

        mesh.position.set(x, y, z);

        // Store reference data with descriptive labels for accessibility
        mesh.userData.attachmentPoint = point;
        mesh.userData.index = index;
        mesh.userData.isAttachmentPoint = true;
        mesh.userData.isChainSpace = isChainSpace;
        mesh.userData.ariaLabel = isChainSpace
            ? 'Chain space attachment point'
            : point.suggested
                ? 'Suggested next stitch attachment point'
                : 'Stitch attachment point';

        // Scale down slightly for ghost effect
        const baseScale = point.suggested
            ? AttachmentConstants.GHOST_SCALE * 1.2
            : AttachmentConstants.GHOST_SCALE;
        mesh.userData.baseScale = baseScale;
        mesh.scale.setScalar(baseScale);

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
     * Get cone geometry for new row indicators (cached)
     * Uses cone shape to differentiate from regular stitches (accessibility)
     */
    getNewRowGeometry() {
        if (this.attachmentGeometries.newRow) {
            return this.attachmentGeometries.newRow;
        }

        // Create cone pointing upward to indicate "next row"
        const geometry = new THREE.ConeGeometry(0.25, 0.5, 8);
        // Rotate so cone points up
        geometry.rotateX(Math.PI);
        this.attachmentGeometries.newRow = geometry;
        return geometry;
    }

    /**
     * Get ring/torus geometry for chain space indicators (cached)
     * Uses hollow ring shape to indicate "space" (accessibility)
     */
    getChainSpaceGeometry() {
        if (this.attachmentGeometries.chainSpace) {
            return this.attachmentGeometries.chainSpace;
        }

        // Create ring/torus to indicate chain space
        const geometry = new THREE.TorusGeometry(
            0.3,  // radius
            0.08, // tube thickness
            8,    // radial segments
            12    // tubular segments
        );
        // Rotate to lay flat
        geometry.rotateX(Math.PI / 2);
        this.attachmentGeometries.chainSpace = geometry;
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
                : (this.hoveredPoint.userData.isChainSpace ? this.chainSpaceMaterial : this.ghostMaterial);
            this.hoveredPoint.material = baseMaterial;
            const baseScale = this.hoveredPoint.userData.baseScale ?? AttachmentConstants.GHOST_SCALE;
            this.hoveredPoint.scale.setScalar(baseScale);
            this.hoveredPoint = null;
        }

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            // Use appropriate hover material based on whether it's a new row indicator
            const hoverMat = mesh.userData.isNewRowIndicator
                ? this.newRowHoverMaterial
                : (mesh.userData.isChainSpace ? this.chainSpaceHoverMaterial : this.hoverMaterial);
            mesh.material = hoverMat;
            mesh.scale.setScalar(AttachmentConstants.HOVER_SCALE);
            this.hoveredPoint = mesh;
            this.sceneManager.isHoveringAttachmentPoint = true;
            this.sceneManager.domElement.style.cursor = 'pointer';
        } else {
            this.sceneManager.domElement.style.cursor = 'default';
            this.sceneManager.isHoveringAttachmentPoint = false;
        }
    }

    /**
     * Warn if row stitch count differs from previous row (unintentional shaping)
     * @returns {Promise<boolean>} - True if user confirms or no warning needed
     */
    async confirmRowCountMismatch() {
        const currentRow = this.pattern.currentRow;
        if (currentRow <= 0) {
            return true;
        }

        // Check if foundation exists
        const hasFoundation = typeof this.pattern.hasFoundationChain === 'function'
            ? this.pattern.hasFoundationChain()
            : false;

        // Don't warn when going from foundation to row 1
        if (hasFoundation && currentRow === 1) {
            return true;
        }

        // Get stitch counts for current and previous rows
        const currentCount = this.pattern.getEffectiveRowStitchCount(currentRow);
        const previousCount = this.pattern.getEffectiveRowStitchCount(currentRow - 1);

        // No warning if counts match or either is 0
        if (currentCount === 0 || previousCount === 0 || currentCount === previousCount) {
            return true;
        }

        // Check if the row has explicit shaping (increases, decreases, skips)
        const currentRowStitches = this.pattern.graph.getRow(currentRow) || [];
        const hasExplicitShaping = currentRowStitches.some(stitch => {
            if (!stitch) return false;
            if (stitch.isIncrease || stitch.isDecrease) return true;
            if ((stitch.skippedStitches?.length || 0) > 0) return true;
            const connectionsOut = stitch.effectiveConnections?.connectionsOut ?? 1;
            const connectionsIn = stitch.effectiveConnections?.connectionsIn ?? 1;
            return connectionsOut > 1 || connectionsIn > 1;
        });

        // If there's explicit shaping, no warning (intentional)
        if (hasExplicitShaping) {
            return true;
        }

        // Calculate display row labels
        const getDisplayLabel = (row) => {
            if (hasFoundation) {
                return row === 0 ? 'Foundation Row' : `Row ${row}`;
            }
            return `Row ${row + 1}`;
        };

        const currentLabel = getDisplayLabel(currentRow);
        const prevLabel = getDisplayLabel(currentRow - 1);
        const message = `${currentLabel} has ${currentCount} stitches, but ${prevLabel} has ${previousCount}. ` +
            'This may indicate an unintended increase/decrease. Start a new row anyway?';

        return showConfirm(message, 'Row Count Warning');
    }

    /**
     * Handle click on attachment points
     */
    async onClick(event) {
        if (!this.hoveredPoint) return;

        // Handle new row indicator click
        if (this.hoveredPoint.userData.isNewRowIndicator) {
            // Confirm if row count differs from previous row (may be unintentional)
            const proceed = await this.confirmRowCountMismatch();
            if (!proceed) {
                return;
            }

            // Start a new row, which will add turning chain and flip direction
            this.pattern.startNewRow({ stitchType: this.previewStitchType });
            // Update attachment points after starting new row
            this.updateAttachmentPoints();
            return;
        }

        const point = this.hoveredPoint.userData.attachmentPoint;
        if (!point) return;

        // Add stitch at this attachment point
        const useSpace = point.type === 'chain-space' || this.pattern.currentWorkIntoSpace;
        const skipCount = useSpace ? 0 : (this.pattern.currentSkipCount || 0);
        const stitchOptions = {
            modifiers: this.pattern.currentModifiers,
            skipCount,
            loopSelection: this.pattern.currentLoopSelection,
            workIntoSpace: useSpace
        };
        const validation = StitchValidator.canPlaceStitch(
            this.previewStitchType,
            point,
            this.pattern,
            stitchOptions
        );
        if (!validation.valid) {
            await showAlert(validation.errors.join('\n'), 'Cannot Place Stitch');
            return;
        }
        if (validation.warnings.length > 0) {
            console.warn('Stitch placement warnings:', validation.warnings);
        }

        this.pattern.addStitch(this.previewStitchType, point.stitch, stitchOptions);

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
        this.sceneManager.isHoveringAttachmentPoint = false;
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
        this.sceneManager.isHoveringAttachmentPoint = false;

        this.geometryCache.forEach(g => g.dispose());
        this.geometryCache.clear();

        // Dispose attachment point geometries
        if (this.attachmentGeometries.newRow) {
            this.attachmentGeometries.newRow.dispose();
        }
        if (this.attachmentGeometries.chainSpace) {
            this.attachmentGeometries.chainSpace.dispose();
        }

        this.ghostMaterial.dispose();
        this.hoverMaterial.dispose();
        this.newRowMaterial.dispose();
        this.newRowHoverMaterial.dispose();
        this.chainSpaceMaterial.dispose();
        this.chainSpaceHoverMaterial.dispose();
        this.chainStartMaterial.dispose();
        this.chainEndMaterial.dispose();
        this.workingPositionMaterial.dispose();

        this.sceneManager.scene.remove(this.group);
    }
}
