/**
 * ShapingGuide.js - Shaping calculations and suggestions
 *
 * Provides:
 * - Increase/decrease calculations for various shapes
 * - Shaping suggestions based on target shape
 * - Pattern validation against expected shaping
 */

/**
 * Shape types for shaping calculations
 */
export const ShapeType = {
    FLAT_CIRCLE: 'flat_circle',
    TUBE: 'tube',
    SPHERE: 'sphere',
    CONE: 'cone',
    FLAT_SQUARE: 'flat_square'
};

/**
 * Calculate increases needed for a flat circle at a given round
 * @param {number} roundNumber - Round number (1-indexed)
 * @param {number} baseStitches - Starting stitch count (usually 6 or 8)
 * @returns {Object} Increase information
 */
export function calculateCircleIncreases(roundNumber, baseStitches = 6) {
    // For a flat circle:
    // Round 1: baseStitches
    // Round 2: baseStitches * 2
    // Round 3: baseStitches * 3
    // etc.

    const totalStitches = baseStitches * roundNumber;
    const prevStitches = baseStitches * (roundNumber - 1);
    const increasesNeeded = roundNumber === 1 ? 0 : baseStitches;

    // Calculate positions for increases (evenly spaced)
    const increases = [];
    if (increasesNeeded > 0) {
        const spacing = Math.floor(prevStitches / increasesNeeded);
        for (let i = 0; i < increasesNeeded; i++) {
            increases.push(i * spacing + (spacing - 1));
        }
    }

    // Generate instruction
    let instruction = '';
    if (roundNumber === 1) {
        instruction = `Work ${baseStitches} sc into magic ring`;
    } else if (roundNumber === 2) {
        instruction = `Inc in each st around (${totalStitches} sts)`;
    } else {
        const scBetween = roundNumber - 2;
        instruction = `*Sc ${scBetween}, inc* repeat around (${totalStitches} sts)`;
    }

    return {
        roundNumber,
        totalStitches,
        increases,
        increaseCount: increasesNeeded,
        increaseSpacing: roundNumber > 1 ? roundNumber - 1 : 0,
        instruction
    };
}

/**
 * Calculate decreases to reach a target stitch count
 * @param {number} currentStitches - Current stitch count
 * @param {number} targetStitches - Target stitch count
 * @returns {Object} Decrease information
 */
export function calculateDecreases(currentStitches, targetStitches) {
    const decreases = Math.max(0, currentStitches - targetStitches);

    if (decreases === 0) {
        return {
            decreases: 0,
            positions: [],
            spacing: 0,
            targetStitches,
            instruction: 'No decreases needed'
        };
    }

    // Calculate evenly spaced positions
    const spacing = decreases > 0 ? Math.floor(currentStitches / decreases) : 0;
    const positions = [];

    for (let i = 0; i < decreases; i++) {
        positions.push(i * spacing);
    }

    // Generate instruction
    let instruction = '';
    if (spacing === 2) {
        instruction = `*Dec* repeat around (${targetStitches} sts)`;
    } else if (spacing > 2) {
        const scBetween = spacing - 2;
        instruction = `*Sc ${scBetween}, dec* repeat around (${targetStitches} sts)`;
    } else {
        instruction = `Dec ${decreases} times evenly around (${targetStitches} sts)`;
    }

    return {
        decreases,
        positions,
        spacing,
        targetStitches,
        instruction
    };
}

/**
 * Suggest shaping for a pattern based on target shape
 * @param {Pattern} pattern - The pattern to analyze
 * @param {string} shapeType - Target shape type
 * @returns {Object} Shaping suggestion
 */
export function suggestShaping(pattern, shapeType) {
    const currentRow = pattern.currentRow;
    const currentRowStitches = pattern.graph.getRow(currentRow);
    const stitchCount = currentRowStitches.length || 6; // Default to 6 if empty

    switch (shapeType) {
        case ShapeType.FLAT_CIRCLE:
            return suggestFlatCircleShaping(pattern, currentRow, stitchCount);

        case ShapeType.TUBE:
            return {
                type: 'none',
                count: 0,
                positions: [],
                instruction: `Continue with ${stitchCount} sc around`
            };

        case ShapeType.CONE:
            return suggestConeShaping(pattern, currentRow, stitchCount);

        case ShapeType.SPHERE:
            return suggestSphereShaping(pattern, currentRow, stitchCount);

        case ShapeType.FLAT_SQUARE:
            return {
                type: 'none',
                count: 0,
                positions: [],
                instruction: `Continue with ${stitchCount} stitches across`
            };

        default:
            return {
                type: 'none',
                count: 0,
                positions: [],
                instruction: 'Unknown shape type'
            };
    }
}

/**
 * Suggest shaping for a flat circle
 */
