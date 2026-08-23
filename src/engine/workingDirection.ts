import { WorkingDirection } from './types';

export { WorkingDirection } from './types';
export type { WorkingDirection as WorkingDirectionType } from './types';

export function defaultDirectionForRow(row: number): WorkingDirection {
  return row % 2 === 1
    ? WorkingDirection.LEFT_TO_RIGHT
    : WorkingDirection.RIGHT_TO_LEFT;
}

export function resolveAttachColumn(
  stitchIndexInRow: number,
  foundationLength: number,
  direction: WorkingDirection,
): number {
  return direction === WorkingDirection.LEFT_TO_RIGHT
    ? stitchIndexInRow
    : foundationLength - 1 - stitchIndexInRow;
}
