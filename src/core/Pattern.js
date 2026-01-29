import { StitchGraph } from './StitchGraph.js';
import { StitchNode, createTurningChain } from './StitchNode.js';
import {
    StitchType,
    StitchModifier,
    getStitchDefinition,
    getTurningChainLength,
    doesTurningChainCount,
    getStitchDisplayName
} from './StitchTypes.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { PatternConstants } from '../utils/Constants.js';

/**
 * Pattern - High-level pattern management
 *
 * Manages:
 * - Pattern creation and editing workflow
 * - Row-by-row construction
 * - Working direction (left-to-right, right-to-left)
 * - Pattern modes (flat, round-joined, round-spiral)
 * - Turning chains
 * - Skip stitches
 * - Chain spaces
 * - Undo/redo history
 */

export class Pattern {
    constructor() {
        this.graph = new StitchGraph();

        // Pattern mode: 'flat', 'round-joined', 'round-spiral'
        this.mode = 'flat';

        // Current working state
        this.currentRow = 0;
        this.workingDirection = 'right'; // 'left' or 'right'

        // Currently selected stitch type for adding
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // Current modifiers to apply
        this.currentModifiers = [];

        // Current yarn color
        this.currentColor = 0x8B4513;

        // Turning chain settings
        this.autoTurningChain = true;
        // Per-stitch-type overrides for whether turning chain counts as first stitch
        // If not specified, uses default from StitchTypes.js
        this.turningChainOverrides = {};

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
            notes: '',
            // Yarn and materials information
            yarn: {
                weight: '',      // e.g., 'fingering', 'sport', 'dk', 'worsted', 'bulky'
                fiber: '',       // e.g., 'cotton', 'wool', 'acrylic', 'blend'
                brand: '',       // e.g., 'Lion Brand', 'Red Heart'
                colorway: '',    // e.g., 'Seafoam', '#123 Blue'
                yardage: null    // Estimated yards/meters needed
            },
            hook: {
                size: '',        // e.g., '4mm', 'G/6', '7'
                type: ''         // e.g., 'inline', 'tapered'
            },
            gauge: {
                stitches: null,  // Stitches per 4 inches/10cm
                rows: null,      // Rows per 4 inches/10cm
                unit: 'inches'   // 'inches' or 'cm'
            },
            difficulty: '',      // e.g., 'beginner', 'easy', 'intermediate', 'advanced'
            category: ''         // e.g., 'amigurumi', 'blanket', 'garment', 'accessory'
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
        this.workingDirection = 'right';
        this.historyIndex = -1;
        this.history = [];

        const chain = this.graph.createFoundationChain(length);
        this.saveHistoryState('Create foundation chain');

        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return chain;
    }

    /**
     * Start a new pattern with foundation single crochet (chainless)
     */
    startWithFoundationSC(length) {
        this.graph.clear();
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.historyIndex = -1;
        this.history = [];

        const stitches = [];
        let prevNode = null;

        for (let i = 0; i < length; i++) {
            const node = this.graph.createNode(StitchType.FOUNDATION_SINGLE_CROCHET, {
                row: 0,
                column: i,
                position: { x: i * 0.7, y: 0, z: 0 }
            });

            if (prevNode) {
                this.graph.connectHorizontal(prevNode, node);
            }

            stitches.push(node);
            prevNode = node;
        }

        this.saveHistoryState('Create foundation single crochet');
        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return stitches;
    }

