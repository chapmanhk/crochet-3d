/**
 * PatternTemplates.js - Pre-built pattern templates
 *
 * Provides starter templates for common crochet patterns:
 * - Granny Square
 * - Basic Circle
 * - Basic Square
 * - Triangle
 */

import { Pattern } from './Pattern.js';
import { StitchType, getStitchDefinition } from './StitchTypes.js';

/**
 * Validate and clamp template options
 * @param {Object} options - Options to validate
 * @param {Object} limits - Limits for each option
 * @returns {Object} Validated options
 */
function validateTemplateOptions(options, limits) {
    const validated = { ...options };

    for (const [key, limit] of Object.entries(limits)) {
        if (validated[key] !== undefined) {
            if (typeof limit.min === 'number' && validated[key] < limit.min) {
                console.warn(`Template option '${key}' (${validated[key]}) is below minimum (${limit.min}), using minimum.`);
                validated[key] = limit.min;
            }
            if (typeof limit.max === 'number' && validated[key] > limit.max) {
                console.warn(`Template option '${key}' (${validated[key]}) exceeds maximum (${limit.max}), using maximum.`);
                validated[key] = limit.max;
            }
        }
    }

    return validated;
}

/**
 * Sync current row and working direction after template generation.
 */
function syncPatternAfterTemplate(pattern) {
    const lastRow = Math.max(0, pattern.graph.getRowCount() - 1);
    pattern.goToRow(lastRow);
}

/**
 * Create a row builder for sequential stitches.
 */
function createRowBuilder(pattern, { row, startColumn = 0, columnStep = 1, color, connectDirection = 'right' }) {
    let column = startColumn;
    let prevNode = null;

    const addNode = (type, options = {}, connectToPrev = true) => {
        const nodeColumn = options.column ?? column;
        const node = pattern.graph.createNode(type, {
            ...options,
            row,
            column: nodeColumn,
            color: options.color ?? color
        });

        if (connectToPrev && prevNode) {
            if (connectDirection === 'left') {
                pattern.graph.connectHorizontal(node, prevNode);
            } else {
                pattern.graph.connectHorizontal(prevNode, node);
            }
        }

        prevNode = node;
        column = nodeColumn + columnStep;
        return node;
    };

    return {
        addNode,
        getColumn: () => column,
        getPrevNode: () => prevNode,
        setPrevNode: (node) => { prevNode = node; }
    };
}

/**
 * Create a granny square pattern
 * @param {Object} options - Configuration options
 * @param {number} options.rounds - Number of rounds (default: 1, min: 1, max: 50)
 * @param {number} options.color - Yarn color (default: brown)
 * @returns {Pattern} The created pattern
 */
export function createGrannySquare(options = {}) {
    const validated = validateTemplateOptions(options, {
        rounds: { min: 1, max: 50 }
    });

    const {
        rounds = 1,
        color = 0x8B4513
    } = validated;

    const pattern = new Pattern();
    pattern.metadata.name = 'Granny Square';
    pattern.mode = 'round-joined';
    pattern.currentColor = color;

    // Create magic ring at center
    const ring = pattern.graph.createNode(StitchType.MAGIC_RING, {
        row: 0,
        column: 0,
        position: { x: 0, y: 0, z: 0 }
    });

    // Round 1: ch 3 (counts as dc), 2 dc, ch 2, [3 dc, ch 2] x 3, join
    // This creates 4 clusters of 3 dc with ch-2 corners

    const clusterCount = 4;  // 4 corners for a square
    const dcPerCluster = 3;
    const cornerChainLength = 2;

    const rowBuilder = createRowBuilder(pattern, { row: 0, startColumn: 1, color });
    const radius = 1.0;
    let firstDC = null;

    for (let corner = 0; corner < clusterCount; corner++) {
        const baseAngle = (corner / clusterCount) * Math.PI * 2;

        // Add 3 dc in cluster - all worked into the ring
        for (let dc = 0; dc < dcPerCluster; dc++) {
            const angle = baseAngle + (dc - 1) * 0.15;
            const node = rowBuilder.addNode(StitchType.DOUBLE_CROCHET, {
                position: {
                    x: Math.cos(angle) * radius,
                    y: 0.5,
                    z: Math.sin(angle) * radius
                }
            });

            if (!firstDC) {
                firstDC = node;
            }

            // All DCs are worked into the magic ring
            pattern.graph.connectVertical(node, ring);
        }

        // Add ch-2 corner - chains are also part of working into the ring
        // They form the corner space for the next round
        for (let ch = 0; ch < cornerChainLength; ch++) {
            const angle = baseAngle + Math.PI / clusterCount;
            const chainNode = rowBuilder.addNode(StitchType.CHAIN, {
                position: {
                    x: Math.cos(angle) * (radius + 0.3),
                    y: 0.5 + ch * 0.2,
                    z: Math.sin(angle) * (radius + 0.3)
                },
                metadata: {
                    isCorner: ch === cornerChainLength - 1,
                    isCornerSpace: true  // Marks this as a corner chain space
                }
            });

            // Corner chains connect to the ring (they're part of working into it)
            // and also connect horizontally to form the sequence
            pattern.graph.connectVertical(chainNode, ring);
        }
    }

    // Connect last stitch to first dc (after ring)
    const lastNode = rowBuilder.getPrevNode();
    if (firstDC && lastNode) {
        pattern.graph.connectHorizontal(lastNode, firstDC);
    }

    // Add additional rounds if requested
    for (let round = 2; round <= rounds; round++) {
        addGrannySquareRound(pattern, round, color);
    }

    syncPatternAfterTemplate(pattern);
    pattern.saveHistoryState('Create granny square template');
    return pattern;
}

