import { describe, expect, it } from 'vitest';
import {
  countParentSlotsConsumed,
  PlacementKind,
  StitchType,
} from '@engine/index';
import type { StitchNode } from '@engine/index';

function stitch(partial: Partial<StitchNode> & Pick<StitchNode, 'id'>): StitchNode {
  return {
    id: partial.id,
    type: partial.type ?? StitchType.SINGLE_CROCHET,
    row: partial.row ?? 1,
    column: partial.column ?? 0,
    attachToId: partial.attachToId ?? 'parent-1',
    position: partial.position ?? { x: 0, y: 0, z: 0 },
    placementKind: partial.placementKind,
    secondaryAttachToId: partial.secondaryAttachToId,
  };
}

describe('placement', () => {
  it('counts parent slots for increases and decreases', () => {
    const rowStitches = [
      stitch({ id: 'a', column: 0 }),
      stitch({ id: 'b', column: 1, placementKind: PlacementKind.INCREASE_SECOND }),
      stitch({
        id: 'c',
        column: 2,
        placementKind: PlacementKind.DECREASE,
        secondaryAttachToId: 'parent-3',
      }),
    ];

    expect(countParentSlotsConsumed(rowStitches)).toBe(3);
  });
});
