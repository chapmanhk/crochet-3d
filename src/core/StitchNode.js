import * as THREE from 'three';
import {
    getStitchDefinition,
    StitchType,
    StitchModifier,
    getModifiedConnections,
    getStitchDisplayName,
    getStitchPhysics
} from './StitchTypes.js';

/**
 * StitchNode - Represents a single stitch in the pattern graph
 *
 * Each node contains:
 * - Stitch type and properties
 * - Modifiers (FLO/BLO, increase/decrease, chain space)
 * - Position in 3D space
 * - Row/column location in pattern
 * - Connections to adjacent stitches (including skipped stitches)
 * - Reference to Three.js mesh
 */

/**
 * Generate a unique ID for stitch nodes.
 * Uses timestamp + random to avoid collisions across multiple pattern instances.
 */
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `stitch_${timestamp}_${random}`;
}

export class StitchNode {
    constructor(type, options = {}) {
        this.id = options.id ?? generateUniqueId();
        this.type = type;
        this.definition = getStitchDefinition(type);

        // Position in 3D space - ensure it's always a THREE.Vector3
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

        // Yarn color (can override default)
        this.color = options.color ?? this.definition?.color ?? 0x8B4513;

        // Stitch modifiers (FLO, BLO, increase, decrease, etc.)
        this.modifiers = options.modifiers || [];

        // Loop selection for working into this stitch
        // 'both' (default), 'front', 'back'
        this.loopSelection = options.loopSelection || 'both';

        // Whether this stitch was worked into a chain space
        this.workedIntoSpace = options.workedIntoSpace || false;

        // For spike stitches: how many rows below this reaches
        this.spikeDepth = options.spikeDepth || 0;

        // Whether this is a turning chain
        this.isTurningChain = options.isTurningChain || false;

        // Whether this turning chain counts as the first stitch
        this.turningChainCountsAsStitch = options.turningChainCountsAsStitch || false;

        // Skipped stitches - references to stitches that were skipped before this one
        this.skippedStitches = options.skippedStitches || [];

        // Connections to other stitches
        this.connections = {
            below: [],      // Stitches this hooks into (previous row)
            above: [],      // Stitches hooked into this (next row)
            left: null,     // Previous stitch in same row
            right: null,    // Next stitch in same row
            space: null     // Chain space this was worked into (if any)
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
     * Get the stitch name (with modifiers)
     */
    get name() {
        return getStitchDisplayName(this.type, this.modifiers);
    }

    /**
     * Get the base stitch name without modifiers
     */
    get baseName() {
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
     * Adjusted for increases (wider) and decreases (narrower)
     */
    get width() {
        const baseWidth = this.definition?.width || 0.7;
        if (this.hasModifier(StitchModifier.INCREASE)) {
            return baseWidth * 1.8;  // Two stitches side by side
        }
        if (this.hasModifier(StitchModifier.INCREASE_3)) {
            return baseWidth * 2.5;  // Three stitches
        }
        if (this.hasModifier(StitchModifier.DECREASE)) {
            return baseWidth * 0.7;  // Combined width
        }
        return baseWidth;
    }

    /**
     * Get physics properties for this stitch
     */
    get physics() {
        return getStitchPhysics(this.type);
    }

    /**
     * Get effective connections in/out based on modifiers
     */
    get effectiveConnections() {
        // Check for modifier-based adjustments
        for (const mod of this.modifiers) {
            if ([StitchModifier.INCREASE, StitchModifier.INCREASE_3,
                 StitchModifier.DECREASE, StitchModifier.DECREASE_3].includes(mod)) {
                return getModifiedConnections(this.type, mod);
            }
        }
        return {
            connectionsIn: this.definition?.connectionsIn || 1,
            connectionsOut: this.definition?.connectionsOut || 1
        };
    }

    /**
     * Check if this stitch has a specific modifier
     */
    hasModifier(modifier) {
        return this.modifiers.includes(modifier);
    }

    /**
     * Add a modifier to this stitch
     */
    addModifier(modifier) {
        if (!this.modifiers.includes(modifier)) {
            this.modifiers.push(modifier);
        }
    }

    /**
     * Remove a modifier from this stitch
     */
    removeModifier(modifier) {
        const idx = this.modifiers.indexOf(modifier);
        if (idx !== -1) {
            this.modifiers.splice(idx, 1);
        }
    }

    /**
     * Set loop selection (both, front, back)
     */
    setLoopSelection(selection) {
        if (['both', 'front', 'back'].includes(selection)) {
            this.loopSelection = selection;
        }
    }

    /**
     * Check if this stitch is an increase
     */
    get isIncrease() {
        return this.hasModifier(StitchModifier.INCREASE) ||
               this.hasModifier(StitchModifier.INCREASE_3) ||
               this.type === StitchType.INCREASE;  // Legacy support
    }

    /**
     * Check if this stitch is a decrease
     */
    get isDecrease() {
        return this.hasModifier(StitchModifier.DECREASE) ||
               this.hasModifier(StitchModifier.DECREASE_3) ||
               this.type === StitchType.DECREASE;  // Legacy support
    }

    /**
     * Check if this stitch can have more stitches worked into it
     * Note: Turning chains don't count against connection limits
     */
    get hasAvailableConnectionsAbove() {
        const { connectionsOut } = this.effectiveConnections;
        // Don't count turning chains - they don't consume the stitch's connection slots
        const workingStitchesAbove = this.connections.above.filter(s => !s.isTurningChain);
        return workingStitchesAbove.length < connectionsOut;
    }

    /**
     * Get remaining available connections above
     * Note: Turning chains don't count against connection limits
     */
    get availableConnectionsAbove() {
        const { connectionsOut } = this.effectiveConnections;
        // Don't count turning chains - they don't consume the stitch's connection slots
        const workingStitchesAbove = this.connections.above.filter(s => !s.isTurningChain);
        return Math.max(0, connectionsOut - workingStitchesAbove.length);
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
     * Connect to a chain space (for working into spaces)
     */
    connectToSpace(spaceStitch) {
        if (!spaceStitch) return false;
        this.connections.space = spaceStitch;
        this.workedIntoSpace = true;
        return true;
    }

    /**
     * Mark stitches as skipped before this one
     */
    setSkippedStitches(stitches) {
        this.skippedStitches = stitches || [];
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
            modifiers: this.modifiers,
            loopSelection: this.loopSelection,
            workedIntoSpace: this.workedIntoSpace,
            spikeDepth: this.spikeDepth,
            isTurningChain: this.isTurningChain,
            turningChainCountsAsStitch: this.turningChainCountsAsStitch,
            skippedStitches: this.skippedStitches.map(s => s.id),
            connections: {
                below: this.connections.below.map(s => s.id),
                above: this.connections.above.map(s => s.id),
                left: this.connections.left?.id || null,
                right: this.connections.right?.id || null,
                space: this.connections.space?.id || null
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
            modifiers: data.modifiers || [],
            loopSelection: data.loopSelection || 'both',
            workedIntoSpace: data.workedIntoSpace || false,
            spikeDepth: data.spikeDepth || 0,
            isTurningChain: data.isTurningChain || false,
            turningChainCountsAsStitch: data.turningChainCountsAsStitch || false,
            metadata: data.metadata
        });
        node.id = data.id;
        node.position.set(data.position.x, data.position.y, data.position.z);
        // Connections and skippedStitches are resolved after all nodes are created
        return node;
    }
}

/**
 * Create a stitch with increase modifier
 */
export function createIncreaseStitch(baseType, options = {}) {
    return new StitchNode(baseType, {
        ...options,
        modifiers: [...(options.modifiers || []), StitchModifier.INCREASE]
    });
}

/**
 * Create a stitch with decrease modifier
 */
export function createDecreaseStitch(baseType, options = {}) {
    return new StitchNode(baseType, {
        ...options,
        modifiers: [...(options.modifiers || []), StitchModifier.DECREASE]
    });
}

/**
 * Create a turning chain
 */
export function createTurningChain(chainCount, countsAsStitch, options = {}) {
    const chains = [];
    for (let i = 0; i < chainCount; i++) {
        const chain = new StitchNode(StitchType.CHAIN, {
            ...options,
            column: (options.column || 0) + i,
            isTurningChain: true,
            turningChainCountsAsStitch: i === chainCount - 1 && countsAsStitch
        });
        chains.push(chain);
    }
    return chains;
}
