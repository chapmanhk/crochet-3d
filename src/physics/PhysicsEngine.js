import * as THREE from 'three';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * PhysicsEngine - Simulates fabric physics for crochet patterns
 *
 * Uses Verlet integration with constraints to simulate:
 * - Spring connections between stitches
 * - Gravity for drape effect
 * - Damping for stability
 */

export class PhysicsEngine {
    constructor(pattern, sceneManager) {
        this.pattern = pattern;
        this.sceneManager = sceneManager;

        // Physics state
        this.isRunning = false;
        this.isSettling = false;

        // Physics bodies (one per stitch node)
        this.bodies = new Map();

        // Constraints (springs between connected stitches)
        this.constraints = [];

        // Physics parameters
        this.params = {
            gravity: new THREE.Vector3(0, -0.5, 0),
            damping: 0.97,
            iterations: 3,          // Constraint solver iterations
            stiffness: 0.8,         // Spring stiffness (0-1)
            restLengthScale: 1.0,   // Multiplier for rest lengths
            groundY: -0.5,          // Ground plane Y position
            enableGround: true,
            enableGravity: true
        };

        // Settling detection
        this.settleThreshold = 0.001;
        this.settleFrames = 0;
        this.maxSettleFrames = 300;

        // Bind methods
        this.update = this.update.bind(this);

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on(Events.STITCH_ADDED, ({ node }) => {
            this.addBody(node);
            this.rebuildConstraints();
        });

        EventBus.on(Events.STITCH_REMOVED, ({ node }) => {
            this.removeBody(node);
            this.rebuildConstraints();
        });

        EventBus.on(Events.PATTERN_LOADED, () => {
            this.rebuildAll();
        });

        EventBus.on(Events.PATTERN_CLEARED, () => {
            this.clear();
        });
    }

    /**
     * Create a physics body for a stitch node
     */
    addBody(node) {
        const body = {
            node: node,
            position: node.position.clone(),
            previousPosition: node.position.clone(),
            acceleration: new THREE.Vector3(),
            mass: 1.0,
            pinned: node.row === 0 // Pin foundation row
        };

        this.bodies.set(node.id, body);
        return body;
    }

    /**
     * Remove a physics body
     */
    removeBody(node) {
        this.bodies.delete(node.id);
    }

    /**
     * Rebuild all bodies from pattern
     */
    rebuildAll() {
        this.clear();

        const nodes = this.pattern.graph.getAllNodes();
        nodes.forEach(node => this.addBody(node));

        this.rebuildConstraints();
    }

    /**
     * Rebuild constraints from pattern connections
     */
    rebuildConstraints() {
        this.constraints = [];

        this.bodies.forEach((body, nodeId) => {
            const node = body.node;

            // Horizontal constraints (same row)
            if (node.connections.right) {
                const rightBody = this.bodies.get(node.connections.right.id);
                if (rightBody) {
                    this.addConstraint(body, rightBody, 'horizontal');
                }
            }

            // Vertical constraints (to row below)
            node.connections.below.forEach(belowNode => {
                const belowBody = this.bodies.get(belowNode.id);
                if (belowBody) {
                    this.addConstraint(body, belowBody, 'vertical');
                }
            });
        });
    }

    /**
     * Add a constraint between two bodies
     */
    addConstraint(bodyA, bodyB, type) {
        // Calculate rest length from current positions
        const restLength = bodyA.position.distanceTo(bodyB.position);

        // Adjust stiffness based on constraint type
        let stiffness = this.params.stiffness;
        if (type === 'horizontal') {
            stiffness *= 1.0; // Full stiffness for row connections
        } else if (type === 'vertical') {
            stiffness *= 0.8; // Slightly less for vertical (allows drape)
        }

        this.constraints.push({
            bodyA,
            bodyB,
            restLength: restLength * this.params.restLengthScale,
            stiffness,
            type
        });
    }

    /**
     * Clear all physics data
     */
    clear() {
        this.bodies.clear();
        this.constraints = [];
        this.isRunning = false;
        this.isSettling = false;
    }

    /**
     * Start continuous physics simulation
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.sceneManager.onUpdate(this.update);
        EventBus.emit(Events.PHYSICS_STARTED);
    }

    /**
     * Stop physics simulation
     */
    stop() {
        this.isRunning = false;
        this.isSettling = false;
    }

    /**
     * Run physics until settled
     */
    settle() {
        if (this.isSettling) return;

        this.isSettling = true;
        this.settleFrames = 0;
        this.start();

        EventBus.emit(Events.PHYSICS_STARTED);
    }

