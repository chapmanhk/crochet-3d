/**
 * Tests for RaycastManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RaycastManager } from '../RaycastManager.js';
import * as THREE from 'three';

describe('RaycastManager', () => {
    let sceneManager;
    let stitchRenderer;
    let rm;

    beforeEach(() => {
        vi.useFakeTimers();

        // Create a minimal fake DOM element
        const domElement = document.createElement('div');
        domElement.getBoundingClientRect = vi.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        }));

        sceneManager = {
            domElement,
            camera: {},
            isHoveringAttachmentPoint: false
        };

        stitchRenderer = {
            getAllMeshes: vi.fn(() => []),
            updateSelectionVisual: vi.fn()
        };

        rm = new RaycastManager(sceneManager, stitchRenderer, { throttleMs: 50 });
    });

    afterEach(() => {
        if (rm) {
            rm.dispose();
        }
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('constructs with default throttle time', () => {
        const rm2 = new RaycastManager(sceneManager, stitchRenderer);
        expect(rm2.throttleMs).toBe(50);
        rm2.dispose();
    });

    it('constructs with custom throttle time', () => {
        const rm3 = new RaycastManager(sceneManager, stitchRenderer, { throttleMs: 100 });
        expect(rm3.throttleMs).toBe(100);
        rm3.dispose();
    });

    it('throttles mousemove events to reduce raycast calls', () => {
        // Spy on the raycast method
        const raycastSpy = vi.spyOn(rm, 'raycast');
        raycastSpy.mockReturnValue([]);

        // Simulate multiple rapid mousemove events
        for (let i = 0; i < 10; i++) {
            const event = new MouseEvent('mousemove', {
                clientX: 100 + i,
                clientY: 200 + i
            });
            sceneManager.domElement.dispatchEvent(event);
        }

        // Should have only 1 immediate call
        expect(raycastSpy).toHaveBeenCalledTimes(1);

        // Advance time to trigger trailing call
        vi.advanceTimersByTime(50);

        // Should have 2 calls total (initial + trailing)
        expect(raycastSpy).toHaveBeenCalledTimes(2);
    });

    it('does not create excessive raycast calls for continuous mouse movement', () => {
        const raycastSpy = vi.spyOn(rm, 'raycast');
        raycastSpy.mockReturnValue([]);

        // Simulate 100 rapid mousemove events
        for (let i = 0; i < 100; i++) {
            const event = new MouseEvent('mousemove', {
                clientX: 100 + i,
                clientY: 200
            });
            sceneManager.domElement.dispatchEvent(event);
        }

        // Should have only 1 immediate call
        expect(raycastSpy).toHaveBeenCalledTimes(1);

        // Advance time
        vi.advanceTimersByTime(50);

        // Should be far fewer than 100 calls (just 2)
        expect(raycastSpy).toHaveBeenCalledTimes(2);
        expect(raycastSpy).toHaveBeenCalledTimes(2); // Much less than 100
    });

    it('removes event listeners on dispose', () => {
        const removeEventListenerSpy = vi.spyOn(sceneManager.domElement, 'removeEventListener');
        const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

        rm.dispose();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', rm._throttledMouseMove);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('click', rm.onClick);
        expect(windowRemoveSpy).toHaveBeenCalledWith('keydown', rm.onKeyDown);
    });

    it('dispose is safe to call multiple times', () => {
        rm.dispose();
        rm.dispose(); // Should not throw
        expect(true).toBe(true); // If we get here, no error was thrown
    });

    it('dispose handles missing domElement gracefully', () => {
        rm.sceneManager.domElement = null;
        rm.dispose(); // Should not throw
        expect(true).toBe(true);
    });

    it('updates mouse position correctly', () => {
        const event = new MouseEvent('mousemove', {
            clientX: 400, // center of 800px width
            clientY: 300  // center of 600px height
        });

        rm.updateMousePosition(event);

        // Normalized device coordinates: center should be (0, 0)
        expect(rm.mouse.x).toBeCloseTo(0, 5);
        expect(rm.mouse.y).toBeCloseTo(0, 5);
    });

    it('clears selection state on dispose', () => {
        // Add a mock selected node
        const mockNode = {
            setSelected: vi.fn(),
            setHighlighted: vi.fn()
        };
        rm.selectedNodes.add(mockNode);
        rm.hoveredNode = mockNode;

        rm.dispose();

        expect(rm.selectedNodes.size).toBe(0);
        expect(rm.hoveredNode).toBe(null);
    });
});
