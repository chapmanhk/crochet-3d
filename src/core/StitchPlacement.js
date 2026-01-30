/**
 * StitchPlacement - Shared helpers for row/column placement
 *
 * Consolidates common row/column and flat-position calculations
 * used by Pattern and StitchGraph to reduce duplicate logic.
 */

/**
 * Calculate the next column for a row, respecting working direction.
 * @param {Array} rowStitches - Stitches in the row
 * @param {string} workingDirection - 'right' or 'left'
 * @returns {number}
 */
export function getNextColumn(rowStitches, workingDirection = 'right') {
    if (!Array.isArray(rowStitches) || rowStitches.length === 0) {
        return 0;
    }

    const columns = rowStitches
        .map(stitch => stitch?.column)
        .filter(col => Number.isFinite(col));

    if (columns.length === 0) {
        return 0;
    }

    return workingDirection === 'right'
        ? Math.max(...columns) + 1
        : Math.min(...columns) - 1;
}

/**
 * Find the previous stitch in a row given a column and direction.
 * @param {Array} rowStitches - Stitches in the row (unsorted OK)
 * @param {number} column - Target column
 * @param {string} workingDirection - 'right' or 'left'
 * @returns {Object|null}
 */
export function findPreviousInRow(rowStitches, column, workingDirection = 'right') {
    if (!Array.isArray(rowStitches) || rowStitches.length === 0) {
        return null;
    }

    const sorted = [...rowStitches].sort((a, b) => (a?.column ?? 0) - (b?.column ?? 0));

    if (workingDirection === 'right') {
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].column < column) {
                return sorted[i];
            }
        }
    } else {
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].column > column) {
                return sorted[i];
            }
        }
    }

    return null;
}

/**
 * Calculate flat-mode stitch position.
 * @param {Object} options
 * @param {Array} options.rowStitches - Stitches in the row being built
 * @param {Object|null} options.attachTo - Stitch below (previous row)
 * @param {number} options.column - Column for the new stitch
 * @param {number} options.row - Row for the new stitch
 * @param {number} options.width - Base stitch width
 * @param {number} options.effectiveWidth - Adjusted stitch width
 * @param {number} options.height - Stitch height
 * @param {string} options.workingDirection - 'right' or 'left'
 * @param {number} [options.rowBaseY] - Optional Y fallback for rows without attachTo
 * @returns {{x: number, y: number, z: number}}
 */
export function calculateFlatPosition({
    rowStitches,
    attachTo,
    column,
    row,
    width,
    effectiveWidth,
    height,
    workingDirection,
    rowBaseY
}) {
    const baseZ = Number.isFinite(attachTo?.position?.z)
        ? attachTo.position.z
        : (Number.isFinite(rowStitches?.[0]?.position?.z) ? rowStitches[0].position.z : 0);

    if (!attachTo) {
        const baseY = Number.isFinite(rowBaseY) ? rowBaseY : row * height;
        return { x: column * width, y: baseY, z: baseZ };
    }

    let x;
    if (rowStitches && rowStitches.length > 0) {
        const sorted = [...rowStitches].sort((a, b) => a.column - b.column);
        if (workingDirection === 'right') {
            const lastInRow = sorted[sorted.length - 1];
            x = lastInRow.position.x + ((lastInRow.width ?? width) + effectiveWidth) / 2;
        } else {
            const firstInRow = sorted[0];
            x = firstInRow.position.x - ((firstInRow.width ?? width) + effectiveWidth) / 2;
        }
    } else {
        x = attachTo.position.x;
    }

    const y = attachTo.position.y + ((attachTo.height ?? height) + height) / 2;

    return { x, y, z: baseZ };
}