    /**
     * Physics update step (called each frame)
     */
    update() {
        if (!this.isRunning) return;

        const dt = 1 / 60; // Fixed timestep
        let totalMovement = 0;

        // Apply forces
        this.bodies.forEach(body => {
            if (body.pinned) return;

            // Gravity
            if (this.params.enableGravity) {
                body.acceleration.add(this.params.gravity);
            }
        });

        // Verlet integration
        this.bodies.forEach(body => {
            if (body.pinned) return;

            const velocity = body.position.clone().sub(body.previousPosition);
            velocity.multiplyScalar(this.params.damping);

            body.previousPosition.copy(body.position);

            // position += velocity + acceleration * dt^2
            body.position.add(velocity);
            body.position.add(body.acceleration.clone().multiplyScalar(dt * dt));

            // Reset acceleration
            body.acceleration.set(0, 0, 0);
        });

        // Solve constraints (multiple iterations for stability)
        for (let i = 0; i < this.params.iterations; i++) {
            this.solveConstraints();
        }

        // Ground collision
        if (this.params.enableGround) {
            this.bodies.forEach(body => {
                if (body.position.y < this.params.groundY) {
                    body.position.y = this.params.groundY;
                }
            });
        }

        // Update mesh positions and calculate total movement
        this.bodies.forEach(body => {
            const movement = body.position.distanceTo(body.node.position);
            totalMovement += movement;

            // Update node position
            body.node.position.copy(body.position);

            // Update mesh
            if (body.node.mesh) {
                body.node.mesh.position.copy(body.position);
            }
        });

        // Check if settled
        if (this.isSettling) {
            this.settleFrames++;

            const avgMovement = totalMovement / Math.max(1, this.bodies.size);

            if (avgMovement < this.settleThreshold || this.settleFrames >= this.maxSettleFrames) {
                this.isSettling = false;
                this.isRunning = false;
                EventBus.emit(Events.PHYSICS_SETTLED);
            }
        }

        EventBus.emit(Events.PHYSICS_STEP, {
            totalMovement,
            bodyCount: this.bodies.size,
            constraintCount: this.constraints.length
        });
    }

    /**
     * Solve all constraints
     */
    solveConstraints() {
        this.constraints.forEach(constraint => {
            const { bodyA, bodyB, restLength, stiffness } = constraint;

            const delta = bodyB.position.clone().sub(bodyA.position);
            const currentLength = delta.length();

            if (currentLength === 0) return;

            // Calculate correction
            const diff = (currentLength - restLength) / currentLength;
            const correction = delta.multiplyScalar(diff * stiffness * 0.5);

            // Apply correction (respecting pinned state)
            if (!bodyA.pinned && !bodyB.pinned) {
                bodyA.position.add(correction);
                bodyB.position.sub(correction);
            } else if (!bodyA.pinned) {
                bodyA.position.add(correction.multiplyScalar(2));
            } else if (!bodyB.pinned) {
                bodyB.position.sub(correction.multiplyScalar(2));
            }
        });
    }

    /**
     * Pin/unpin a specific node
     */
    setPinned(node, pinned) {
        const body = this.bodies.get(node.id);
        if (body) {
            body.pinned = pinned;
        }
    }

    /**
     * Pin entire row
     */
    pinRow(rowIndex) {
        this.bodies.forEach(body => {
            if (body.node.row === rowIndex) {
                body.pinned = true;
            }
        });
    }

    /**
     * Unpin all except foundation
     */
    unpinAll() {
        this.bodies.forEach(body => {
            body.pinned = body.node.row === 0;
        });
    }

    /**
     * Apply an impulse to a node
     */
    applyImpulse(node, impulse) {
        const body = this.bodies.get(node.id);
        if (body && !body.pinned) {
            body.position.add(impulse);
        }
    }

    /**
     * Reset positions to original pattern positions
     */
    resetPositions() {
        this.bodies.forEach(body => {
            // Recalculate original position based on row/column
            const node = body.node;
            const def = node.definition;

            const x = node.column * def.width;
            const y = node.row * def.height;

            body.position.set(x, y, 0);
            body.previousPosition.copy(body.position);
            node.position.copy(body.position);

            if (node.mesh) {
                node.mesh.position.copy(body.position);
            }
        });
    }

    /**
     * Set physics parameters
     */
    setParams(params) {
        Object.assign(this.params, params);

        // Rebuild constraints if stiffness changed
        if ('stiffness' in params || 'restLengthScale' in params) {
            this.rebuildConstraints();
        }
    }

    /**
     * Get current physics stats
     */
    getStats() {
        return {
            bodyCount: this.bodies.size,
            constraintCount: this.constraints.length,
            isRunning: this.isRunning,
            isSettling: this.isSettling,
            settleProgress: this.isSettling ? this.settleFrames / this.maxSettleFrames : 0
        };
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.stop();
        this.clear();
    }
}
