import type { PatternSnapshot, StitchNode } from './types';
import { PlacementError, StitchType } from './types';
import { StitchGraph } from './StitchGraph';
import { createStitchNode, resetIdCounter } from './StitchNode';
import { layoutPosition } from './layout';

const MIN_CHAIN_LENGTH = 1;
const MAX_CHAIN_LENGTH = 500;

export class Pattern {
  private readonly graph = new StitchGraph();
  private currentRow = 0;
  private foundationChainLength = 0;

  addFoundationChain(length: number): StitchNode[] {
    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      throw new PlacementError(
        'INVALID_CHAIN_LENGTH',
        `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`,
      );
    }

    if (this.graph.count() > 0) {
      throw new PlacementError(
        'FOUNDATION_EXISTS',
        'Foundation chain already exists. Start a new pattern to reset.',
      );
    }

    const stitches: StitchNode[] = [];
    for (let column = 0; column < length; column++) {
      const stitch = createStitchNode(StitchType.CHAIN, 0, column);
      this.graph.add(stitch);
      stitches.push(stitch);
    }

    this.foundationChainLength = length;
    this.currentRow = 0;
    return stitches;
  }

  addSingleCrochet(): StitchNode {
    if (this.foundationChainLength === 0) {
      throw new PlacementError(
        'NO_FOUNDATION',
        'Add a foundation chain before placing single crochet stitches.',
      );
    }

    const rowStitches = this.graph.getByRow(this.currentRow);
    const previousRow = this.graph.getByRow(this.currentRow - 1);

    if (this.currentRow === 0) {
      throw new PlacementError(
        'NO_TARGET_STITCH',
        'Single crochet must be worked into row 1 or later.',
      );
    }

    if (rowStitches.length >= this.foundationChainLength) {
      throw new PlacementError(
        'ROW_FULL',
        `Row ${this.currentRow} already has ${this.foundationChainLength} stitches.`,
      );
    }

    const column = rowStitches.length;
    const attachTarget = previousRow[column];

    if (!attachTarget) {
      throw new PlacementError(
        'NO_TARGET_STITCH',
        `No stitch available to attach to in row ${this.currentRow - 1}, column ${column}.`,
      );
    }

    const stitch = createStitchNode(
      StitchType.SINGLE_CROCHET,
      this.currentRow,
      column,
      attachTarget.id,
    );

    this.graph.add(stitch);
    return stitch;
  }

  startNewRow(): number {
    if (this.foundationChainLength === 0) {
      throw new PlacementError(
        'CANNOT_START_ROW',
        'Add a foundation chain before starting a new row.',
      );
    }

    if (this.currentRow === 0) {
      this.currentRow = 1;
      return this.currentRow;
    }

    const previousRowStitches = this.graph.getByRow(this.currentRow);
    if (previousRowStitches.length === 0) {
      throw new PlacementError(
        'CANNOT_START_ROW',
        'Current row has no stitches. Add stitches before starting a new row.',
      );
    }

    this.currentRow += 1;
    return this.currentRow;
  }

  getCurrentRow(): number {
    return this.currentRow;
  }

  getFoundationChainLength(): number {
    return this.foundationChainLength;
  }

  getStitches(): StitchNode[] {
    return this.graph.getAll();
  }

  getRowStitchCount(row: number): number {
    return this.graph.getByRow(row).length;
  }

  getSnapshot(): PatternSnapshot {
    return {
      stitches: this.getStitches(),
      currentRow: this.currentRow,
      foundationChainLength: this.foundationChainLength,
    };
  }

  reset(): void {
    this.graph.clear();
    this.currentRow = 0;
    this.foundationChainLength = 0;
    resetIdCounter();
  }

  /** Recompute positions after layout constant changes (testing helper). */
  relayout(): void {
    for (const stitch of this.graph.getAll()) {
      stitch.position = layoutPosition(stitch.type, stitch.row, stitch.column);
      this.graph.add(stitch);
    }
  }
}
