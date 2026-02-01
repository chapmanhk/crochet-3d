import * as THREE from 'three';
import { EventBus, Events, createEventSubscriptions } from '../utils/EventBus.js';
import { throttle } from '../utils/throttle.js';

/**
 * RaycastManager - Handles mouse and touch interaction with 3D objects
 *
 * Manages:
 * - Click/tap detection on stitches
 * - Hover detection (mouse and single-touch)
 * - Selection management
 * - Multi-touch gesture detection (delegates to OrbitControls)
 */

export class RaycastManager {
    constructor(sceneManager, stitchRenderer, options = {}) {
        this.sceneManager = sceneManager;
        this.stitchRenderer = stitchRenderer;
        this.throttleMs = options.throttleMs ?? 50;

        // Raycaster for hit detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Current hover/selection state
        this.hoveredNode = null;
        this.selectedNodes = new Set();
        this.eventSubs = createEventSubscriptions();

        // Touch state tracking
        this.isTouchActive = false;
        this.touchStartTime = 0;
        this.lastTouchCount = 0;

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);

        // Create throttled wrapper for mousemove
        this._throttledMouseMove = throttle(this.onMouseMove, this.throttleMs);

        // Create throttled wrapper for touchmove
        this._throttledTouchMove = throttle(this.onTouchMove, this.throttleMs);

        // Setup listeners
        this.setupEventListeners();
        this.setupSelectionListeners();
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        const canvas = this.sceneManager.domElement;

        // Mouse events
        canvas.addEventListener('mousemove', this._throttledMouseMove);
        canvas.addEventListener('click', this.onClick);
        window.addEventListener('keydown', this.onKeyDown);

