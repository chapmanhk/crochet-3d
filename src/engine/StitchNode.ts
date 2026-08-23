import type { StitchNode } from './types';
import { StitchType } from './types';
import { layoutPosition } from './layout';

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
): StitchNode {
  return {
    id: createId(),
    type,
    row,
    column,
    attachToId,
    position: layoutPosition(type, row, column),
  };
}

export function cloneStitchNode(stitch: StitchNode): StitchNode {
  return { ...stitch, position: { ...stitch.position } };
}
