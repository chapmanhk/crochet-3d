export function getResetDisabledReason(stitchesCount: number): string | null {
  if (stitchesCount === 0) {
    return 'There is no pattern to reset.';
  }

  return null;
}
