import type { FoundationType, StitchNode, WorkingStitchType } from '@engine/index';
import { getAttachmentInsertionPosition } from './stitchGeometry';

export interface AttachmentPoint {
  attachToId: string;
  position: { x: number; y: number; z: number };
}

export function getAttachmentPointForTarget(
  attachTarget: StitchNode,
  childType: WorkingStitchType,
  foundationType: FoundationType,
): AttachmentPoint {
  return {
    attachToId: attachTarget.id,
    position: getAttachmentInsertionPosition(attachTarget, childType, foundationType),
  };
}

export function getNextAttachmentPoint(
  stitches: StitchNode[],
  nextAttachmentTargetId: string | null,
  childType: WorkingStitchType,
  foundationType: FoundationType,
): AttachmentPoint | null {
  if (!nextAttachmentTargetId) {
    return null;
  }

  const attachTarget = stitches.find((stitch) => stitch.id === nextAttachmentTargetId);
  if (!attachTarget) {
    return null;
  }

  return getAttachmentPointForTarget(attachTarget, childType, foundationType);
}
