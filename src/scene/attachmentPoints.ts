import type { StitchNode } from '@engine/index';
import { StitchType } from '@engine/index';
import { VISUAL_ROW_HEIGHT } from './stitchGeometry';
const CHAIN_CROWN_Z = 0.1;
const SC_TOP_Z_BASE = 0.07;
const SC_TOP_Z_PER_ROW = 0.035;

export interface AttachmentPoint {
  attachToId: string;
  position: { x: number; y: number; z: number };
}

function scRowTopY(row: number): number {
  return row * VISUAL_ROW_HEIGHT;
}

function scRowTopZ(row: number): number {
  return SC_TOP_Z_BASE + row * SC_TOP_Z_PER_ROW;
}

function scInsertionY(parent: StitchNode): number {
  if (parent.type === StitchType.CHAIN) {
    return 0;
  }

  return scRowTopY(parent.row);
}

export function getAttachmentPointForTarget(
  attachTarget: StitchNode,
): AttachmentPoint {
  const x = attachTarget.position.x;
  const y = scInsertionY(attachTarget);
  const z =
    attachTarget.type === StitchType.CHAIN
      ? CHAIN_CROWN_Z - 0.015
      : scRowTopZ(attachTarget.row) - 0.01;

  return {
    attachToId: attachTarget.id,
    position: { x, y, z },
  };
}

export function getNextAttachmentPoint(
  stitches: StitchNode[],
  nextAttachmentTargetId: string | null,
): AttachmentPoint | null {
  if (!nextAttachmentTargetId) {
    return null;
  }

  const attachTarget = stitches.find((stitch) => stitch.id === nextAttachmentTargetId);
  if (!attachTarget) {
    return null;
  }

  return getAttachmentPointForTarget(attachTarget);
}