function suggestFlatCircleShaping(pattern, currentRow, stitchCount) {
    // Estimate base stitches from current state
    const baseStitches = currentRow > 0 ? Math.round(stitchCount / currentRow) : 6;
    const nextRound = currentRow + 2; // +1 for 0-index, +1 for next

    const increaseInfo = calculateCircleIncreases(nextRound, baseStitches);

    // Calculate positions relative to current stitch count
    const positions = [];
    const spacing = Math.max(1, Math.floor(stitchCount / baseStitches));
    for (let i = 0; i < baseStitches; i++) {
        positions.push(i * spacing);
    }

    return {
        type: 'increase',
        count: baseStitches,
        positions,
        instruction: increaseInfo.instruction
    };
}

/**
 * Suggest shaping for a cone (gradual decrease)
 */
function suggestConeShaping(pattern, currentRow, stitchCount) {
    // Cone typically decreases by 6 per round (or proportional to base)
    const decreaseCount = Math.max(1, Math.round(stitchCount / 4));
    const targetStitches = Math.max(0, stitchCount - decreaseCount);

    const decreaseInfo = calculateDecreases(stitchCount, targetStitches);

    return {
        type: 'decrease',
        count: decreaseCount,
        positions: decreaseInfo.positions,
        instruction: decreaseInfo.instruction
    };
}

/**
 * Suggest shaping for a sphere (increase then decrease)
 */
function suggestSphereShaping(pattern, currentRow, stitchCount) {
    // Sphere: first half increases, second half decreases
    // Estimate midpoint based on maximum expected diameter
    const estimatedMidpoint = 5; // Typical sphere has ~10 rounds

    if (currentRow < estimatedMidpoint) {
        return suggestFlatCircleShaping(pattern, currentRow, stitchCount);
    } else {
        return suggestConeShaping(pattern, currentRow, stitchCount);
    }
}

/**
 * Get shaping information for a specific row
 * @param {number} rowNumber - Row number (1-indexed)
 * @param {string} shapeType - Target shape type
 * @param {Object} options - Additional options
 * @returns {Object} Shaping info for the row
 */
export function getShapingForRow(rowNumber, shapeType, options = {}) {
    const {
        startingStitches = 6,
        stitchesPerRow = 20,
        maxRows = 10
    } = options;

    switch (shapeType) {
        case ShapeType.FLAT_CIRCLE: {
            const info = calculateCircleIncreases(rowNumber, startingStitches);
            return {
                stitchCount: info.totalStitches,
                increases: info.increaseCount,
                decreases: 0,
                instruction: info.instruction
            };
        }

        case ShapeType.TUBE:
            return {
                stitchCount: startingStitches,
                increases: 0,
                decreases: 0,
                instruction: `Sc ${startingStitches} around`
            };

        case ShapeType.SPHERE: {
            const midpoint = Math.ceil(maxRows / 2);
            const maxStitches = startingStitches * midpoint;

            if (rowNumber <= midpoint) {
                // Increasing phase
                const info = calculateCircleIncreases(rowNumber, startingStitches);
                return {
                    stitchCount: info.totalStitches,
                    increases: info.increaseCount,
                    decreases: 0,
                    instruction: info.instruction
                };
            } else {
                // Decreasing phase
                const rowsFromEnd = maxRows - rowNumber + 1;
                const targetStitches = startingStitches * rowsFromEnd;
                const prevStitches = startingStitches * (rowsFromEnd + 1);
                const decreaseInfo = calculateDecreases(prevStitches, targetStitches);

                return {
                    stitchCount: targetStitches,
                    increases: 0,
                    decreases: decreaseInfo.decreases,
                    instruction: decreaseInfo.instruction
                };
            }
        }

        case ShapeType.CONE: {
            // Cone decreases gradually from starting stitches
            const decreasePerRow = Math.max(1, Math.round(startingStitches / maxRows));
            const stitchCount = Math.max(1, startingStitches - (rowNumber - 1) * decreasePerRow);
            const prevStitches = rowNumber > 1 ? stitchCount + decreasePerRow : startingStitches;

            return {
                stitchCount,
                increases: 0,
                decreases: rowNumber > 1 ? decreasePerRow : 0,
                instruction: rowNumber > 1
                    ? `Dec ${decreasePerRow} evenly (${stitchCount} sts)`
                    : `Sc ${stitchCount} around`
            };
        }

        case ShapeType.FLAT_SQUARE:
            return {
                stitchCount: stitchesPerRow,
                increases: 0,
                decreases: 0,
                instruction: `Sc ${stitchesPerRow} across`
            };

        default:
            return {
                stitchCount: startingStitches,
                increases: 0,
                decreases: 0,
                instruction: 'Unknown shape'
            };
    }
}

/**
 * ShapingGuide class for pattern-specific shaping assistance
 */
export class ShapingGuide {
    /**
     * Create a shaping guide for a pattern
     * @param {Pattern} pattern - The pattern to guide
     */
    constructor(pattern) {
        this.pattern = pattern;
        this.targetShape = null;
        this.options = {};
    }

