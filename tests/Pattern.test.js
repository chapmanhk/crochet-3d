/**
 * Tests for Pattern class
 *
 * Verifies:
 * - Pattern creation (chain, magic ring)
 * - Stitch operations (add, remove, change)
 * - Undo/redo functionality
 * - Working direction and row management
 * - Attachment point calculation
 * - Pattern serialization
 * - Instruction generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus, Events } from '../src/utils/EventBus.js';

describe('Pattern', () => {
    let pattern;

    beforeEach(() => {
        pattern = new Pattern();
        // Clear any previous EventBus listeners
        EventBus.clear();
    });

    describe('constructor', () => {
        it('should create pattern with default values', () => {
            expect(pattern.mode).toBe('flat');
            expect(pattern.currentRow).toBe(0);
            expect(pattern.workingDirection).toBe('right');
            expect(pattern.selectedStitchType).toBe(StitchType.SINGLE_CROCHET);
            expect(pattern.currentColor).toBe(0x8B4513);
        });

        it('should create empty graph', () => {
            expect(pattern.graph.size).toBe(0);
        });

        it('should initialize empty history', () => {
            expect(pattern.history).toEqual([]);
            expect(pattern.historyIndex).toBe(-1);
        });

        it('should create metadata with defaults', () => {
            expect(pattern.metadata.name).toBe('Untitled Pattern');
            expect(pattern.metadata.author).toBe('');
            expect(pattern.metadata.createdAt).toBeDefined();
            expect(pattern.metadata.modifiedAt).toBeDefined();
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

        it('should clear existing pattern', () => {
            pattern.startWithChain(5);
            pattern.startWithChain(3);

            expect(pattern.graph.size).toBe(3);
        });

        it('should reset history', () => {
            pattern.startWithChain(5);
            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

            pattern.startWithChain(3);

            expect(pattern.historyIndex).toBe(0); // Only initial state
        });

        it('should save initial history state', () => {
            pattern.startWithChain(5);

            expect(pattern.history).toHaveLength(1);
            expect(pattern.history[0].action).toBe('Create foundation chain');
        });

        it('should emit PATTERN_LOADED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.PATTERN_LOADED, callback);

            pattern.startWithChain(5);

            expect(callback).toHaveBeenCalled();
        });

        it('should create connected chain', () => {
            const chain = pattern.startWithChain(3);

            expect(chain[0].connections.right).toBe(chain[1]);
            expect(chain[1].connections.left).toBe(chain[0]);
            expect(chain[1].connections.right).toBe(chain[2]);
        });
    });

    describe('startWithMagicRing', () => {
        it('should create magic ring with default 6 stitches', () => {
            const stitches = pattern.startWithMagicRing();

            // 1 magic ring + 6 SC = 7 total
            expect(stitches).toHaveLength(7);
            expect(pattern.graph.size).toBe(7);
        });

        it('should create magic ring with custom stitch count', () => {
            const stitches = pattern.startWithMagicRing(8);

            // 1 magic ring + 8 SC = 9 total
            expect(stitches).toHaveLength(9);
        });

        it('should set mode to round', () => {
            pattern.startWithMagicRing();

            expect(pattern.mode).toBe('round');
        });

        it('should create magic ring node at center', () => {
            pattern.startWithMagicRing();

            const ring = pattern.graph.getAt(0, 0);
            expect(ring.type).toBe(StitchType.MAGIC_RING);
        });

        it('should connect stitches to magic ring', () => {
            pattern.startWithMagicRing(4);

            const ring = pattern.graph.getAt(0, 0);
            expect(ring.connections.above).toHaveLength(4);
        });
    });

    describe('addStitch', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should add stitch attached to specified node', () => {
            const attachTo = pattern.graph.getAt(0, 2);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            expect(stitch).toBeDefined();
            expect(stitch.type).toBe(StitchType.SINGLE_CROCHET);
            expect(stitch.connections.below).toContain(attachTo);
        });

        it('should apply current color', () => {
            pattern.currentColor = 0xFF0000;
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            expect(stitch.color).toBe(0xFF0000);
        });

        it('should allow custom color override', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo, {
                color: 0x00FF00
            });

            expect(stitch.color).toBe(0x00FF00);
        });

        it('should place stitch in next row', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            expect(stitch.row).toBe(1);
        });

        it('should connect to previous stitch in row', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch1 = pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            const stitch2 = pattern.addStitch(StitchType.SINGLE_CROCHET, chain[1]);

            expect(stitch1.connections.right).toBe(stitch2);
            expect(stitch2.connections.left).toBe(stitch1);
        });

        it('should save history state', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const historyBefore = pattern.history.length;

            pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            expect(pattern.history.length).toBe(historyBefore + 1);
        });

        it('should return null for invalid stitch type', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch('invalid_type', attachTo);

            expect(stitch).toBeNull();
        });

        it('should handle decrease with second attachment', () => {
            const chain = pattern.graph.getRowSorted(0);
            const stitch = pattern.addStitch(StitchType.DECREASE, chain[0], {
                secondAttachment: chain[1]
            });

            expect(stitch.connections.below).toContain(chain[0]);
            expect(stitch.connections.below).toContain(chain[1]);
        });
    });

    describe('removeStitch', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should remove stitch from pattern', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);
            const sizeBefore = pattern.graph.size;

            const result = pattern.removeStitch(stitch);

            expect(result).toBe(true);
            expect(pattern.graph.size).toBe(sizeBefore - 1);
        });

        it('should save history state', () => {
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);
            const historyBefore = pattern.history.length;

            pattern.removeStitch(stitch);

            expect(pattern.history.length).toBe(historyBefore + 1);
        });

        it('should return false for null node', () => {
            expect(pattern.removeStitch(null)).toBe(false);
        });
    });

    describe('changeStitchType', () => {
        it('should change stitch type', () => {
            pattern.startWithChain(3);
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            // Mock setPosition to avoid THREE.Vector3 dependency
            stitch.setPosition = vi.fn();

            pattern.changeStitchType(stitch, StitchType.DOUBLE_CROCHET);

            expect(stitch.type).toBe(StitchType.DOUBLE_CROCHET);
        });

        it('should recalculate position', () => {
            pattern.startWithChain(3);
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            // Mock setPosition to capture the new position
            let newPosition = null;
            stitch.setPosition = vi.fn((x, y, z) => {
                newPosition = { x, y, z };
            });

            pattern.changeStitchType(stitch, StitchType.DOUBLE_CROCHET);

            // Double crochet is taller, so setPosition should be called with new y
            expect(stitch.setPosition).toHaveBeenCalled();
            expect(newPosition).not.toBeNull();
            // DC is taller than SC, so y should be higher
            expect(newPosition.y).toBeGreaterThan(stitch.position.y);
        });

        it('should emit STITCH_TYPE_CHANGED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.STITCH_TYPE_CHANGED, callback);

            pattern.startWithChain(3);
            const attachTo = pattern.graph.getAt(0, 0);
            const stitch = pattern.addStitch(StitchType.SINGLE_CROCHET, attachTo);

            // Mock setPosition to avoid THREE.Vector3 dependency
            stitch.setPosition = vi.fn();

            pattern.changeStitchType(stitch, StitchType.DOUBLE_CROCHET);

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                node: stitch,
                oldType: StitchType.SINGLE_CROCHET,
                newType: StitchType.DOUBLE_CROCHET
            }));
        });

        it('should return false for null node', () => {
            expect(pattern.changeStitchType(null, StitchType.CHAIN)).toBe(false);
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
            expect(pattern.workingDirection).toBe('right');

            pattern.startNewRow();
            expect(pattern.workingDirection).toBe('left');

            pattern.startNewRow();
            expect(pattern.workingDirection).toBe('right');
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
        });
    });

    describe('undo/redo', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should undo last action', () => {
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[1]);

            expect(pattern.graph.size).toBe(7);

            pattern.undo();

            expect(pattern.graph.size).toBe(6);
        });

        it('should redo undone action', () => {
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);

            pattern.undo();
            expect(pattern.graph.size).toBe(5);

            pattern.redo();
            expect(pattern.graph.size).toBe(6);
        });

        it('should report canUndo correctly', () => {
            expect(pattern.canUndo()).toBe(false);

            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

            expect(pattern.canUndo()).toBe(true);
        });

        it('should report canRedo correctly', () => {
            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

            expect(pattern.canRedo()).toBe(false);

            pattern.undo();

            expect(pattern.canRedo()).toBe(true);
        });

        it('should clear redo history on new action', () => {
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.undo();

            expect(pattern.canRedo()).toBe(true);

            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[1]);

            expect(pattern.canRedo()).toBe(false);
        });

        it('should emit UNDO event', () => {
            const callback = vi.fn();
            EventBus.on(Events.UNDO, callback);

            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));
            pattern.undo();

            expect(callback).toHaveBeenCalled();
        });

        it('should emit REDO event', () => {
            const callback = vi.fn();
            EventBus.on(Events.REDO, callback);

            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));
            pattern.undo();
            pattern.redo();

            expect(callback).toHaveBeenCalled();
        });

        it('should emit HISTORY_CHANGED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.HISTORY_CHANGED, callback);

            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                canUndo: true,
                canRedo: false
            }));
        });

        it('should limit history size', () => {
            // Add more actions than maxHistorySize
            const chain = pattern.graph.getRowSorted(0);
            for (let i = 0; i < 60; i++) {
                pattern.addStitch(StitchType.SINGLE_CROCHET, chain[i % 5], { row: Math.floor(i / 5) + 1 });
            }

            expect(pattern.history.length).toBeLessThanOrEqual(pattern.maxHistorySize);
        });

        it('should return false when undo not available', () => {
            expect(pattern.undo()).toBe(false);
        });

        it('should return false when redo not available', () => {
            expect(pattern.redo()).toBe(false);
        });
    });

    describe('getAttachmentPoints', () => {
        beforeEach(() => {
            pattern.startWithChain(5);
        });

        it('should return attachment points from previous row', () => {
            pattern.startNewRow();

            const points = pattern.getAttachmentPoints();

            expect(points.length).toBeGreaterThan(0);
            expect(points[0].stitch).toBeDefined();
            expect(points[0].type).toBe('above');
        });

        it('should exclude already connected stitches', () => {
            pattern.startNewRow();
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);

            const points = pattern.getAttachmentPoints();

            // First chain should not be available anymore
            const firstChainAvailable = points.some(p => p.stitch === chain[0]);
            expect(firstChainAvailable).toBe(false);
        });

        it('should mark suggested attachment point', () => {
            pattern.startNewRow();
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);

            const points = pattern.getAttachmentPoints();

            // Next suggested should be column 1
            const suggested = points.find(p => p.suggested);
            if (suggested) {
                expect(suggested.stitch.column).toBe(1);
            }
        });
    });

    describe('serialization', () => {
        it('should serialize to JSON', () => {
            pattern.startWithChain(5);
            pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

            const json = pattern.toJSON();

            expect(json.version).toBe(1);
            expect(json.metadata).toBeDefined();
            expect(json.mode).toBe('flat');
            expect(json.currentRow).toBeDefined();
            expect(json.graph).toBeDefined();
            expect(json.graph.nodes).toHaveLength(6);
        });

        it('should include metadata', () => {
            pattern.metadata.name = 'Test Pattern';
            pattern.metadata.author = 'Test Author';

            const json = pattern.toJSON();

            expect(json.metadata.name).toBe('Test Pattern');
            expect(json.metadata.author).toBe('Test Author');
        });

        it('should deserialize from JSON', () => {
            pattern.startWithChain(5);
            pattern.mode = 'round';
            pattern.currentColor = 0xFF0000;
            pattern.metadata.name = 'Test';

            const json = pattern.toJSON();
            const restored = Pattern.fromJSON(json);

            expect(restored.mode).toBe('round');
            expect(restored.currentColor).toBe(0xFF0000);
            expect(restored.metadata.name).toBe('Test');
            expect(restored.graph.size).toBe(5);
        });

        it('should handle missing optional fields', () => {
            const minimalData = {
                graph: {
                    nodes: []
                }
            };

            const restored = Pattern.fromJSON(minimalData);

            expect(restored.mode).toBe('flat');
            expect(restored.currentRow).toBe(0);
        });
    });

    describe('generateInstructions', () => {
        it('should generate readable instructions', () => {
            pattern.startWithChain(5);

            const instructions = pattern.generateInstructions();

            expect(instructions).toContain('Pattern:');
            expect(instructions).toContain('Row 1:');
            expect(instructions).toContain('ch');
            expect(instructions).toContain('5 sts');
        });

        it('should include pattern name', () => {
            pattern.metadata.name = 'My Test Pattern';
            pattern.startWithChain(3);

            const instructions = pattern.generateInstructions();

            expect(instructions).toContain('My Test Pattern');
        });

        it('should count stitch totals', () => {
            pattern.startWithChain(3);
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[1]);

            const instructions = pattern.generateInstructions();

            expect(instructions).toContain('Total Stitches: 5');
        });

        it('should aggregate stitch counts per row', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[1]);
            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[2]);

            const instructions = pattern.generateInstructions();

            expect(instructions).toContain('Row 2:');
            expect(instructions).toContain('sc');
            expect(instructions).toContain('dc');
        });
    });

    describe('event forwarding', () => {
        it('should forward STITCH_ADDED events', () => {
            const callback = vi.fn();
            EventBus.on(Events.STITCH_ADDED, callback);

            pattern.startWithChain(3);

            expect(callback).toHaveBeenCalled();
        });

        it('should forward STITCH_REMOVED events', () => {
            pattern.startWithChain(3);

            const callback = vi.fn();
            EventBus.on(Events.STITCH_REMOVED, callback);

            const stitch = pattern.graph.getAt(0, 0);
            pattern.removeStitch(stitch);

            expect(callback).toHaveBeenCalled();
        });

        it('should forward PATTERN_CLEARED events', () => {
            pattern.startWithChain(3);

            const callback = vi.fn();
            EventBus.on(Events.PATTERN_CLEARED, callback);

            pattern.graph.clear();

            expect(callback).toHaveBeenCalled();
        });

        it('should update modifiedAt timestamp on changes', () => {
            pattern.startWithChain(3);
            const timeBefore = pattern.metadata.modifiedAt;

            // Wait a bit to ensure timestamp difference
            return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
                pattern.addStitch(StitchType.SINGLE_CROCHET, pattern.graph.getAt(0, 0));

                expect(pattern.metadata.modifiedAt).toBeGreaterThan(timeBefore);
            });
        });
    });
});
