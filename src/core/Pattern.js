import { StitchGraph } from './StitchGraph.js';
import { StitchType, getStitchDefinition } from './StitchTypes.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { PatternConstants } from '../utils/Constants.js';

/**
 * Pattern - High-level pattern management
 *
 * Manages:
 * - Pattern creation and editing workflow
 * - Row-by-row construction
 * - Working direction (left-to-right, right-to-left)
 * - Pattern modes (flat, round)
 * - Undo/redo history
 */

export class Pattern {
    constructor() {
        this.graph = new StitchGraph();

        // Pattern mode
        this.mode = 'flat'; // 'flat' or 'round'

        // Current working state
        this.currentRow = 0;
        this.workingDirection = 'right'; // 'left' or 'right'

        // Currently selected stitch type for adding
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // Current yarn color
        this.currentColor = 0x8B4513;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = PatternConstants.MAX_HISTORY_SIZE;

        // Pattern metadata
        this.metadata = {
            name: 'Untitled Pattern',
            author: '',
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            notes: ''
        };

        // Setup graph event forwarding
        this.setupGraphListeners();
    }

    /**
     * Setup listeners for graph events
     */
    setupGraphListeners() {
        this.graph.on('nodeAdded', ({ node }) => {
            EventBus.emit(Events.STITCH_ADDED, { node, pattern: this });
            this.metadata.modifiedAt = Date.now();
        });

        this.graph.on('nodeRemoved', ({ node }) => {
            EventBus.emit(Events.STITCH_REMOVED, { node, pattern: this });
            this.metadata.modifiedAt = Date.now();
        });

        this.graph.on('graphCleared', () => {
            EventBus.emit(Events.PATTERN_CLEARED, { pattern: this });
        });
    }

    /**
     * Start a new pattern with a foundation chain
     */
    startWithChain(length) {
        this.graph.clear();
        this.currentRow = 0;
        this.historyIndex = -1;
        this.history = [];

        const chain = this.graph.createFoundationChain(length);
        this.saveHistoryState('Create foundation chain');

        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return chain;
    }

    /**
     * Start a new pattern with a magic ring
     */
    startWithMagicRing(initialStitches = PatternConstants.MAGIC_RING_INITIAL_STITCHES) {
        this.graph.clear();
        this.currentRow = 0;
        this.mode = 'round';
        this.historyIndex = -1;
        this.history = [];

        // Create the magic ring center
        const ring = this.graph.createNode(StitchType.MAGIC_RING, {
            row: 0,
            column: 0,
            position: { x: 0, y: 0, z: 0 }
        });

        // Add initial stitches around the ring
        const stitches = [ring];
        const radius = PatternConstants.MAGIC_RING_RADIUS;
        for (let i = 0; i < initialStitches; i++) {
            const angle = (i / initialStitches) * Math.PI * 2;

            const stitch = this.graph.createNode(StitchType.SINGLE_CROCHET, {
                row: 0,
                column: i + 1,
                position: {
                    x: Math.cos(angle) * radius,
                    y: PatternConstants.MAGIC_RING_INITIAL_Y,
                    z: Math.sin(angle) * radius
                }
            });

            this.graph.connectVertical(stitch, ring);

            if (i > 0) {
                this.graph.connectHorizontal(stitches[stitches.length - 1], stitch);
            }
            stitches.push(stitch);
        }

        // Connect last to first for continuous round
        if (stitches.length > 2) {
            this.graph.connectHorizontal(stitches[stitches.length - 1], stitches[1]);
        }

        this.saveHistoryState('Create magic ring');
        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return stitches;
    }

    /**
     * Add a stitch at a specific attachment point
     */
    addStitch(type, attachToNode, options = {}) {
        const def = getStitchDefinition(type);
        if (!def) {
            console.error(`Unknown stitch type: ${type}`);
            return null;
        }

        // Determine row and column
        const row = options.row ?? (attachToNode ? attachToNode.row + 1 : this.currentRow);
        const column = options.column ?? this.calculateNextColumn(row);

        // Calculate position
        const position = this.calculateStitchPosition(type, attachToNode, row, column);

        // Create the node
        const node = this.graph.createNode(type, {
            row,
            column,
            position,
            color: options.color ?? this.currentColor
        });

        // Connect to attachment point
        if (attachToNode) {
            this.graph.connectVertical(node, attachToNode);
        }

        // Connect to previous stitch in row if exists
        const prevInRow = this.findPreviousInRow(row, column);
        if (prevInRow) {
            this.graph.connectHorizontal(prevInRow, node);
        }

        // Handle increases (creates additional connection point)
        if (type === StitchType.INCREASE) {
            node.metadata.increasesTo = 2;
        }

        // Handle decreases (needs two stitches below)
        if (type === StitchType.DECREASE && options.secondAttachment) {
            this.graph.connectVertical(node, options.secondAttachment);
        }

        this.saveHistoryState(`Add ${def.name}`);
        return node;
    }

