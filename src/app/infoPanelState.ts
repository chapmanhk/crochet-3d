import {
  FoundationType,
  getWorkingStitchName,
  StitchType,
  type StitchNode,
  type WorkingStitchType,
} from '@engine/index';

function isMagicRing(foundationType: FoundationType): boolean {
  return foundationType === FoundationType.MAGIC_RING;
}

function formatAttachmentTargetRowLabel(
  target: StitchNode,
  foundationType: FoundationType,
): string {
  if (isMagicRing(foundationType)) {
    return `round ${target.row}`;
  }

  return target.row === 0 ? 'foundation' : `row ${target.row}`;
}

export function getAdvanceActionLabel(
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  return isMagicRing(foundationType) ? 'New Round' : 'New Row';
}

export function getProgressLabel(
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  return isMagicRing(foundationType) ? 'Round progress' : 'Row progress';
}

export function getFoundationStatLabel(
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  return isMagicRing(foundationType) ? 'Stitches in ring' : 'Chain length';
}

export function relabelForFoundationType(
  message: string | null,
  foundationType: FoundationType = FoundationType.CHAIN,
): string | null {
  if (!message || !isMagicRing(foundationType)) {
    return message;
  }

  return message
    .replace(/\bRow\b/g, 'Round')
    .replace(/\brow\b/g, 'round')
    .replace(/\bNew row\b/g, 'New Round');
}

export function getRowLabel(
  foundationChainLength: number,
  currentRow: number,
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  if (foundationChainLength === 0) {
    return 'No pattern';
  }

  if (currentRow === 0) {
    return isMagicRing(foundationType) ? 'Magic ring' : 'Foundation';
  }

  if (isMagicRing(foundationType)) {
    return `Round ${currentRow}`;
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
  const advanceAction = getAdvanceActionLabel(foundationType);
  const workUnit = isMagicRing(foundationType) ? 'round' : 'row';

  if (foundationChainLength === 0) {
    return 'Choose New foundation or Templates to start your pattern.';
  }

  if (currentRow === 0) {
    if (isMagicRing(foundationType)) {
      return `Choose ${advanceAction} to work into the magic ring stitches.`;
    }
    return `Choose ${advanceAction} to begin the first working row.`;
  }

  const remainingSlots = rowWidthTarget - currentRowSlotsConsumed;
  if (remainingSlots > 0) {
    const stitchName = getWorkingStitchName(selectedStitchType);
    const stitchWord = remainingSlots === 1 ? 'stitch' : 'stitches';
    return `Place ${remainingSlots} more ${stitchName} ${stitchWord} in ${workUnit} ${currentRow}.`;
  }

  const completeLabel = isMagicRing(foundationType)
    ? `Round ${currentRow}`
    : `Row ${currentRow}`;
  return `${completeLabel} is complete. Choose ${advanceAction} to continue.`;
}

/**
 * Screen-reader text for the next attachment target shown in the info panel.
 * Returns null when no stitch can be placed or the target is not on a working row.
 */
export function getAttachmentTargetDescription(
  stitches: StitchNode[],
  nextAttachmentTargetId: string | null,
  selectedStitchType: WorkingStitchType,
  currentRow: number,
  foundationType: FoundationType = FoundationType.CHAIN,
): string | null {
  if (!nextAttachmentTargetId || currentRow <= 0) {
    return null;
  }

  const target = stitches.find((stitch) => stitch.id === nextAttachmentTargetId);
  if (!target) {
    return null;
  }

  const stitchName = getWorkingStitchName(selectedStitchType);
  const workUnit = isMagicRing(foundationType) ? 'round' : 'row';
  const targetRowLabel = formatAttachmentTargetRowLabel(target, foundationType);
  const columnIndex = target.column + 1;
  const rowStitches = stitches.filter((stitch) => stitch.row === target.row);
  const totalInRow = rowStitches.length;

  return `Next ${stitchName} attaches to stitch ${columnIndex} of ${totalInRow} in ${targetRowLabel} (${workUnit} ${currentRow}).`;
}

export function getAddStitchButtonLabel(selectedStitchType: WorkingStitchType): string {
  return `Add ${getWorkingStitchName(selectedStitchType)}`;
}
