import { describe, expect, it } from 'vitest';
import {
  layoutMagicRingPosition,
  layoutMagicRingWorkingPosition,
  layoutPosition,
  layoutStitchPositions,
  MAGIC_RING_BASE_RADIUS,
  MAGIC_RING_RADIUS_GROWTH,
  magicRingRadialDistance,
  PlacementKind,
  StitchType,
} from '@engine/index';

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

describe('layoutMagicRingPosition', () => {
  it('places foundation stitches on a circle', () => {
    const stitches = Array.from({ length: 6 }, (_, index) =>
      layoutMagicRingPosition(index, 6),
    );

    for (const position of stitches) {
      expect(magicRingRadialDistance(position)).toBeCloseTo(MAGIC_RING_BASE_RADIUS, 5);
    }
  });
});

describe('layoutMagicRingWorkingPosition', () => {
  it('expands working stitches outward from their parent angle', () => {
    const parent = layoutMagicRingPosition(0, 6);
    const child = layoutMagicRingWorkingPosition({
      row: 1,
      parentPosition: parent,
    });

    const parentRadius = magicRingRadialDistance(parent);
    const childRadius = magicRingRadialDistance(child);

    expect(childRadius).toBeGreaterThan(parentRadius);
    expect(childRadius).toBeCloseTo(MAGIC_RING_BASE_RADIUS + MAGIC_RING_RADIUS_GROWTH, 5);
  });

  it('offsets increase-second stitches slightly from the parent angle', () => {
    const parent = layoutMagicRingPosition(1, 6);
    const first = layoutMagicRingWorkingPosition({
      row: 1,
      parentPosition: parent,
    });
    const second = layoutMagicRingWorkingPosition({
      row: 1,
      parentPosition: parent,
      placementKind: PlacementKind.INCREASE_SECOND,
    });

    expect(second.x).not.toBeCloseTo(first.x, 3);
    expect(second.z).not.toBeCloseTo(first.z, 3);
  });

  it('places decrease stitches between two parent angles', () => {
    const primary = layoutMagicRingPosition(1, 6);
    const secondary = layoutMagicRingPosition(2, 6);
    const decrease = layoutMagicRingWorkingPosition({
      row: 2,
      parentPosition: primary,
      secondaryParentPosition: secondary,
      placementKind: PlacementKind.DECREASE,
    });

    expect(magicRingRadialDistance(decrease)).toBeCloseTo(
      MAGIC_RING_BASE_RADIUS + 2 * MAGIC_RING_RADIUS_GROWTH,
      5,
    );
  });

  it('throws when decrease layout lacks a secondary parent', () => {
    expect(() =>
      layoutMagicRingWorkingPosition({
        row: 2,
        parentPosition: layoutMagicRingPosition(0, 6),
        placementKind: PlacementKind.DECREASE,
      }),
    ).toThrow('secondaryParentPosition');
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
