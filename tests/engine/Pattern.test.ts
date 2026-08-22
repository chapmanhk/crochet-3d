import { describe, expect, it } from 'vitest';
import {
  Pattern,
  PlacementError,
  StitchType,
  MAX_CHAIN_LENGTH,
  MIN_CHAIN_LENGTH,
} from '@engine/index';
import { resetIdCounter } from '@engine/StitchNode';

function expectPlacementError(
  action: () => void,
  code: PlacementError['code'],
): void {
  try {
    action();
    expect.unreachable('Expected PlacementError to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(PlacementError);
    expect((error as PlacementError).code).toBe(code);
  }
}

describe('Pattern', () => {
  it('creates a foundation chain', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(5);

    expect(chains).toHaveLength(5);
    expect(chains.every((stitch) => stitch.type === StitchType.CHAIN)).toBe(true);
    expect(pattern.getFoundationChainLength()).toBe(5);
    expect(pattern.getCurrentRow()).toBe(0);
  });

  it('accepts the minimum and maximum allowed chain lengths', () => {
    const minPattern = new Pattern();
    expect(minPattern.addFoundationChain(MIN_CHAIN_LENGTH)).toHaveLength(
      MIN_CHAIN_LENGTH,
    );

    const maxPattern = new Pattern();
    expect(maxPattern.addFoundationChain(MAX_CHAIN_LENGTH)).toHaveLength(
      MAX_CHAIN_LENGTH,
    );
  });

  it('rejects invalid chain lengths', () => {
    const pattern = new Pattern();
    expectPlacementError(() => pattern.addFoundationChain(0), 'INVALID_CHAIN_LENGTH');
    expectPlacementError(() => pattern.addFoundationChain(501), 'INVALID_CHAIN_LENGTH');
  });

  it('rejects duplicate foundation chains', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    expectPlacementError(() => pattern.addFoundationChain(3), 'FOUNDATION_EXISTS');
  });

  it('rejects single crochet before a foundation chain exists', () => {
    const pattern = new Pattern();
    expectPlacementError(() => pattern.addSingleCrochet(), 'NO_FOUNDATION');
  });

  it('rejects single crochet on the foundation row', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);

    try {
      pattern.addSingleCrochet();
      expect.unreachable('Expected PlacementError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PlacementError);
      expect((error as PlacementError).code).toBe('NO_TARGET_STITCH');
      expect((error as PlacementError).message).toMatch(/row 1 or later/i);
    }
  });

  it('adds single crochet on row 1 after starting a new row', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();

    const stitch = pattern.addSingleCrochet();
    expect(stitch.type).toBe(StitchType.SINGLE_CROCHET);
    expect(stitch.row).toBe(1);
    expect(stitch.column).toBe(0);
    expect(stitch.attachToId).toBeTruthy();
  });

  it('attaches single crochet to the matching stitch in the previous row', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(3);
    pattern.startNewRow();

    const first = pattern.addSingleCrochet();
    const second = pattern.addSingleCrochet();

    expect(first.attachToId).toBe(chains[0].id);
    expect(second.attachToId).toBe(chains[1].id);
  });

  it('rejects adding single crochet when the row is full', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    expectPlacementError(() => pattern.addSingleCrochet(), 'ROW_FULL');
  });

  it('starts the first working row from foundation', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);

    expect(pattern.startNewRow()).toBe(1);
    expect(pattern.getCurrentRow()).toBe(1);
  });

  it('starts additional rows after the previous row is complete', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    expect(pattern.startNewRow()).toBe(2);
    expect(pattern.getCurrentRow()).toBe(2);
  });

  it('rejects starting a new row before the current row is complete', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    expectPlacementError(() => pattern.startNewRow(), 'CANNOT_START_ROW');
  });

  it('rejects starting a new row when the current row has no stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();

    expectPlacementError(() => pattern.startNewRow(), 'CANNOT_START_ROW');
  });

  it('rejects starting a new row without a foundation chain', () => {
    const pattern = new Pattern();

    expectPlacementError(() => pattern.startNewRow(), 'CANNOT_START_ROW');
  });

  it('reports whether single crochet can be placed', () => {
    const pattern = new Pattern();

    expect(pattern.canAddSingleCrochet()).toBe(false);

    pattern.addFoundationChain(2);
    expect(pattern.canAddSingleCrochet()).toBe(false);

    pattern.startNewRow();
    expect(pattern.canAddSingleCrochet()).toBe(true);

    pattern.addSingleCrochet();
    pattern.addSingleCrochet();
    expect(pattern.canAddSingleCrochet()).toBe(false);
  });

  it('reports whether a new row can be started', () => {
    const pattern = new Pattern();

    expect(pattern.canStartNewRow()).toBe(false);

    pattern.addFoundationChain(2);
    expect(pattern.canStartNewRow()).toBe(true);

    pattern.startNewRow();
    expect(pattern.canStartNewRow()).toBe(false);

    pattern.addSingleCrochet();
    expect(pattern.canStartNewRow()).toBe(false);

    pattern.addSingleCrochet();
    expect(pattern.canStartNewRow()).toBe(true);
  });

  it('exposes pattern state through getSnapshot', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    const snapshot = pattern.getSnapshot();
    expect(snapshot.foundationChainLength).toBe(2);
    expect(snapshot.currentRow).toBe(1);
    expect(snapshot.stitches).toHaveLength(3);
  });

  it('resets the pattern', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.reset();

    expect(pattern.getStitches()).toHaveLength(0);
    expect(pattern.getFoundationChainLength()).toBe(0);
    expect(pattern.getCurrentRow()).toBe(0);
  });

  it('reports stitch counts per row', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    expect(pattern.getRowStitchCount(0)).toBe(3);
    expect(pattern.getRowStitchCount(1)).toBe(2);
    expect(pattern.getRowStitchCount(2)).toBe(0);
  });

  it('attaches row 2 single crochet to row 1 stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    const rowOne = [pattern.addSingleCrochet(), pattern.addSingleCrochet()];
    pattern.startNewRow();

    const rowTwoFirst = pattern.addSingleCrochet();
    expect(rowTwoFirst.attachToId).toBe(rowOne[0].id);
    expect(rowTwoFirst.row).toBe(2);
  });

  it('restarts stitch ids after reset', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(1);
    const firstId = pattern.getStitches()[0]?.id;

    pattern.reset();
    pattern.addFoundationChain(1);
    const secondId = pattern.getStitches()[0]?.id;

    expect(firstId).toBe('stitch-1');
    expect(secondId).toBe('stitch-1');
  });
});
