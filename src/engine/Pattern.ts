import type { PatternSnapshot, StitchNode, WorkingStitchType } from './types';
import {
  FoundationType,
  PlacementError,
  PlacementKind,
  StitchType,
  WorkingDirection,
  isWorkingStitchType,
} from './types';
import { StitchGraph } from './StitchGraph';
import { createStitchNode, resetIdCounter, restoreIdCounter } from './StitchNode';
import { layoutMagicRingPosition, layoutPosition } from './layout';
import {
  canPlaceDecrease,
  countParentSlotsConsumed,
  isRowComplete,
} from './placement';
import {
  defaultDirectionForRow,
  resolveAttachColumn,
} from './workingDirection';

const MIN_CHAIN_LENGTH = 1;
const MAX_CHAIN_LENGTH = 500;
const MIN_MAGIC_RING_STITCHES = 2;
const MAX_MAGIC_RING_STITCHES = 50;

export {
  MIN_CHAIN_LENGTH,
  MAX_CHAIN_LENGTH,
  MIN_MAGIC_RING_STITCHES,
  MAX_MAGIC_RING_STITCHES,
};

export function formatChainLengthError(): string {
  return `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`;
}

export function formatMagicRingCountError(): string {
  return `Magic ring stitch count must be between ${MIN_MAGIC_RING_STITCHES} and ${MAX_MAGIC_RING_STITCHES}.`;
}

function cloneSnapshot(snapshot: PatternSnapshot): PatternSnapshot {
  return {
    stitches: snapshot.stitches.map((stitch) => ({
      ...stitch,
      position: { ...stitch.position },
    })),
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    foundationType: snapshot.foundationType,
    rowDirections: { ...snapshot.rowDirections },
  };
}

function normalizeSnapshot(snapshot: PatternSnapshot): PatternSnapshot {
  return {
    ...snapshot,
    foundationType: snapshot.foundationType ?? FoundationType.CHAIN,
    rowDirections: snapshot.rowDirections ?? {},
    stitches: snapshot.stitches.map((stitch) => ({
      ...stitch,
      placementKind: stitch.placementKind ?? PlacementKind.NORMAL,
    })),
  };
}

export class Pattern {
  private readonly graph = new StitchGraph();
  private currentRow = 0;
  private foundationChainLength = 0;
  private foundationType: FoundationType = FoundationType.CHAIN;
  private rowDirections: Record<number, WorkingDirection> = {};

  addFoundationChain(length: number): StitchNode[] {
    const error = this.validateFoundationChain(length);
    if (error) {
      throw error;
    }

    const stitches: StitchNode[] = [];
    for (let column = 0; column < length; column++) {
      const stitch = createStitchNode(StitchType.CHAIN, 0, column);
      stitch.position = layoutPosition(StitchType.CHAIN, 0, column);
      this.graph.add(stitch);
      stitches.push(stitch);
    }

    this.foundationChainLength = length;
    this.foundationType = FoundationType.CHAIN;
    this.currentRow = 0;
    this.rowDirections = {};
    return stitches;
  }

  addMagicRing(stitchCount: number): StitchNode[] {
    const error = this.validateMagicRing(stitchCount);
    if (error) {
      throw error;
    }

    const stitches: StitchNode[] = [];
    for (let column = 0; column < stitchCount; column++) {
      const stitch = createStitchNode(
        StitchType.SINGLE_CROCHET,
        0,
        column,
        null,
        PlacementKind.NORMAL,
      );
      stitch.position = layoutMagicRingPosition(column, stitchCount);
      this.graph.add(stitch);
      stitches.push(stitch);
    }

    this.foundationChainLength = stitchCount;
    this.foundationType = FoundationType.MAGIC_RING;
    this.currentRow = 0;
    this.rowDirections = {};
    return stitches;
  }

  addSingleCrochet(): StitchNode {
    return this.addWorkingStitch(StitchType.SINGLE_CROCHET);
  }

  addSingleCrochetAt(attachToId: string): StitchNode {
    return this.addWorkingStitchAt(StitchType.SINGLE_CROCHET, attachToId);
  }