    /**
     * Remove a stitch
     */
    removeStitch(node) {
        if (!node) return false;

        const nodeName = node.name;
        const result = this.graph.removeNode(node);

        if (result) {
            this.saveHistoryState(`Remove ${nodeName}`);
        }

        return result;
    }

    /**
     * Change a stitch's type
     */
    changeStitchType(node, newType) {
        if (!node) return false;

        const oldType = node.type;
        node.changeType(newType);

        // Recalculate position based on new type
        // Safely access first connection below (may not exist for foundation row)
        const attachTo = node.connections.below?.[0] ?? null;
        const newPosition = this.calculateStitchPosition(
            newType,
            attachTo,
            node.row,
            node.column
        );
        node.setPosition(newPosition.x, newPosition.y, newPosition.z);

        EventBus.emit(Events.STITCH_TYPE_CHANGED, { node, oldType, newType });
        const def = getStitchDefinition(newType);
        this.saveHistoryState(`Change stitch to ${def?.name ?? 'unknown'}`);

        return true;
    }

    /**
     * Calculate position for a new stitch
     */
    calculateStitchPosition(type, attachTo, row, column) {
        const def = getStitchDefinition(type);
        // Default dimensions if stitch definition not found
        const width = def?.width ?? PatternConstants.DEFAULT_STITCH_WIDTH;
        const height = def?.height ?? PatternConstants.DEFAULT_STITCH_HEIGHT;

        if (!attachTo) {
            // First stitch - position at origin
            return { x: column * width, y: row * height, z: 0 };
        }

        if (this.mode === 'round') {
            return this.calculateRoundPosition(type, attachTo, row, column);
        }

        // Flat mode positioning
        let x = attachTo.position.x;

        // Offset based on column within row
        const rowStitches = this.graph.getRowSorted(row);
        if (rowStitches.length > 0) {
            const lastInRow = rowStitches[rowStitches.length - 1];
            x = lastInRow.position.x + ((lastInRow.width ?? width) + width) / 2;
        }

        // Y position based on row and stitch height
        const y = attachTo.position.y + ((attachTo.height ?? height) + height) / 2;

        return { x, y, z: 0 };
    }

    /**
     * Calculate position for stitches in the round
     */
    calculateRoundPosition(type, attachTo, row, column) {
        const def = getStitchDefinition(type);
        const height = def?.height ?? PatternConstants.DEFAULT_STITCH_HEIGHT;
        const prevRowStitches = this.graph.getRow(row - 1);

        const stitchCount = prevRowStitches.length || PatternConstants.MAGIC_RING_INITIAL_STITCHES;
        const angle = (column / stitchCount) * Math.PI * 2;
        const radius = PatternConstants.MAGIC_RING_RADIUS + row * PatternConstants.ROUND_RADIUS_GROWTH;

        return {
            x: Math.cos(angle) * radius,
            y: row * height * 0.5,
            z: Math.sin(angle) * radius
        };
    }

    /**
     * Find previous stitch in the same row
     */
    findPreviousInRow(row, column) {
        const rowStitches = this.graph.getRowSorted(row);
        for (let i = rowStitches.length - 1; i >= 0; i--) {
            if (rowStitches[i].column < column) {
                return rowStitches[i];
            }
        }
        return null;
    }

    /**
     * Calculate the next column number for a row
     */
    calculateNextColumn(row) {
        const rowStitches = this.graph.getRow(row);
        if (rowStitches.length === 0) return 0;
        return Math.max(...rowStitches.map(s => s.column)) + 1;
    }

