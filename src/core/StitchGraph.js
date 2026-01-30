import { StitchNode } from './StitchNode.js';
import { StitchType, getStitchDefinition } from './StitchTypes.js';
import { calculateFlatPosition, getNextColumn } from './StitchPlacement.js';

/**
 * StitchGraph - Graph structure for managing the entire crochet pattern
 *
 * Manages:
 * - Collection of all stitch nodes
 * - Adding/removing stitches
 * - Finding stitches by various criteria
 * - Pattern validation
 * - Serialization/deserialization
 */

export class StitchGraph {
    constructor() {
        // Map of stitch ID to StitchNode
        this.nodes = new Map();

        // Quick lookup by row
        this.rowIndex = new Map();

        // Event callbacks
        this.listeners = {
            nodeAdded: [],
            nodeRemoved: [],
            connectionChanged: [],
            graphCleared: []
        };
    }

    /**
     * Get total stitch count
     */
    get size() {
        return this.nodes.size;
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners[event]) {
            const idx = this.listeners[event].indexOf(callback);
            if (idx !== -1) this.listeners[event].splice(idx, 1);
        }
    }

    /**
     * Emit event to listeners with error handling
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in StitchGraph event listener for "${event}":`, err);
                }
            });
        }
    }

    /**
     * Add a new stitch to the graph
     */
    addNode(node) {
        if (!(node instanceof StitchNode)) {
            throw new Error('Must add StitchNode instance');
        }

        this.nodes.set(node.id, node);

        // Update row index
        if (!this.rowIndex.has(node.row)) {
            this.rowIndex.set(node.row, []);
        }
        this.rowIndex.get(node.row).push(node);

        this.emit('nodeAdded', { node });
        return node;
    }

    /**
     * Create and add a new stitch
     */
    createNode(type, options = {}) {
        const node = new StitchNode(type, options);
        return this.addNode(node);
    }

    /**
     * Remove a stitch from the graph
     */
    removeNode(nodeOrId) {
        const node = typeof nodeOrId === 'string'
            ? this.nodes.get(nodeOrId)
            : nodeOrId;

        if (!node) return false;

        // Disconnect from all neighbors
        node.disconnectAll();

        // Remove from nodes map
        this.nodes.delete(node.id);

        // Remove from row index
        const rowNodes = this.rowIndex.get(node.row);
        if (rowNodes) {
            const idx = rowNodes.indexOf(node);
            if (idx !== -1) rowNodes.splice(idx, 1);
            if (rowNodes.length === 0) {
                this.rowIndex.delete(node.row);
            }
        }

        this.emit('nodeRemoved', { node });
        return true;
    }

    /**
     * Get a node by ID
     */
    getNode(id) {
        return this.nodes.get(id) || null;
    }

    /**
     * Get all nodes as array
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    /**
     * Get all nodes in a specific row
     * Returns a copy to prevent external mutation of internal data
     */
    getRow(rowNumber) {
        const row = this.rowIndex.get(rowNumber);
        return row ? [...row] : [];
    }

    /**
     * Get the number of rows in the pattern
     * @returns {number} Number of rows (0 if empty)
     */
    getRowCount() {
        if (this.rowIndex.size === 0) return 0;

        // Convert to array to avoid spread operator issues with iterators
        const keys = Array.from(this.rowIndex.keys());
        if (keys.length === 0) return 0;

        // Filter to only valid numbers and find max
        const validKeys = keys.filter(k => Number.isFinite(k) && k >= 0);
        if (validKeys.length === 0) return 0;

        return Math.max(...validKeys) + 1;
    }

    /**
     * Get stitches in a row, sorted by column
     */
    getRowSorted(rowNumber) {
        const row = this.getRow(rowNumber);
        return [...row].sort((a, b) => a.column - b.column);
    }

    /**
     * Find the last stitch in a row
     */
    getLastInRow(rowNumber) {
        const row = this.getRowSorted(rowNumber);
        return row.length > 0 ? row[row.length - 1] : null;
    }

    /**
     * Find the first stitch in a row
     */
    getFirstInRow(rowNumber) {
        const row = this.getRowSorted(rowNumber);
        return row.length > 0 ? row[0] : null;
    }

    /**
     * Get stitch at specific row and column
     */
    getAt(row, column) {
        const rowNodes = this.getRow(row);
        return rowNodes.find(n => n.column === column) || null;
    }

    /**
     * Connect two stitches vertically (row to row)
     */
    connectVertical(upperNode, lowerNode) {
        if (!upperNode || !lowerNode) return false;
        upperNode.connectBelow(lowerNode);
        this.emit('connectionChanged', { type: 'vertical', upper: upperNode, lower: lowerNode });
        return true;
    }

    /**
     * Connect two stitches horizontally (same row)
     */
    connectHorizontal(leftNode, rightNode) {
        if (!leftNode || !rightNode) return false;
        leftNode.connectRight(rightNode);
        this.emit('connectionChanged', { type: 'horizontal', left: leftNode, right: rightNode });
        return true;
    }

    /**
     * Clear the entire graph
     */
    clear() {
        this.nodes.clear();
        this.rowIndex.clear();
        this.emit('graphCleared', {});
    }

    /**
     * Create a foundation chain of specified length
     * @param {number} length - Number of chains (must be positive integer)
     * @param {Object} startPosition - Starting position {x, y, z}
     * @returns {Array} Array of chain nodes
     */
    createFoundationChain(length, startPosition = { x: 0, y: 0, z: 0 }) {
        // Validate length
        if (!Number.isFinite(length) || length < 1) {
            console.error(`Invalid chain length: ${length}. Must be a positive integer.`);
            return [];
        }

        // Validate and sanitize startPosition
        const safeStartPosition = {
            x: Number.isFinite(startPosition?.x) ? startPosition.x : 0,
            y: Number.isFinite(startPosition?.y) ? startPosition.y : 0,
            z: Number.isFinite(startPosition?.z) ? startPosition.z : 0
        };

        const safeLength = Math.floor(length);
        const chainNodes = [];
        let prevNode = null;

        for (let i = 0; i < safeLength; i++) {
            const node = this.createNode(StitchType.CHAIN, {
                row: 0,
                column: i,
                position: {
                    x: safeStartPosition.x + i * 0.6,
                    y: safeStartPosition.y,
                    z: safeStartPosition.z
                }
            });

            if (prevNode) {
                this.connectHorizontal(prevNode, node);
            }

            chainNodes.push(node);
            prevNode = node;
        }

        return chainNodes;
    }

    /**
     * Add a stitch to the end of a row, connecting appropriately
     * @param {string} type - Stitch type
     * @param {number} rowNumber - Row number to add to
     * @param {StitchNode} connectTo - Optional node to connect vertically to
     * @returns {StitchNode|null} The created node, or null if creation failed
     */
    addStitchToRow(type, rowNumber, connectTo = null) {
        // Validate inputs
        if (!type || typeof type !== 'string') {
            console.error('Invalid stitch type for addStitchToRow');
            return null;
        }

        if (!Number.isFinite(rowNumber) || rowNumber < 0) {
            console.error(`Invalid row number: ${rowNumber}`);
            return null;
        }

        const existingRow = this.getRowSorted(rowNumber);
        const lastInRow = existingRow.length > 0 ? existingRow[existingRow.length - 1] : null;
        const column = getNextColumn(existingRow, 'right');

        // Calculate position based on stitch type and previous stitch
        const def = getStitchDefinition(type);
        const defWidth = def?.width ?? 0.7;
        const defHeight = def?.height ?? 1.0;

        const prevRowFirst = rowNumber > 0 ? this.getFirstInRow(rowNumber - 1) : null;
        const attachForPosition = existingRow.length === 0
            ? (connectTo || prevRowFirst)
            : null;
        const rowBaseY = Number.isFinite(lastInRow?.position?.y)
            ? lastInRow.position.y
            : rowNumber * defHeight;

        const position = calculateFlatPosition({
            rowStitches: existingRow,
            attachTo: attachForPosition,
            column,
            row: rowNumber,
            width: defWidth,
            effectiveWidth: defWidth,
            height: defHeight,
            workingDirection: 'right',
            rowBaseY
        });

        const node = this.createNode(type, {
            row: rowNumber,
            column: column,
            position: position
        });

        // Connect to previous in row
        if (lastInRow) {
            this.connectHorizontal(lastInRow, node);
        }

        // Connect to stitch below if specified
        if (connectTo) {
            this.connectVertical(node, connectTo);
        }

        return node;
    }

    /**
     * Validate the pattern structure
     */
    validate() {
        const errors = [];
        const warnings = [];

        // Check for disconnected stitches (except first chain)
        this.nodes.forEach(node => {
            if (node.row > 0 && node.connections.below.length === 0) {
                warnings.push(`Stitch ${node.id} at row ${node.row} has no connection below`);
            }
        });

        // Check for consistent row numbering
        let prevRowSize = null;
        for (let row = 0; row < this.getRowCount(); row++) {
            const rowSize = this.getRow(row).length;
            if (prevRowSize !== null && Math.abs(rowSize - prevRowSize) > prevRowSize) {
                warnings.push(`Row ${row} has ${rowSize} stitches (prev: ${prevRowSize}) - large size change`);
            }
            prevRowSize = rowSize;
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Get pattern statistics
     */
    getStats() {
        const stats = {
            totalStitches: this.size,
            rowCount: this.getRowCount(),
            stitchesByType: {},
            stitchesPerRow: []
        };

        // Count by type
        this.nodes.forEach(node => {
            stats.stitchesByType[node.type] = (stats.stitchesByType[node.type] || 0) + 1;
        });

        // Count per row
        for (let i = 0; i < stats.rowCount; i++) {
            stats.stitchesPerRow.push(this.getRow(i).length);
        }

        return stats;
    }

    /**
     * Serialize entire graph to JSON
     */
    toJSON() {
        return {
            version: 1,
            nodes: this.getAllNodes().map(n => n.toJSON()),
            metadata: {
                createdAt: Date.now(),
                stats: this.getStats()
            }
        };
    }

    /**
     * Load graph from JSON
     */
    static fromJSON(data) {
        const graph = new StitchGraph();

        if (!data || !data.nodes) {
            throw new Error('Invalid graph data');
        }

        // First pass: create all nodes and collect connection data
        const nodeMap = new Map();
        const connectionDataMap = new Map();
        const skippedStitchesMap = new Map();

        data.nodes.forEach(nodeData => {
            const node = StitchNode.fromJSON(nodeData);
            graph.addNode(node);
            nodeMap.set(node.id, node);
            connectionDataMap.set(node.id, nodeData.connections || {});
            // Store skippedStitches IDs for later resolution
            if (nodeData.skippedStitches && nodeData.skippedStitches.length > 0) {
                skippedStitchesMap.set(node.id, nodeData.skippedStitches);
            }
        });

        // Second pass: restore connections
        nodeMap.forEach((node, nodeId) => {
            const connectionData = connectionDataMap.get(nodeId);

            // Restore below connections
            if (connectionData.below) {
                connectionData.below.forEach(id => {
                    const target = graph.getNode(id);
                    if (target) node.connectBelow(target);
                });
            }

            // Restore left connection (right is established automatically via connectLeft)
            if (connectionData.left) {
                const left = graph.getNode(connectionData.left);
                if (left) node.connectLeft(left);
            }

            // Restore space connection (for stitches worked into chain spaces)
            if (connectionData.space) {
                const spaceNode = graph.getNode(connectionData.space);
                if (spaceNode) {
                    node.connections.space = spaceNode;
                }
            }
        });

        // Third pass: restore skippedStitches references
        skippedStitchesMap.forEach((skippedIds, nodeId) => {
            const node = nodeMap.get(nodeId);
            if (node) {
                node.skippedStitches = skippedIds
                    .map(id => graph.getNode(id))
                    .filter(n => n !== null);
            }
        });

        return graph;
    }
}