  addWorkingStitch(type: WorkingStitchType): StitchNode {
    const attachTarget = this.getNextAttachmentTarget(type);
    if (!attachTarget) {
      const error = this.validateAddWorkingStitch(type);
      if (error) {
        throw error;
      }
      throw new PlacementError(
        'NO_TARGET_STITCH',
        'No stitch available to attach the next stitch.',
      );
    }

    return this.addWorkingStitchAt(type, attachTarget.id);
  }

  addWorkingStitchAt(
    type: WorkingStitchType,
    attachToId: string,
    options: { placementKind?: PlacementKind; secondaryAttachToId?: string } = {},
  ): StitchNode {
    const error = this.validateAddWorkingStitch(type, options);
    if (error) {
      throw error;
    }

    const expectedTarget = this.getNextAttachmentTarget(type);
    const placementKind = options.placementKind ?? PlacementKind.NORMAL;

    if (placementKind === PlacementKind.DECREASE) {
      const secondaryId = options.secondaryAttachToId;
      const decreaseTargets = this.getDecreaseTargets();
      if (
        !decreaseTargets ||
        !expectedTarget ||
        !secondaryId ||
        decreaseTargets.primary.id !== attachToId ||
        decreaseTargets.secondary.id !== secondaryId
      ) {
        throw new PlacementError(
          'INVALID_ATTACHMENT_TARGET',
          'That attachment point is not valid for the next decrease.',
        );
      }
    } else if (!expectedTarget || expectedTarget.id !== attachToId) {
      throw new PlacementError(
        'INVALID_ATTACHMENT_TARGET',
        'That attachment point is not the next stitch for the current row.',
      );
    }

    return this.createAndAddWorkingStitch(type, attachToId, options);
  }

  addIncrease(type: WorkingStitchType): StitchNode[] {
    const first = this.addWorkingStitch(type);
    const second = this.createAndAddWorkingStitch(
      type,
      first.attachToId!,
      { placementKind: PlacementKind.INCREASE_SECOND },
    );
    return [first, second];
  }

  addDecrease(type: WorkingStitchType): StitchNode {
    const decreaseTargets = this.getDecreaseTargets();
    if (!decreaseTargets) {
      throw new PlacementError(
        'CANNOT_DECREASE',
        'Not enough stitches remain in the row below for a decrease.',
      );
    }

    return this.addWorkingStitchAt(type, decreaseTargets.primary.id, {
      placementKind: PlacementKind.DECREASE,
      secondaryAttachToId: decreaseTargets.secondary.id,
    });
  }

  getNextAttachmentTarget(type: WorkingStitchType = StitchType.SINGLE_CROCHET): StitchNode | null {
    if (this.validateAddWorkingStitch(type) !== null) {
      return null;
    }

    const slotIndex = countParentSlotsConsumed(this.graph.getByRow(this.currentRow));
    return this.resolveParentAttachTarget(
      slotIndex,
      this.getRowDirection(this.currentRow),
    );
  }

  startNewRow(): number {
    const error = this.validateStartNewRow();
    if (error) {
      throw error;
    }

    if (this.currentRow === 0) {
      this.currentRow = 1;
      this.rowDirections[1] = defaultDirectionForRow(1);
      return this.currentRow;
    }

    this.currentRow += 1;
    this.rowDirections[this.currentRow] = defaultDirectionForRow(this.currentRow);
    return this.currentRow;
  }

  getCurrentRow(): number {
    return this.currentRow;
  }

  getFoundationChainLength(): number {
    return this.foundationChainLength;
  }

  getFoundationType(): FoundationType {
    return this.foundationType;
  }

  getRowDirection(row: number): WorkingDirection {
    return this.rowDirections[row] ?? defaultDirectionForRow(row);
  }

  getParentSlotsConsumed(row: number): number {
    return countParentSlotsConsumed(this.graph.getByRow(row));
  }

  getRowWidthTarget(row: number): number {
    if (row <= 1) {
      return this.foundationChainLength;
    }

    return this.getRowStitchCount(row - 1);
  }

  getStitches(): StitchNode[] {
    return this.graph.getAll();
  }

  getRowStitchCount(row: number): number {
    return this.graph.getByRow(row).length;
  }

  canAddWorkingStitch(type: WorkingStitchType): boolean {
    return this.validateAddWorkingStitch(type) === null;
  }

