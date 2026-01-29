import { StitchNode } from './StitchNode.js';
import { StitchType, getStitchDefinition } from './StitchTypes.js';

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
     * Emit event to listeners
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
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
     */
    getRow(rowNumber) {
        return this.rowIndex.get(rowNumber) || [];
    }

    /**
     * Get the number of rows in the pattern
     */
    getRowCount() {
        if (this.rowIndex.size === 0) return 0;
        return Math.max(...this.rowIndex.keys()) + 1;
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
     */
    createFoundationChain(length, startPosition = { x: 0, y: 0, z: 0 }) {
        const chainNodes = [];
        let prevNode = null;

        for (let i = 0; i < length; i++) {
            const node = this.createNode(StitchType.CHAIN, {
                row: 0,
                column: i,
                position: {
                    x: startPosition.x + i * 0.6,
                    y: startPosition.y,
                    z: startPosition.z
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
     */
    addStitchToRow(type, rowNumber, connectTo = null) {
        const existingRow = this.getRowSorted(rowNumber);
        const lastInRow = existingRow.length > 0 ? existingRow[existingRow.length - 1] : null;
        const column = lastInRow ? lastInRow.column + 1 : 0;

        // Calculate position based on stitch type and previous stitch
        const def = getStitchDefinition(type);
        let position = { x: 0, y: 0, z: 0 };

        if (lastInRow) {
            position.x = lastInRow.position.x + (lastInRow.width + def.width) / 2;
            position.y = lastInRow.position.y;
            position.z = lastInRow.position.z;
        } else if (rowNumber > 0) {
            // First stitch in new row - position above previous row
            const prevRowFirst = this.getFirstInRow(rowNumber - 1);
            if (prevRowFirst) {
                position.x = prevRowFirst.position.x;
                position.y = prevRowFirst.position.y + def.height;
                position.z = prevRowFirst.position.z;
            }
        }

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
