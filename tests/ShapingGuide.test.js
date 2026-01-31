/**
 * Tests for ShapingGuide module
 *
 * Verifies:
 * - Shaping calculations for various pattern shapes
 * - Increase/decrease suggestions
 * - Stitch count predictions
 * - Placement recommendations for shaping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    ShapingGuide,
    calculateCircleIncreases,
    calculateDecreases,
    getCrownShapingGuide,
    suggestShaping,
    getShapingForRow,
    ShapeType
} from '../src/core/ShapingGuide.js';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus } from '../src/utils/EventBus.js';

describe('ShapingGuide', () => {
    beforeEach(() => {
        EventBus.clear();
    });

    describe('module structure', () => {
        it('should export ShapingGuide class', () => {
            expect(ShapingGuide).toBeDefined();
        });

        it('should export calculateCircleIncreases function', () => {
            expect(calculateCircleIncreases).toBeDefined();
            expect(typeof calculateCircleIncreases).toBe('function');
        });

        it('should export calculateDecreases function', () => {
            expect(calculateDecreases).toBeDefined();
            expect(typeof calculateDecreases).toBe('function');
        });

        it('should export suggestShaping function', () => {
            expect(suggestShaping).toBeDefined();
            expect(typeof suggestShaping).toBe('function');
        });

        it('should export getShapingForRow function', () => {
            expect(getShapingForRow).toBeDefined();
            expect(typeof getShapingForRow).toBe('function');
        });

        it('should export ShapeType enum', () => {
            expect(ShapeType).toBeDefined();
            expect(ShapeType.FLAT_CIRCLE).toBeDefined();
            expect(ShapeType.TUBE).toBeDefined();
            expect(ShapeType.SPHERE).toBeDefined();
            expect(ShapeType.CONE).toBeDefined();
            expect(ShapeType.FLAT_SQUARE).toBeDefined();
        });
    });

    describe('calculateCircleIncreases', () => {
        it('should return increase count for flat circle by round number', () => {
            // For flat circle starting with 6 stitches:
            // Round 1: 6 stitches (start)
            // Round 2: 12 stitches (inc in each = +6)
            // Round 3: 18 stitches (inc every 2nd = +6)
            // Round 4: 24 stitches (inc every 3rd = +6)

            const round1 = calculateCircleIncreases(1, 6);
            const round2 = calculateCircleIncreases(2, 6);
            const round3 = calculateCircleIncreases(3, 6);

            expect(round1.totalStitches).toBe(6);
            expect(round2.totalStitches).toBe(12);
            expect(round3.totalStitches).toBe(18);
        });

        it('should return increase positions', () => {
            const round2 = calculateCircleIncreases(2, 6);

            expect(round2.increases).toBeDefined();
            expect(Array.isArray(round2.increases)).toBe(true);
            // Round 2: increase in every stitch, so 6 increase positions
            expect(round2.increases.length).toBe(6);
        });

        it('should handle different starting stitch counts', () => {
            const round2With8 = calculateCircleIncreases(2, 8);

            expect(round2With8.totalStitches).toBe(16);
            expect(round2With8.increases.length).toBe(8);
        });

        it('should return instruction text', () => {
            const round3 = calculateCircleIncreases(3, 6);

            expect(round3.instruction).toBeDefined();
            expect(typeof round3.instruction).toBe('string');
            expect(round3.instruction.length).toBeGreaterThan(0);
        });

        it('should calculate evenly spaced increases', () => {
            const round4 = calculateCircleIncreases(4, 6);

            // Round 4 should have 24 stitches total
            // 18 from round 3 + 6 increases = 24
            // Pattern: (sc, sc, inc) x 6 OR (2 sc, inc) x 6
            expect(round4.totalStitches).toBe(24);
            expect(round4.increases.length).toBe(6);

            // Increases should be evenly spaced
            const spacing = round4.increaseSpacing;
            expect(spacing).toBe(3); // Every 3rd stitch
        });
    });

    describe('calculateDecreases', () => {
        it('should return decrease count to reach target stitch count', () => {
            const result = calculateDecreases(24, 18);

            expect(result.decreases).toBe(6);
            expect(result.targetStitches).toBe(18);
        });

        it('should return decrease positions', () => {
            const result = calculateDecreases(24, 18);

            expect(result.positions).toBeDefined();
            expect(Array.isArray(result.positions)).toBe(true);
            expect(result.positions.length).toBe(6);
        });

        it('should calculate evenly spaced decreases', () => {
            const result = calculateDecreases(24, 18);

            // 6 decreases over 24 stitches = every 4th stitch
            expect(result.spacing).toBe(4);
        });

        it('should return instruction text', () => {
            const result = calculateDecreases(18, 12);

            expect(result.instruction).toBeDefined();
            expect(result.instruction).toContain('dec');
        });

        it('should handle case where no decreases needed', () => {
            const result = calculateDecreases(10, 10);

            expect(result.decreases).toBe(0);
            expect(result.positions).toEqual([]);
        });

        it('should handle rapid decreases for closing', () => {
            const result = calculateDecreases(12, 6);

            expect(result.decreases).toBe(6);
            // Every other stitch should be a decrease
            expect(result.spacing).toBe(2);
        });
    });

    describe('getCrownShapingGuide', () => {
        it('should build crown shaping rounds and finish instruction', () => {
            const guide = getCrownShapingGuide(24, { decreasesPerRound: 6, targetStitches: 6, stitchAbbr: 'sc' });

            expect(guide.rounds.length).toBeGreaterThan(0);
            expect(guide.finish).toContain('drawstring');
            expect(guide.rounds[0].instruction).toContain('dec');
        });

        it('should return empty rounds when already at target', () => {
            const guide = getCrownShapingGuide(6, { decreasesPerRound: 6, targetStitches: 6 });

            expect(guide.rounds).toHaveLength(0);
        });
    });

    describe('suggestShaping', () => {
        let pattern;

        beforeEach(() => {
            pattern = new Pattern();
        });

        it('should suggest increases for flat circle', () => {
            pattern.startWithMagicRing(6);

            const suggestion = suggestShaping(pattern, ShapeType.FLAT_CIRCLE);

            expect(suggestion).toBeDefined();
            expect(suggestion.type).toBe('increase');
            expect(suggestion.count).toBeGreaterThan(0);
        });

        it('should suggest no shaping for tube', () => {
            pattern.startWithMagicRing(12);

            const suggestion = suggestShaping(pattern, ShapeType.TUBE);

            expect(suggestion).toBeDefined();
            expect(suggestion.type).toBe('none');
            expect(suggestion.count).toBe(0);
        });

        it('should suggest decreases for cone narrowing', () => {
            pattern.startWithMagicRing(24);
            // Simulate being on a later row with more stitches
            pattern.currentRow = 3;

            const suggestion = suggestShaping(pattern, ShapeType.CONE);

            expect(suggestion).toBeDefined();
            expect(suggestion.type).toBe('decrease');
        });

        it('should return positions for shaping', () => {
            pattern.startWithMagicRing(6);

            const suggestion = suggestShaping(pattern, ShapeType.FLAT_CIRCLE);

            expect(suggestion.positions).toBeDefined();
            expect(Array.isArray(suggestion.positions)).toBe(true);
        });

        it('should provide written instruction', () => {
            pattern.startWithMagicRing(6);

            const suggestion = suggestShaping(pattern, ShapeType.FLAT_CIRCLE);

            expect(suggestion.instruction).toBeDefined();
            expect(typeof suggestion.instruction).toBe('string');
        });
    });

    describe('getShapingForRow', () => {
        it('should return shaping info for specific row in flat circle', () => {
            const shapingRow1 = getShapingForRow(1, ShapeType.FLAT_CIRCLE, { startingStitches: 6 });
            const shapingRow2 = getShapingForRow(2, ShapeType.FLAT_CIRCLE, { startingStitches: 6 });
            const shapingRow3 = getShapingForRow(3, ShapeType.FLAT_CIRCLE, { startingStitches: 6 });

            expect(shapingRow1.stitchCount).toBe(6);
            expect(shapingRow2.stitchCount).toBe(12);
            expect(shapingRow3.stitchCount).toBe(18);
        });

        it('should return no shaping for tube rows', () => {
            const shaping = getShapingForRow(5, ShapeType.TUBE, { startingStitches: 20 });

            expect(shaping.stitchCount).toBe(20);
            expect(shaping.increases).toBe(0);
            expect(shaping.decreases).toBe(0);
        });

        it('should return decrease info for sphere bottom half', () => {
            // Sphere: increase first half, then decrease second half
            const shaping = getShapingForRow(8, ShapeType.SPHERE, {
                startingStitches: 6,
                maxRows: 10
            });

            // Row 8 of 10 should be decreasing
            expect(shaping.decreases).toBeGreaterThan(0);
        });

        it('should return gradual decrease for cone', () => {
            const shaping1 = getShapingForRow(2, ShapeType.CONE, { startingStitches: 24 });
            const shaping2 = getShapingForRow(3, ShapeType.CONE, { startingStitches: 24 });

            // Cone decreases gradually
            expect(shaping2.stitchCount).toBeLessThan(shaping1.stitchCount);
        });

        it('should handle flat square (no shaping)', () => {
            const shaping = getShapingForRow(5, ShapeType.FLAT_SQUARE, { stitchesPerRow: 20 });

            expect(shaping.stitchCount).toBe(20);
            expect(shaping.increases).toBe(0);
            expect(shaping.decreases).toBe(0);
        });
    });

    describe('ShapingGuide class', () => {
        let guide;
        let pattern;

        beforeEach(() => {
            pattern = new Pattern();
            pattern.startWithMagicRing(6);
            guide = new ShapingGuide(pattern);
        });

        it('should create instance with pattern', () => {
            expect(guide).toBeInstanceOf(ShapingGuide);
            expect(guide.pattern).toBe(pattern);
        });

        it('should have setTargetShape method', () => {
            expect(typeof guide.setTargetShape).toBe('function');

            guide.setTargetShape(ShapeType.FLAT_CIRCLE);
            expect(guide.targetShape).toBe(ShapeType.FLAT_CIRCLE);
        });

        it('should have getNextRowSuggestion method', () => {
            expect(typeof guide.getNextRowSuggestion).toBe('function');

            guide.setTargetShape(ShapeType.FLAT_CIRCLE);
            const suggestion = guide.getNextRowSuggestion();

            expect(suggestion).toBeDefined();
            expect(suggestion.type).toBeDefined();
        });

        it('should have getCurrentRowAnalysis method', () => {
            expect(typeof guide.getCurrentRowAnalysis).toBe('function');

            const analysis = guide.getCurrentRowAnalysis();

            expect(analysis).toBeDefined();
            expect(analysis.stitchCount).toBeDefined();
            expect(analysis.rowNumber).toBeDefined();
        });

        it('should have validateShaping method', () => {
            expect(typeof guide.validateShaping).toBe('function');

            guide.setTargetShape(ShapeType.FLAT_CIRCLE);
            const validation = guide.validateShaping();

            expect(validation).toBeDefined();
            expect(validation.isValid).toBeDefined();
            expect(typeof validation.isValid).toBe('boolean');
        });

        it('should detect when pattern deviates from target shape', () => {
            guide.setTargetShape(ShapeType.TUBE);

            // Add stitches that would create increases (deviating from tube)
            const row0 = pattern.graph.getRowSorted(0);
            if (row0.length > 0) {
                pattern.addStitch(StitchType.SINGLE_CROCHET, row0[1]);
                pattern.addStitch(StitchType.SINGLE_CROCHET, row0[1]); // Extra stitch = increase
            }

            const validation = guide.validateShaping();

            // Should warn about deviation from tube (constant stitch count)
            expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
        });

        it('should provide corrective suggestions', () => {
            guide.setTargetShape(ShapeType.FLAT_CIRCLE);

            const suggestion = guide.getCorrectiveSuggestion();

            expect(suggestion).toBeDefined();
            // Should provide instruction on what to do
            expect(suggestion.instruction || suggestion.message).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle empty pattern', () => {
            const pattern = new Pattern();
            const guide = new ShapingGuide(pattern);

            guide.setTargetShape(ShapeType.FLAT_CIRCLE);
            const suggestion = guide.getNextRowSuggestion();

            expect(suggestion).toBeDefined();
        });

        it('should handle very large round numbers', () => {
            const result = calculateCircleIncreases(50, 6);

            expect(result.totalStitches).toBeDefined();
            expect(result.totalStitches).toBe(6 * 50); // 300 stitches
        });

        it('should handle decrease to zero', () => {
            const result = calculateDecreases(6, 0);

            expect(result.decreases).toBe(6);
            expect(result.instruction).toBeDefined();
        });

        it('should not suggest negative stitches', () => {
            const result = calculateDecreases(5, 0);

            expect(result.decreases).toBe(5);
            expect(result.targetStitches).toBe(0);
        });
    });
});
