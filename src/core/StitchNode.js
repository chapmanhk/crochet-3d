import * as THREE from 'three';
import { getStitchDefinition } from './StitchTypes.js';

/**
 * StitchNode - Represents a single stitch in the pattern graph
 *
 * Each node contains:
 * - Stitch type (chain or single crochet)
 * - Position in 3D space
 * - Row/column location in pattern
 * - Connections to adjacent stitches
 * - Reference to Three.js mesh
 */

let nextId = 0;

function generateUniqueId() {
    return `stitch_${nextId++}`;
}

export class StitchNode {
    constructor(type, options = {}) {
        this.id = options.id ?? generateUniqueId();
        this.type = type;
        this.definition = getStitchDefinition(type);

        // Position in 3D space
        if (options.position instanceof THREE.Vector3) {
            this.position = options.position;
        } else if (options.position && typeof options.position === 'object') {
            this.position = new THREE.Vector3(
                options.position.x || 0,
                options.position.y || 0,
                options.position.z || 0
            );
        } else {
            this.position = new THREE.Vector3(0, 0, 0);
        }

        // Position in pattern grid
        this.row = options.row ?? 0;
        this.column = options.column ?? 0;

        // Yarn color
        this.color = options.color ?? this.definition?.color ?? 0x8B4513;

        // Whether this is a turning chain
        this.isTurningChain = options.isTurningChain || false;

        // Connections to other stitches
        this.connections = {
            below: [],      // Stitches this hooks into (previous row)
            above: [],      // Stitches hooked into this (next row)
            left: null,     // Previous stitch in same row
            right: null     // Next stitch in same row
        };

        // Three.js mesh reference (set by renderer)
        this.mesh = null;
    }

    get abbreviation() {
        return this.definition?.abbreviation || '?';
    }

    get name() {
        return this.definition?.name || 'Unknown';
    }

    get height() {
        return this.definition?.height || 1.0;
    }

    get width() {
        return this.definition?.width || 0.7;
    }

    get effectiveConnections() {
        return {
            connectionsIn: this.definition?.connectionsIn || 1,
            connectionsOut: this.definition?.connectionsOut || 1
        };
    }

    get availableConnectionsAbove() {
        const { connectionsOut } = this.effectiveConnections;
        return Math.max(0, connectionsOut - this.connections.above.length);
    }

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

    connectRight(stitch) {
        if (!stitch) return false;
        this.connections.right = stitch;
        stitch.connections.left = this;
        return true;
    }

    disconnectAll() {
        // Disconnect from below
        for (const s of [...this.connections.below]) {
            const idx = s.connections.above.indexOf(this);
            if (idx !== -1) s.connections.above.splice(idx, 1);
        }
        this.connections.below = [];

        // Disconnect from above
        for (const s of [...this.connections.above]) {
            const idx = s.connections.below.indexOf(this);
            if (idx !== -1) s.connections.below.splice(idx, 1);
        }
        this.connections.above = [];

        // Disconnect left/right
        if (this.connections.left) {
            this.connections.left.connections.right = null;
            this.connections.left = null;
        }
        if (this.connections.right) {
            this.connections.right.connections.left = null;
            this.connections.right = null;
        }
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

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
            isTurningChain: this.isTurningChain,
            connections: {
                below: this.connections.below.map(s => s.id),
                above: this.connections.above.map(s => s.id),
                left: this.connections.left?.id || null,
                right: this.connections.right?.id || null
            }
        };
    }

    static fromJSON(data) {
        const node = new StitchNode(data.type, {
            row: data.row,
            column: data.column,
            color: data.color,
            isTurningChain: data.isTurningChain || false
        });
        node.id = data.id;
        node.position.set(data.position.x, data.position.y, data.position.z);
        return node;
    }
}
