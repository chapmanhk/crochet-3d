import type { PatternSnapshot, StitchNode } from './types';
import { PlacementError, StitchType, WorkingDirection } from './types';
import { StitchGraph } from './StitchGraph';
import { createStitchNode, resetIdCounter, restoreIdCounter } from './StitchNode';
import { layoutPosition } from './layout';
import {
  defaultDirectionForRow,
  resolveAttachColumn,
} from './workingDirection';

const MIN_CHAIN_LENGTH = 1;
const MAX_CHAIN_LENGTH = 500;

export { MIN_CHAIN_LENGTH, MAX_CHAIN_LENGTH };

export function formatChainLengthError(): string {
  return `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`;
}

function cloneSnapshot(snapshot: PatternSnapshot): PatternSnapshot {
  return {
    stitches: snapshot.stitches.map((stitch) => ({
      ...stitch,
      position: { ...stitch.position },
    })),
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    rowDirections: { ...snapshot.rowDirections },
  };
}

export class Pattern {
  private readonly graph = new StitchGraph();
  private currentRow = 0;
  private foundationChainLength = 0;
  private rowDirections: Record<number, WorkingDirection> = {};

  addFoundationChain(length: number): StitchNode[] {
    const error = this.validateFoundationChain(length);
    if (error) {
      throw error;
    }

    const stitches: StitchNode[] = [];
    for (let column = 0; column < length; column++) {
      const stitch = createStitchNode(StitchType.CHAIN, 0, column);
      this.graph.add(stitch);
      stitches.push(stitch);
    }

    this.foundationChainLength = length;
    this.currentRow = 0;
    this.rowDirections = {};
    return stitches;
  }

  addSingleCrochet(): StitchNode {
    const attachTarget = this.getNextAttachmentTarget();
    if (!attachTarget) {
      const error = this.validateAddSingleCrochet();
      if (error) {
        throw error;
      }
      throw new PlacementError(
        'NO_TARGET_STITCH',
        'No stitch available to attach the next single crochet.',
      );
    }

    return this.addSingleCrochetAt(attachTarget.id);
  }

  addSingleCrochetAt(attachToId: string): StitchNode {
    const error = this.validateAddSingleCrochet();
    if (error) {
      throw error;
    }

    const expectedTarget = this.getNextAttachmentTarget();
    if (!expectedTarget || expectedTarget.id !== attachToId) {
      throw new PlacementError(
        'INVALID_ATTACHMENT_TARGET',
        'That attachment point is not the next stitch for the current row.',
      );
    }

    const rowStitches = this.graph.getByRow(this.currentRow);
    const stitchIndex = rowStitches.length;
    const direction = this.getRowDirection(this.currentRow);
    const visualColumn = resolveAttachColumn(
      stitchIndex,
      this.foundationChainLength,
      direction,
    );

    const stitch = createStitchNode(
      StitchType.SINGLE_CROCHET,
      this.currentRow,
      stitchIndex,
      attachToId,
    );
    stitch.position = layoutPosition(
      StitchType.SINGLE_CROCHET,
      this.currentRow,
      visualColumn,
    );

    this.graph.add(stitch);
    return stitch;
  }

  getNextAttachmentTarget(): StitchNode | null {
    if (this.validateAddSingleCrochet() !== null) {
      return null;
    }

    const rowStitches = this.graph.getByRow(this.currentRow);
    const stitchIndex = rowStitches.length;
    const attachColumn = resolveAttachColumn(
      stitchIndex,
      this.foundationChainLength,
      this.getRowDirection(this.currentRow),
    );

    return this.graph.getByRow(this.currentRow - 1)[attachColumn] ?? null;
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

  getRowDirection(row: number): WorkingDirection {
    return this.rowDirections[row] ?? defaultDirectionForRow(row);
  }

  getStitches(): StitchNode[] {
    return this.graph.getAll();
  }

  getRowStitchCount(row: number): number {
    return this.graph.getByRow(row).length;
  }

  canAddSingleCrochet(): boolean {
    return this.validateAddSingleCrochet() === null;
  }

  canStartNewRow(): boolean {
    return this.validateStartNewRow() === null;
  }

  getAddSingleCrochetError(): string | null {
    return this.validateAddSingleCrochet()?.message ?? null;
  }

  getStartNewRowError(): string | null {
    return this.validateStartNewRow()?.message ?? null;
  }

  getSnapshot(): PatternSnapshot {
    return cloneSnapshot({
      stitches: this.getStitches(),
      currentRow: this.currentRow,
      foundationChainLength: this.foundationChainLength,
      rowDirections: { ...this.rowDirections },
    });
  }

  loadSnapshot(snapshot: PatternSnapshot): void {
    this.graph.clear();
    this.currentRow = snapshot.currentRow;
    this.foundationChainLength = snapshot.foundationChainLength;
    this.rowDirections = { ...snapshot.rowDirections };

    restoreIdCounter(snapshot.stitches);
    for (const stitch of snapshot.stitches) {
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
    this.rowDirections = {};
    resetIdCounter();
  }

  private validateFoundationChain(length: number): PlacementError | null {
    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      return new PlacementError('INVALID_CHAIN_LENGTH', formatChainLengthError());
    }

    if (this.graph.count() > 0) {
      return new PlacementError(
        'FOUNDATION_EXISTS',
        'Foundation chain already exists. Start a new pattern to reset.',
      );
    }

    return null;
  }

  private validateAddSingleCrochet(): PlacementError | null {
    if (this.foundationChainLength === 0) {
      return new PlacementError(
        'NO_FOUNDATION',
        'Add a foundation chain before placing single crochet stitches.',
      );
    }

    if (this.currentRow === 0) {
      return new PlacementError(
        'NO_TARGET_STITCH',
        'Single crochet must be worked into row 1 or later.',
      );
    }

    const rowStitches = this.graph.getByRow(this.currentRow);
    if (rowStitches.length >= this.foundationChainLength) {
      return new PlacementError(
        'ROW_FULL',
        `Row ${this.currentRow} already has ${this.foundationChainLength} stitches.`,
      );
    }

    const stitchIndex = rowStitches.length;
    const attachColumn = resolveAttachColumn(
      stitchIndex,
      this.foundationChainLength,
      this.getRowDirection(this.currentRow),
    );
    const attachTarget = this.graph.getByRow(this.currentRow - 1)[attachColumn];
    if (!attachTarget) {
      return new PlacementError(
        'NO_TARGET_STITCH',
        `No stitch available to attach to in row ${this.currentRow - 1}, column ${attachColumn}.`,
      );
    }

    return null;
  }

  private validateStartNewRow(): PlacementError | null {
    if (this.foundationChainLength === 0) {
      return new PlacementError(
        'CANNOT_START_ROW',
        'Add a foundation chain before starting a new row.',
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

    if (currentRowStitches.length < this.foundationChainLength) {
      return new PlacementError(
        'CANNOT_START_ROW',
        `Complete row ${this.currentRow} before starting a new row (${currentRowStitches.length}/${this.foundationChainLength} stitches).`,
      );
    }

    return null;
  }
}
