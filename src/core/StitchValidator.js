import {
    StitchType,
    StitchModifier,
    getStitchDefinition,
    getTurningChainLength,
    doesTurningChainCount,
    isBasicStitch,
    createsSpace
} from './StitchTypes.js';

/**
 * StitchValidator - Validates stitch placements and pattern construction
 *
 * Checks for:
 * - Valid stitch type for position
 * - Correct connection counts
 * - Pattern consistency warnings
 * - Support for increases, decreases, skipped stitches
 */

export class StitchValidator {
    /**
     * Validate if a stitch can be placed at a given attachment point
     */
    static canPlaceStitch(stitchType, attachPoint, pattern, options = {}) {
        const result = {
            valid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        const modifiers = options.modifiers || [];
        const skipCount = options.skipCount || 0;
        const workIntoSpace = options.workIntoSpace || false;

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

        // Warn about deprecated types
        if (def.deprecated) {
            result.warnings.push(`${def.name} is deprecated. ${def.replacementHint}`);
        }

        const attachStitch = attachPoint.stitch;

        // Check if attachment point has available connections
        const connectionsOut = attachStitch.effectiveConnections?.connectionsOut
            || attachStitch.definition?.connectionsOut || 1;

        const workingConnectionsAbove = attachStitch.connections.above.filter(stitch =>
            !stitch.isTurningChain || stitch.turningChainCountsAsStitch
        );

        if (workingConnectionsAbove.length >= connectionsOut) {
            result.errors.push('Attachment point has no available connections');
            result.valid = false;
            return result;
        }

        // Validate decrease requires multiple stitches below
        const isDecrease = modifiers.includes(StitchModifier.DECREASE) ||
                          modifiers.includes(StitchModifier.DECREASE_3) ||
                          stitchType === StitchType.DECREASE ||
                          stitchType === StitchType.CLUSTER;

        if (isDecrease) {
            const decreaseCount = modifiers.includes(StitchModifier.DECREASE_3) ? 3 :
                                 stitchType === StitchType.CLUSTER ? 3 : 2;
            const row = attachStitch.row;
            const rowStitches = pattern.graph.getRowSorted(row);
            const attachIndex = rowStitches.indexOf(attachStitch);

            if (attachIndex === -1 || attachIndex > rowStitches.length - decreaseCount) {
                result.errors.push(`Decrease requires ${decreaseCount} adjacent stitches`);
                result.valid = false;
                return result;
            }

            // Check that all stitches needed for decrease are available
            for (let i = 1; i < decreaseCount; i++) {
                const nextStitch = rowStitches[attachIndex + i];
                if (!nextStitch) {
                    result.errors.push(`Not enough stitches for ${decreaseCount}-stitch decrease`);
                    result.valid = false;
                    return result;
                }
                const workingAbove = nextStitch.connections.above.filter(stitch =>
                    !stitch.isTurningChain || stitch.turningChainCountsAsStitch
                );
                if (workingAbove.length > 0) {
                    result.errors.push(`Stitch ${i + 1} for decrease already has a connection above`);
                    result.valid = false;
                    return result;
                }
            }
        }

        // Validate skip stitches
        if (skipCount > 0) {
            const row = attachStitch.row;
            const rowStitches = pattern.graph.getRowSorted(row);
            const attachIndex = rowStitches.indexOf(attachStitch);

            // Find actual attachment after skip
            const actualAttachIndex = attachIndex + skipCount;
            if (actualAttachIndex >= rowStitches.length) {
                result.errors.push(`Cannot skip ${skipCount} stitches - not enough stitches in row`);
                result.valid = false;
                return result;
            }
        }

        // Validate working into chain space
        if (workIntoSpace) {
            if (!createsSpace(attachStitch.type)) {
                result.warnings.push('Attachment point does not typically create a chain space');
            }
        }

        // Contextual warnings (not errors)

        // Chain stitch usage - chains are valid in many contexts
        if (stitchType === StitchType.CHAIN) {
            const currentRowStitches = pattern.graph.getRow(pattern.currentRow);
            const isAtRowStart = currentRowStitches.length === 0;

            // Chains at row start are turning chains - this is normal
            if (isAtRowStart && attachStitch.row >= 0) {
                // Suggest using turning chain count based on planned stitch type
                const suggestedStitchType = this.getSuggestedStitchType(pattern, attachPoint);
                const turningChainCount = getTurningChainLength(suggestedStitchType);
                if (turningChainCount > 1) {
                    result.suggestions.push(
                        `Consider ${turningChainCount} chains for turning chain (working ${getStitchDefinition(suggestedStitchType)?.name})`
                    );
                }
            }
        }

        // Post stitches require working around a post from previous row
        if (def.isPostStitch && attachStitch.row < 1) {
            result.errors.push('Post stitches require at least one previous row to work around');
            result.valid = false;
            return result;
        }

        // Spike stitches need rows below to work into
        if (def.isSpikeStitch) {
            const spikeDepth = options.spikeDepth || def.rowsBelow || 1;
            if (attachStitch.row < spikeDepth) {
                result.errors.push(`Spike stitch requires at least ${spikeDepth + 1} rows`);
                result.valid = false;
                return result;
            }
        }

        // Tall stitches on first working row - informational only
        if (attachStitch.row === 0) {
            const tallStitches = [StitchType.DOUBLE_CROCHET, StitchType.TRIPLE_CROCHET];
            if (tallStitches.includes(stitchType)) {
                result.suggestions.push(
                    'Tall stitches on first row: ensure adequate turning chain height'
                );
            }
        }

        // Analyze stitch count changes
        const currentRowCount = pattern.graph.getRow(pattern.currentRow).length;
        const prevRowCount = pattern.graph.getRow(pattern.currentRow - 1).length;

        if (prevRowCount > 0 && currentRowCount >= prevRowCount) {
            const isIncrease = modifiers.includes(StitchModifier.INCREASE) ||
                              modifiers.includes(StitchModifier.INCREASE_3) ||
                              stitchType === StitchType.INCREASE ||
                              stitchType === StitchType.SHELL ||
                              stitchType === StitchType.V_STITCH;

            if (!isIncrease && currentRowCount > prevRowCount) {
                result.warnings.push(
                    'Row exceeds previous row stitch count without explicit increase'
                );
            }
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
            rowStats: [],
            info: {}
        };

        const rowCount = pattern.graph.getRowCount();

        for (let row = 0; row < rowCount; row++) {
            const stitches = pattern.graph.getRowSorted(row);
            const rowResult = {
                row,
                stitchCount: stitches.length,
                warnings: [],
                errors: [],
                increases: 0,
                decreases: 0,
                turningChains: 0,
                skippedStitches: 0
            };

            stitches.forEach((stitch, index) => {
                // Check for disconnected stitches (except foundation and turning chains)
                if (row > 0 &&
                    stitch.connections.below.length === 0 &&
                    !stitch.isTurningChain &&
                    !stitch.workedIntoSpace) {

                    // Allow skipped stitches - they don't need below connections
                    const hasSkippedBefore = index > 0 &&
                        stitches[index - 1].skippedStitches?.length > 0;

                    if (!hasSkippedBefore) {
                        rowResult.warnings.push(
                            `Stitch at column ${stitch.column} has no connection below ` +
                            `(may be intentional for lace/skip pattern)`
                        );
                    }
                }

                // Count increases and decreases (including modifier-based)
                if (stitch.isIncrease) {
                    rowResult.increases++;
                }
                if (stitch.isDecrease) {
                    rowResult.decreases++;
                }
                if (stitch.isTurningChain) {
                    rowResult.turningChains++;
                }
                if (stitch.skippedStitches?.length > 0) {
                    rowResult.skippedStitches += stitch.skippedStitches.length;
                }
            });

            // Check row stitch count changes
            if (row > 0) {
                const prevRowCount = pattern.graph.getRow(row - 1).length;
                const diff = stitches.length - prevRowCount;

                // Account for increases/decreases
                const expectedDiff = rowResult.increases - rowResult.decreases;

                if (Math.abs(diff) > 3 && Math.abs(diff - expectedDiff) > 2) {
                    rowResult.warnings.push(
                        `Unexpected stitch count change: ${diff > 0 ? '+' : ''}${diff} ` +
                        `(expected around ${expectedDiff > 0 ? '+' : ''}${expectedDiff})`
                    );
                }
            }

            // Build info string
            const infoParts = [];
            if (rowResult.increases > 0) infoParts.push(`${rowResult.increases} inc`);
            if (rowResult.decreases > 0) infoParts.push(`${rowResult.decreases} dec`);
            if (rowResult.turningChains > 0) infoParts.push(`${rowResult.turningChains} tch`);
            if (rowResult.skippedStitches > 0) infoParts.push(`${rowResult.skippedStitches} skipped`);

            if (infoParts.length > 0) {
                rowResult.info = infoParts.join(', ');
            }

            result.rowStats.push(rowResult);

            // Aggregate errors and warnings
            if (rowResult.errors.length > 0) {
                result.valid = false;
                result.errors.push(...rowResult.errors.map(e => `Row ${row + 1}: ${e}`));
            }
            result.warnings.push(...rowResult.warnings.map(w => `Row ${row + 1}: ${w}`));
        }

        // Overall pattern info
        result.info = {
            totalStitches: pattern.graph.size,
            rows: rowCount,
            shape: this.analyzeShape(pattern)
        };

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
                // Ignore chains, turning chains, and increases/decreases for counting
                if (s.type !== StitchType.CHAIN &&
                    s.type !== StitchType.INCREASE &&
                    s.type !== StitchType.DECREASE &&
                    !s.isTurningChain) {
                    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
                }
            });