        // Touch events
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._throttledTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    }

    /**
     * Subscribe to events that should clear or prune selection
     */
    setupSelectionListeners() {
        this.eventSubs.on(Events.PATTERN_LOADED, () => this.clearSelection());
        this.eventSubs.on(Events.PATTERN_CLEARED, () => this.clearSelection());
        this.eventSubs.on(Events.STITCH_REMOVED, ({ node }) => this.pruneSelection(node));
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
     * Wrapped in try-catch to prevent UI freezes
     */
    onMouseMove(event) {
        try {
            if (this.sceneManager?.isHoveringAttachmentPoint) {
                if (this.hoveredNode) {
                    try {
                        this.hoveredNode.setHighlighted(false);
                        this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                        EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                    } catch (err) {
                        console.warn('Error unhighlighting node:', err);
                    }
                    this.hoveredNode = null;
                }
                return;
            }

            this.updateMousePosition(event);

            const intersects = this.raycast();

            if (intersects.length > 0) {
                const mesh = intersects[0]?.object;
                const node = mesh?.userData?.node;

                if (node && node !== this.hoveredNode) {
                    // Unhover previous
                    if (this.hoveredNode) {
                        try {
                            this.hoveredNode.setHighlighted(false);
                            this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                            EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                        } catch (err) {
                            console.warn('Error unhighlighting previous node:', err);
                        }
                    }

                    // Hover new
                    this.hoveredNode = node;
                    node.setHighlighted(true);
                    this.stitchRenderer.updateSelectionVisual(node);
                    EventBus.emit(Events.STITCH_HOVERED, { node });

                    // Change cursor
                    if (this.sceneManager?.domElement) {
                        this.sceneManager.domElement.style.cursor = 'pointer';
                    }
                }
            } else {
                // No intersection
                if (this.hoveredNode) {
                    try {
                        this.hoveredNode.setHighlighted(false);
                        this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                        EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                    } catch (err) {
                        console.warn('Error unhighlighting node:', err);
                    }
                    this.hoveredNode = null;
                }

                if (this.sceneManager?.domElement) {
                    this.sceneManager.domElement.style.cursor = 'default';
                }
            }
        } catch (err) {
            console.error('Error in mouse move handler:', err);
        }
    }

    /**
     * Handle click for selection
     * Wrapped in try-catch to prevent UI freezes
     */
    onClick(event) {
        try {
            if (this.sceneManager?.isHoveringAttachmentPoint) {
                return;
            }

            this.updateMousePosition(event);

            const intersects = this.raycast();

            if (intersects.length > 0) {
                const mesh = intersects[0]?.object;
                const node = mesh?.userData?.node;

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
        } catch (err) {
            console.error('Error in click handler:', err);
        }
    }

    /**
     * Handle touch start for tap detection and hover
     */
    onTouchStart(event) {
        try {
            this.isTouchActive = true;
            this.touchStartTime = performance.now();
            this.lastTouchCount = event.touches.length;

            // For multi-touch (pinch/pan), skip interaction detection
            if (event.touches.length > 1) {
                // Clear any hover state during multi-touch
                if (this.hoveredNode) {
                    this.hoveredNode.setHighlighted(false);
                    this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                    EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                    this.hoveredNode = null;
                }
                if (this.sceneManager?.domElement) {
                    this.sceneManager.domElement.style.cursor = 'default';
                }
                return;
            }

            // Single touch - treat like mouse move for hover
            const touch = event.touches[0];
            this.updateTouchPosition(touch);

            // Don't prevent default - let OrbitControls handle panning
        } catch (err) {
            console.error('Error in touch start handler:', err);
        }
    }

    /**
     * Handle touch move for hover detection
     */
    onTouchMove(event) {
        try {
            // For multi-touch (pinch/pan), skip hover detection
            if (event.touches.length > 1) {
                return;
            }

            if (this.sceneManager?.isHoveringAttachmentPoint) {
                if (this.hoveredNode) {
                    try {
                        this.hoveredNode.setHighlighted(false);
                        this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                        EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                    } catch (err) {
                        console.warn('Error unhighlighting node:', err);
                    }
                    this.hoveredNode = null;
                }
                return;
            }

            const touch = event.touches[0];
            this.updateTouchPosition(touch);

            const intersects = this.raycast();

            if (intersects.length > 0) {
                const mesh = intersects[0]?.object;
                const node = mesh?.userData?.node;

                if (node && node !== this.hoveredNode) {
                    // Unhover previous
                    if (this.hoveredNode) {
                        try {
                            this.hoveredNode.setHighlighted(false);
                            this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                            EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                        } catch (err) {
                            console.warn('Error unhighlighting previous node:', err);
                        }
                    }

                    // Hover new
                    this.hoveredNode = node;
                    node.setHighlighted(true);
                    this.stitchRenderer.updateSelectionVisual(node);
                    EventBus.emit(Events.STITCH_HOVERED, { node });
                }
            } else {
                // No intersection
                if (this.hoveredNode) {
                    try {
                        this.hoveredNode.setHighlighted(false);
                        this.stitchRenderer.updateSelectionVisual(this.hoveredNode);
                        EventBus.emit(Events.STITCH_UNHOVERED, { node: this.hoveredNode });
                    } catch (err) {
                        console.warn('Error unhighlighting node:', err);
                    }
                    this.hoveredNode = null;
                }
            }
        } catch (err) {
            console.error('Error in touch move handler:', err);
        }
    }

    /**
     * Handle touch end for selection (tap)
     */
    onTouchEnd(event) {
        try {
            // If this was a multi-touch gesture, don't treat as tap
            if (this.lastTouchCount > 1) {
                this.isTouchActive = false;
                return;
            }

            // Calculate tap duration
            const tapDuration = performance.now() - this.touchStartTime;
            const MAX_TAP_DURATION = 300; // milliseconds

            // Only treat as tap if it was quick (not a drag)
            if (tapDuration > MAX_TAP_DURATION) {
                this.isTouchActive = false;
                return;
            }

            if (this.sceneManager?.isHoveringAttachmentPoint) {
                this.isTouchActive = false;
                return;
            }

            // Use changedTouches to get the touch that ended
            const touch = event.changedTouches[0];
            this.updateTouchPosition(touch);

            const intersects = this.raycast();

            if (intersects.length > 0) {
                const mesh = intersects[0]?.object;
                const node = mesh?.userData?.node;

                if (node) {
                    // Touch doesn't have shift/ctrl, so always single select
                    // Could implement long-press for multi-select in future
                    this.selectSingle(node);
                }
            } else {
                // Tapped on empty space
                this.clearSelection();
            }

            this.isTouchActive = false;
        } catch (err) {
            console.error('Error in touch end handler:', err);
            this.isTouchActive = false;
        }
    }

    /**
     * Update mouse position from touch coordinates
     */
    updateTouchPosition(touch) {
        const rect = this.sceneManager.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
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
     * @param {StitchNode} node - Node to select
     */
    selectSingle(node) {
        if (!node) return;

        // Clear previous selection
        this.selectedNodes.forEach(n => {
            try {
                if (n) {
                    n.setSelected(false);
                    this.stitchRenderer.updateSelectionVisual(n);
                    EventBus.emit(Events.STITCH_DESELECTED, { node: n });
                }
            } catch (err) {
                console.warn('Error deselecting node:', err);
            }
        });
        this.selectedNodes.clear();

        // Select new
        try {
            node.setSelected(true);
            this.selectedNodes.add(node);
            this.stitchRenderer.updateSelectionVisual(node);
            EventBus.emit(Events.STITCH_SELECTED, { node, isMultiple: false });
        } catch (err) {
            console.error('Error selecting node:', err);
        }
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
     * Remove a node from selection if it was deleted
     */
    pruneSelection(node) {
        if (!node || !this.selectedNodes.has(node)) {
            return;
        }

        try {
            node.setSelected(false);
            this.stitchRenderer.updateSelectionVisual(node);
            EventBus.emit(Events.STITCH_DESELECTED, { node });
        } catch (err) {
            console.warn('Error pruning selection:', err);
        }
        this.selectedNodes.delete(node);
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
     * Dispose of resources
     */
    dispose() {
        const canvas = this.sceneManager?.domElement;
        if (!canvas) return;

        // Remove mouse event listeners
        canvas.removeEventListener('mousemove', this._throttledMouseMove);
        canvas.removeEventListener('click', this.onClick);
        window.removeEventListener('keydown', this.onKeyDown);

        // Remove touch event listeners
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this._throttledTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);

        // Clear stale references to prevent memory leaks
        if (this.eventSubs) {
            this.eventSubs.dispose();
        }
        this.hoveredNode = null;
        this.selectedNodes.clear();
    }
}