/**
 * Add an additional round to a granny square
 */
function addGrannySquareRound(pattern, roundNumber, color) {
    const prevRound = pattern.graph.getRowSorted(roundNumber - 2);
    if (prevRound.length === 0) return;

    pattern.currentRow = roundNumber - 1;
    const radius = 1.0 + (roundNumber - 1) * 0.8;

    const rowBuilder = createRowBuilder(pattern, {
        row: roundNumber - 1,
        startColumn: 0,
        color
    });
    const clusterCount = 4;

    for (let corner = 0; corner < clusterCount; corner++) {
        const baseAngle = (corner / clusterCount) * Math.PI * 2;

        // Add 3 dc in corner space
        for (let dc = 0; dc < 3; dc++) {
            const angle = baseAngle + (dc - 1) * 0.12;
            rowBuilder.addNode(StitchType.DOUBLE_CROCHET, {
                position: {
                    x: Math.cos(angle) * radius,
                    y: 0.5 * roundNumber,
                    z: Math.sin(angle) * radius
                }
            });
        }

        // Add ch-2 corner
        for (let ch = 0; ch < 2; ch++) {
            const angle = baseAngle + Math.PI / clusterCount * 0.5;
            rowBuilder.addNode(StitchType.CHAIN, {
                position: {
                    x: Math.cos(angle) * (radius + 0.3),
                    y: 0.5 * roundNumber + ch * 0.2,
                    z: Math.sin(angle) * (radius + 0.3)
                },
                metadata: { isCorner: ch === 1 }
            });
        }

        // Add side clusters (one more per round)
        const sideClusters = roundNumber - 1;
        for (let side = 0; side < sideClusters; side++) {
            const sideAngle = baseAngle + (side + 1) * (Math.PI / 2 / (sideClusters + 1));

            // ch 1 between clusters
            rowBuilder.addNode(StitchType.CHAIN, {
                position: {
                    x: Math.cos(sideAngle) * radius,
                    y: 0.5 * roundNumber,
                    z: Math.sin(sideAngle) * radius
                }
            });

            // 3 dc cluster
            for (let dc = 0; dc < 3; dc++) {
                const clusterAngle = sideAngle + (dc - 1) * 0.1;
                rowBuilder.addNode(StitchType.DOUBLE_CROCHET, {
                    position: {
                        x: Math.cos(clusterAngle) * radius,
                        y: 0.5 * roundNumber,
                        z: Math.sin(clusterAngle) * radius
                    }
                });
            }
        }
    }

    // Connect last to first
    const firstInRound = pattern.graph.getAt(roundNumber - 1, 0);
    const lastNode = rowBuilder.getPrevNode();
    if (firstInRound && lastNode) {
        pattern.graph.connectHorizontal(lastNode, firstInRound);
    }
}

/**
 * Create a basic circle pattern
 * @param {Object} options - Configuration options
 * @param {number} options.rounds - Number of rounds (default: 1, min: 1, max: 100)
 * @param {number} options.initialStitches - Starting stitch count (default: 6, min: 4, max: 12)
 * @param {string} options.stitchType - Stitch type to use (default: single crochet)
 * @param {string} options.mode - 'joined' or 'spiral' (default: 'joined')
 * @param {number} options.color - Yarn color
 * @returns {Pattern} The created pattern
 */
