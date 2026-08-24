export function getResetDisabledReason(stitchesCount: number): string | null {
  if (stitchesCount === 0) {
    return 'There is no pattern to reset.';
  }

  return null;
}

export function getSavePatternDisabledReason(stitchesCount: number): string | null {
  if (stitchesCount === 0) {
    return 'Add stitches before saving a pattern.';
  }

  return null;
}

export function getCopyInstructionsDisabledReason(stitchesCount: number): string | null {
  if (stitchesCount === 0) {
    return 'Add stitches before copying instructions.';
  }

  return null;
}