    /**
     * Start a new pattern with a magic ring
     * @param {number} initialStitches - Number of stitches in the ring
     * @param {string} stitchType - Type of stitch to use (default: single crochet)
     * @param {string} roundMode - 'joined' or 'spiral'
     */
    startWithMagicRing(initialStitches = PatternConstants.MAGIC_RING_INITIAL_STITCHES, stitchType = StitchType.SINGLE_CROCHET, roundMode = 'joined') {
        this.graph.clear();
        this.currentRow = 0;
        this.mode = roundMode === 'spiral' ? 'round-spiral' : 'round-joined';
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

            const stitch = this.graph.createNode(stitchType, {
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

        // Connect last to first for joined rounds (not spiral)
        if (roundMode === 'joined' && stitches.length > 2) {
            this.graph.connectHorizontal(stitches[stitches.length - 1], stitches[1]);
        }

        this.saveHistoryState('Create magic ring');
        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return stitches;
    }

    /**
     * Add turning chain at the start of a new row
     */
    addTurningChain(stitchType = null) {
        const targetStitchType = stitchType || this.selectedStitchType;
        const chainCount = getTurningChainLength(targetStitchType);
        // Check for per-pattern override, otherwise use default from StitchTypes
        const countsAsStitch = this.turningChainOverrides[targetStitchType] !== undefined
            ? this.turningChainOverrides[targetStitchType]
            : doesTurningChainCount(targetStitchType);

        if (chainCount === 0) return [];

        const prevRow = this.graph.getRowSorted(this.currentRow - 1);
        const attachPoint = this.workingDirection === 'right'
            ? prevRow[prevRow.length - 1]
            : prevRow[0];

        const chains = [];
        let prevNode = attachPoint;
        const def = getStitchDefinition(StitchType.CHAIN);

        for (let i = 0; i < chainCount; i++) {
            const isLast = i === chainCount - 1;
            const position = this.calculateTurningChainPosition(prevNode, i, chainCount);

            const node = this.graph.createNode(StitchType.CHAIN, {
                row: this.currentRow,
                column: i,
                position,
                color: this.currentColor,
                isTurningChain: true,
                turningChainCountsAsStitch: isLast && countsAsStitch
            });

            // Connect to previous
            if (i === 0 && attachPoint) {
                this.graph.connectVertical(node, attachPoint);
            }
            if (prevNode && i > 0) {
                this.graph.connectHorizontal(chains[chains.length - 1], node);
            }

            chains.push(node);
            prevNode = node;
        }

        return chains;
    }

    /**
     * Calculate position for turning chain stitches
     */
    calculateTurningChainPosition(prevNode, index, totalChains) {
        if (!prevNode) {
            return { x: 0, y: index * 0.5, z: 0 };
        }

        const def = getStitchDefinition(StitchType.CHAIN);
        const height = def?.height || 0.5;

        return {
            x: prevNode.position.x,
            y: prevNode.position.y + (index + 1) * height,
            z: prevNode.position.z
        };
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

        const modifiers = options.modifiers || this.currentModifiers;
        const skipCount = options.skipCount || 0;
        const workIntoSpace = options.workIntoSpace || false;
        const loopSelection = options.loopSelection || 'both';

        // Determine row and column
        const row = options.row ?? (attachToNode ? attachToNode.row + 1 : this.currentRow);
        const column = options.column ?? this.calculateNextColumn(row);

        // Handle skip stitches
        let actualAttachNode = attachToNode;
        const skippedStitches = [];

        if (skipCount > 0 && attachToNode) {
            const prevRowStitches = this.graph.getRowSorted(attachToNode.row);
            const attachIndex = prevRowStitches.indexOf(attachToNode);

            // Collect skipped stitches
            for (let i = 0; i < skipCount && attachIndex + i < prevRowStitches.length; i++) {
                skippedStitches.push(prevRowStitches[attachIndex + i]);
            }

            // Actual attachment is after the skipped stitches
            const newAttachIndex = attachIndex + skipCount;
            if (newAttachIndex < prevRowStitches.length) {
                actualAttachNode = prevRowStitches[newAttachIndex];
            }
        }

        // Calculate position with working direction
        const position = this.calculateStitchPosition(type, actualAttachNode, row, column, modifiers);

        // Create the node with modifiers
        const node = this.graph.createNode(type, {
            row,
            column,
            position,
            color: options.color ?? this.currentColor,
            modifiers,
            loopSelection,
            workedIntoSpace: workIntoSpace,
            skippedStitches
        });

        // Connect to attachment point
        if (actualAttachNode && !workIntoSpace) {
            this.graph.connectVertical(node, actualAttachNode);
        }

        // Connect to chain space if working into space
        if (workIntoSpace && actualAttachNode) {
            node.connectToSpace(actualAttachNode);
        }

        // Connect to previous stitch in row
        const prevInRow = this.findPreviousInRow(row, column);
        if (prevInRow) {
            this.graph.connectHorizontal(prevInRow, node);
        }

        // Handle increases with modifiers (creates multiple stitches)
        if (modifiers.includes(StitchModifier.INCREASE) ||
            modifiers.includes(StitchModifier.INCREASE_3)) {
            const increaseCount = modifiers.includes(StitchModifier.INCREASE_3) ? 3 : 2;
            node.metadata.increasesTo = increaseCount;
        }

        // Handle decreases (connect to multiple stitches below)
        if (modifiers.includes(StitchModifier.DECREASE) ||
            modifiers.includes(StitchModifier.DECREASE_3)) {
            const decreaseCount = modifiers.includes(StitchModifier.DECREASE_3) ? 3 : 2;

            if (actualAttachNode) {
                const prevRowStitches = this.graph.getRowSorted(actualAttachNode.row);
                const attachIndex = prevRowStitches.indexOf(actualAttachNode);

                // Connect to additional stitches
                for (let i = 1; i < decreaseCount; i++) {
                    const nextStitch = prevRowStitches[attachIndex + i];
                    if (nextStitch) {
                        this.graph.connectVertical(node, nextStitch);
                    }
                }
            }
        }

        // Legacy support for INCREASE/DECREASE types
        if (type === StitchType.INCREASE) {
            node.metadata.increasesTo = 2;
        }

        if (type === StitchType.DECREASE && options.secondAttachment) {
            this.graph.connectVertical(node, options.secondAttachment);
        }

        const displayName = getStitchDisplayName(type, modifiers);
        this.saveHistoryState(`Add ${displayName}`);
        return node;
    }

    /**
     * Add a stitch with skip
     */
    addStitchWithSkip(type, attachToNode, skipCount, options = {}) {
        return this.addStitch(type, attachToNode, { ...options, skipCount });
    }

    /**
     * Add a stitch worked into a chain space
     */
    addStitchInSpace(type, spaceStitch, options = {}) {
        return this.addStitch(type, spaceStitch, { ...options, workIntoSpace: true });
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
        const attachTo = node.connections.below?.[0] ?? null;
        const newPosition = this.calculateStitchPosition(
            newType,
            attachTo,
            node.row,
            node.column,
            node.modifiers
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
    calculateStitchPosition(type, attachTo, row, column, modifiers = []) {
        const def = getStitchDefinition(type);
        const width = def?.width ?? PatternConstants.DEFAULT_STITCH_WIDTH;
        const height = def?.height ?? PatternConstants.DEFAULT_STITCH_HEIGHT;

        // Adjust width for increases/decreases
        let effectiveWidth = width;
        if (modifiers.includes(StitchModifier.INCREASE)) {
            effectiveWidth = width * 1.8;
        } else if (modifiers.includes(StitchModifier.DECREASE)) {
            effectiveWidth = width * 0.7;
        }

        if (!attachTo) {
            return { x: column * width, y: row * height, z: 0 };
        }

        if (this.mode === 'round-joined' || this.mode === 'round-spiral') {
            return this.calculateRoundPosition(type, attachTo, row, column);
        }

        // Flat mode positioning with working direction
        const rowStitches = this.graph.getRowSorted(row);
        let x;

        if (rowStitches.length > 0) {
            if (this.workingDirection === 'right') {
                const lastInRow = rowStitches[rowStitches.length - 1];
                x = lastInRow.position.x + ((lastInRow.width ?? width) + effectiveWidth) / 2;
            } else {
                const firstInRow = rowStitches[0];
                x = firstInRow.position.x - ((firstInRow.width ?? width) + effectiveWidth) / 2;
            }
        } else {
            // First stitch of row - position based on attachment
            x = attachTo.position.x;
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

        // For spiral, use cumulative stitch count
        let stitchCount;
        if (this.mode === 'round-spiral') {
            const currentCount = this.graph.getRow(row).length;
            const prevCount = this.graph.getRow(row - 1).length;
            stitchCount = currentCount + prevCount;
        } else {
            const prevRowStitches = this.graph.getRow(row - 1);
            stitchCount = prevRowStitches.length || PatternConstants.MAGIC_RING_INITIAL_STITCHES;
        }

        // Guard against division by zero or NaN
        if (stitchCount <= 0 || !Number.isFinite(stitchCount)) {
            stitchCount = PatternConstants.MAGIC_RING_INITIAL_STITCHES;
        }

        const currentRowStitches = this.graph.getRow(row);
        const stitchIndex = currentRowStitches.length;

        const angle = (stitchIndex / stitchCount) * Math.PI * 2;
        const radius = PatternConstants.MAGIC_RING_RADIUS + row * PatternConstants.ROUND_RADIUS_GROWTH;

        // Spiral mode: gradual height increase
        const heightOffset = this.mode === 'round-spiral'
            ? (stitchIndex / stitchCount) * height * 0.5
            : 0;

        // Ensure no NaN values
        const x = Math.cos(angle) * radius;
        const y = row * height * 0.5 + heightOffset;
        const z = Math.sin(angle) * radius;

        return {
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : 0,
            z: Number.isFinite(z) ? z : 0
        };
    }

    /**
     * Find previous stitch in the same row (respects working direction)
     */
    findPreviousInRow(row, column) {
        const rowStitches = this.graph.getRowSorted(row);

        if (this.workingDirection === 'right') {
            for (let i = rowStitches.length - 1; i >= 0; i--) {
                if (rowStitches[i].column < column) {
                    return rowStitches[i];
                }
            }
        } else {
            for (let i = 0; i < rowStitches.length; i++) {
                if (rowStitches[i].column > column) {
                    return rowStitches[i];
                }
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

        if (this.workingDirection === 'right') {
            return Math.max(...rowStitches.map(s => s.column)) + 1;
        } else {
            return Math.min(...rowStitches.map(s => s.column)) - 1;
        }
    }

    /**
     * Start a new row
     */
    startNewRow(options = {}) {
        this.currentRow++;

        // Toggle working direction for flat mode
        if (this.mode === 'flat') {
            this.workingDirection = this.workingDirection === 'right' ? 'left' : 'right';
        }

        // Auto-add turning chain if enabled and in flat mode
        const turningChains = [];
        if (this.autoTurningChain && this.mode === 'flat' && !options.skipTurningChain) {
            const chains = this.addTurningChain(options.stitchType);
            turningChains.push(...chains);
        }

        // Join round with slip stitch if in joined round mode
        if (this.mode === 'round-joined' && !options.skipJoin) {
            // Add slip stitch to join
            const prevRow = this.graph.getRowSorted(this.currentRow - 1);
            if (prevRow.length > 0) {
                const firstStitch = prevRow[0];
                // The join slip stitch is optional to add explicitly
            }
        }

        EventBus.emit(Events.ROW_ADDED, {
            row: this.currentRow,
            pattern: this,
            turningChains
        });

        return this.currentRow;
    }

    /**
     * Get available attachment points for adding new stitches
     */
    getAttachmentPoints(options = {}) {
        const points = [];
        const includeSkippable = options.includeSkippable || false;
        const currentRowStitches = this.graph.getRow(this.currentRow);

        if (this.currentRow === 0) {
            // Foundation row - return end points
            const foundationStitches = this.graph.getRowSorted(0);
            if (foundationStitches.length > 0) {
                const lastStitch = foundationStitches[foundationStitches.length - 1];
                if (lastStitch.hasAvailableConnectionsAbove) {
                    points.push({
                        stitch: lastStitch,
                        type: 'end',
                        available: true
                    });
                }
            }
            return points;
        }

        // Working on subsequent rows
        const prevRow = this.workingDirection === 'right'
            ? this.graph.getRowSorted(this.currentRow - 1)
            : this.graph.getRowSorted(this.currentRow - 1).reverse();

        const lastStitch = this.graph.getLastInRow(this.currentRow);

        prevRow.forEach((stitch, index) => {
            const hasConnection = stitch.connections.above.length > 0;
            const hasAvailable = stitch.hasAvailableConnectionsAbove;

            if (hasAvailable) {
                const isSuggested = !hasConnection && (
                    lastStitch ? index === (this.workingDirection === 'right' ? lastStitch.column + 1 : lastStitch.column - 1) : index === 0
                );

                points.push({
                    stitch,
                    type: 'above',
                    available: !hasConnection,
                    suggested: isSuggested,
                    canSkip: includeSkippable && !hasConnection
                });
            }
        });

        return points;
    }

    /**
     * Get chain spaces available for working into
     */
    getChainSpaces() {
        const spaces = [];
        const prevRow = this.graph.getRowSorted(this.currentRow - 1);

        prevRow.forEach(stitch => {
            if (stitch.definition?.createsSpace && stitch.connections.above.length === 0) {
                spaces.push({
                    stitch,
                    type: 'chain-space',
                    available: true
                });
            }
        });

        return spaces;
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
            mode: this.mode,
            workingDirection: this.workingDirection,
            timestamp: Date.now()
        });

        // Always increment historyIndex after adding new state
        this.historyIndex++;

        // Limit history size - remove oldest entry and adjust index
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
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
        this.mode = state.mode || 'flat';
        this.workingDirection = state.workingDirection || 'right';

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
        this.mode = state.mode || 'flat';
        this.workingDirection = state.workingDirection || 'right';

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
     * Set pattern mode
     */
    setMode(mode) {
        if (['flat', 'round-joined', 'round-spiral'].includes(mode)) {
            this.mode = mode;
        }
    }

    /**
     * Set whether turning chain counts as first stitch for a specific stitch type
     * @param {string} stitchType - The stitch type (e.g., StitchType.HALF_DOUBLE_CROCHET)
     * @param {boolean} countsAsStitch - Whether the turning chain counts as a stitch
     */
    setTurningChainCounts(stitchType, countsAsStitch) {
        this.turningChainOverrides[stitchType] = countsAsStitch;
    }

    /**
     * Clear turning chain override for a stitch type (use default)
     * @param {string} stitchType - The stitch type
     */
    clearTurningChainOverride(stitchType) {
        delete this.turningChainOverrides[stitchType];
    }

    /**
     * Export pattern to JSON
     */
    toJSON() {
        return {
            version: 2,
            metadata: this.metadata,
            mode: this.mode,
            currentRow: this.currentRow,
            workingDirection: this.workingDirection,
            currentColor: this.currentColor,
            autoTurningChain: this.autoTurningChain,
            turningChainOverrides: this.turningChainOverrides,
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

        // Handle legacy 'round' mode
        if (data.mode === 'round') {
            pattern.mode = 'round-joined';
        } else {
            pattern.mode = data.mode || 'flat';
        }

        pattern.currentRow = data.currentRow || 0;
        pattern.workingDirection = data.workingDirection || 'right';
        pattern.currentColor = data.currentColor || 0x8B4513;
        pattern.autoTurningChain = data.autoTurningChain ?? true;
        pattern.turningChainOverrides = data.turningChainOverrides || {};

        // Legacy support: if old turningChainCountsAsStitch was used, ignore it
        // as the new system uses StitchTypes defaults with optional overrides

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
        lines.push(`Mode: ${this.mode}`);
        lines.push(`Total Stitches: ${this.graph.size}`);
        lines.push('');

        for (let row = 0; row < rowCount; row++) {
            const stitches = this.graph.getRowSorted(row);

            // Separate turning chains from working stitches
            const turningChains = stitches.filter(s => s.isTurningChain);
            const workingStitches = stitches.filter(s => !s.isTurningChain);

            // Group consecutive same-type stitches
            const groups = [];
            let currentGroup = null;

            workingStitches.forEach(s => {
                const displayName = getStitchDisplayName(s.type, s.modifiers);

                if (currentGroup && currentGroup.name === displayName) {
                    currentGroup.count++;
                } else {
                    currentGroup = { name: displayName, abbr: s.abbreviation, count: 1 };
                    groups.push(currentGroup);
                }
            });

            // Build instruction string
            let instruction = '';

            if (turningChains.length > 0) {
                instruction += `Ch ${turningChains.length}`;
                if (turningChains.some(tc => tc.turningChainCountsAsStitch)) {
                    instruction += ' (counts as first st)';
                }
                instruction += ', ';
            }

            instruction += groups
                .map(g => g.count > 1 ? `${g.count} ${g.abbr}` : g.abbr)
                .join(', ');

            const totalWorking = workingStitches.length +
                (turningChains.some(tc => tc.turningChainCountsAsStitch) ? 1 : 0);

            lines.push(`Row ${row + 1}: ${instruction} (${totalWorking} sts)`);
        }

        return lines.join('\n');
    }
}
