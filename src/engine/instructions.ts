import type { StitchNode } from './types';
import { StitchDefinitions, StitchType } from './types';

export function generateInstructions(stitches: StitchNode[]): string[] {
  if (stitches.length === 0) {
    return [];
  }

  const rows = groupByRow(stitches);
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

function groupByRow(stitches: StitchNode[]): Map<number, StitchNode[]> {
  const rows = new Map<number, StitchNode[]>();

  for (const stitch of stitches) {
    const rowStitches = rows.get(stitch.row) ?? [];
    rowStitches.push(stitch);
    rows.set(stitch.row, rowStitches);
  }

  for (const rowStitches of rows.values()) {
    rowStitches.sort((a, b) => a.column - b.column);
  }

  return new Map([...rows.entries()].sort(([a], [b]) => a - b));
}

export function getStitchLabel(type: StitchType): string {
  return StitchDefinitions[type].abbreviation;
}