export function createBasicCircle(options = {}) {
    const validated = validateTemplateOptions(options, {
        rounds: { min: 1, max: 100 },
        initialStitches: { min: 4, max: 12 }
    });

    const {
        rounds = 1,
        initialStitches = 6,
        stitchType = StitchType.SINGLE_CROCHET,
        mode = 'joined',
        color = 0x8B4513
    } = validated;

    const pattern = new Pattern();
    pattern.metadata.name = 'Basic Circle';
    pattern.mode = mode === 'spiral' ? 'round-spiral' : 'round-joined';
    pattern.currentColor = color;

    // Start with magic ring
    pattern.startWithMagicRing(initialStitches, stitchType, mode);

    // Update colors for initial stitches
    pattern.graph.nodes.forEach(node => {
        if (node.type !== StitchType.MAGIC_RING) {
            node.color = color;
        }
    });

    // Add additional rounds with increases for flat circle
    for (let round = 2; round <= rounds; round++) {
        addCircleRound(pattern, round, initialStitches, stitchType, color);
    }

    syncPatternAfterTemplate(pattern);
    return pattern;
}

/**
 * Add a round to a flat circle with proper increases
 */
function addCircleRound(pattern, roundNumber, baseStitches, stitchType, color) {
    const prevRow = pattern.graph.getRowSorted(roundNumber - 2);
    if (prevRow.length === 0) return;

    pattern.currentRow = roundNumber - 1;

    // For flat circle: each round adds baseStitches more stitches
    // Round 1: baseStitches
    // Round 2: baseStitches * 2 (inc in every st)
    // Round 3: baseStitches * 3 (inc every 2nd st)
    // etc.

    const targetStitches = baseStitches * roundNumber;
    const prevStitches = prevRow.length;
    const increases = targetStitches - prevStitches;

    // Calculate which stitch indices should have increases
    // For even distribution, we use a remainder-based approach
    const def = getStitchDefinition(stitchType);
    const height = def?.height || 1.0;
    const radius = 1.0 + (roundNumber - 1) * 0.6;

    const rowBuilder = createRowBuilder(pattern, {
        row: roundNumber - 1,
        startColumn: 0,
        color
    });
    let stitchesAdded = 0;
    let increasesAdded = 0;

    for (let i = 0; i < prevStitches; i++) {
        const attachTo = prevRow[i];

        // Add regular stitch
        const angle = (stitchesAdded / targetStitches) * Math.PI * 2;
        const node = rowBuilder.addNode(stitchType, {
            position: {
                x: Math.cos(angle) * radius,
                y: height * (roundNumber - 1) * 0.5,
                z: Math.sin(angle) * radius
            }
        });

        pattern.graph.connectVertical(node, attachTo);
        stitchesAdded++;

        // Add increase if needed - use proper distribution calculation
        // Check if we should add an increase at this position
        // Formula: we want to place 'increases' evenly among 'prevStitches' positions
        // An increase should happen when: (i + 1) * increases / prevStitches crosses an integer boundary
        const shouldIncrease = increases > 0 &&
            increasesAdded < increases &&
            Math.floor((i + 1) * increases / prevStitches) > increasesAdded;

        if (shouldIncrease) {
            const incAngle = (stitchesAdded / targetStitches) * Math.PI * 2;
            const incNode = rowBuilder.addNode(stitchType, {
                position: {
                    x: Math.cos(incAngle) * radius,
                    y: height * (roundNumber - 1) * 0.5,
                    z: Math.sin(incAngle) * radius
                },
                metadata: { isIncrease: true }
            });

            pattern.graph.connectVertical(incNode, attachTo);
            stitchesAdded++;
            increasesAdded++;
        }
    }

    // Connect last to first for joined rounds
    if (pattern.mode === 'round-joined') {
        const firstInRound = pattern.graph.getAt(roundNumber - 1, 0);
        const lastNode = rowBuilder.getPrevNode();
        if (firstInRound && lastNode) {
            pattern.graph.connectHorizontal(lastNode, firstInRound);
        }
    }
}

