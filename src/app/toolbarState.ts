function disabledWhenEmpty(stitchesCount: number, message: string): string | null {
  return stitchesCount === 0 ? message : null;
}

export function getResetDisabledReason(stitchesCount: number): string | null {
  return disabledWhenEmpty(stitchesCount, 'There is no pattern to reset.');
}

export function getSavePatternDisabledReason(stitchesCount: number): string | null {
  return disabledWhenEmpty(stitchesCount, 'Add stitches before saving a pattern.');
}

export function getCopyInstructionsDisabledReason(stitchesCount: number): string | null {
  return disabledWhenEmpty(stitchesCount, 'Add stitches before copying instructions.');
}

export function getExportInstructionsDisabledReason(stitchesCount: number): string | null {
  return disabledWhenEmpty(stitchesCount, 'Add stitches before exporting instructions.');
}

export function getDrapePreviewDisabledReason(stitchesCount: number): string | null {
  return disabledWhenEmpty(
    stitchesCount,
    'Add a foundation (chain or magic ring) or choose a template before enabling drape preview.',
  );
}
