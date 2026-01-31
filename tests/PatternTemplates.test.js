/**
 * Tests for PatternTemplates module
 *
 * Verifies:
 * - Template creation functions exist
 * - Templates create valid patterns with correct structure
 * - Templates support customization options
 * - Generated patterns follow crochet conventions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PatternTemplates,
    createGrannySquare,
    createBasicCircle,
    createBasicSquare,
    createTriangle,
    getAvailableTemplates
} from '../src/core/PatternTemplates.js';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus } from '../src/utils/EventBus.js';

describe('PatternTemplates', () => {
    beforeEach(() => {
        EventBus.clear();
    });

    describe('module structure', () => {
        it('should export PatternTemplates object', () => {
            expect(PatternTemplates).toBeDefined();
            expect(typeof PatternTemplates).toBe('object');
        });

        it('should export createGrannySquare function', () => {
            expect(createGrannySquare).toBeDefined();
            expect(typeof createGrannySquare).toBe('function');
        });

        it('should export createBasicCircle function', () => {
            expect(createBasicCircle).toBeDefined();
            expect(typeof createBasicCircle).toBe('function');
        });

        it('should export createBasicSquare function', () => {
            expect(createBasicSquare).toBeDefined();
            expect(typeof createBasicSquare).toBe('function');
        });

        it('should export createTriangle function', () => {
            expect(createTriangle).toBeDefined();
            expect(typeof createTriangle).toBe('function');
        });

        it('should export getAvailableTemplates function', () => {
            expect(getAvailableTemplates).toBeDefined();
            expect(typeof getAvailableTemplates).toBe('function');
        });
    });

    describe('getAvailableTemplates', () => {
        it('should return array of template definitions', () => {
            const templates = getAvailableTemplates();

            expect(Array.isArray(templates)).toBe(true);
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should include required template properties', () => {
            const templates = getAvailableTemplates();

            templates.forEach(template => {
                expect(template.id).toBeDefined();
                expect(template.name).toBeDefined();
                expect(template.description).toBeDefined();
                expect(template.category).toBeDefined();
                expect(template.create).toBeDefined();
                expect(typeof template.create).toBe('function');
            });
        });

        it('should include granny square template', () => {
            const templates = getAvailableTemplates();
            const grannySquare = templates.find(t => t.id === 'granny-square');

            expect(grannySquare).toBeDefined();
            expect(grannySquare.name).toBe('Granny Square');
            expect(grannySquare.category).toBe('square');
        });

        it('should include basic circle template', () => {
            const templates = getAvailableTemplates();
            const circle = templates.find(t => t.id === 'basic-circle');

            expect(circle).toBeDefined();
            expect(circle.name).toBe('Basic Circle');
            expect(circle.category).toBe('circular');
        });

        it('should include basic square template', () => {
            const templates = getAvailableTemplates();
            const square = templates.find(t => t.id === 'basic-square');

            expect(square).toBeDefined();
            expect(square.name).toBe('Basic Square');
            expect(square.category).toBe('square');
        });

        it('should include triangle template', () => {
            const templates = getAvailableTemplates();
            const triangle = templates.find(t => t.id === 'triangle');

            expect(triangle).toBeDefined();
            expect(triangle.name).toBe('Triangle');
            expect(triangle.category).toBe('shaped');
        });
    });

    describe('createGrannySquare', () => {
        it('should return a Pattern instance', () => {
            const pattern = createGrannySquare();

            expect(pattern).toBeInstanceOf(Pattern);
        });

        it('should set pattern name to Granny Square', () => {
            const pattern = createGrannySquare();

            expect(pattern.metadata.name).toBe('Granny Square');
        });

        it('should create pattern in round-joined mode', () => {
            const pattern = createGrannySquare();

            expect(pattern.mode).toBe('round-joined');
        });

        it('should start with magic ring', () => {
            const pattern = createGrannySquare();
            const firstStitch = pattern.graph.getAt(0, 0);

            expect(firstStitch).toBeDefined();
            expect(firstStitch.type).toBe(StitchType.MAGIC_RING);
        });

        it('should create initial round with chain and dc clusters', () => {
            const pattern = createGrannySquare();

            // Granny square round 1: ch 3, 2 dc, ch 2, [3 dc, ch 2] x 3
            // Should have dc clusters and chain spaces for corners
            const stitchCount = pattern.graph.size;
            expect(stitchCount).toBeGreaterThan(10);
        });

        it('should have 4 corners (chain spaces)', () => {
            const pattern = createGrannySquare();

            // Count chain-2 spaces (corners)
            let cornerCount = 0;
            pattern.graph.nodes.forEach(node => {
                if (node.type === StitchType.CHAIN && node.metadata?.isCorner) {
                    cornerCount++;
                }
            });

            // Each corner is a ch-2, so at least 4 corner markers
            expect(cornerCount).toBeGreaterThanOrEqual(4);
        });

        it('should accept custom number of rounds', () => {
            const pattern1 = createGrannySquare({ rounds: 1 });
            const pattern2 = createGrannySquare({ rounds: 3 });

            expect(pattern2.graph.size).toBeGreaterThan(pattern1.graph.size);
        });

        it('should accept custom color', () => {
            const customColor = 0xFF0000;
            const pattern = createGrannySquare({ color: customColor });

            // Check that stitches use the custom color
            const stitches = Array.from(pattern.graph.nodes.values());
            const coloredStitches = stitches.filter(s => s.color === customColor);
            expect(coloredStitches.length).toBeGreaterThan(0);
        });

        it('should create valid pattern that can be serialized', () => {
            const pattern = createGrannySquare();
            const json = pattern.toJSON();

            expect(json.version).toBeDefined();
            expect(json.graph.nodes.length).toBeGreaterThan(0);

            // Should be able to restore from JSON
            const restored = Pattern.fromJSON(json);
            expect(restored.graph.size).toBe(pattern.graph.size);
        });
    });

    describe('createBasicCircle', () => {
        it('should return a Pattern instance', () => {
            const pattern = createBasicCircle();

            expect(pattern).toBeInstanceOf(Pattern);
        });

        it('should set pattern name to Basic Circle', () => {
            const pattern = createBasicCircle();

            expect(pattern.metadata.name).toBe('Basic Circle');
        });

        it('should create pattern in round mode', () => {
            const pattern = createBasicCircle();

            expect(['round-joined', 'round-spiral']).toContain(pattern.mode);
        });

        it('should start with magic ring', () => {
            const pattern = createBasicCircle();
            const firstStitch = pattern.graph.getAt(0, 0);

            expect(firstStitch).toBeDefined();
            expect(firstStitch.type).toBe(StitchType.MAGIC_RING);
        });

        it('should have default 6 stitches in first round', () => {
            const pattern = createBasicCircle({ rounds: 1 });

            // Magic ring + 6 sc = 7 total minimum
            const row0 = pattern.graph.getRow(0);
            expect(row0.length).toBeGreaterThanOrEqual(6);
        });

        it('should accept custom initial stitch count', () => {
            const pattern = createBasicCircle({ initialStitches: 8, rounds: 1 });

            // Magic ring + 8 sc
            const row0 = pattern.graph.getRow(0);
            expect(row0.length).toBeGreaterThanOrEqual(8);
        });

        it('should increase stitch count each round for flat circle', () => {
            const pattern = createBasicCircle({ rounds: 3 });

            // In a flat circle, each round should have more stitches
            const rows = pattern.graph.getRowCount();

            if (rows >= 2) {
                const row0Count = pattern.graph.getRow(0).length;
                const row1Count = pattern.graph.getRow(1).length;
                expect(row1Count).toBeGreaterThanOrEqual(row0Count);
            }
        });

        it('should accept custom stitch type', () => {
            const pattern = createBasicCircle({
                stitchType: StitchType.DOUBLE_CROCHET,
                rounds: 1
            });

            // Check that DC stitches are used
            const stitches = Array.from(pattern.graph.nodes.values());
            const dcStitches = stitches.filter(s => s.type === StitchType.DOUBLE_CROCHET);
            expect(dcStitches.length).toBeGreaterThan(0);
        });

        it('should support spiral mode', () => {
            const pattern = createBasicCircle({ mode: 'spiral' });

            expect(pattern.mode).toBe('round-spiral');
        });

        it('should create valid pattern that can be serialized', () => {
            const pattern = createBasicCircle({ rounds: 2 });
            const json = pattern.toJSON();

            expect(json.graph.nodes.length).toBeGreaterThan(0);

            const restored = Pattern.fromJSON(json);
            expect(restored.graph.size).toBe(pattern.graph.size);
        });
    });

    describe('createBasicSquare', () => {
        it('should return a Pattern instance', () => {
            const pattern = createBasicSquare();

            expect(pattern).toBeInstanceOf(Pattern);
        });

        it('should set pattern name to Basic Square', () => {
            const pattern = createBasicSquare();

            expect(pattern.metadata.name).toBe('Basic Square');
        });

        it('should create pattern in flat mode', () => {
            const pattern = createBasicSquare();

            expect(pattern.mode).toBe('flat');
        });

        it('should align working direction with last row', () => {
            const pattern = createBasicSquare({ size: 4, rows: 4 });

            expect(pattern.currentRow).toBe(3);
            expect(pattern.workingDirection).toBe('right');
        });

        it('should start with foundation chain', () => {
            const pattern = createBasicSquare();
            const row0 = pattern.graph.getRowSorted(0);

            expect(row0.length).toBeGreaterThan(0);
            expect(row0[0].type).toBe(StitchType.CHAIN);
        });

        it('should have equal width and height (square proportions)', () => {
            const pattern = createBasicSquare({ size: 10 });

            // Foundation chain should match row count
            const row0 = pattern.graph.getRow(0);
            const rowCount = pattern.graph.getRowCount();

            // Square should have similar dimensions
            expect(row0.length).toBe(10);
        });

        it('should accept custom size', () => {
            const pattern5 = createBasicSquare({ size: 5 });
            const pattern10 = createBasicSquare({ size: 10 });

            const row0_5 = pattern5.graph.getRow(0);
            const row0_10 = pattern10.graph.getRow(0);

            expect(row0_10.length).toBeGreaterThan(row0_5.length);
        });

        it('should accept custom stitch type for body', () => {
            const pattern = createBasicSquare({
                stitchType: StitchType.DOUBLE_CROCHET,
                size: 5,
                rows: 2
            });

            // Check row 1 has DC stitches
            const row1 = pattern.graph.getRow(1);
            if (row1.length > 0) {
                const dcInRow = row1.filter(s => s.type === StitchType.DOUBLE_CROCHET);
                expect(dcInRow.length).toBeGreaterThan(0);
            }
        });

        it('should maintain consistent stitch count across rows', () => {
            const pattern = createBasicSquare({ size: 8, rows: 3 });

            // Each row should have the same number of working stitches
            const rowCounts = [];
            for (let i = 0; i < pattern.graph.getRowCount(); i++) {
                const row = pattern.graph.getRow(i);
                // Filter out turning chains for consistent count
                const workingStitches = row.filter(s => !s.isTurningChain);
                rowCounts.push(workingStitches.length);
            }

            // All working stitch counts should be the same (or within 1 for turning chain adjustments)
            const maxDiff = Math.max(...rowCounts) - Math.min(...rowCounts);
            expect(maxDiff).toBeLessThanOrEqual(1);
        });

        it('should create valid pattern that can be serialized', () => {
            const pattern = createBasicSquare({ size: 5, rows: 3 });
            const json = pattern.toJSON();

            const restored = Pattern.fromJSON(json);
            expect(restored.graph.size).toBe(pattern.graph.size);
        });
    });

    describe('createTriangle', () => {
        it('should return a Pattern instance', () => {
            const pattern = createTriangle();

            expect(pattern).toBeInstanceOf(Pattern);
        });

        it('should set pattern name to Triangle', () => {
            const pattern = createTriangle();

            expect(pattern.metadata.name).toBe('Triangle');
        });

        it('should create pattern in flat mode', () => {
            const pattern = createTriangle();

            expect(pattern.mode).toBe('flat');
        });

        it('should align working direction with last row', () => {
            const pattern = createTriangle({ direction: 'top-down', baseWidth: 5, rows: 4 });

            expect(pattern.currentRow).toBe(3);
            expect(pattern.workingDirection).toBe('right');
        });

        it('should decrease stitch count each row (top-down triangle)', () => {
            const pattern = createTriangle({ direction: 'top-down', baseWidth: 10, rows: 3 });

            const rowCounts = [];
            for (let i = 0; i < pattern.graph.getRowCount(); i++) {
                const row = pattern.graph.getRow(i);
                const workingStitches = row.filter(s => !s.isTurningChain);
                rowCounts.push(workingStitches.length);
            }

            // Each subsequent row should have fewer stitches
            for (let i = 1; i < rowCounts.length; i++) {
                expect(rowCounts[i]).toBeLessThanOrEqual(rowCounts[i - 1]);
            }
        });

        it('should increase stitch count each row (bottom-up triangle)', () => {
            const pattern = createTriangle({ direction: 'bottom-up', rows: 5 });

            const rowCounts = [];
            for (let i = 0; i < pattern.graph.getRowCount(); i++) {
                const row = pattern.graph.getRow(i);
                const workingStitches = row.filter(s => !s.isTurningChain);
                if (workingStitches.length > 0) {
                    rowCounts.push(workingStitches.length);
                }
            }

            // Each subsequent row should have more stitches
            for (let i = 1; i < rowCounts.length; i++) {
                expect(rowCounts[i]).toBeGreaterThanOrEqual(rowCounts[i - 1]);
            }
        });

        it('should accept custom base width', () => {
            const pattern = createTriangle({ baseWidth: 15, direction: 'top-down' });

            const row0 = pattern.graph.getRow(0);
            expect(row0.length).toBe(15);
        });

        it('should accept custom stitch type', () => {
            const pattern = createTriangle({
                stitchType: StitchType.HALF_DOUBLE_CROCHET,
                rows: 2
            });

            const stitches = Array.from(pattern.graph.nodes.values());
            const hdcStitches = stitches.filter(s => s.type === StitchType.HALF_DOUBLE_CROCHET);
            expect(hdcStitches.length).toBeGreaterThan(0);
        });

        it('should create valid pattern that can be serialized', () => {
            const pattern = createTriangle({ baseWidth: 8, rows: 4 });
            const json = pattern.toJSON();

            const restored = Pattern.fromJSON(json);
            expect(restored.graph.size).toBe(pattern.graph.size);
        });
    });

    describe('PatternTemplates object', () => {
        it('should have create method for each template type', () => {
            expect(PatternTemplates.grannySquare).toBeDefined();
            expect(PatternTemplates.basicCircle).toBeDefined();
            expect(PatternTemplates.basicSquare).toBeDefined();
            expect(PatternTemplates.triangle).toBeDefined();
        });

        it('should create patterns via PatternTemplates object', () => {
            const grannySquare = PatternTemplates.grannySquare();
            const circle = PatternTemplates.basicCircle();
            const square = PatternTemplates.basicSquare();
            const triangle = PatternTemplates.triangle();

            expect(grannySquare).toBeInstanceOf(Pattern);
            expect(circle).toBeInstanceOf(Pattern);
            expect(square).toBeInstanceOf(Pattern);
            expect(triangle).toBeInstanceOf(Pattern);
        });
    });
});
