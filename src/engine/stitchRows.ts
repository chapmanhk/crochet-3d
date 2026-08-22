import type { StitchNode } from './types';

export function groupStitchesByRow(stitches: StitchNode[]): Map<number, StitchNode[]> {
  const rows = new Map<number, StitchNode[]>();

  for (const stitch of stitches) {
    const rowStitches = rows.get(stitch.row) ?? [];
    rowStitches.push(stitch);
    rows.set(stitch.row, rowStitches);
  }

  for (const rowStitches of rows.values()) {
    rowStitches.sort((left, right) => left.column - right.column);
  }

  return new Map([...rows.entries()].sort(([left], [right]) => left - right));
}
