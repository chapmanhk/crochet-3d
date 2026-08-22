import { describe, expect, it } from 'vitest';
import { generateInstructions, StitchType } from '@engine/index';
import { createStitchNode } from '@engine/StitchNode';

describe('generateInstructions', () => {
  it('returns empty instructions for an empty pattern', () => {
    expect(generateInstructions([])).toEqual([]);
  });

  it('describes foundation and single crochet rows', () => {
    const stitches = [
      createStitchNode(StitchType.CHAIN, 0, 0),
      createStitchNode(StitchType.CHAIN, 0, 1),
      createStitchNode(StitchType.SINGLE_CROCHET, 1, 0),
      createStitchNode(StitchType.SINGLE_CROCHET, 1, 1),
    ];

    expect(generateInstructions(stitches)).toEqual([
      'Foundation: ch 2',
      'Row 1: sc in each st across (2 sc)',
    ]);
  });
});
