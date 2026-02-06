import { StitchNode } from './StitchNode.js';
import { StitchType } from './StitchTypes.js';

/**
 * StitchGraph - Graph structure for managing the entire crochet pattern
 *
 * Manages:
 * - Collection of all stitch nodes
 * - Adding/removing stitches
 * - Finding stitches by row
 * - Serialization/deserialization
 */

export class StitchGraph {
    constructor() {
        this.nodes = new Map();
        this.rowIndex = new Map();

        this.listeners = {
            nodeAdded: [],
            nodeRemoved: [],
            graphCleared: []
        };
    }

    get size() {
        return this.nodes.size;
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            const idx = this.listeners[event].indexOf(callback);
            if (idx !== -1) this.listeners[event].splice(idx, 1);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in StitchGraph listener for "${event}":`, err);
                }
            });
        }
    }

    addNode(node) {
        this.nodes.set(node.id, node);

        if (!this.rowIndex.has(node.row)) {
            this.rowIndex.set(node.row, []);
        }
        this.rowIndex.get(node.row).push(node);

        this.emit('nodeAdded', { node });
        return node;
    }

    createNode(type, options = {}) {
        const node = new StitchNode(type, options);
        return this.addNode(node);
    }

    removeNode(nodeOrId) {
        const node = typeof nodeOrId === 'string'
            ? this.nodes.get(nodeOrId)
            : nodeOrId;

        if (!node) return false;

        node.disconnectAll();
        this.nodes.delete(node.id);

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

    getNode(id) {
        return this.nodes.get(id) || null;
    }

    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    getRow(rowNumber) {
        const row = this.rowIndex.get(rowNumber);
        return row ? [...row] : [];
    }

    getRowCount() {
        if (this.rowIndex.size === 0) return 0;
        const keys = Array.from(this.rowIndex.keys()).filter(k => Number.isFinite(k) && k >= 0);
        if (keys.length === 0) return 0;
        return Math.max(...keys) + 1;
    }

    getRowSorted(rowNumber) {
        const row = this.getRow(rowNumber);
        return [...row].sort((a, b) => a.column - b.column);
    }

    connectVertical(upperNode, lowerNode) {
        if (!upperNode || !lowerNode) return false;
        upperNode.connectBelow(lowerNode);
        return true;
    }

    connectHorizontal(leftNode, rightNode) {
        if (!leftNode || !rightNode) return false;
        leftNode.connectRight(rightNode);
        return true;
    }

    clear() {
        this.nodes.clear();
        this.rowIndex.clear();
        this.emit('graphCleared', {});
    }

    createFoundationChain(length, startPosition = { x: 0, y: 0, z: 0 }) {
        if (!Number.isFinite(length) || length < 1) return [];

        const safeLength = Math.floor(length);
        const chainNodes = [];
        let prevNode = null;

        for (let i = 0; i < safeLength; i++) {
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

    getStats() {
        return {
            totalStitches: this.size,
            rowCount: this.getRowCount()
        };
    }

    toJSON() {
        return {
            nodes: this.getAllNodes().map(n => n.toJSON())
        };
    }

    static fromJSON(data) {
        const graph = new StitchGraph();

        if (!data || !data.nodes) {
            throw new Error('Invalid graph data');
        }

        const nodeMap = new Map();
        const connectionDataMap = new Map();

        data.nodes.forEach(nodeData => {
            const node = StitchNode.fromJSON(nodeData);
            graph.addNode(node);
            nodeMap.set(node.id, node);
            connectionDataMap.set(node.id, nodeData.connections || {});
        });

        nodeMap.forEach((node, nodeId) => {
            const connectionData = connectionDataMap.get(nodeId);

            if (connectionData.below) {
                connectionData.below.forEach(id => {
                    const target = graph.getNode(id);
                    if (target) node.connectBelow(target);
                });
            }

            if (connectionData.left) {
                const left = graph.getNode(connectionData.left);
                if (left) {
                    node.connections.left = left;
                    left.connections.right = node;
                }
            }
        });

        return graph;
    }
}
