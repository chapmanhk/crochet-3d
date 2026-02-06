/**
 * Tests for Pattern class (simplified)
 *
 * Verifies:
 * - Foundation chain creation
 * - Adding single crochet stitches
 * - Row management and direction toggling
 * - Attachment point calculation
 * - Turning chains
 * - Event forwarding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus, Events } from '../src/utils/EventBus.js';

describe('Pattern', () => {
    let pattern;

    beforeEach(() => {
        pattern = new Pattern();
    });

    describe('constructor', () => {
        it('should create pattern with default values', () => {
            expect(pattern.currentRow).toBe(0);
            expect(pattern.workingDirection).toBe('right');
            expect(pattern.selectedStitchType).toBe(StitchType.SINGLE_CROCHET);
            expect(pattern.currentColor).toBe(0x8B4513);
        });

        it('should create empty graph', () => {
            expect(pattern.graph.size).toBe(0);
        });
    });

    describe('startWithChain', () => {
        it('should create foundation chain of specified length', () => {
            const chain = pattern.startWithChain(10);

            expect(chain).toHaveLength(10);
            expect(pattern.graph.size).toBe(10);
        });

        it('should reset current row to 0', () => {
            pattern.currentRow = 5;
            pattern.startWithChain(10);

            expect(pattern.currentRow).toBe(0);
        });

        it('should set working direction to left', () => {
            pattern.startWithChain(5);
            expect(pattern.workingDirection).toBe('left');
        });

        it('should clear existing pattern', () => {
            pattern.startWithChain(5);
            pattern.startWithChain(3);

            expect(pattern.graph.size).toBe(3);
        });

        it('should emit PATTERN_LOADED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.PATTERN_LOADED, callback);

            pattern.startWithChain(5);

            expect(callback).toHaveBeenCalled();

            EventBus.off(Events.PATTERN_LOADED, callback);
        });

        it('should create connected chain', () => {
            const chain = pattern.startWithChain(3);

            expect(chain[0].connections.right).toBe(chain[1]);
            expect(chain[1].connections.left).toBe(chain[0]);
            expect(chain[1].connections.right).toBe(chain[2]);
        });

        it('should return empty array for invalid length', () => {
            expect(pattern.startWithChain(0)).toEqual([]);
            expect(pattern.startWithChain(-1)).toEqual([]);
        });

        it('should clamp length to 500', () => {
            const chain = pattern.startWithChain(1000);
            expect(chain).toHaveLength(500);
        });
    });

    describe('addStitch', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should add stitch attached to specified node', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch = pattern.addStitch(chain[2]);

            expect(stitch).toBeDefined();
            expect(stitch.type).toBe(StitchType.SINGLE_CROCHET);
            expect(stitch.connections.below).toContain(chain[2]);
        });

        it('should apply current color', () => {
            pattern.currentColor = 0xFF0000;
            const chain = pattern.graph.getRowSorted(0);
            const stitch = pattern.addStitch(chain[0]);

            expect(stitch.color).toBe(0xFF0000);
        });

        it('should allow custom color override', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch = pattern.addStitch(chain[0], { color: 0x00FF00 });

            expect(stitch.color).toBe(0x00FF00);
        });

        it('should place stitch in next row', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch = pattern.addStitch(chain[0]);

            expect(stitch.row).toBe(1);
        });

        it('should connect to previous stitch in row', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch1 = pattern.addStitch(chain[0]);
            const stitch2 = pattern.addStitch(chain[1]);

            expect(stitch1.connections.right).toBe(stitch2);
            expect(stitch2.connections.left).toBe(stitch1);
        });

        it('should update currentRow when adding to higher row', () => {
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(chain[0], { row: 3 });

            expect(pattern.currentRow).toBe(3);
        });
    });

    describe('startNewRow', () => {
        it('should increment current row', () => {
            pattern.startWithChain(5);

            pattern.startNewRow();

            expect(pattern.currentRow).toBe(1);
        });

        it('should toggle working direction', () => {
            pattern.startWithChain(5);
            expect(pattern.workingDirection).toBe('left');

            pattern.startNewRow();
            expect(pattern.workingDirection).toBe('right');

            pattern.startNewRow();
            expect(pattern.workingDirection).toBe('left');
        });

        it('should emit ROW_ADDED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.ROW_ADDED, callback);

            pattern.startWithChain(5);
            pattern.startNewRow();

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                row: 1,
                pattern
            }));

            EventBus.off(Events.ROW_ADDED, callback);
        });

        it('should add a turning chain', () => {
            pattern.startWithChain(5);
            pattern.startNewRow();

            const row1 = pattern.graph.getRow(1);
            const turningChains = row1.filter(s => s.isTurningChain);

            expect(turningChains.length).toBeGreaterThan(0);
            expect(turningChains[0].type).toBe(StitchType.CHAIN);
        });

        it('should attach turning chain to end of previous row', () => {
            pattern.startWithChain(5);
            // workingDirection is 'left' after chain, so end is column 0
            pattern.startNewRow();

            const row1 = pattern.graph.getRow(1);
            const turningChains = row1.filter(s => s.isTurningChain);

            expect(turningChains.length).toBeGreaterThan(0);
            const attachedTo = turningChains[0].connections.below[0];
            expect(attachedTo).toBeDefined();
            expect(attachedTo.column).toBe(0);
        });

        it('should return the new row number', () => {
            pattern.startWithChain(5);
            const rowNum = pattern.startNewRow();
            expect(rowNum).toBe(1);
        });
    });

    describe('getAttachmentPoints', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should return attachment points from foundation row', () => {
            const points = pattern.getAttachmentPoints();

            expect(points.length).toBeGreaterThan(0);
            expect(points[0].stitch).toBeDefined();
        });

        it('should exclude stitches with no available connections', () => {
            const chain = pattern.graph.getRowSorted(0);
            // Add stitch to chain[0] - it should no longer be available
            pattern.addStitch(chain[0]);

            const points = pattern.getAttachmentPoints();

            const firstChainAvailable = points.some(p => p.stitch === chain[0]);
            expect(firstChainAvailable).toBe(false);
        });

        it('should mark suggested attachment point', () => {
            const points = pattern.getAttachmentPoints();

            const suggested = points.find(p => p.suggested);
            expect(suggested).toBeDefined();
        });

        it('should exclude turning chains', () => {
            pattern.startNewRow();
            const points = pattern.getAttachmentPoints();

            const hasTurningChain = points.some(p => p.stitch.isTurningChain);
            expect(hasTurningChain).toBe(false);
        });

        it('should reverse order when working left', () => {
            pattern.startNewRow(); // direction = right
            const chain = pattern.graph.getRowSorted(0);
            chain.forEach(ch => pattern.addStitch(ch));

            pattern.startNewRow(); // direction = left

            const points = pattern.getAttachmentPoints();
            if (points.length >= 2) {
                // When working left, first suggested should be highest column
                expect(points[0].stitch.column).toBeGreaterThan(
                    points[points.length - 1].stitch.column
                );
            }
        });
    });

    describe('calculateStitchPosition', () => {
        it('should return position object with x, y, z', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);
            const pos = pattern.calculateStitchPosition(
                StitchType.SINGLE_CROCHET, chain[0], 1, 0
            );

            expect(pos).toHaveProperty('x');
            expect(pos).toHaveProperty('y');
            expect(pos).toHaveProperty('z');
        });
    });

    describe('findPreviousInRow', () => {
        it('should find previous stitch when working right', () => {
            pattern.startWithChain(5);
            pattern.startNewRow(); // direction = right
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(chain[0]); // column 0

            const prev = pattern.findPreviousInRow(1, 1);
            expect(prev).toBeDefined();
            expect(prev.column).toBeLessThan(1);
        });

        it('should return null for empty row', () => {
            pattern.startWithChain(5);
            const prev = pattern.findPreviousInRow(5, 0);
            expect(prev).toBeNull();
        });
    });

    describe('calculateNextColumn', () => {
        it('should return 0 for empty row', () => {
            pattern.startWithChain(5);
            expect(pattern.calculateNextColumn(5)).toBe(0);
        });
    });

    describe('event forwarding', () => {
        it('should forward STITCH_ADDED events', () => {
            const callback = vi.fn();
            EventBus.on(Events.STITCH_ADDED, callback);

            pattern.startWithChain(3);

            expect(callback).toHaveBeenCalled();

            EventBus.off(Events.STITCH_ADDED, callback);
        });

        it('should forward PATTERN_CLEARED events', () => {
            pattern.startWithChain(3);

            const callback = vi.fn();
            EventBus.on(Events.PATTERN_CLEARED, callback);

            pattern.graph.clear();

            expect(callback).toHaveBeenCalled();

            EventBus.off(Events.PATTERN_CLEARED, callback);
        });
    });

    describe('dispose', () => {
        it('should clean up graph listeners', () => {
            pattern.dispose();
            expect(pattern.graphListeners).toEqual({});
        });

        it('should not throw when called multiple times', () => {
            pattern.dispose();
            expect(() => pattern.dispose()).not.toThrow();
        });
    });
});
