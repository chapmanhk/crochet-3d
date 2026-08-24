import { afterEach, describe, expect, it } from 'vitest';
import { FoundationType, Pattern, StitchType, resetIdCounter } from '@engine/index';
import { getAttachmentPointForTarget } from '../../src/scene/attachmentPoints';
import { getAttachmentInsertionPosition } from '../../src/scene/stitchGeometry';
import {
  loopAnchorFromParent,
  ROUND_WORKING_TOP_Z_OFFSET,
  VISUAL_ROW_HEIGHT,
} from '../../src/scene/stitchRealism';

const SC_TOP_Z_BASE = 0.07;
const SC_TOP_Z_PER_ROW = 0.035;

function parentLoopAnchor(
  parent: ReturnType<Pattern['getStitches']>[number],
  roundFoundation: boolean,
) {
  const parentTopY = parent.row * VISUAL_ROW_HEIGHT;
  const parentTopZ = roundFoundation
    ? parent.position.z + ROUND_WORKING_TOP_Z_OFFSET
    : SC_TOP_Z_BASE + parent.row * SC_TOP_Z_PER_ROW;

  return loopAnchorFromParent(parent, parentTopY, parentTopZ);
}

describe('attachmentPoints', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('aligns flat attachment markers with parent loop anchors', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    const parent = pattern.getStitches().find((stitch) => stitch.row === 1)!;

    const position = getAttachmentInsertionPosition(
      parent,
      StitchType.SINGLE_CROCHET,
      FoundationType.CHAIN,
    );
    const anchor = parentLoopAnchor(parent, false);

    expect(position.x).toBe(parent.position.x);
    expect(position.y).toBeCloseTo(anchor.y, 5);
    expect(position.z).toBeCloseTo(anchor.z, 5);
    expect(getAttachmentPointForTarget(parent, StitchType.SINGLE_CROCHET, FoundationType.CHAIN)).toEqual({
      attachToId: parent.id,
      position,
    });
  });

  it('uses round-top Z offset for magic ring attachment markers', () => {
    const pattern = new Pattern();
    pattern.addMagicRing(4);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    const parent = pattern.getStitches().find((stitch) => stitch.row === 1)!;

    const flatPosition = getAttachmentInsertionPosition(
      parent,
      StitchType.SINGLE_CROCHET,
      FoundationType.CHAIN,
    );
    const roundPosition = getAttachmentInsertionPosition(
      parent,
      StitchType.SINGLE_CROCHET,
      FoundationType.MAGIC_RING,
    );
    const anchor = parentLoopAnchor(parent, true);

    expect(roundPosition.x).toBe(parent.position.x);
    expect(roundPosition.y).toBeCloseTo(anchor.y, 5);
    expect(roundPosition.z).toBeCloseTo(anchor.z, 5);
    expect(roundPosition.z).not.toBeCloseTo(flatPosition.z, 3);
  });
});
