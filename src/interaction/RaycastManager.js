import * as THREE from 'three';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * RaycastManager - Handles mouse interaction with 3D objects
 *
 * Manages:
 * - Click detection on stitches
 * - Hover detection
 * - Selection management
 * - Attachment point visualization
 */

export class RaycastManager {
    constructor(sceneManager, stitchRenderer) {
        this.sceneManager = sceneManager;
        this.stitchRenderer = stitchRenderer;

        // Raycaster for hit detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Current hover/selection state
        this.hoveredNode = null;
        this.selectedNodes = new Set();

        // Attachment point indicators
        this.attachmentIndicators = [];
        this.attachmentGroup = new THREE.Group();
        this.sceneManager.addUIObject(this.attachmentGroup);

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        // Setup listeners
        this.setupEventListeners();
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        const canvas = this.sceneManager.domElement;

        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('click', this.onClick);
        window.addEventListener('keydown', this.onKeyDown);
    }

    /**
     * Update mouse position in normalized device coordinates
     */
    updateMousePosition(event) {
        const rect = this.sceneManager.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Perform raycast and return intersected objects
     */
    raycast() {
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const meshes = this.stitchRenderer.getAllMeshes();
        return this.raycaster.intersectObjects(meshes, false);
    }

    /**
     * Handle mouse move for hover detection
     */
    onMouseMove(event) {
        this.updateMousePosition(event);

        const intersects = this.raycast();

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const node = mesh.userData.node;

            if (node && node !== this.hoveredNode) {
                // Unhover previous
                if (this.hoveredNode) {
                    this.hoveredNode.setHighlighted(false);
                    this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                    EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                }

                // Hover new
                this.hoveredNode = node;
                node.setHighlighted(true);
                this.stitchRenderer.updateSelectionVisual(node);
                EventBus.emit(Events.STITCH_HOVERED, { node });

                // Change cursor
                this.sceneManager.domElement.style.cursor = 'pointer';
            }
        } else {
            // No intersection
            if (this.hoveredNode) {
                this.hoveredNode.setHighlighted(false);
                this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                this.hoveredNode = null;
            }

            this.sceneManager.domElement.style.cursor = 'default';
        }
    }

    /**
     * Handle click for selection
     */
    onClick(event) {
        this.updateMousePosition(event);

        const intersects = this.raycast();

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const node = mesh.userData.node;

            if (node) {
                const isShiftClick = event.shiftKey;
                const isCtrlClick = event.ctrlKey || event.metaKey;

                if (isShiftClick || isCtrlClick) {
                    // Multi-select toggle
                    this.toggleSelection(node);
                } else {
                    // Single select
                    this.selectSingle(node);
                }
            }
        } else {
            // Clicked on empty space
            if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
                this.clearSelection();
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    onKeyDown(event) {
        // Delete selected stitches
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (this.selectedNodes.size > 0) {
                EventBus.emit('selection:delete', {
                    nodes: Array.from(this.selectedNodes)
                });
            }
        }

        // Escape to clear selection
        if (event.key === 'Escape') {
            this.clearSelection();
        }

        // Select all with Ctrl+A
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            this.selectAll();
        }
    }

    /**
     * Select a single node (clears previous selection)
     */
    selectSingle(node) {
        // Clear previous selection
        this.selectedNodes.forEach(n => {
            n.setSelected(false);
            this.stitchRenderer.updateSelectionVisual(n);
            EventBus.emit(Events.STITCH_DESELECTED, { node: n });
        });
        this.selectedNodes.clear();

        // Select new
        node.setSelected(true);
        this.selectedNodes.add(node);
        this.stitchRenderer.updateSelectionVisual(node);
        EventBus.emit(Events.STITCH_SELECTED, { node, isMultiple: false });
    }

    /**
     * Toggle selection on a node
     */
    toggleSelection(node) {
        if (this.selectedNodes.has(node)) {
            // Deselect
            node.setSelected(false);
            this.selectedNodes.delete(node);
            this.stitchRenderer.updateSelectionVisual(node);
            EventBus.emit(Events.STITCH_DESELECTED, { node });
        } else {
            // Add to selection
            node.setSelected(true);
            this.selectedNodes.add(node);
            this.stitchRenderer.updateSelectionVisual(node);
            EventBus.emit(Events.STITCH_SELECTED, { node, isMultiple: true });
        }
    }

    /**
     * Clear all selection
     */
    clearSelection() {
        this.selectedNodes.forEach(node => {
            node.setSelected(false);
            this.stitchRenderer.updateSelectionVisual(node);
            EventBus.emit(Events.STITCH_DESELECTED, { node });
        });
        this.selectedNodes.clear();
    }

    /**
     * Select all nodes
     */
    selectAll() {
        const allMeshes = this.stitchRenderer.getAllMeshes();
        allMeshes.forEach(mesh => {
            const node = mesh.userData.node;
            if (node && !this.selectedNodes.has(node)) {
                node.setSelected(true);
                this.selectedNodes.add(node);
                this.stitchRenderer.updateSelectionVisual(node);
            }
        });
        EventBus.emit('selection:all', { count: this.selectedNodes.size });
    }

    /**
     * Get currently selected nodes
     */
    getSelection() {
        return Array.from(this.selectedNodes);
    }

    /**
     * Get first selected node (for single-select operations)
     */
    getSelectedNode() {
        return this.selectedNodes.size > 0
            ? this.selectedNodes.values().next().value
            : null;
    }

    /**
     * Show attachment point indicators
     */
    showAttachmentPoints(points) {
        this.clearAttachmentPoints();

        points.forEach(point => {
            const indicator = this.createAttachmentIndicator(point);
            this.attachmentIndicators.push(indicator);
            this.attachmentGroup.add(indicator);
        });
    }

    /**
     * Create a visual indicator for an attachment point
     */
    createAttachmentIndicator(point) {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: point.suggested ? 0x00ff00 : 0x0088ff,
            transparent: true,
            opacity: 0.7
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position above the stitch
        mesh.position.copy(point.stitch.position);
        mesh.position.y += point.stitch.height * 0.8;

        // Store reference for click handling
        mesh.userData.attachmentPoint = point;

        return mesh;
    }

    /**
     * Clear attachment point indicators
     */
    clearAttachmentPoints() {
        this.attachmentIndicators.forEach(indicator => {
            this.attachmentGroup.remove(indicator);
            indicator.geometry.dispose();
            indicator.material.dispose();
        });
        this.attachmentIndicators = [];
    }

    /**
     * Check if mouse is over an attachment point
     */
    getHoveredAttachmentPoint() {
        if (this.attachmentIndicators.length === 0) return null;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObjects(this.attachmentIndicators);

        if (intersects.length > 0) {
            return intersects[0].object.userData.attachmentPoint;
        }

        return null;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        const canvas = this.sceneManager.domElement;

        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('click', this.onClick);
        window.removeEventListener('keydown', this.onKeyDown);

        this.clearAttachmentPoints();
        this.sceneManager.removeUIObject(this.attachmentGroup);
    }
}