    /**
     * Start a new row
     */
    startNewRow() {
        this.currentRow++;
        this.workingDirection = this.workingDirection === 'right' ? 'left' : 'right';
        EventBus.emit(Events.ROW_ADDED, { row: this.currentRow, pattern: this });
        return this.currentRow;
    }

    /**
     * Get available attachment points for adding new stitches
     */
    getAttachmentPoints() {
        const points = [];
        const currentRowStitches = this.graph.getRow(this.currentRow);

        if (currentRowStitches.length === 0 && this.currentRow > 0) {
            // New row - can attach to any stitch in previous row
            const prevRow = this.graph.getRowSorted(this.currentRow - 1);
            prevRow.forEach(stitch => {
                if (stitch.connections.above.length < stitch.definition.connectionsOut) {
                    points.push({
                        stitch,
                        type: 'above',
                        available: true
                    });
                }
            });
        } else {
            // Within a row - can attach to next available stitch below
            const prevRow = this.graph.getRowSorted(this.currentRow - 1);
            const lastStitch = this.graph.getLastInRow(this.currentRow);

            prevRow.forEach((stitch, index) => {
                const hasConnection = stitch.connections.above.length > 0;
                if (!hasConnection) {
                    points.push({
                        stitch,
                        type: 'above',
                        available: true,
                        suggested: lastStitch ? index === lastStitch.column + 1 : index === 0
                    });
                }
            });
        }

        return points;
    }

    /**
     * Save current state to history
     */
    saveHistoryState(action) {
        // Remove any redo states
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Save current state
        this.history.push({
            action,
            state: this.graph.toJSON(),
            timestamp: Date.now()
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        EventBus.emit(Events.HISTORY_CHANGED, {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Undo last action
     */
    undo() {
        if (!this.canUndo()) return false;

        this.historyIndex--;
        const state = this.history[this.historyIndex];

        this.loadState(state.state);
        EventBus.emit(Events.UNDO, { action: state.action });
        EventBus.emit(Events.HISTORY_CHANGED, {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });

        return true;
    }

    /**
     * Redo previously undone action
     */
    redo() {
        if (!this.canRedo()) return false;

        this.historyIndex++;
        const state = this.history[this.historyIndex];

        this.loadState(state.state);
        EventBus.emit(Events.REDO, { action: state.action });
        EventBus.emit(Events.HISTORY_CHANGED, {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });

        return true;
    }

    /**
     * Load a state (for undo/redo)
     */
    loadState(stateData) {
        const listeners = this.graph.listeners;
        this.graph = StitchGraph.fromJSON(stateData);
        this.graph.listeners = listeners;
        this.currentRow = this.graph.getRowCount() - 1;
        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
    }

    /**
     * Export pattern to JSON
     */
    toJSON() {
        return {
            version: 1,
            metadata: this.metadata,
            mode: this.mode,
            currentRow: this.currentRow,
            currentColor: this.currentColor,
            graph: this.graph.toJSON()
        };
    }

    /**
     * Import pattern from JSON
     */
    static fromJSON(data) {
        const pattern = new Pattern();

        if (data.metadata) {
            pattern.metadata = { ...pattern.metadata, ...data.metadata };
        }
        pattern.mode = data.mode || 'flat';
        pattern.currentRow = data.currentRow || 0;
        pattern.currentColor = data.currentColor || 0x8B4513;

        if (data.graph) {
            pattern.graph = StitchGraph.fromJSON(data.graph);
            pattern.setupGraphListeners();
        }

        return pattern;
    }

    /**
     * Generate written pattern instructions
     */
    generateInstructions() {
        const lines = [];
        const rowCount = this.graph.getRowCount();

        lines.push(`Pattern: ${this.metadata.name}`);
        lines.push(`Total Stitches: ${this.graph.size}`);
        lines.push('');

        for (let row = 0; row < rowCount; row++) {
            const stitches = this.graph.getRowSorted(row);
            const stitchCounts = {};

            stitches.forEach(s => {
                const abbr = s.abbreviation;
                stitchCounts[abbr] = (stitchCounts[abbr] || 0) + 1;
            });

            const instructions = Object.entries(stitchCounts)
                .map(([abbr, count]) => count > 1 ? `${count} ${abbr}` : abbr)
                .join(', ');

            lines.push(`Row ${row + 1}: ${instructions} (${stitches.length} sts)`);
        }

        return lines.join('\n');
    }
}
