import { StitchGraph } from './StitchGraph.js';
import { StitchType, getStitchDefinition } from './StitchTypes.js';
import { calculateFlatPosition } from './StitchPlacement.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * Pattern - High-level pattern management
 *
 * Manages:
 * - Foundation chain creation
 * - Adding single crochet stitches one after another
 * - Row-by-row construction in flat mode
 * - Working direction (left-to-right, right-to-left)
 */

export class Pattern {
    constructor() {
        this.graph = new StitchGraph();

        // Current working state
        this.currentRow = 0;
        this.workingDirection = 'right'; // 'left' or 'right'

        // Currently selected stitch type
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // Current yarn color
        this.currentColor = 0x8B4513;

        // Graph listener callbacks (stored for cleanup)
        this.graphListeners = {};
        this.setupGraphListeners();
    }

    setupGraphListeners() {
        this.graphListeners.nodeAdded = ({ node }) => {
            EventBus.emit(Events.STITCH_ADDED, { node, pattern: this });
        };

        this.graphListeners.nodeRemoved = ({ node }) => {
            EventBus.emit(Events.STITCH_REMOVED, { node, pattern: this });
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
     */
    startWithChain(length) {
        if (!Number.isFinite(length) || length < 1) return [];

        const safeLength = Math.min(Math.max(1, Math.floor(length)), 500);

        this.graph.clear();
        this.currentRow = 0;
        this.workingDirection = 'left';

        const chain = this.graph.createFoundationChain(safeLength);
        EventBus.emit(Events.PATTERN_LOADED, { pattern: this });
        return chain;
    }

    /**
     * Add a single crochet stitch at the next available position
     */
    addStitch(attachToNode, options = {}) {
        const type = StitchType.SINGLE_CROCHET;
        const def = getStitchDefinition(type);
        if (!def) return null;

        const row = options.row ?? (attachToNode ? attachToNode.row + 1 : this.currentRow);
        const column = options.column ?? this.calculateNextColumn(row);
        const color = options.color ?? this.currentColor;

        const position = this.calculateStitchPosition(type, attachToNode, row, column);

        const node = this.graph.createNode(type, {
            row,
            column,
            position,
            color
        });

        // Connect vertically to stitch below
        if (attachToNode) {
            this.graph.connectVertical(node, attachToNode);
        }

        // Connect horizontally to previous stitch in same row
        const prevInRow = this.findPreviousInRow(row, column);
        if (prevInRow) {
            this.graph.connectHorizontal(prevInRow, node);
        }

        if (row > this.currentRow) {
            this.currentRow = row;
        }

        return node;
    }

    /**
     * Start a new row - toggle direction and increment row counter
     */
    startNewRow() {
        // Find where to attach turning chain
        const currentRowStitches = this.graph.getRowSorted(this.currentRow);
        let turningChainAttachPoint = null;
        if (currentRowStitches.length > 0) {
            turningChainAttachPoint = this.workingDirection === 'right'
                ? currentRowStitches[currentRowStitches.length - 1]
                : currentRowStitches[0];
        }

        this.currentRow++;
        this.workingDirection = this.workingDirection === 'right' ? 'left' : 'right';

        // Add a single turning chain for SC
        if (turningChainAttachPoint) {
            const chainDef = getStitchDefinition(StitchType.CHAIN);
            const chainHeight = chainDef?.height || 0.5;

            const chainNode = this.graph.createNode(StitchType.CHAIN, {
                row: this.currentRow,
                column: this.workingDirection === 'right' ? -1 : this.graph.getRow(this.currentRow).length,
                position: {
                    x: turningChainAttachPoint.position.x,
                    y: turningChainAttachPoint.position.y + chainHeight,
                    z: turningChainAttachPoint.position.z
                },
                isTurningChain: true
            });

            this.graph.connectVertical(chainNode, turningChainAttachPoint);
        }

        EventBus.emit(Events.ROW_ADDED, {
            row: this.currentRow,
            pattern: this
        });

        return this.currentRow;
    }

    /**
     * Get attachment points for adding stitches (previous row stitches with available connections)
     */
    getAttachmentPoints() {
        const targetRow = this.currentRow === 0 ? 0 : this.currentRow - 1;
        const rowStitches = this.graph.getRowSorted(targetRow);

        // Filter to working stitches (exclude turning chains)
        const workingStitches = rowStitches.filter(s => !s.isTurningChain);

        const ordered = this.workingDirection === 'right'
            ? workingStitches
            : [...workingStitches].reverse();

        const points = [];
        let suggestedStitch = null;

        for (const stitch of ordered) {
            if (stitch.availableConnectionsAbove > 0) {
                if (!suggestedStitch) suggestedStitch = stitch;
                points.push({
                    stitch,
                    suggested: stitch === suggestedStitch
                });
            }
        }

        return points;
    }

    calculateStitchPosition(type, attachTo, row, column) {
        const def = getStitchDefinition(type);
        const width = def?.width ?? 0.7;
        const height = def?.height ?? 1.0;

        const rowStitches = this.graph.getRowSorted(row);
        return calculateFlatPosition({
            rowStitches,
            attachTo,
            column,
            row,
            width,
            effectiveWidth: width,
            height,
            workingDirection: this.workingDirection,
            rowBaseY: row * height
        });
    }

    findPreviousInRow(row, column) {
        const rowStitches = this.graph.getRowSorted(row);
        if (rowStitches.length === 0) return null;

        if (this.workingDirection === 'right') {
            for (let i = rowStitches.length - 1; i >= 0; i--) {
                if (rowStitches[i].column < column) return rowStitches[i];
            }
        } else {
            for (let i = 0; i < rowStitches.length; i++) {
                if (rowStitches[i].column > column) return rowStitches[i];
            }
        }

        return null;
    }

    calculateNextColumn(row) {
        const rowStitches = this.graph.getRow(row);
        if (rowStitches.length === 0) return 0;

        const columns = rowStitches.map(s => s.column).filter(c => Number.isFinite(c));
        if (columns.length === 0) return 0;

        return this.workingDirection === 'right'
            ? Math.max(...columns) + 1
            : Math.min(...columns) - 1;
    }

    dispose() {
        if (this.graphListeners && this.graph) {
            if (this.graphListeners.nodeAdded) {
                this.graph.off('nodeAdded', this.graphListeners.nodeAdded);
            }
            if (this.graphListeners.nodeRemoved) {
                this.graph.off('nodeRemoved', this.graphListeners.nodeRemoved);
            }
            if (this.graphListeners.graphCleared) {
                this.graph.off('graphCleared', this.graphListeners.graphCleared);
            }
            this.graphListeners = {};
        }
    }
}
