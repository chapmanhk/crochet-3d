import * as THREE from 'three';
import { EventBus, Events } from '../utils/EventBus.js';
import { PhysicsConstants } from '../utils/Constants.js';
import { getStitchPhysics } from '../core/StitchTypes.js';

/**
 * PhysicsEngine - Simulates fabric physics for crochet patterns
 *
 * Uses Verlet integration with constraints to simulate:
 * - Spring connections between stitches
 * - Gravity for drape effect
 * - Damping for stability
 * - Per-stitch physics properties (stiffness, density, bendResistance)
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
            gravity: new THREE.Vector3(0, PhysicsConstants.DEFAULT_GRAVITY_Y, 0),
            damping: PhysicsConstants.DEFAULT_DAMPING,
            iterations: PhysicsConstants.CONSTRAINT_ITERATIONS,
            stiffness: PhysicsConstants.DEFAULT_STIFFNESS,
            restLengthScale: PhysicsConstants.REST_LENGTH_SCALE,
            groundY: PhysicsConstants.DEFAULT_GROUND_Y,
            enableGround: true,
            enableGravity: true
        };

        // Settling detection
        this.settleThreshold = PhysicsConstants.SETTLE_THRESHOLD;
        this.settleFrames = 0;
        this.maxSettleFrames = PhysicsConstants.MAX_SETTLE_FRAMES;

        // Bind methods
        this.update = this.update.bind(this);

        // Store unsubscribe functions for cleanup
        this.eventUnsubscribers = [];

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventUnsubscribers.push(
            EventBus.on(Events.STITCH_ADDED, ({ node }) => {
                this.addBody(node);
                this.rebuildConstraints();
            })
        );

        this.eventUnsubscribers.push(
            EventBus.on(Events.STITCH_REMOVED, ({ node }) => {
                this.removeBody(node);
                this.rebuildConstraints();
            })
        );

        this.eventUnsubscribers.push(
            EventBus.on(Events.PATTERN_LOADED, () => {
                this.rebuildAll();
            })
        );

        this.eventUnsubscribers.push(
            EventBus.on(Events.PATTERN_CLEARED, () => {
                this.clear();
            })
        );
    }

    /**
     * Create a physics body for a stitch node
     * Uses per-stitch physics properties for realistic fabric behavior
     */
    addBody(node) {
        // Get stitch-specific physics properties
        const stitchPhysics = node.physics || getStitchPhysics(node.type);

        const body = {
            node: node,
            position: node.position.clone(),
            previousPosition: node.position.clone(),
            acceleration: new THREE.Vector3(),
            // Mass based on stitch density (denser stitches = heavier)
            mass: PhysicsConstants.DEFAULT_BODY_MASS * (stitchPhysics.density || 1.0),
            // Stitch-specific stiffness for constraint calculations
            stiffness: stitchPhysics.stiffness || 0.8,
            // Bend resistance affects how rigid the stitch is
            bendResistance: stitchPhysics.bendResistance || 0.5,
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
     * Uses per-stitch physics properties for realistic fabric behavior
     * @param {Object} bodyA - First body
     * @param {Object} bodyB - Second body
     * @param {string} type - Constraint type ('horizontal' or 'vertical')
     */
    addConstraint(bodyA, bodyB, type) {
        // Validate inputs
        if (!bodyA?.position || !bodyB?.position) {
            console.warn('Cannot add constraint: invalid bodies');
            return;
        }

        // Calculate rest length from current positions
        const restLength = bodyA.position.distanceTo(bodyB.position);

        // Safety check: skip if rest length is invalid
        if (!Number.isFinite(restLength) || restLength < 0) {
            console.warn('Cannot add constraint: invalid rest length');
            return;
        }

        // Calculate stiffness as average of both stitches' properties
        // This creates realistic transitions between different stitch types
        const avgStitchStiffness = (bodyA.stiffness + bodyB.stiffness) / 2;

        // Base stiffness from params, modified by stitch properties
        let stiffness = this.params.stiffness * avgStitchStiffness;

        // Adjust based on constraint type
        if (type === 'horizontal') {
            stiffness *= PhysicsConstants.HORIZONTAL_STIFFNESS_MULTIPLIER;
            // Horizontal connections also affected by bend resistance
            const avgBendResistance = (bodyA.bendResistance + bodyB.bendResistance) / 2;
            stiffness *= (1 + avgBendResistance * 0.5);
        } else if (type === 'vertical') {
            stiffness *= PhysicsConstants.VERTICAL_STIFFNESS_MULTIPLIER;
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
     * Wrapped in try-catch to prevent animation loop breakage
     */
    update() {
        if (!this.isRunning) return;

        try {
            const dt = PhysicsConstants.FIXED_TIMESTEP;
            let totalMovement = 0;

            // Apply forces
            this.bodies.forEach(body => {
                if (body.pinned) return;

                // Safety check for valid body
                if (!body?.position || !body?.acceleration) return;

                // Gravity
                if (this.params.enableGravity && this.params.gravity) {
                    body.acceleration.add(this.params.gravity);
                }
            });

            // Verlet integration
            this.bodies.forEach(body => {
                if (body.pinned) return;

                // Safety check for valid body properties
                if (!body?.position || !body?.previousPosition || !body?.acceleration) return;

                const velocity = body.position.clone().sub(body.previousPosition);
                velocity.multiplyScalar(this.params.damping);

                body.previousPosition.copy(body.position);

                // position += velocity + acceleration * dt^2
                body.position.add(velocity);
                body.position.add(body.acceleration.clone().multiplyScalar(dt * dt));

                // Safety check: clamp position to prevent extreme values
                if (!Number.isFinite(body.position.x)) body.position.x = 0;
                if (!Number.isFinite(body.position.y)) body.position.y = 0;
                if (!Number.isFinite(body.position.z)) body.position.z = 0;

                // Reset acceleration
                body.acceleration.set(0, 0, 0);
            });

            // Solve constraints (multiple iterations for stability)
            const iterations = Math.max(1, Math.min(this.params.iterations, 10)); // Clamp iterations
            for (let i = 0; i < iterations; i++) {
                this.solveConstraints();
            }

            // Ground collision
            if (this.params.enableGround) {
                this.bodies.forEach(body => {
                    if (body?.position && body.position.y < this.params.groundY) {
                        body.position.y = this.params.groundY;
                    }
                });
            }

            // Update mesh positions and calculate total movement
            this.bodies.forEach(body => {
                // Safety check
                if (!body?.position || !body?.node?.position) return;

                const movement = body.position.distanceTo(body.node.position);
                totalMovement += Number.isFinite(movement) ? movement : 0;

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
        } catch (err) {
            console.error('Error in physics update:', err);
            // Don't stop the simulation on error, but log it
        }
    }

    /**
     * Solve all constraints with numerical safety checks
     */
    solveConstraints() {
        this.constraints.forEach(constraint => {
            const { bodyA, bodyB, restLength, stiffness } = constraint;

            // Safety check for valid bodies
            if (!bodyA?.position || !bodyB?.position) return;

            const delta = bodyB.position.clone().sub(bodyA.position);
            const currentLength = delta.length();

            // Safety check for zero length (avoid division by zero) and NaN
            if (currentLength === 0 || !Number.isFinite(currentLength)) return;

            // Calculate correction
            const diff = (currentLength - restLength) / currentLength;
            const correction = delta.multiplyScalar(diff * stiffness * PhysicsConstants.CONSTRAINT_CORRECTION_FACTOR);

            // Apply correction (respecting pinned state)
            if (!bodyA.pinned && !bodyB.pinned) {
                bodyA.position.add(correction);
                bodyB.position.sub(correction);
            } else if (!bodyA.pinned) {
                bodyA.position.add(correction.multiplyScalar(PhysicsConstants.PINNED_CORRECTION_MULTIPLIER));
            } else if (!bodyB.pinned) {
                bodyB.position.sub(correction.multiplyScalar(PhysicsConstants.PINNED_CORRECTION_MULTIPLIER));
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

            // Use default dimensions if definition is not available
            const width = def?.width ?? 0.7;
            const height = def?.height ?? 1.0;

            const x = node.column * width;
            const y = node.row * height;

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

        // Unsubscribe from all events
        this.eventUnsubscribers.forEach(unsub => {
            if (typeof unsub === 'function') {
                unsub();
            }
        });
        this.eventUnsubscribers = [];
    }
}
