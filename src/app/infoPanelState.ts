import {
  FoundationType,
  getWorkingStitchName,
  StitchType,
  type WorkingStitchType,
} from '@engine/index';

export function getRowLabel(
  foundationChainLength: number,
  currentRow: number,
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  if (foundationChainLength === 0) {
    return 'No pattern';
  }

  if (currentRow === 0) {
    return foundationType === FoundationType.MAGIC_RING ? 'Magic ring' : 'Foundation';
  }

  return `Row ${currentRow}`;
}

export function getRowProgress(
  currentRow: number,
  foundationChainLength: number,
  rowWidthTarget: number,
  currentRowStitchCount: number,
  currentRowSlotsConsumed: number,
): string {
  if (currentRow <= 0 || foundationChainLength === 0) {
    return '—';
  }

  if (currentRowSlotsConsumed !== currentRowStitchCount) {
    const stitchWord = currentRowStitchCount === 1 ? 'stitch' : 'stitches';
    return `${currentRowStitchCount} ${stitchWord} (uses ${currentRowSlotsConsumed} of ${rowWidthTarget} stitches)`;
  }

  return `${currentRowStitchCount}/${rowWidthTarget}`;
}

export function getNextStep(
  foundationChainLength: number,
  currentRow: number,
  rowWidthTarget: number,
  _currentRowStitchCount: number,
  currentRowSlotsConsumed: number,
  selectedStitchType: WorkingStitchType = StitchType.SINGLE_CROCHET,
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  if (foundationChainLength === 0) {
    return 'Choose New foundation or Templates to start your pattern.';
  }

  if (currentRow === 0) {
    if (foundationType === FoundationType.MAGIC_RING) {
      return 'Choose New Row to work into the magic ring stitches.';
    }
    return 'Choose New Row to begin the first working row.';
  }

  const remainingSlots = rowWidthTarget - currentRowSlotsConsumed;
  if (remainingSlots > 0) {
    const stitchName = getWorkingStitchName(selectedStitchType);
    const stitchWord = remainingSlots === 1 ? 'stitch' : 'stitches';
    return `Place ${remainingSlots} more ${stitchName} ${stitchWord} on row ${currentRow}.`;
  }

  return `Row ${currentRow} is complete. Choose New Row to continue.`;
}

export function getAddStitchButtonLabel(selectedStitchType: WorkingStitchType): string {
  return `Add ${getWorkingStitchName(selectedStitchType)}`;
}
