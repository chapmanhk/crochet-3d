import { describe, expect, it } from 'vitest';
import { createStitchNode, groupStitchesByRow, resetIdCounter, StitchType } from '@engine/index';

describe('groupStitchesByRow', () => {
  it('groups stitches by row and sorts columns', () => {
    resetIdCounter();
    const stitches = [
      createStitchNode(StitchType.SINGLE_CROCHET, 1, 2),
      createStitchNode(StitchType.CHAIN, 0, 1),
      createStitchNode(StitchType.CHAIN, 0, 0),
      createStitchNode(StitchType.SINGLE_CROCHET, 1, 0),
    ];

    const rows = groupStitchesByRow(stitches);
    expect([...rows.keys()]).toEqual([0, 1]);
    expect(rows.get(0)?.map((stitch) => stitch.column)).toEqual([0, 1]);
    expect(rows.get(1)?.map((stitch) => stitch.column)).toEqual([0, 2]);
  });
});