/**
 * Create a basic square pattern (flat, worked in rows)
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width in stitches (default: 10, min: 2, max: 200)
 * @param {number} options.rows - Number of rows (default: same as size, min: 1, max: 200)
 * @param {string} options.stitchType - Stitch type for body (default: single crochet)
 * @param {number} options.color - Yarn color
 * @returns {Pattern} The created pattern
 */
export function createBasicSquare(options = {}) {
    const validated = validateTemplateOptions(options, {
        size: { min: 2, max: 200 },
        rows: { min: 1, max: 200 }
    });

    const {
        size = 10,
        rows = null,
        stitchType = StitchType.SINGLE_CROCHET,
        color = 0x8B4513
    } = validated;

    const targetRows = rows || size;

    const pattern = new Pattern();
    pattern.metadata.name = 'Basic Square';
    pattern.mode = 'flat';
    pattern.currentColor = color;
    pattern.autoTurningChain = false; // We'll handle this manually for cleaner counting

    // Start with foundation chain
    pattern.startWithChain(size);

    // Update chain colors
    pattern.graph.nodes.forEach(node => {
        node.color = color;
    });

    // Add rows
    for (let row = 1; row < targetRows; row++) {
        addSquareRow(pattern, row, size, stitchType, color);
    }

    syncPatternAfterTemplate(pattern);
    return pattern;
}

/**
 * Add a row to a square pattern
 */
function addSquareRow(pattern, rowNumber, width, stitchType, color) {
    const prevRow = pattern.graph.getRowSorted(rowNumber - 1);
    if (prevRow.length === 0) return;

    pattern.currentRow = rowNumber;

    // Determine working direction
    const leftToRight = rowNumber % 2 === 1;
    const orderedPrevRow = leftToRight ? prevRow : [...prevRow].reverse();

    const def = getStitchDefinition(stitchType);
    const height = def?.height || 1.0;
    const stitchWidth = def?.width || 0.7;

    const columnStep = leftToRight ? 1 : -1;
    const startColumn = leftToRight ? 0 : width - 1;
    const rowBuilder = createRowBuilder(pattern, {
        row: rowNumber,
        startColumn,
        columnStep,
        color,
        connectDirection: leftToRight ? 'right' : 'left'
    });

    for (let i = 0; i < width && i < orderedPrevRow.length; i++) {
        const attachTo = orderedPrevRow[i];
        const column = rowBuilder.getColumn();
        const node = rowBuilder.addNode(stitchType, {
            position: {
                x: column * stitchWidth,
                y: rowNumber * height,
                z: 0
            }
        });

        pattern.graph.connectVertical(node, attachTo);
    }
}

/**
 * Create a triangle pattern
 * @param {Object} options - Configuration options
 * @param {string} options.direction - 'top-down' (decreasing) or 'bottom-up' (increasing)
 * @param {number} options.baseWidth - Width at the base (default: 10, min: 3, max: 200)
 * @param {number} options.rows - Number of rows (min: 2, max: 200)
 * @param {string} options.stitchType - Stitch type to use
 * @param {number} options.color - Yarn color
 * @returns {Pattern} The created pattern
 */
export function createTriangle(options = {}) {
    const validated = validateTemplateOptions(options, {
        baseWidth: { min: 3, max: 200 },
        rows: { min: 2, max: 200 }
    });

    const {
        direction = 'top-down',
        baseWidth = 10,
        rows = null,
        stitchType = StitchType.SINGLE_CROCHET,
        color = 0x8B4513
    } = validated;

    const pattern = new Pattern();
    pattern.metadata.name = 'Triangle';
    pattern.mode = 'flat';
    pattern.currentColor = color;
    pattern.autoTurningChain = false;

    if (direction === 'top-down') {
        return createTopDownTriangle(pattern, baseWidth, rows, stitchType, color);
    } else {
        return createBottomUpTriangle(pattern, baseWidth, rows, stitchType, color);
    }
}

/**
 * Create a top-down triangle (starts wide, decreases)
 */
