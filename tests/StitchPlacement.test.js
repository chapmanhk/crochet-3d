/**
 * Tests for StitchPlacement helpers
 */

import { describe, it, expect } from 'vitest';
import {
    calculateFlatPosition,
    findPreviousInRow,
    getNextColumn
} from '../src/core/StitchPlacement.js';

describe('StitchPlacement', () => {
    describe('getNextColumn', () => {
        it('should return 0 for empty rows', () => {
            expect(getNextColumn([], 'right')).toBe(0);
        });

        it('should return max + 1 when working right', () => {
            const row = [{ column: 2 }, { column: -1 }, { column: 0 }];
            expect(getNextColumn(row, 'right')).toBe(3);
        });

        it('should return min - 1 when working left', () => {
            const row = [{ column: 2 }, { column: -1 }, { column: 0 }];
            expect(getNextColumn(row, 'left')).toBe(-2);
        });
    });

    describe('findPreviousInRow', () => {
        it('should find previous stitch when working right', () => {
            const row = [{ column: 0 }, { column: 2 }, { column: 1 }];
            const prev = findPreviousInRow(row, 2, 'right');
            expect(prev.column).toBe(1);
        });

        it('should find previous stitch when working left', () => {
            const row = [{ column: 0 }, { column: 2 }, { column: 1 }];
            const prev = findPreviousInRow(row, 0, 'left');
            expect(prev.column).toBe(1);
        });
    });

    describe('calculateFlatPosition', () => {
        it('should use rowBaseY when no attachment', () => {
            const rowStitches = [
                { position: { z: 5 }, column: 0 }
            ];
            const position = calculateFlatPosition({
                rowStitches,
                attachTo: null,
                column: 2,
                row: 1,
                width: 1,
                effectiveWidth: 1,
                height: 1,
                workingDirection: 'right',
                rowBaseY: 2
            });

            expect(position.x).toBe(2);
            expect(position.y).toBe(2);
            expect(position.z).toBe(5);
        });

        it('should place to the right of last stitch when working right', () => {
            const rowStitches = [
                { column: 0, position: { x: 0, y: 0, z: 0 }, width: 1 },
                { column: 1, position: { x: 1, y: 0, z: 0 }, width: 1 }
            ];
            const attachTo = { position: { x: 0, y: 0, z: 7 }, height: 1 };
            const position = calculateFlatPosition({
                rowStitches,
                attachTo,
                column: 2,
                row: 1,
                width: 1,
                effectiveWidth: 1,
                height: 1,
                workingDirection: 'right'
            });

            expect(position.x).toBe(2);
            expect(position.z).toBe(7);
        });
    });
});