    /**
     * Set the target shape for shaping suggestions
     * @param {string} shape - Shape type from ShapeType enum
     * @param {Object} options - Shape-specific options
     */
    setTargetShape(shape, options = {}) {
        this.targetShape = shape;
        this.options = options;
    }

    /**
     * Get suggestion for the next row
     * @returns {Object} Shaping suggestion
     */
    getNextRowSuggestion() {
        if (!this.targetShape) {
            return {
                type: 'none',
                count: 0,
                positions: [],
                instruction: 'No target shape set'
            };
        }

        return suggestShaping(this.pattern, this.targetShape);
    }

    /**
     * Analyze the current row
     * @returns {Object} Current row analysis
     */
    getCurrentRowAnalysis() {
        const currentRow = this.pattern.currentRow;
        const rowStitches = this.pattern.graph.getRow(currentRow);

        // Count increases and decreases in current row
        let increases = 0;
        let decreases = 0;

        rowStitches.forEach(stitch => {
            if (stitch.metadata?.isIncrease) {
                increases++;
            }
            if (stitch.metadata?.isDecrease) {
                decreases++;
            }
            // Check connections for implicit increases/decreases
            if (stitch.connections.below.length === 0 && currentRow > 0) {
                increases++; // Stitch not attached = increase
            }
            if (stitch.connections.below.length > 1) {
                decreases++; // Multiple connections below = decrease
            }
        });

        return {
            rowNumber: currentRow,
            stitchCount: rowStitches.length,
            increases,
            decreases,
            netChange: increases - decreases
        };
    }

    /**
     * Validate current shaping against target shape
     * @returns {Object} Validation result
     */
    validateShaping() {
        if (!this.targetShape) {
            return {
                isValid: true,
                warnings: [],
                errors: []
            };
        }

        const warnings = [];
        const errors = [];
        const analysis = this.getCurrentRowAnalysis();

        // Get expected shaping for this row
        const expected = getShapingForRow(
            analysis.rowNumber + 1,
            this.targetShape,
            {
                startingStitches: this.options.startingStitches || 6,
                maxRows: this.options.maxRows || 10,
                stitchesPerRow: this.options.stitchesPerRow || analysis.stitchCount
            }
        );

        // Compare actual vs expected
        if (this.targetShape === ShapeType.TUBE) {
            // Tube should have constant stitch count
            if (analysis.netChange !== 0) {
                warnings.push(
                    `Row ${analysis.rowNumber + 1} has ${analysis.netChange > 0 ? 'increases' : 'decreases'} ` +
                    `but tube should maintain constant stitch count`
                );
            }
        } else if (this.targetShape === ShapeType.FLAT_CIRCLE) {
            // Circle should increase by baseStitches each round
            const baseStitches = this.options.startingStitches || 6;
            if (analysis.increases < baseStitches - 1 && analysis.rowNumber > 0) {
                warnings.push(
                    `Row ${analysis.rowNumber + 1} may not have enough increases for a flat circle. ` +
                    `Expected ~${baseStitches} increases.`
                );
            }
        }

        // Stitch count validation
        const tolerance = 2; // Allow some variance
        if (Math.abs(analysis.stitchCount - expected.stitchCount) > tolerance) {
            warnings.push(
                `Stitch count (${analysis.stitchCount}) differs from expected (${expected.stitchCount})`
            );
        }

        return {
            isValid: errors.length === 0,
            warnings,
            errors,
            expected,
            actual: analysis
        };
    }

    /**
     * Get corrective suggestion if pattern deviates
     * @returns {Object} Corrective suggestion
     */
    getCorrectiveSuggestion() {
        const validation = this.validateShaping();

        if (validation.isValid && validation.warnings.length === 0) {
            return {
                needed: false,
                message: 'Pattern is on track',
                instruction: this.getNextRowSuggestion().instruction
            };
        }

        const analysis = validation.actual;
        const expected = validation.expected;

        if (!expected) {
            return {
                needed: false,
                message: 'Continue as planned',
                instruction: 'Follow pattern instructions'
            };
        }

        const diff = expected.stitchCount - analysis.stitchCount;

        if (diff > 0) {
            return {
                needed: true,
                type: 'increase',
                count: diff,
                message: `Need to add ${diff} more stitches to match target shape`,
                instruction: `Add ${diff} increases in next row`
            };
        } else if (diff < 0) {
            return {
                needed: true,
                type: 'decrease',
                count: Math.abs(diff),
                message: `Need to remove ${Math.abs(diff)} stitches to match target shape`,
                instruction: `Add ${Math.abs(diff)} decreases in next row`
            };
        }

        return {
            needed: false,
            message: 'Pattern is on track',
            instruction: this.getNextRowSuggestion().instruction
        };
    }
}

export default ShapingGuide;
