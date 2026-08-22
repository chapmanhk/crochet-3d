interface ToolbarPatternState {
  foundationChainLength: number;
  currentRow: number;
  canAddSingleCrochet: boolean;
  canStartNewRow: boolean;
  stitches: Array<{ row: number }>;
}

export function getAddScDisabledReason(
  state: ToolbarPatternState,
): string | null {
  if (state.foundationChainLength === 0) {
    return 'Add a foundation chain first.';
  }

  if (state.currentRow === 0) {
    return 'Start a working row before placing single crochet stitches.';
  }

  if (!state.canAddSingleCrochet) {
    return `Row ${state.currentRow} is full. Start a new row to continue.`;
  }

  return null;
}

export function getNewRowDisabledReason(
  state: ToolbarPatternState,
): string | null {
  if (state.foundationChainLength === 0) {
    return 'Add a foundation chain first.';
  }

  if (!state.canStartNewRow) {
    const rowStitches = state.stitches.filter(
      (stitch) => stitch.row === state.currentRow,
    ).length;

    if (state.currentRow > 0 && rowStitches === 0) {
      return 'Place at least one single crochet stitch before starting a new row.';
    }

    return `Complete row ${state.currentRow} before starting a new row.`;
  }

  return null;
}

export function getResetDisabledReason(
  stitchesCount: number,
): string | null {
  if (stitchesCount === 0) {
    return 'There is no pattern to reset.';
  }

  return null;
}
