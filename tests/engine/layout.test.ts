import { describe, expect, it } from 'vitest';
import { layoutPosition, StitchType } from '@engine/index';

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
});
