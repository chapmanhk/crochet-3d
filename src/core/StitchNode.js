import * as THREE from 'three';
import { getStitchDefinition, StitchType } from './StitchTypes.js';

/**
 * StitchNode - Represents a single stitch in the pattern graph
 *
 * Each node contains:
 * - Stitch type and properties
 * - Position in 3D space
 * - Row/column location in pattern
 * - Connections to adjacent stitches
 * - Reference to Three.js mesh
 */

let nodeIdCounter = 0;

export class StitchNode {
    constructor(type, options = {}) {
        this.id = `stitch_${++nodeIdCounter}`;
        this.type = type;
        this.definition = getStitchDefinition(type);

        // Position in 3D space
        this.position = options.position || new THREE.Vector3(0, 0, 0);

        // Position in pattern grid
        this.row = options.row ?? 0;
        this.column = options.column ?? 0;

        // Yarn color (can override default)
        this.color = options.color ?? this.definition?.color ?? 0x8B4513;

        // Connections to other stitches
        this.connections = {
            below: [],      // Stitches this hooks into (previous row)
            above: [],      // Stitches hooked into this (next row)
            left: null,     // Previous stitch in same row
            right: null     // Next stitch in same row
        };

        // Three.js mesh reference (set by renderer)
        this.mesh = null;

        // Physics body reference (set by physics engine)
        this.physicsBody = null;

        // Selection state
        this.isSelected = false;
        this.isHighlighted = false;

        // Metadata
        this.createdAt = Date.now();
        this.metadata = options.metadata || {};
    }

    /**
     * Get the stitch abbreviation for pattern notation
     */
    get abbreviation() {
        return this.definition?.abbreviation || '?';
    }

    /**
     * Get the stitch name
     */
    get name() {
        return this.definition?.name || 'Unknown';
    }

    /**
     * Get stitch height for positioning
     */
    get height() {
        return this.definition?.height || 1.0;
    }

    /**
     * Get stitch width for positioning
     */
    get width() {
        return this.definition?.width || 0.7;
    }

    /**
     * Connect this stitch to another stitch below (previous row)
     */
    connectBelow(stitch) {
        if (!stitch) return false;

        if (!this.connections.below.includes(stitch)) {
            this.connections.below.push(stitch);
        }
        if (!stitch.connections.above.includes(this)) {
            stitch.connections.above.push(this);
        }
        return true;
    }

    /**
     * Connect this stitch to another stitch above (next row)
     */
    connectAbove(stitch) {
        if (!stitch) return false;

        if (!this.connections.above.includes(stitch)) {
            this.connections.above.push(stitch);
        }
        if (!stitch.connections.below.includes(this)) {
            stitch.connections.below.push(this);
        }
        return true;
    }

    /**
     * Connect to left neighbor (previous in row)
     */
    connectLeft(stitch) {
        if (!stitch) return false;

        this.connections.left = stitch;
        stitch.connections.right = this;
        return true;
    }

    /**
     * Connect to right neighbor (next in row)
     */
    connectRight(stitch) {
        if (!stitch) return false;

        this.connections.right = stitch;
        stitch.connections.left = this;
        return true;
    }

    /**
     * Disconnect from a specific stitch
     */
    disconnect(stitch) {
        if (!stitch) return;

        // Remove from below connections
        const belowIdx = this.connections.below.indexOf(stitch);
        if (belowIdx !== -1) {
            this.connections.below.splice(belowIdx, 1);
            const aboveIdx = stitch.connections.above.indexOf(this);
            if (aboveIdx !== -1) stitch.connections.above.splice(aboveIdx, 1);
        }

        // Remove from above connections
        const aboveIdx = this.connections.above.indexOf(stitch);
        if (aboveIdx !== -1) {
            this.connections.above.splice(aboveIdx, 1);
            const belowIdx2 = stitch.connections.below.indexOf(this);
            if (belowIdx2 !== -1) stitch.connections.below.splice(belowIdx2, 1);
        }

        // Remove left/right connections
        if (this.connections.left === stitch) {
            this.connections.left = null;
            stitch.connections.right = null;
        }
        if (this.connections.right === stitch) {
            this.connections.right = null;
            stitch.connections.left = null;
        }
    }

    /**
     * Disconnect from all stitches
     */
    disconnectAll() {
        // Disconnect from below
        [...this.connections.below].forEach(s => this.disconnect(s));

        // Disconnect from above
        [...this.connections.above].forEach(s => this.disconnect(s));

        // Disconnect left/right
        if (this.connections.left) this.disconnect(this.connections.left);
        if (this.connections.right) this.disconnect(this.connections.right);
    }

    /**
     * Get all connected stitches
     */
    getAllConnections() {
        const connections = [
            ...this.connections.below,
            ...this.connections.above
        ];
        if (this.connections.left) connections.push(this.connections.left);
        if (this.connections.right) connections.push(this.connections.right);
        return connections;
    }

    /**
     * Check if this stitch is connected to another
     */
    isConnectedTo(stitch) {
        return this.getAllConnections().includes(stitch);
    }

    /**
     * Update 3D position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    /**
     * Set selection state
     */
    setSelected(selected) {
        this.isSelected = selected;
        // Visual update handled by renderer
    }

    /**
     * Set highlight state (hover)
     */
    setHighlighted(highlighted) {
        this.isHighlighted = highlighted;
        // Visual update handled by renderer
    }

    /**
     * Change stitch type
     */
    changeType(newType) {
        this.type = newType;
        this.definition = getStitchDefinition(newType);
        // Mesh update handled by renderer
    }

    /**
     * Change yarn color
     */
    changeColor(color) {
        this.color = color;
        // Mesh update handled by renderer
    }

    /**
     * Serialize to JSON for saving
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            row: this.row,
            column: this.column,
            color: this.color,
            connections: {
                below: this.connections.below.map(s => s.id),
                above: this.connections.above.map(s => s.id),
                left: this.connections.left?.id || null,
                right: this.connections.right?.id || null
            },
            metadata: this.metadata
        };
    }

    /**
     * Create from JSON data (connections resolved separately)
     */
    static fromJSON(data) {
        const node = new StitchNode(data.type, {
            row: data.row,
            column: data.column,
            color: data.color,
            metadata: data.metadata
        });
        node.id = data.id;
        node.position.set(data.position.x, data.position.y, data.position.z);
        // Connections are resolved after all nodes are created
        return node;
    }
}

/**
 * Reset the ID counter (useful for testing)
 */
export function resetNodeIdCounter() {
    nodeIdCounter = 0;
}
