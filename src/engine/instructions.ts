import type { StitchNode } from './types';
import { StitchDefinitions, StitchType } from './types';
import { groupStitchesByRow } from './stitchRows';

export function generateInstructions(stitches: StitchNode[]): string[] {
  if (stitches.length === 0) {
    return [];
  }

  const rows = groupStitchesByRow(stitches);
  const instructions: string[] = [];

  for (const [row, rowStitches] of rows) {
    if (row === 0) {
      instructions.push(`Foundation: ch ${rowStitches.length}`);
      continue;
    }

    const scCount = rowStitches.filter(
      (stitch) => stitch.type === StitchType.SINGLE_CROCHET,
    ).length;

    if (scCount > 0) {
      instructions.push(`Row ${row}: sc in each st across (${scCount} sc)`);
    }
  }

  return instructions;
}

export function getStitchLabel(type: StitchType): string {
  return StitchDefinitions[type].abbreviation;
}