function createTopDownTriangle(pattern, baseWidth, rows, stitchType, color) {
    const targetRows = rows || baseWidth;

    // Start with foundation chain of full width
    pattern.startWithChain(baseWidth);

    // Update chain colors
    pattern.graph.nodes.forEach(node => {
        node.color = color;
    });

    // Add decreasing rows
    let currentWidth = baseWidth;
    for (let row = 1; row < targetRows && currentWidth > 1; row++) {
        const prevRow = pattern.graph.getRowSorted(row - 1);
        pattern.currentRow = row;

        // Decrease by 1-2 stitches per row
        const decrease = Math.min(2, currentWidth - 1);
        currentWidth = Math.max(1, currentWidth - decrease);

        const leftToRight = row % 2 === 1;
        const orderedPrevRow = leftToRight ? prevRow : [...prevRow].reverse();

        const def = getStitchDefinition(stitchType);
        const height = def?.height || 1.0;
        const stitchWidth = def?.width || 0.7;

        const startOffset = Math.floor(decrease / 2);
        const columnStep = leftToRight ? 1 : -1;
        const startColumn = leftToRight ? 0 : currentWidth - 1;
        const rowBuilder = createRowBuilder(pattern, {
            row,
            startColumn,
            columnStep,
            color,
            connectDirection: leftToRight ? 'right' : 'left'
        });

        for (let i = 0; i < currentWidth; i++) {
            const prevIndex = startOffset + i;
            if (prevIndex >= orderedPrevRow.length) break;

            const attachTo = orderedPrevRow[prevIndex];
            const column = rowBuilder.getColumn();
            const node = rowBuilder.addNode(stitchType, {
                position: {
                    x: (startOffset + column) * stitchWidth,
                    y: row * height,
                    z: 0
                }
            });

            pattern.graph.connectVertical(node, attachTo);
        }
    }

    syncPatternAfterTemplate(pattern);
    pattern.saveHistoryState('Create triangle template');
    return pattern;
}

/**
 * Create a bottom-up triangle (starts narrow, increases)
 */
function createBottomUpTriangle(pattern, baseWidth, rows, stitchType, color) {
    const targetRows = rows || baseWidth;

    // Start with single chain or small foundation
    pattern.startWithChain(2);

    // Update chain colors
    pattern.graph.nodes.forEach(node => {
        node.color = color;
    });

    const def = getStitchDefinition(stitchType);
    const height = def?.height || 1.0;
    const stitchWidth = def?.width || 0.7;

    // Add increasing rows
    let currentWidth = 2;
    for (let row = 1; row < targetRows; row++) {
        const prevRow = pattern.graph.getRowSorted(row - 1);
        pattern.currentRow = row;

        // Increase by 1-2 stitches per row
        currentWidth = Math.min(baseWidth, currentWidth + 2);

        const rowBuilder = createRowBuilder(pattern, {
            row,
            startColumn: 0,
            columnStep: 1,
            color
        });

        for (let i = 0; i < currentWidth; i++) {
            // Attach to previous row, reusing stitches for increases
            const prevIndex = Math.min(i, prevRow.length - 1);
            const attachTo = prevRow[Math.max(0, prevIndex)];

            const column = rowBuilder.getColumn();
            const node = rowBuilder.addNode(stitchType, {
                position: {
                    x: column * stitchWidth,
                    y: row * height,
                    z: 0
                }
            });

            if (attachTo) {
                pattern.graph.connectVertical(node, attachTo);
            }
        }
    }

    syncPatternAfterTemplate(pattern);
    pattern.saveHistoryState('Create triangle template');
    return pattern;
}

/**
 * Get list of available templates
 * @returns {Array} Array of template definitions
 */
export function getAvailableTemplates() {
    return [
        {
            id: 'granny-square',
            name: 'Granny Square',
            description: 'Classic granny square worked in the round with DC clusters and chain spaces',
            category: 'square',
            defaultOptions: { rounds: 1 },
            create: createGrannySquare
        },
        {
            id: 'basic-circle',
            name: 'Basic Circle',
            description: 'Flat circle worked from magic ring with regular increases',
            category: 'circular',
            defaultOptions: { rounds: 1, initialStitches: 6 },
            create: createBasicCircle
        },
        {
            id: 'basic-square',
            name: 'Basic Square',
            description: 'Simple square worked flat in rows',
            category: 'square',
            defaultOptions: { size: 10 },
            create: createBasicSquare
        },
        {
            id: 'triangle',
            name: 'Triangle',
            description: 'Triangle shape with increasing or decreasing rows',
            category: 'shaped',
            defaultOptions: { direction: 'top-down', baseWidth: 10 },
            create: createTriangle
        }
    ];
}

/**
 * PatternTemplates object for convenient access
 */
export const PatternTemplates = {
    grannySquare: createGrannySquare,
    basicCircle: createBasicCircle,
    basicSquare: createBasicSquare,
    triangle: createTriangle,
    getAvailable: getAvailableTemplates
};

export default PatternTemplates;
