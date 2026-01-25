import { StitchType, getStitchDefinition } from './StitchTypes.js';

/**
 * StitchValidator - Validates stitch placements and pattern construction
 *
 * Checks for:
 * - Valid stitch type for position
 * - Correct connection counts
 * - Pattern consistency warnings
 */

export class StitchValidator {
    /**
     * Validate if a stitch can be placed at a given attachment point
     */
    static canPlaceStitch(stitchType, attachPoint, pattern) {
        const result = {
            valid: true,
            warnings: [],
            errors: []
        };

        if (!attachPoint || !attachPoint.stitch) {
            result.errors.push('No attachment point specified');
            result.valid = false;
            return result;
        }

        const def = getStitchDefinition(stitchType);
        if (!def) {
            result.errors.push(`Unknown stitch type: ${stitchType}`);
            result.valid = false;
            return result;
        }

        const attachStitch = attachPoint.stitch;

        // Check if attachment point has available connections
        if (attachStitch.connections.above.length >= attachStitch.definition.connectionsOut) {
            result.errors.push('Attachment point has no available connections');
            result.valid = false;
            return result;
        }

        // Validate decrease requires two stitches below
        if (stitchType === StitchType.DECREASE) {
            const row = attachStitch.row;
            const rowStitches = pattern.graph.getRowSorted(row);
            const attachIndex = rowStitches.indexOf(attachStitch);

            if (attachIndex === -1 || attachIndex >= rowStitches.length - 1) {
                result.errors.push('Decrease requires two adjacent stitches');
                result.valid = false;
                return result;
            }

            const nextStitch = rowStitches[attachIndex + 1];
            if (nextStitch.connections.above.length > 0) {
                result.errors.push('Second stitch for decrease already has a connection');
                result.valid = false;
                return result;
            }
        }

        // Warnings for unusual patterns

        // Chain stitch after foundation row is unusual
        if (stitchType === StitchType.CHAIN && attachStitch.row > 0) {
            result.warnings.push('Chain stitches are typically only used in foundation row');
        }

        // Tall stitches on row 1 may cause tension issues
        if (attachStitch.row === 0) {
            const tallStitches = [StitchType.DOUBLE_CROCHET, StitchType.TRIPLE_CROCHET];
            if (tallStitches.includes(stitchType)) {
                result.warnings.push('Tall stitches on first row may cause tension issues');
            }
        }

        // Check for stitch count consistency
        const currentRowCount = pattern.graph.getRow(pattern.currentRow).length;
        const prevRowCount = pattern.graph.getRow(pattern.currentRow - 1).length;

        if (currentRowCount > prevRowCount && stitchType !== StitchType.INCREASE) {
            result.warnings.push('Row has more stitches than previous - consider using increases');
        }

        return result;
    }

    /**
     * Validate entire pattern for consistency
     */
    static validatePattern(pattern) {
        const result = {
            valid: true,
            warnings: [],
            errors: [],
            rowStats: []
        };

        const rowCount = pattern.graph.getRowCount();

        for (let row = 0; row < rowCount; row++) {
            const stitches = pattern.graph.getRow(row);
            const rowResult = {
                row,
                stitchCount: stitches.length,
                warnings: [],
                errors: []
            };

            // Check for disconnected stitches
            stitches.forEach(stitch => {
                if (row > 0 && stitch.connections.below.length === 0) {
                    rowResult.errors.push(`Stitch at column ${stitch.column} has no connection below`);
                }
            });

            // Check row stitch count changes
            if (row > 0) {
                const prevRowCount = pattern.graph.getRow(row - 1).length;
                const diff = stitches.length - prevRowCount;

                if (Math.abs(diff) > 2) {
                    rowResult.warnings.push(
                        `Large stitch count change from row ${row}: ${diff > 0 ? '+' : ''}${diff}`
                    );
                }
            }

            // Count increases and decreases
            const increases = stitches.filter(s => s.type === StitchType.INCREASE).length;
            const decreases = stitches.filter(s => s.type === StitchType.DECREASE).length;

            if (increases > 0 || decreases > 0) {
                rowResult.info = `${increases} inc, ${decreases} dec`;
            }

            result.rowStats.push(rowResult);

            // Aggregate errors and warnings
            if (rowResult.errors.length > 0) {
                result.valid = false;
                result.errors.push(...rowResult.errors.map(e => `Row ${row + 1}: ${e}`));
            }
            result.warnings.push(...rowResult.warnings.map(w => `Row ${row + 1}: ${w}`));
        }

        return result;
    }

    /**
     * Get suggested next stitch type based on pattern context
     */
    static getSuggestedStitchType(pattern, attachPoint) {
        if (!attachPoint) return StitchType.SINGLE_CROCHET;

        const currentRow = pattern.currentRow;
        const prevRow = pattern.graph.getRowSorted(currentRow - 1);
        const currentRowStitches = pattern.graph.getRow(currentRow);

        // First stitch of new row - match dominant type from previous row
        if (currentRowStitches.length === 0 && prevRow.length > 0) {
            const typeCounts = {};
            prevRow.forEach(s => {
                typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
            });

            const dominantType = Object.entries(typeCounts)
                .filter(([type]) => type !== StitchType.CHAIN)
                .sort((a, b) => b[1] - a[1])[0];

            if (dominantType) {
                return dominantType[0];
            }
        }

        // Continue with same type as last stitch in row
        if (currentRowStitches.length > 0) {
            const lastStitch = currentRowStitches[currentRowStitches.length - 1];
            if (lastStitch.type !== StitchType.CHAIN) {
                return lastStitch.type;
            }
        }

        return StitchType.SINGLE_CROCHET;
    }

    /**
     * Check if pattern forms a valid shape
     */
    static analyzeShape(pattern) {
        const rowCounts = [];
        const rowCount = pattern.graph.getRowCount();

        for (let i = 0; i < rowCount; i++) {
            rowCounts.push(pattern.graph.getRow(i).length);
        }

        // Determine shape type
        if (rowCounts.length < 2) {
            return { shape: 'chain', description: 'Foundation chain' };
        }

        const isIncreasing = rowCounts.every((count, i) =>
            i === 0 || count >= rowCounts[i - 1]
        );

        const isDecreasing = rowCounts.every((count, i) =>
            i === 0 || count <= rowCounts[i - 1]
        );

        const isConstant = rowCounts.every(count => count === rowCounts[0]);

        if (isConstant) {
            return { shape: 'rectangle', description: 'Rectangular piece' };
        } else if (isIncreasing) {
            return { shape: 'triangle', description: 'Increasing (triangle/wedge)' };
        } else if (isDecreasing) {
            return { shape: 'inverted-triangle', description: 'Decreasing (inverted triangle)' };
        } else {
            // More complex shape
            const maxRow = Math.max(...rowCounts);
            const maxRowIndex = rowCounts.indexOf(maxRow);

            if (maxRowIndex > 0 && maxRowIndex < rowCounts.length - 1) {
                return { shape: 'diamond', description: 'Diamond/hexagon shape' };
            }

            return { shape: 'irregular', description: 'Irregular shaped piece' };
        }
    }
}
