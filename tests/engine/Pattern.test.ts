import { describe, expect, it } from 'vitest';
import { Pattern, PlacementError, StitchType } from '@engine/index';

describe('Pattern', () => {
  it('creates a foundation chain', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(5);

    expect(chains).toHaveLength(5);
    expect(chains.every((stitch) => stitch.type === StitchType.CHAIN)).toBe(true);
    expect(pattern.getFoundationChainLength()).toBe(5);
    expect(pattern.getCurrentRow()).toBe(0);
  });

  it('rejects invalid chain lengths', () => {
    const pattern = new Pattern();
    expect(() => pattern.addFoundationChain(0)).toThrow(PlacementError);
    expect(() => pattern.addFoundationChain(501)).toThrow(PlacementError);
  });

  it('rejects duplicate foundation chains', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    expect(() => pattern.addFoundationChain(3)).toThrow(PlacementError);
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

  it('fills a row up to foundation length', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();

    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    expect(() => pattern.addSingleCrochet()).toThrow(PlacementError);
  });

  it('starts additional rows after the first row has stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    const row = pattern.startNewRow();
    expect(row).toBe(2);
    expect(pattern.getCurrentRow()).toBe(2);
  });

  it('rejects starting a new row before the current row is complete', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    expect(() => pattern.startNewRow()).toThrow(PlacementError);
  });

  it('rejects starting a new row when the current row has no stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();

    expect(() => pattern.startNewRow()).toThrow(PlacementError);
  });

  it('resets the pattern', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(2);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.reset();

    expect(pattern.getStitches()).toHaveLength(0);
    expect(pattern.getFoundationChainLength()).toBe(0);
  });
});