            const dominantType = Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])[0];

            if (dominantType) {
                return dominantType[0];
            }
        }

        // Continue with same type as last working stitch in row
        if (currentRowStitches.length > 0) {
            // Find last non-chain, non-turning-chain stitch
            for (let i = currentRowStitches.length - 1; i >= 0; i--) {
                const stitch = currentRowStitches[i];
                if (stitch.type !== StitchType.CHAIN && !stitch.isTurningChain) {
                    return stitch.type;
                }
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
            const stitches = pattern.graph.getRow(i);
            // Don't count turning chains in stitch count
            const workingStitches = stitches.filter(s => !s.isTurningChain);
            rowCounts.push(workingStitches.length);
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

        const isConstant = rowCounts.every(count =>
            Math.abs(count - rowCounts[0]) <= 1  // Allow for small variations
        );

        if (isConstant) {
            return { shape: 'rectangle', description: 'Rectangular piece' };
        } else if (isIncreasing) {
            return { shape: 'triangle', description: 'Increasing (triangle/wedge)' };
        } else if (isDecreasing) {
            return { shape: 'inverted-triangle', description: 'Decreasing (inverted triangle)' };
        } else {
            // More complex shape
            const maxCount = Math.max(...rowCounts);
            const maxRowIndex = rowCounts.indexOf(maxCount);

            if (maxRowIndex > 0 && maxRowIndex < rowCounts.length - 1) {
                return { shape: 'diamond', description: 'Diamond/hexagon shape' };
            }

            // Check for wave pattern
            let increasing = true;
            let waveCount = 0;
            for (let i = 1; i < rowCounts.length; i++) {
                const changed = rowCounts[i] > rowCounts[i - 1];
                if (changed !== increasing) {
                    waveCount++;
                    increasing = changed;
                }
            }
            if (waveCount >= 2) {
                return { shape: 'wave', description: 'Wave or scallop pattern' };
            }

            return { shape: 'irregular', description: 'Irregular shaped piece' };
        }
    }

    /**
     * Validate turning chain for a given stitch type
     */
    static validateTurningChain(pattern, stitchType) {
        const result = {
            valid: true,
            suggestedChainCount: getTurningChainLength(stitchType),
            countsAsStitch: doesTurningChainCount(stitchType),
            warnings: []
        };

        const currentRowStitches = pattern.graph.getRow(pattern.currentRow);
        const turningChains = currentRowStitches.filter(s => s.isTurningChain);

        if (turningChains.length === 0 && pattern.currentRow > 0 && pattern.mode === 'flat') {
            result.warnings.push('No turning chain at row start - may affect fabric height');
        }

        if (turningChains.length > 0 && turningChains.length !== result.suggestedChainCount) {
            result.warnings.push(
                `Turning chain count (${turningChains.length}) differs from standard ` +
                `(${result.suggestedChainCount}) for ${getStitchDefinition(stitchType)?.name}`
            );
        }

        return result;
    }

    /**
     * Check if a stitch can be skipped
     */
    static canSkipStitch(stitch, pattern) {
        // Can't skip if stitch already has connections above
        if (stitch.connections.above.length > 0) {
            return {
                canSkip: false,
                reason: 'Stitch already has stitches worked into it'
            };
        }

        // Can't skip foundation/first stitch in row
        const rowStitches = pattern.graph.getRowSorted(stitch.row);
        if (rowStitches.indexOf(stitch) === 0) {
            return {
                canSkip: false,
                reason: 'Cannot skip first stitch in row'
            };
        }

        return { canSkip: true };
    }

    /**
     * Get valid stitch types for a given context
     */
    static getValidStitchTypes(pattern, attachPoint) {
        const validTypes = [];
        const allTypes = Object.values(StitchType);

        for (const type of allTypes) {
            const def = getStitchDefinition(type);
            if (!def || def.deprecated) continue;

            const validation = this.canPlaceStitch(type, attachPoint, pattern);
            if (validation.valid) {
                validTypes.push({
                    type,
                    name: def.name,
                    warnings: validation.warnings
                });
            }
        }

        return validTypes;
    }
}
