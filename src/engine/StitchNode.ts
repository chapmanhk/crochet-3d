import type { StitchNode, StitchType } from './types';
import { PlacementKind } from './types';

let nextId = 1;

export function resetIdCounter(): void {
  nextId = 1;
}

export function restoreIdCounter(stitches: StitchNode[]): void {
  let maxId = 0;
  for (const stitch of stitches) {
    const match = /^stitch-(\d+)$/.exec(stitch.id);
    if (match) {
      maxId = Math.max(maxId, Number.parseInt(match[1]!, 10));
    }
  }
  nextId = maxId + 1;
}

function createId(): string {
  return `stitch-${nextId++}`;
}

export function createStitchNode(
  type: StitchType,
  row: number,
  column: number,
  attachToId: string | null = null,
  placementKind: PlacementKind = PlacementKind.NORMAL,
  secondaryAttachToId: string | null = null,
): StitchNode {
  const stitch: StitchNode = {
    id: createId(),
    type,
    row,
    column,
    attachToId,
    placementKind,
    position: { x: 0, y: 0, z: 0 },
  };

  if (secondaryAttachToId) {
    stitch.secondaryAttachToId = secondaryAttachToId;
  }

  return stitch;
}

export function cloneStitchNode(stitch: StitchNode): StitchNode {
  return {
    ...stitch,
    position: { ...stitch.position },
  };
}
