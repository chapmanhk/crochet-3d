import type { StitchNode } from './types';
import { PlacementKind } from './types';

export function getPlacementKind(stitch: StitchNode): PlacementKind {
  return stitch.placementKind ?? PlacementKind.NORMAL;
}

export function countParentSlotsConsumed(rowStitches: StitchNode[]): number {
  let slots = 0;

  for (const stitch of rowStitches) {
    const kind = getPlacementKind(stitch);
    if (kind === PlacementKind.INCREASE_SECOND) {
      continue;
    }

    if (kind === PlacementKind.DECREASE) {
      slots += 2;
      continue;
    }

    slots += 1;
  }

  return slots;
}

export function countWorkingStitches(rowStitches: StitchNode[]): number {
  return rowStitches.length;
}

export function isRowComplete(
  rowStitches: StitchNode[],
  foundationLength: number,
): boolean {
  return countParentSlotsConsumed(rowStitches) >= foundationLength;
}

export function remainingParentSlots(
  rowStitches: StitchNode[],
  foundationLength: number,
): number {
  return Math.max(0, foundationLength - countParentSlotsConsumed(rowStitches));
}

export function canPlaceDecrease(
  rowStitches: StitchNode[],
  foundationLength: number,
): boolean {
  return remainingParentSlots(rowStitches, foundationLength) >= 2;
}
