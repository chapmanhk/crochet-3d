/**
 * Tests for PhysicsEngine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsEngine } from '../src/physics/PhysicsEngine.js';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus, Events } from '../src/utils/EventBus.js';

describe('PhysicsEngine', () => {
    let pattern;
    let sceneManager;

    beforeEach(() => {
        EventBus.clear();
        pattern = new Pattern();
        sceneManager = {
            onUpdate: () => () => {}
        };
    });

    it('rebuilds bodies and constraints from pattern', () => {
        pattern.startWithChain(2);
        const engine = new PhysicsEngine(pattern, sceneManager);

        engine.rebuildAll();

        expect(engine.bodies.size).toBe(2);
        expect(engine.constraints.length).toBe(1);
    });

    it('pins foundation row bodies', () => {
        pattern.startWithChain(1);
        const engine = new PhysicsEngine(pattern, sceneManager);

        engine.rebuildAll();
        const body = Array.from(engine.bodies.values())[0];

        expect(body.pinned).toBe(true);
    });

    it('rebuilds constraints when stiffness changes', () => {
        pattern.startWithChain(2);
        const engine = new PhysicsEngine(pattern, sceneManager);
        const rebuildSpy = engine.rebuildConstraints.bind(engine);
        let rebuildCalled = 0;
        engine.rebuildConstraints = () => {
            rebuildCalled += 1;
            rebuildSpy();
        };

        engine.setParams({ stiffness: 0.5 });

        expect(rebuildCalled).toBe(1);
    });

    it('settles and emits events when movement is below threshold', () => {
        pattern.startWithChain(1);
        const engine = new PhysicsEngine(pattern, sceneManager);
        engine.rebuildAll();

        let settled = false;
        let stepped = false;
        EventBus.on(Events.PHYSICS_SETTLED, () => { settled = true; });
        EventBus.on(Events.PHYSICS_STEP, () => { stepped = true; });

        engine.isRunning = true;
        engine.isSettling = true;
        engine.settleThreshold = 1;

        engine.update();

        expect(stepped).toBe(true);
        expect(settled).toBe(true);
        expect(engine.isRunning).toBe(false);
        expect(engine.isSettling).toBe(false);
    });

    it('applies impulse to unpinned bodies', () => {
        pattern.startWithChain(1);
        const base = pattern.graph.getAt(0, 0);
        const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, base);

        const engine = new PhysicsEngine(pattern, sceneManager);
        engine.rebuildAll();

        const body = engine.bodies.get(stitch.id);
        const beforeX = body.position.x;
        engine.applyImpulse(stitch, { x: 1, y: 0, z: 0 });

        expect(body.position.x).toBe(beforeX + 1);
    });

    it('subscribes to updates once and unsubscribes on stop', () => {
        const unsubscribe = vi.fn();
        sceneManager = {
            onUpdate: vi.fn(() => unsubscribe)
        };
        const engine = new PhysicsEngine(pattern, sceneManager);

        engine.start();
        engine.start();

        expect(sceneManager.onUpdate).toHaveBeenCalledTimes(1);

        engine.stop();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(sceneManager.onUpdate).toHaveBeenCalledTimes(1);
    });
});
