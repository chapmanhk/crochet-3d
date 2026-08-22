import type { StitchNode } from './types';
import { StitchType } from './types';
import { layoutPosition } from './layout';

let nextId = 1;

export function resetIdCounter(): void {
  nextId = 1;
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