  canAddSingleCrochet(): boolean {
    return this.canAddWorkingStitch(StitchType.SINGLE_CROCHET);
  }

  canAddIncrease(type: WorkingStitchType): boolean {
    return this.validateAddWorkingStitch(type) === null;
  }

  canAddDecrease(type: WorkingStitchType): boolean {
    return this.validateAddWorkingStitch(type, {
      placementKind: PlacementKind.DECREASE,
    }) === null;
  }

  canStartNewRow(): boolean {
    return this.validateStartNewRow() === null;
  }

  getAddWorkingStitchError(type: WorkingStitchType): string | null {
    return this.validateAddWorkingStitch(type)?.message ?? null;
  }

  getAddSingleCrochetError(): string | null {
    return this.getAddWorkingStitchError(StitchType.SINGLE_CROCHET);
  }

  getAddIncreaseError(type: WorkingStitchType): string | null {
    return this.validateAddWorkingStitch(type)?.message ?? null;
  }

  getAddDecreaseError(type: WorkingStitchType): string | null {
    return this.validateAddWorkingStitch(type, {
      placementKind: PlacementKind.DECREASE,
    })?.message ?? null;
  }

  getStartNewRowError(): string | null {
    return this.validateStartNewRow()?.message ?? null;
  }

  getSnapshot(): PatternSnapshot {
    return cloneSnapshot({
      stitches: this.getStitches(),
      currentRow: this.currentRow,
      foundationChainLength: this.foundationChainLength,
      foundationType: this.foundationType,
      rowDirections: { ...this.rowDirections },
    });
  }

  loadSnapshot(snapshot: PatternSnapshot): void {
    const normalized = normalizeSnapshot(snapshot);
    this.graph.clear();
    this.currentRow = normalized.currentRow;
    this.foundationChainLength = normalized.foundationChainLength;
    this.foundationType = normalized.foundationType;
    this.rowDirections = { ...normalized.rowDirections };

    restoreIdCounter(normalized.stitches);
    for (const stitch of normalized.stitches) {
      this.graph.add({
        ...stitch,
        position: { ...stitch.position },
      });
    }
  }

  reset(): void {
    this.graph.clear();
    this.currentRow = 0;
    this.foundationChainLength = 0;
    this.foundationType = FoundationType.CHAIN;
    this.rowDirections = {};
    resetIdCounter();
  }

  private createAndAddWorkingStitch(
    type: WorkingStitchType,
    attachToId: string,
    options: { placementKind?: PlacementKind; secondaryAttachToId?: string } = {},
  ): StitchNode {
    const rowStitches = this.graph.getByRow(this.currentRow);
    const stitchIndex = rowStitches.length;

    const stitch = createStitchNode(
      type,
      this.currentRow,
      stitchIndex,
      attachToId,
      options.placementKind ?? PlacementKind.NORMAL,
      options.secondaryAttachToId ?? null,
    );

    stitch.position = layoutPosition(type, this.currentRow, stitchIndex);

    this.graph.add(stitch);
    return stitch;
  }

  private validateFoundationChain(length: number): PlacementError | null {
    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      return new PlacementError('INVALID_CHAIN_LENGTH', formatChainLengthError());
    }

    if (this.graph.count() > 0) {
      return new PlacementError(
        'FOUNDATION_EXISTS',
        'Foundation already exists. Start a new pattern to reset.',
      );
    }

