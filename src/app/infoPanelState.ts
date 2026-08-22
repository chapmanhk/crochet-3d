export function getRowLabel(
  foundationChainLength: number,
  currentRow: number,
): string {
  if (foundationChainLength === 0) {
    return 'No pattern';
  }

  if (currentRow === 0) {
    return 'Foundation';
  }

  return `Row ${currentRow}`;
}

export function getRowProgress(
  currentRow: number,
  foundationChainLength: number,
  currentRowStitchCount: number,
): string {
  if (currentRow <= 0 || foundationChainLength === 0) {
    return '—';
  }

  return `${currentRowStitchCount}/${foundationChainLength}`;
}

export function getNextStep(
  foundationChainLength: number,
  currentRow: number,
  currentRowStitchCount: number,
): string {
  if (foundationChainLength === 0) {
    return 'Choose New Chain to start your foundation.';
  }

  if (currentRow === 0) {
    return 'Choose New Row to begin the first working row.';
  }

  const remaining = foundationChainLength - currentRowStitchCount;
  if (remaining > 0) {
    const stitchWord = remaining === 1 ? 'stitch' : 'stitches';
    return `Place ${remaining} more single crochet ${stitchWord} on row ${currentRow}.`;
  }

  return `Row ${currentRow} is complete. Choose New Row to continue.`;
}
