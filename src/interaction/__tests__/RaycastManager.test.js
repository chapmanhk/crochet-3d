/**
 * Tests for RaycastManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RaycastManager } from '../RaycastManager.js';
import * as THREE from 'three';

// Mock Touch and TouchEvent for testing (not available in jsdom)
class MockTouch {
    constructor({ identifier, target, clientX, clientY }) {
        this.identifier = identifier;
        this.target = target;
        this.clientX = clientX;
        this.clientY = clientY;
    }
}

class MockTouchEvent extends Event {
    constructor(type, { touches = [], targetTouches = [], changedTouches = [] }) {
        super(type);
        this.touches = touches;
        this.targetTouches = targetTouches;
        this.changedTouches = changedTouches;
    }
}

// Make them globally available for tests
global.Touch = MockTouch;
global.TouchEvent = MockTouchEvent;

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

        // Should be far fewer than 100 calls (just 2, not 100+)
        expect(raycastSpy).toHaveBeenCalledTimes(2);
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

    describe('Touch Events', () => {
        it('handles single touch start event', () => {
            const touch = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            const event = new TouchEvent('touchstart', {
                touches: [touch],
                targetTouches: [touch],
                changedTouches: [touch]
            });

            sceneManager.domElement.dispatchEvent(event);

            expect(rm.isTouchActive).toBe(true);
            expect(rm.lastTouchCount).toBe(1);
        });

        it('handles multi-touch start event', () => {
            const touch1 = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 300,
                clientY: 300
            });

            const touch2 = new Touch({
                identifier: 1,
                target: sceneManager.domElement,
                clientX: 500,
                clientY: 300
            });

            const event = new TouchEvent('touchstart', {
                touches: [touch1, touch2],
                targetTouches: [touch1, touch2],
                changedTouches: [touch1, touch2]
            });

            sceneManager.domElement.dispatchEvent(event);

            expect(rm.isTouchActive).toBe(true);
            expect(rm.lastTouchCount).toBe(2);
        });

        it('clears hover state during multi-touch', () => {
            const mockNode = {
                setSelected: vi.fn(),
                setHighlighted: vi.fn()
            };
            rm.hoveredNode = mockNode;

            const touch1 = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 300,
                clientY: 300
            });

            const touch2 = new Touch({
                identifier: 1,
                target: sceneManager.domElement,
                clientX: 500,
                clientY: 300
            });

            const event = new TouchEvent('touchstart', {
                touches: [touch1, touch2],
                targetTouches: [touch1, touch2],
                changedTouches: [touch1, touch2]
            });

            sceneManager.domElement.dispatchEvent(event);

            expect(mockNode.setHighlighted).toHaveBeenCalledWith(false);
            expect(rm.hoveredNode).toBe(null);
        });

        it('throttles touchmove events like mousemove', () => {
            const raycastSpy = vi.spyOn(rm, 'raycast');
            raycastSpy.mockReturnValue([]);

            // Simulate multiple rapid touchmove events
            for (let i = 0; i < 10; i++) {
                const touch = new Touch({
                    identifier: 0,
                    target: sceneManager.domElement,
                    clientX: 100 + i,
                    clientY: 200 + i
                });

                const event = new TouchEvent('touchmove', {
                    touches: [touch],
                    targetTouches: [touch],
                    changedTouches: [touch]
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

        it('skips hover detection during multi-touch move', () => {
            const raycastSpy = vi.spyOn(rm, 'raycast');
            raycastSpy.mockReturnValue([]);

            const touch1 = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 300,
                clientY: 300
            });

            const touch2 = new Touch({
                identifier: 1,
                target: sceneManager.domElement,
                clientX: 500,
                clientY: 300
            });

            const event = new TouchEvent('touchmove', {
                touches: [touch1, touch2],
                targetTouches: [touch1, touch2],
                changedTouches: [touch1, touch2]
            });

            sceneManager.domElement.dispatchEvent(event);

            // Should not raycast during multi-touch
            expect(raycastSpy).not.toHaveBeenCalled();
        });

        it('handles tap (quick touch end) as selection', () => {
            vi.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)  // touchstart time
                .mockReturnValueOnce(1100); // touchend time (100ms later)

            const mockNode = {
                setSelected: vi.fn(),
                setHighlighted: vi.fn()
            };

            const mockMesh = {
                userData: { node: mockNode }
            };

            const raycastSpy = vi.spyOn(rm, 'raycast');
            raycastSpy.mockReturnValue([{ object: mockMesh }]);

            const selectSingleSpy = vi.spyOn(rm, 'selectSingle');

            // Touch start
            const touchStart = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchStart],
                targetTouches: [touchStart],
                changedTouches: [touchStart]
            }));

            // Touch end quickly
            const touchEnd = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchEnd]
            }));

            expect(selectSingleSpy).toHaveBeenCalledWith(mockNode);
            expect(rm.isTouchActive).toBe(false);
        });

        it('ignores slow touch (drag) as selection', () => {
            vi.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)  // touchstart time
                .mockReturnValueOnce(1400); // touchend time (400ms later, too slow)

            const selectSingleSpy = vi.spyOn(rm, 'selectSingle');

            // Touch start
            const touchStart = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchStart],
                targetTouches: [touchStart],
                changedTouches: [touchStart]
            }));

            // Touch end slowly
            const touchEnd = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchEnd]
            }));

            // Should not trigger selection
            expect(selectSingleSpy).not.toHaveBeenCalled();
            expect(rm.isTouchActive).toBe(false);
        });

        it('ignores multi-touch end as tap', () => {
            vi.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1100);

            const selectSingleSpy = vi.spyOn(rm, 'selectSingle');

            // Multi-touch start
            const touch1 = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 300,
                clientY: 300
            });

            const touch2 = new Touch({
                identifier: 1,
                target: sceneManager.domElement,
                clientX: 500,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touch1, touch2],
                targetTouches: [touch1, touch2],
                changedTouches: [touch1, touch2]
            }));

            // Touch end
            sceneManager.domElement.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touch1]
            }));

            // Should not trigger selection
            expect(selectSingleSpy).not.toHaveBeenCalled();
            expect(rm.isTouchActive).toBe(false);
        });

        it('clears selection on tap on empty space', () => {
            vi.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1100);

            const raycastSpy = vi.spyOn(rm, 'raycast');
            raycastSpy.mockReturnValue([]); // No intersection

            const clearSelectionSpy = vi.spyOn(rm, 'clearSelection');

            // Touch start
            const touchStart = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchStart],
                targetTouches: [touchStart],
                changedTouches: [touchStart]
            }));

            // Touch end
            const touchEnd = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400,
                clientY: 300
            });

            sceneManager.domElement.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchEnd]
            }));

            expect(clearSelectionSpy).toHaveBeenCalled();
        });

        it('updates touch position correctly', () => {
            const touch = new Touch({
                identifier: 0,
                target: sceneManager.domElement,
                clientX: 400, // center of 800px width
                clientY: 300  // center of 600px height
            });

            rm.updateTouchPosition(touch);

            // Normalized device coordinates: center should be (0, 0)
            expect(rm.mouse.x).toBeCloseTo(0, 5);
            expect(rm.mouse.y).toBeCloseTo(0, 5);
        });

        it('removes touch event listeners on dispose', () => {
            const removeEventListenerSpy = vi.spyOn(sceneManager.domElement, 'removeEventListener');

            rm.dispose();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', rm.onTouchStart);
            expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', rm._throttledTouchMove);
            expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', rm.onTouchEnd);
        });
    });
});
