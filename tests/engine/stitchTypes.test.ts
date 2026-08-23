import { describe, expect, it } from 'vitest';
import {
  Pattern,
  PlacementKind,
  StitchType,
} from '@engine/index';

describe('stitch types', () => {
  it('adds half double crochet stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();

    const stitch = pattern.addWorkingStitch(StitchType.HALF_DOUBLE_CROCHET);
    expect(stitch.type).toBe(StitchType.HALF_DOUBLE_CROCHET);
  });

  it('adds double crochet stitches', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();

    const stitch = pattern.addWorkingStitch(StitchType.DOUBLE_CROCHET);
    expect(stitch.type).toBe(StitchType.DOUBLE_CROCHET);
  });

  it('attaches half double crochet to the first foundation stitch', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(3);
    pattern.startNewRow();

    const stitch = pattern.addWorkingStitch(StitchType.HALF_DOUBLE_CROCHET);
    expect(stitch.attachToId).toBe(chains[0]!.id);
  });

  it('maps row 2 attachments across an increase row in working order', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    const [incFirst, incSecond] = pattern.addIncrease(StitchType.SINGLE_CROCHET);
    const sc1 = pattern.addSingleCrochet();
    const sc2 = pattern.addSingleCrochet();

    pattern.startNewRow();
    const r2a = pattern.addSingleCrochet();
    const r2b = pattern.addSingleCrochet();
    const r2c = pattern.addSingleCrochet();

    // Row 2 works right-to-left across the four stitches below.
    expect(r2a.attachToId).toBe(sc2.id);
    expect(r2b.attachToId).toBe(sc1.id);
    expect(r2c.attachToId).toBe(incSecond.id);
    expect(r2c.attachToId).not.toBe(incFirst.id);
  });

  it('places an increase as two stitches in one parent slot', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(3);
    pattern.startNewRow();

    const [first, second] = pattern.addIncrease(StitchType.SINGLE_CROCHET);
    expect(first.attachToId).toBe(chains[0]!.id);
    expect(second.attachToId).toBe(chains[0]!.id);
    expect(second.placementKind).toBe(PlacementKind.INCREASE_SECOND);
    expect(pattern.getRowStitchCount(1)).toBe(2);
    expect(pattern.getParentSlotsConsumed(1)).toBe(1);
  });

  it('places a decrease across two parent stitches', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(4);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();

    const decrease = pattern.addDecrease(StitchType.SINGLE_CROCHET);
    expect(decrease.placementKind).toBe(PlacementKind.DECREASE);
    expect(decrease.attachToId).toBe(chains[2]!.id);
    expect(decrease.secondaryAttachToId).toBe(chains[3]!.id);
    expect(pattern.getParentSlotsConsumed(1)).toBe(4);
  });
});

describe('magic ring', () => {
  it('creates a magic ring foundation', () => {
    const pattern = new Pattern();
    const stitches = pattern.addMagicRing(6);

    expect(stitches).toHaveLength(6);
    expect(pattern.getFoundationType()).toBe('magic_ring');
    expect(pattern.getSnapshot().foundationType).toBe('magic_ring');
  });
});
