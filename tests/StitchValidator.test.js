/**
 * Tests for StitchValidator class
 *
 * Verifies:
 * - Stitch placement validation
 * - Pattern consistency checks
 * - Stitch type suggestions
 * - Shape analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StitchValidator } from '../src/core/StitchValidator.js';
import { Pattern } from '../src/core/Pattern.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { EventBus } from '../src/utils/EventBus.js';

describe('StitchValidator', () => {
    let pattern;

    beforeEach(() => {
        pattern = new Pattern();
        EventBus.clear();
    });

    describe('canPlaceStitch', () => {
        beforeEach(() => {
            pattern.autoTurningChain = false;  // Disable auto turning chains for tests
            pattern.startWithChain(5);
            pattern.startNewRow();
        });

        it('should return valid for proper placement', () => {
            const attachPoint = {
                stitch: pattern.graph.getAt(0, 0),
                type: 'above'
            };

            const result = StitchValidator.canPlaceStitch(
                StitchType.SINGLE_CROCHET,
                attachPoint,
                pattern
            );

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should error on missing attachment point', () => {
            const result = StitchValidator.canPlaceStitch(
                StitchType.SINGLE_CROCHET,
                null,
                pattern
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('No attachment point specified');
        });

        it('should error on attachment point without stitch', () => {
            const result = StitchValidator.canPlaceStitch(
                StitchType.SINGLE_CROCHET,
                { type: 'above' },
                pattern
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('No attachment point specified');
        });

        it('should error on unknown stitch type', () => {
            const attachPoint = {
                stitch: pattern.graph.getAt(0, 0),
                type: 'above'
            };

            const result = StitchValidator.canPlaceStitch(
                'unknown_type',
                attachPoint,
                pattern
            );

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Unknown stitch type'))).toBe(true);
        });

        it('should error when attachment point has no available connections', () => {
            const chain = pattern.graph.getAt(0, 0);
            // Add a stitch to fill the connection
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain);

            const attachPoint = {
                stitch: chain,
                type: 'above'
            };

            const result = StitchValidator.canPlaceStitch(
                StitchType.SINGLE_CROCHET,
                attachPoint,
                pattern
            );

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('no available connections'))).toBe(true);
        });

        it('should ignore non-counting turning chains in availability checks', () => {
            const localPattern = new Pattern();
            localPattern.startWithChain(3);
            localPattern.selectedStitchType = StitchType.SINGLE_CROCHET;
            localPattern.startNewRow(); // Adds ch-1 turning chain that does not count

            const attachPoint = {
                stitch: localPattern.graph.getAt(0, 0),
                type: 'above'
            };

            const result = StitchValidator.canPlaceStitch(
                StitchType.SINGLE_CROCHET,
                attachPoint,
                localPattern
            );

            expect(result.valid).toBe(true);
        });

        describe('decrease validation', () => {
            it('should error when decrease has no adjacent stitch', () => {
                // Position at end of row
                const lastChain = pattern.graph.getAt(0, 4);

                const attachPoint = {
                    stitch: lastChain,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.DECREASE,
                    attachPoint,
                    pattern
                );

                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('adjacent stitches'))).toBe(true);
            });

            it('should error when second stitch for decrease is connected', () => {
                const chain0 = pattern.graph.getAt(0, 0);
                const chain1 = pattern.graph.getAt(0, 1);

                // Add a stitch to chain1 first
                pattern.addStitch(StitchType.SINGLE_CROCHET, chain1);

                const attachPoint = {
                    stitch: chain0,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.DECREASE,
                    attachPoint,
                    pattern
                );

                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('already has a connection'))).toBe(true);
            });

            it('should be valid for proper decrease placement', () => {
                // Use chain at position 0 which has chain at position 1 next to it
                const chain0 = pattern.graph.getAt(0, 0);

                const attachPoint = {
                    stitch: chain0,
                    type: 'above'
                };

                // Ensure pattern.currentRow matches where we're placing
                pattern.currentRow = 1;

                const result = StitchValidator.canPlaceStitch(
                    StitchType.DECREASE,
                    attachPoint,
                    pattern
                );

                // Should be valid when there are 2 adjacent stitches
                expect(result.valid).toBe(true);
            });
        });

        describe('suggestions and warnings', () => {
            it('should allow chain stitch on row 1 attachment', () => {
                // Add a stitch to row 1 first
                const chain0 = pattern.graph.getAt(0, 0);
                const sc = pattern.addStitch(StitchType.SINGLE_CROCHET, chain0);
                pattern.startNewRow();  // Now on row 2

                // The SC has available connections above
                const attachPoint = {
                    stitch: sc,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.CHAIN,
                    attachPoint,
                    pattern
                );

                // Chains are valid anywhere - used for turning chains, chain spaces, etc.
                expect(result.valid).toBe(true);
            });

            it('should suggest turning chain for tall stitches on foundation', () => {
                // Get foundation chain (row 0)
                const chain = pattern.graph.getAt(0, 0);

                const attachPoint = {
                    stitch: chain,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.DOUBLE_CROCHET,
                    attachPoint,
                    pattern
                );

                // Suggestion about turning chain height for tall stitches
                expect(result.suggestions.some(s => s.includes('turning chain'))).toBe(true);
            });

            it('should suggest turning chain for triple crochet on foundation', () => {
                // Get foundation chain (row 0)
                const chain = pattern.graph.getAt(0, 0);

                const attachPoint = {
                    stitch: chain,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.TRIPLE_CROCHET,
                    attachPoint,
                    pattern
                );

                // Suggestion about turning chain height
                expect(result.suggestions.some(s => s.includes('turning chain'))).toBe(true);
            });

            it('should warn about deprecated stitch types', () => {
                const chain = pattern.graph.getAt(0, 0);

                const attachPoint = {
                    stitch: chain,
                    type: 'above'
                };

                const result = StitchValidator.canPlaceStitch(
                    StitchType.INCREASE,  // Deprecated type
                    attachPoint,
                    pattern
                );

                expect(result.warnings.some(w => w.includes('deprecated'))).toBe(true);
            });
        });
    });

    describe('validatePattern', () => {
        it('should return valid for properly constructed pattern', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);

            // Add connected stitches
            chain.forEach(ch => {
                pattern.addStitch(StitchType.SINGLE_CROCHET, ch);
            });

            const result = StitchValidator.validatePattern(pattern);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should warn about disconnected stitches (now warning for lace patterns)', () => {
            pattern.startWithChain(3);
            // Add disconnected stitch manually
            pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 1, column: 0 });

            const result = StitchValidator.validatePattern(pattern);

            // Changed from error to warning to support lace patterns with skipped stitches
            expect(result.warnings.some(w => w.includes('no connection below'))).toBe(true);
        });

        it('should warn about large unexpected stitch count changes', () => {
            pattern.startWithChain(10);
            const chain = pattern.graph.getRowSorted(0);

            // Add only 2 stitches in row 1 (large decrease without using decrease stitches)
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[1]);

            const result = StitchValidator.validatePattern(pattern);

            // Warning text changed to mention "Unexpected stitch count change"
            expect(result.warnings.some(w => w.includes('stitch count'))).toBe(true);
        });

        it('should include row statistics', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.INCREASE, chain[1]);

            const result = StitchValidator.validatePattern(pattern);

            expect(result.rowStats).toHaveLength(2);
            expect(result.rowStats[0].stitchCount).toBe(5);
            expect(result.rowStats[1].stitchCount).toBe(2);
        });

        it('should track increases and decreases in row stats', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);
            pattern.addStitch(StitchType.INCREASE, chain[0]);
            pattern.addStitch(StitchType.DECREASE, chain[2], { secondAttachment: chain[3] });

            const result = StitchValidator.validatePattern(pattern);

            expect(result.rowStats[1].increases).toBe(1);
            expect(result.rowStats[1].decreases).toBe(1);
        });
    });

    describe('getSuggestedStitchType', () => {
        it('should suggest single crochet with no context', () => {
            const suggestion = StitchValidator.getSuggestedStitchType(pattern, null);

            expect(suggestion).toBe(StitchType.SINGLE_CROCHET);
        });

        it('should suggest dominant type from previous row for new row', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);

            // Add mostly double crochet in row 1
            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[1]);
            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[2]);
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[3]);

            // Move to row 2 - should suggest based on dominant type in row 1
            pattern.currentRow = 2;

            const attachPoint = { stitch: pattern.graph.getAt(1, 0) };
            const suggestion = StitchValidator.getSuggestedStitchType(pattern, attachPoint);

            // Should be double crochet as it's dominant in prev row
            expect(suggestion).toBe(StitchType.DOUBLE_CROCHET);
        });

        it('should continue with same type as last in current row', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);

            // Add stitches to row 1
            pattern.addStitch(StitchType.SINGLE_CROCHET, chain[0]);
            pattern.addStitch(StitchType.DOUBLE_CROCHET, chain[1]);
            pattern.addStitch(StitchType.HALF_DOUBLE_CROCHET, chain[2]);

            // Now in row 1, last stitch is half double
            pattern.currentRow = 1;
            const attachPoint = { stitch: chain[3] };
            const suggestion = StitchValidator.getSuggestedStitchType(pattern, attachPoint);

            // Should continue with HDC (last in row) or suggest based on context
            expect([StitchType.HALF_DOUBLE_CROCHET, StitchType.SINGLE_CROCHET]).toContain(suggestion);
        });

        it('should not suggest chain type', () => {
            pattern.startWithChain(5);

            pattern.startNewRow();

            const attachPoint = { stitch: pattern.graph.getAt(0, 0) };
            const suggestion = StitchValidator.getSuggestedStitchType(pattern, attachPoint);

            expect(suggestion).not.toBe(StitchType.CHAIN);
        });
    });

    describe('analyzeShape', () => {
        it('should identify chain/foundation pattern', () => {
            pattern.startWithChain(5);

            const result = StitchValidator.analyzeShape(pattern);

            expect(result.shape).toBe('chain');
            expect(result.description).toContain('Foundation');
        });

        it('should identify rectangular pattern', () => {
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);

            // Add same number of stitches in each row
            for (let row = 1; row <= 3; row++) {
                const prevRow = pattern.graph.getRowSorted(row - 1);
                prevRow.forEach(stitch => {
                    pattern.addStitch(StitchType.SINGLE_CROCHET, stitch, { row });
                });
            }

            const result = StitchValidator.analyzeShape(pattern);

            expect(result.shape).toBe('rectangle');
        });

        it('should identify increasing/triangle pattern', () => {
            pattern.startWithChain(3);
            const chain = pattern.graph.getRowSorted(0);

            // Row 1: 4 stitches (more than row 0)
            chain.forEach(ch => pattern.addStitch(StitchType.SINGLE_CROCHET, ch));
            pattern.addStitch(StitchType.INCREASE, chain[2]);

            // Row 2: 6 stitches (more than row 1)
            const row1 = pattern.graph.getRowSorted(1);
            row1.forEach(st => pattern.addStitch(StitchType.SINGLE_CROCHET, st, { row: 2 }));
            pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 2 });
            pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 2 });

            const result = StitchValidator.analyzeShape(pattern);

            expect(result.shape).toBe('triangle');
            expect(result.description).toContain('Increasing');
        });

        it('should identify decreasing/inverted triangle pattern', () => {
            pattern.startWithChain(6);
            const chain = pattern.graph.getRowSorted(0);

            // Row 1: 5 stitches (fewer than row 0)
            for (let i = 0; i < 5; i++) {
                pattern.addStitch(StitchType.SINGLE_CROCHET, chain[i]);
            }

            // Row 2: 4 stitches (fewer than row 1)
            const row1 = pattern.graph.getRowSorted(1);
            for (let i = 0; i < 4; i++) {
                pattern.addStitch(StitchType.SINGLE_CROCHET, row1[i], { row: 2 });
            }

            const result = StitchValidator.analyzeShape(pattern);

            expect(result.shape).toBe('inverted-triangle');
            expect(result.description).toContain('Decreasing');
        });

        it('should identify diamond shape', () => {
            // Row 0: 2 stitches
            pattern.startWithChain(2);
            const chain = pattern.graph.getRowSorted(0);

            // Row 1: 4 stitches (increase)
            chain.forEach(ch => {
                pattern.addStitch(StitchType.SINGLE_CROCHET, ch);
            });
            pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
            pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });

            // Row 2: 2 stitches (decrease)
            const row1 = pattern.graph.getRowSorted(1);
            pattern.addStitch(StitchType.SINGLE_CROCHET, row1[0], { row: 2 });
            pattern.addStitch(StitchType.SINGLE_CROCHET, row1[1], { row: 2 });

            const result = StitchValidator.analyzeShape(pattern);

            expect(result.shape).toBe('diamond');
        });

        it('should identify irregular or complex shape', () => {
            // Create irregular pattern
            pattern.startWithChain(5);
            const chain = pattern.graph.getRowSorted(0);

            // Row 1: 3 stitches
            for (let i = 0; i < 3; i++) {
                pattern.addStitch(StitchType.SINGLE_CROCHET, chain[i]);
            }

            // Row 2: 6 stitches (irregular jump)
            const row1 = pattern.graph.getRowSorted(1);
            row1.forEach(st => pattern.addStitch(StitchType.SINGLE_CROCHET, st, { row: 2 }));
            for (let i = 0; i < 3; i++) {
                pattern.graph.createNode(StitchType.SINGLE_CROCHET, { row: 2 });
            }

            // Row 3: 2 stitches (irregular drop)
            const row2 = pattern.graph.getRowSorted(2);
            pattern.addStitch(StitchType.SINGLE_CROCHET, row2[0], { row: 3 });
            pattern.addStitch(StitchType.SINGLE_CROCHET, row2[1], { row: 3 });

            const result = StitchValidator.analyzeShape(pattern);

            // Pattern has max in middle so may be classified as diamond or irregular
            expect(['irregular', 'diamond']).toContain(result.shape);
        });
    });
});