    return null;
  }

  private validateMagicRing(stitchCount: number): PlacementError | null {
    if (
      stitchCount < MIN_MAGIC_RING_STITCHES ||
      stitchCount > MAX_MAGIC_RING_STITCHES
    ) {
      return new PlacementError(
        'INVALID_MAGIC_RING_COUNT',
        formatMagicRingCountError(),
      );
    }

    if (this.graph.count() > 0) {
      return new PlacementError(
        'FOUNDATION_EXISTS',
        'Foundation already exists. Start a new pattern to reset.',
      );
    }

    return null;
  }

  private validateAddWorkingStitch(
    type: WorkingStitchType,
    options: { placementKind?: PlacementKind; secondaryAttachToId?: string } = {},
  ): PlacementError | null {
    if (!isWorkingStitchType(type)) {
      return new PlacementError('INVALID_STITCH_TYPE', 'Unsupported stitch type.');
    }

    if (this.foundationChainLength === 0) {
      return new PlacementError(
        'NO_FOUNDATION',
        'Add a foundation before placing stitches.',
      );
    }

    if (this.currentRow === 0) {
      return new PlacementError(
        'NO_TARGET_STITCH',
        'Stitches must be worked into row 1 or later.',
      );
    }

    const rowStitches = this.graph.getByRow(this.currentRow);
    const placementKind = options.placementKind ?? PlacementKind.NORMAL;
    const rowWidthTarget = this.getRowWidthTarget(this.currentRow);

    if (placementKind === PlacementKind.DECREASE) {
      if (!canPlaceDecrease(rowStitches, rowWidthTarget)) {
        return new PlacementError(
          'CANNOT_DECREASE',
          'Not enough stitches remain in the row below for a decrease.',
        );
      }
    } else if (isRowComplete(rowStitches, rowWidthTarget)) {
      return new PlacementError(
        'ROW_FULL',
        `Row ${this.currentRow} already has enough stitches for the row width.`,
      );
    }

    const slotIndex = countParentSlotsConsumed(rowStitches);
    const attachTarget = this.resolveParentAttachTarget(
      slotIndex,
      this.getRowDirection(this.currentRow),
    );
    if (!attachTarget && placementKind !== PlacementKind.DECREASE) {
      return new PlacementError(
        'NO_TARGET_STITCH',
        `No stitch available to attach to in row ${this.currentRow - 1}.`,
      );
    }

    if (placementKind === PlacementKind.DECREASE) {
      const decreaseTargets = this.getDecreaseTargets();
      if (!decreaseTargets) {
        return new PlacementError(
          'CANNOT_DECREASE',
          'Not enough stitches remain in the row below for a decrease.',
        );
      }
    }

    return null;
  }

  private validateStartNewRow(): PlacementError | null {
    if (this.foundationChainLength === 0) {
      return new PlacementError(
        'CANNOT_START_ROW',
        'Add a foundation before starting a new row.',
      );
    }

    if (this.currentRow === 0) {
      return null;
    }

    const currentRowStitches = this.graph.getByRow(this.currentRow);
    if (currentRowStitches.length === 0) {
      return new PlacementError(
        'CANNOT_START_ROW',
        'Current row has no stitches. Add stitches before starting a new row.',
      );
    }

    if (!isRowComplete(currentRowStitches, this.getRowWidthTarget(this.currentRow))) {
      const slots = countParentSlotsConsumed(currentRowStitches);
      const target = this.getRowWidthTarget(this.currentRow);
      return new PlacementError(
        'CANNOT_START_ROW',
        `Complete row ${this.currentRow} before starting a new row (${slots}/${target} stitches).`,
      );
    }

    const nextRowParentCount = this.getRowStitchCount(this.currentRow);
    if (nextRowParentCount === 0) {
      return new PlacementError(
        'CANNOT_START_ROW',
        'The next row has no stitches to work into.',
      );
    }

    return null;
  }

  private resolveParentAttachTarget(
    slotIndex: number,
    direction: WorkingDirection,
  ): StitchNode | null {
    const parentRow = this.currentRow - 1;
    const parentStitches = this.graph.getByRow(parentRow);

    if (parentRow === 0) {
      const attachColumn = resolveAttachColumn(
        slotIndex,
        this.foundationChainLength,
        direction,
      );
      return parentStitches[attachColumn] ?? null;
    }

    const ordered =
      direction === WorkingDirection.LEFT_TO_RIGHT
        ? parentStitches
        : [...parentStitches].reverse();
    return ordered[slotIndex] ?? null;
  }

  private getDecreaseTargets(): { primary: StitchNode; secondary: StitchNode } | null {
    const direction = this.getRowDirection(this.currentRow);
    const slotIndex = countParentSlotsConsumed(this.graph.getByRow(this.currentRow));
    const primary = this.resolveParentAttachTarget(slotIndex, direction);
    const secondary = this.resolveParentAttachTarget(slotIndex + 1, direction);

    if (!primary || !secondary) {
      return null;
    }

    return { primary, secondary };
  }
}
