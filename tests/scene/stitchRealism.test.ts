import { describe, expect, it } from 'vitest';
import { PlacementKind, StitchType } from '@engine/index';
import { createStitchNode } from '@engine/StitchNode';
import {
  getStitchShapeAdjustments,
  stitchJitter,
  stitchPostHeight,
  VISUAL_ROW_HEIGHT,
} from '../../src/scene/stitchRealism';

describe('stitchRealism', () => {
  it('scales stitch post heights for hdc and dc', () => {
    expect(stitchPostHeight(StitchType.SINGLE_CROCHET)).toBe(VISUAL_ROW_HEIGHT);
    expect(stitchPostHeight(StitchType.HALF_DOUBLE_CROCHET)).toBeCloseTo(VISUAL_ROW_HEIGHT * 1.5);
    expect(stitchPostHeight(StitchType.DOUBLE_CROCHET)).toBeCloseTo(VISUAL_ROW_HEIGHT * 2);
  });

  it('produces deterministic jitter per stitch id', () => {
    const stitch = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0);
    expect(stitchJitter(stitch, 1, 0.01)).toBe(stitchJitter(stitch, 1, 0.01));
    expect(stitchJitter(stitch, 1, 0.01)).not.toBe(stitchJitter(stitch, 2, 0.01));
  });

  it('fans increase stitches apart and bunches decreases', () => {
    const increaseSecond = createStitchNode(
      StitchType.SINGLE_CROCHET,
      1,
      1,
      'parent',
      PlacementKind.INCREASE_SECOND,
    );
    const decrease = createStitchNode(
      StitchType.SINGLE_CROCHET,
      1,
      2,
      'parent',
      PlacementKind.DECREASE,
      'secondary',
    );
    const normal = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0, 'parent');

    const increaseAdjust = getStitchShapeAdjustments(increaseSecond);
    const decreaseAdjust = getStitchShapeAdjustments(decrease);
    const normalAdjust = getStitchShapeAdjustments(normal);
    const increaseFirst = getStitchShapeAdjustments(normal, { increasePairFirst: true });

    expect(increaseAdjust.xShift).toBeGreaterThan(normalAdjust.xShift);
    expect(increaseFirst.xShift).toBeLessThan(normalAdjust.xShift);
    expect(decreaseAdjust.vHalfWidth).toBeLessThan(normalAdjust.vHalfWidth);
  });
});
