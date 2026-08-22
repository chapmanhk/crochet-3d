import { describe, expect, it } from 'vitest';
import { layoutPosition, layoutStitchPositions, StitchType } from '@engine/index';

describe('layoutPosition', () => {
  it('spaces stitches horizontally within a row', () => {
    const first = layoutPosition(StitchType.CHAIN, 0, 0);
    const second = layoutPosition(StitchType.CHAIN, 0, 1);

    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBe(first.y);
  });

  it('raises stitches on later rows', () => {
    const foundation = layoutPosition(StitchType.CHAIN, 0, 0);
    const rowOne = layoutPosition(StitchType.SINGLE_CROCHET, 1, 0);

    expect(rowOne.y).toBeGreaterThan(foundation.y);
  });

  it('offsets single crochet stitches slightly in z', () => {
    const foundation = layoutPosition(StitchType.CHAIN, 0, 0);
    const rowOne = layoutPosition(StitchType.SINGLE_CROCHET, 1, 0);

    expect(foundation.z).toBe(0);
    expect(rowOne.z).toBeGreaterThan(0);
  });
});

describe('layoutStitchPositions', () => {
  it('maps each stitch to a layout position', () => {
    const stitches = [
      { type: StitchType.CHAIN, row: 0, column: 0 },
      { type: StitchType.SINGLE_CROCHET, row: 1, column: 0 },
    ];

    const positions = layoutStitchPositions(stitches);

    expect(positions).toHaveLength(2);
    expect(positions[1]?.y).toBeGreaterThan(positions[0]?.y ?? 0);
  });
});
