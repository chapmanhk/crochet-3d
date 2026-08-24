import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlacementKind, StitchType } from '@engine/index';
import { createStitchNode } from '@engine/StitchNode';
import {
  buildCrossingVTopPoints,
  getStitchShapeAdjustments,
  helicalPoints,
  loopAnchorFromParent,
  stitchJitter,
  stitchPostHeight,
  stitchTopY,
  stitchTopYFromAdjustments,
  VISUAL_ROW_HEIGHT,
  yarnOverHeights,
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

  it('computes stitch top Y from insertion and adjustments', () => {
    const stitch = createStitchNode(StitchType.HALF_DOUBLE_CROCHET, 1, 0, 'parent');
    const adjustments = getStitchShapeAdjustments(stitch);
    const insertionY = 0.22;

    expect(stitchTopY(insertionY, stitch)).toBe(
      stitchTopYFromAdjustments(insertionY, stitch, adjustments),
    );
    expect(stitchTopY(insertionY, stitch)).toBeGreaterThan(insertionY + VISUAL_ROW_HEIGHT);
  });

  it('returns yarn-over wrap heights for taller stitches', () => {
    expect(yarnOverHeights(StitchType.SINGLE_CROCHET)).toEqual([]);
    expect(yarnOverHeights(StitchType.HALF_DOUBLE_CROCHET)).toEqual([0.42]);
    expect(yarnOverHeights(StitchType.DOUBLE_CROCHET)).toEqual([0.34, 0.68]);
  });

  it('builds helical post points with ply twist', () => {
    const start = new THREE.Vector3(0, 1, 0);
    const end = new THREE.Vector3(0, 0, 0);
    const points = helicalPoints(start, end, 2, 3);

    expect(points).toHaveLength(7);
    expect(points[0]!.x).not.toBe(points[3]!.x);
    expect(points[0]!.z).not.toBe(points[3]!.z);
  });

  it('builds crossing V-top points with lean', () => {
    const vTop = buildCrossingVTopPoints(0, 0.44, 0.1, 0.1, 0.2);

    expect(vTop.leftTop.x).toBeLessThan(vTop.rightTop.x);
    expect(vTop.crossLeft.y).toBeGreaterThan(vTop.leftTop.y);
    expect(vTop.crossRight.z).toBeGreaterThan(vTop.rightTop.z);
  });

  it('anchors loop insertion slightly below the parent V-top', () => {
    const parent = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0);
    const anchor = loopAnchorFromParent(parent, 0.44, 0.1);

    expect(anchor.x).toBe(parent.position.x);
    expect(anchor.y).toBeCloseTo(0.428, 3);
    expect(anchor.z).toBeCloseTo(0.092, 3);
  });
});
