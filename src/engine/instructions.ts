import type { StitchNode } from './types';
import {
  FoundationType,
  PlacementKind,
  StitchDefinitions,
  StitchType,
  type WorkingStitchType,
} from './types';
import { groupStitchesByRow } from './stitchRows';
import { getPlacementKind } from './placement';

function formatFoundationLine(rowStitches: StitchNode[], foundationType: FoundationType): string {
  if (foundationType === FoundationType.MAGIC_RING) {
    const count = rowStitches.length;
    return `Foundation: magic ring, ${count} sc`;
  }

  return `Foundation: ch ${rowStitches.length}`;
}

function summarizeRowStitches(rowStitches: StitchNode[]): string {
  const counts = new Map<string, number>();

  for (const stitch of rowStitches) {
    const def = StitchDefinitions[stitch.type];
    counts.set(def.abbreviation, (counts.get(def.abbreviation) ?? 0) + 1);
  }

  const parts = [...counts.entries()].map(([abbreviation, count]) => `${count} ${abbreviation}`);
  return parts.join(', ');
}

function rowInstruction(row: number, rowStitches: StitchNode[]): string {
  const increases = rowStitches.filter(
    (stitch) => getPlacementKind(stitch) === PlacementKind.INCREASE_SECOND,
  ).length;
  const decreases = rowStitches.filter(
    (stitch) => getPlacementKind(stitch) === PlacementKind.DECREASE,
  ).length;
  const summary = summarizeRowStitches(rowStitches);
  const notes: string[] = [];

  if (increases > 0) {
    notes.push(`${increases} inc`);
  }
  if (decreases > 0) {
    notes.push(`${decreases} dec`);
  }

  const noteText = notes.length > 0 ? `; ${notes.join(', ')}` : '';
  return `Row ${row}: work across (${summary})${noteText}`;
}

export function generateInstructions(
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): string[] {
  if (stitches.length === 0) {
    return [];
  }

  const rows = groupStitchesByRow(stitches);
  const instructions: string[] = [];

  for (const [row, rowStitches] of rows) {
    if (row === 0) {
      instructions.push(formatFoundationLine(rowStitches, foundationType));
      continue;
    }

    const workingStitches = rowStitches.filter(
      (stitch) => stitch.type !== StitchType.CHAIN,
    );

    if (workingStitches.length > 0) {
      instructions.push(rowInstruction(row, workingStitches));
    }
  }

  return instructions;
}

export function getStitchLabel(type: StitchType): string {
  return StitchDefinitions[type].abbreviation;
}

export function getWorkingStitchLabel(type: WorkingStitchType): string {
  return StitchDefinitions[type].abbreviation;
}

export function getWorkingStitchName(type: WorkingStitchType): string {
  return StitchDefinitions[type].name.toLowerCase();
}
