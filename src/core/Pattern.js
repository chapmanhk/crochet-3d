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
import { PatternConstants, sanitizeObject } from '../utils/Constants.js';

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

        // Graph listener callbacks (stored for cleanup)
        this.graphListeners = {};

        // Setup graph event forwarding
        this.setupGraphListeners();
    }

    /**
     * Setup listeners for graph events
     */
    setupGraphListeners() {
        // Store callbacks so they can be removed in dispose()
        this.graphListeners.nodeAdded = ({ node }) => {
            EventBus.emit(Events.STITCH_ADDED, { node, pattern: this });
            this.metadata.modifiedAt = Date.now();
        };

        this.graphListeners.nodeRemoved = ({ node }) => {
            EventBus.emit(Events.STITCH_REMOVED, { node, pattern: this });
            this.metadata.modifiedAt = Date.now();
        };

        this.graphListeners.graphCleared = () => {
            EventBus.emit(Events.PATTERN_CLEARED, { pattern: this });
        };

        this.graph.on('nodeAdded', this.graphListeners.nodeAdded);
        this.graph.on('nodeRemoved', this.graphListeners.nodeRemoved);
        this.graph.on('graphCleared', this.graphListeners.graphCleared);
    }

    /**
     * Start a new pattern with a foundation chain
     * @param {number} length - Number of chains (must be positive integer)
     * @returns {Array} Array of chain nodes, or empty array if invalid input
     */
    startWithChain(length) {
        // Validate input
        if (!Number.isFinite(length) || length < 1) {
            console.error(`Invalid chain length: ${length}. Must be a positive integer.`);
            return [];
        }

        // Clamp to reasonable bounds
        const safeLength = Math.min(Math.max(1, Math.floor(length)), PatternConstants.MAX_CHAIN_LENGTH || 1000);

        this.graph.clear();
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.historyIndex = -1;
        this.history = [];

        const chain = this.graph.createFoundationChain(safeLength);
        this.saveHistoryState('Create foundation chain');

        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return chain;
    }

    /**
     * Start a new pattern with foundation single crochet (chainless)
     * @param {number} length - Number of foundation stitches (must be positive integer)
     * @returns {Array} Array of stitch nodes, or empty array if invalid input
     */
    startWithFoundationSC(length) {
        // Validate input
        if (!Number.isFinite(length) || length < 1) {
            console.error(`Invalid foundation length: ${length}. Must be a positive integer.`);
            return [];
        }

        // Clamp to reasonable bounds
        const safeLength = Math.min(Math.max(1, Math.floor(length)), PatternConstants.MAX_CHAIN_LENGTH || 1000);

        this.graph.clear();
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.historyIndex = -1;
        this.history = [];

        const stitches = [];
        let prevNode = null;

        for (let i = 0; i < safeLength; i++) {
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
     * @param {number} initialStitches - Number of stitches in the ring (must be positive integer, min 1, max 50)
     * @param {string} stitchType - Type of stitch to use (default: single crochet)
     * @param {string} roundMode - 'joined' or 'spiral'
     * @returns {Array} Array of stitch nodes, or empty array if invalid input
     */
    startWithMagicRing(initialStitches = PatternConstants.MAGIC_RING_INITIAL_STITCHES, stitchType = StitchType.SINGLE_CROCHET, roundMode = 'joined') {
        // Validate initialStitches
        if (!Number.isFinite(initialStitches) || initialStitches < 1) {
            console.error(`Invalid initial stitches: ${initialStitches}. Must be a positive integer.`);
            initialStitches = PatternConstants.MAGIC_RING_INITIAL_STITCHES;
        }

        // Clamp to reasonable bounds (1-50 stitches in magic ring)
        const safeStitchCount = Math.min(Math.max(1, Math.floor(initialStitches)), 50);

        // Validate roundMode
        const validRoundModes = ['joined', 'spiral'];
        if (!validRoundModes.includes(roundMode)) {
            console.warn(`Invalid round mode: ${roundMode}. Defaulting to 'joined'.`);
            roundMode = 'joined';
        }

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
        for (let i = 0; i < safeStitchCount; i++) {
            const angle = (i / safeStitchCount) * Math.PI * 2;

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
     * @param {string} stitchType - Optional stitch type to determine chain count
     * @returns {Array} Array of chain nodes, or empty array if cannot add
     */
    addTurningChain(stitchType = null) {
        const targetStitchType = stitchType || this.selectedStitchType;
        const chainCount = getTurningChainLength(targetStitchType);
        // Check for per-pattern override, otherwise use default from StitchTypes
        const countsAsStitch = this.turningChainOverrides[targetStitchType] !== undefined
            ? this.turningChainOverrides[targetStitchType]
            : doesTurningChainCount(targetStitchType);

        if (chainCount === 0) return [];

        // Safety check for currentRow
        if (this.currentRow < 1) {
            console.warn('Cannot add turning chain: no previous row exists');
            return [];
        }

        const prevRow = this.graph.getRowSorted(this.currentRow - 1);

        // Safety check for empty previous row
        if (!prevRow || prevRow.length === 0) {
            console.warn('Cannot add turning chain: previous row is empty');
            return [];
        }

        const attachPoint = this.workingDirection === 'right'
            ? prevRow[prevRow.length - 1]
            : prevRow[0];

        const chains = [];
        let prevNode = attachPoint;
        const def = getStitchDefinition(StitchType.CHAIN);

        // Calculate starting column for turning chains to avoid conflicts
        // Use negative columns for turning chains to keep them separate from working stitches
        const existingStitches = this.graph.getRow(this.currentRow);
        let startColumn;
        if (existingStitches.length === 0) {
            // No existing stitches, use negative columns for turning chains
            startColumn = -chainCount;
        } else {
            // Get min/max columns of existing stitches
            const columns = existingStitches.map(s => s.column).filter(c => Number.isFinite(c));
            if (this.workingDirection === 'left') {
                // Working left, turning chain is at the right end
                startColumn = Math.max(...columns) + 1;
            } else {
                // Working right, turning chain is at the left end
                startColumn = Math.min(...columns) - chainCount;
            }
        }

        for (let i = 0; i < chainCount; i++) {
            const isLast = i === chainCount - 1;
            const position = this.calculateTurningChainPosition(prevNode, i, chainCount);

            const node = this.graph.createNode(StitchType.CHAIN, {
                row: this.currentRow,
                column: startColumn + i,
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
     * @param {string} type - Stitch type to add
     * @param {StitchNode} attachToNode - Node to attach to (can be null for first stitch)
     * @param {Object} options - Additional options
     * @returns {StitchNode|null} The created node, or null if creation failed
     */
    addStitch(type, attachToNode, options = {}) {
        // Validate stitch type
        if (!type || typeof type !== 'string') {
            console.error('Invalid stitch type: must be a non-empty string');
            return null;
        }

        const def = getStitchDefinition(type);
        if (!def) {
            console.error(`Unknown stitch type: ${type}`);
            return null;
        }

        // Validate options
        const modifiers = Array.isArray(options.modifiers) ? options.modifiers : (this.currentModifiers || []);
        const skipCount = Number.isFinite(options.skipCount) && options.skipCount >= 0 ? Math.floor(options.skipCount) : 0;
        const workIntoSpace = Boolean(options.workIntoSpace);
        const loopSelection = ['both', 'front', 'back'].includes(options.loopSelection) ? options.loopSelection : 'both';

        // Determine row and column
        const row = options.row ?? (attachToNode ? attachToNode.row + 1 : this.currentRow);
        const column = options.column ?? this.calculateNextColumn(row);

        // Handle skip stitches
        let actualAttachNode = attachToNode;
        const skippedStitches = [];

        if (skipCount > 0 && attachToNode) {
            const prevRowStitches = this.graph.getRowSorted(attachToNode.row);
            const attachIndex = prevRowStitches.indexOf(attachToNode);

            // Safety check: ensure attachIndex is valid
            if (attachIndex === -1) {
                console.warn('Attachment node not found in its row, using original attachment');
            } else {
                // Collect skipped stitches (with bounds checking)
                for (let i = 0; i < skipCount; i++) {
                    const idx = attachIndex + i;
                    if (idx >= 0 && idx < prevRowStitches.length) {
                        skippedStitches.push(prevRowStitches[idx]);
                    }
                }

                // Actual attachment is after the skipped stitches
                const newAttachIndex = attachIndex + skipCount;
                if (newAttachIndex >= 0 && newAttachIndex < prevRowStitches.length) {
                    actualAttachNode = prevRowStitches[newAttachIndex];
                }
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

                // Connect to additional stitches (with bounds checking)
                if (attachIndex !== -1) {
                    for (let i = 1; i < decreaseCount; i++) {
                        const nextIndex = attachIndex + i;
                        if (nextIndex >= 0 && nextIndex < prevRowStitches.length) {
                            const nextStitch = prevRowStitches[nextIndex];
                            if (nextStitch) {
                                this.graph.connectVertical(node, nextStitch);
                            }
                        }
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

        // Update currentRow if we've added a stitch to a higher row
        // This keeps the pattern state in sync with actual work
        if (row > this.currentRow) {
            this.currentRow = row;
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
     * @param {number} row - Row number
     * @returns {number} Next column number
     */
    calculateNextColumn(row) {
        // Validate row number
        if (!Number.isFinite(row) || row < 0) {
            return 0;
        }

        const rowStitches = this.graph.getRow(row);
        if (!rowStitches || rowStitches.length === 0) return 0;

        // Extract column numbers, filtering out any invalid values
        const columns = rowStitches
            .map(s => s?.column)
            .filter(c => Number.isFinite(c));

        if (columns.length === 0) return 0;

        if (this.workingDirection === 'right') {
            return Math.max(...columns) + 1;
        } else {
            return Math.min(...columns) - 1;
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

        // Determine which row we're working into (previous row)
        // If currentRow is 0, we're working into the foundation to create row 1
        const targetRow = this.currentRow === 0 ? 0 : this.currentRow - 1;
        const workingRow = this.currentRow === 0 ? 1 : this.currentRow;

        // Get stitches from the row we're working into
        const prevRow = this.workingDirection === 'right'
            ? this.graph.getRowSorted(targetRow)
            : this.graph.getRowSorted(targetRow).reverse();

        if (prevRow.length === 0) {
            return points;
        }

        // Get the last stitch in the row we're building (to determine suggested point)
        // Exclude turning chains when finding the last working stitch
        const workingRowStitches = this.graph.getRowSorted(workingRow)
            .filter(s => !s.isTurningChain);
        const lastWorkingStitch = workingRowStitches.length > 0
            ? workingRowStitches[workingRowStitches.length - 1]
            : null;

        prevRow.forEach((stitch, index) => {
            // Count only working stitches (non-turning-chains) for connection checks
            const workingStitchesAbove = stitch.connections.above.filter(s => !s.isTurningChain);
            const hasWorkingConnection = workingStitchesAbove.length > 0;
            const hasAvailable = stitch.hasAvailableConnectionsAbove;

            if (hasAvailable) {
                // Determine if this is the suggested next attachment point
                let isSuggested = false;
                if (!hasWorkingConnection) {
                    if (!lastWorkingStitch) {
                        // No working stitches yet - suggest first available
                        isSuggested = index === 0;
                    } else {
                        // Suggest the stitch adjacent to the last one worked
                        const lastWorkedIntoCol = lastWorkingStitch.connections.below[0]?.column;
                        if (lastWorkedIntoCol !== undefined) {
                            const expectedNextCol = this.workingDirection === 'right'
                                ? lastWorkedIntoCol + 1
                                : lastWorkedIntoCol - 1;
                            isSuggested = stitch.column === expectedNextCol;
                        }
                    }
                }

                points.push({
                    stitch,
                    type: 'above',
                    available: !hasWorkingConnection,
                    suggested: isSuggested,
                    canSkip: includeSkippable && !hasWorkingConnection
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
     * Data is sanitized to prevent prototype pollution attacks
     */
    static fromJSON(data) {
        const pattern = new Pattern();

        // Sanitize metadata to prevent prototype pollution
        if (data.metadata) {
            const sanitizedMetadata = sanitizeObject(data.metadata);
            pattern.metadata = { ...pattern.metadata, ...sanitizedMetadata };
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

        // Sanitize turningChainOverrides to prevent prototype pollution
        pattern.turningChainOverrides = sanitizeObject(data.turningChainOverrides || {});

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

    /**
     * Dispose of pattern resources and clean up listeners
     * Call this before replacing a pattern instance to prevent memory leaks
     */
    dispose() {
        // Remove graph event listeners
        if (this.graphListeners && this.graph) {
            try {
                if (this.graphListeners.nodeAdded) {
                    this.graph.off('nodeAdded', this.graphListeners.nodeAdded);
                }
                if (this.graphListeners.nodeRemoved) {
                    this.graph.off('nodeRemoved', this.graphListeners.nodeRemoved);
                }
                if (this.graphListeners.graphCleared) {
                    this.graph.off('graphCleared', this.graphListeners.graphCleared);
                }
            } catch (err) {
                console.error('Error during pattern disposal:', err);
            }
            this.graphListeners = {};
        }

        // Clear history to free memory
        this.history = [];
        this.historyIndex = -1;
    }
}
