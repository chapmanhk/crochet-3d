import { describe, expect, it } from 'vitest';
import {
  Pattern,
  PlacementKind,
  StitchType,
} from '@engine/index';

function radialDistance(position: { x: number; z: number }): number {
  return Math.hypot(position.x, (position.z - 0.12) / 0.35);
}

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

  it('allows row 2 after a decrease-shaped row 1', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(4);
    pattern.startNewRow();
    pattern.addDecrease(StitchType.SINGLE_CROCHET);
    pattern.addDecrease(StitchType.SINGLE_CROCHET);

    expect(pattern.getRowStitchCount(1)).toBe(2);
    expect(pattern.canStartNewRow()).toBe(true);

    pattern.startNewRow();
    expect(pattern.getRowWidthTarget(2)).toBe(2);
    expect(pattern.canAddWorkingStitch(StitchType.SINGLE_CROCHET)).toBe(true);

    pattern.addSingleCrochet();
    pattern.addSingleCrochet();
    expect(pattern.getRowStitchCount(2)).toBe(2);
    expect(pattern.canStartNewRow()).toBe(true);
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

  it('lays out foundation chain stitches along the row', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(3);

    expect(chains[0]!.position.x).toBeLessThan(chains[1]!.position.x);
    expect(chains[1]!.position.x).toBeLessThan(chains[2]!.position.x);
    expect(chains.every((chain) => chain.position.x !== 0 || chain.column === 0)).toBe(true);
  });

  it('works stitches into a magic ring on row 1', () => {
    const pattern = new Pattern();
    const ring = pattern.addMagicRing(4);
    pattern.startNewRow();

    const stitch = pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
    expect(stitch.attachToId).toBe(ring[0]!.id);
    expect(pattern.getRowWidthTarget(1)).toBe(4);
  });

  it('lays out magic ring working rows in expanding circles', () => {
    const pattern = new Pattern();
    const ring = pattern.addMagicRing(4);
    pattern.startNewRow();

    for (let index = 0; index < 4; index += 1) {
      pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
    }

    const rowOne = pattern.getStitches().filter((stitch) => stitch.row === 1);
    const parentRadius = radialDistance(ring[0]!.position);

    for (const stitch of rowOne) {
      expect(radialDistance(stitch.position)).toBeGreaterThan(parentRadius);
    }

    pattern.startNewRow();
    pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
    const rowTwoFirst = pattern.getStitches().find((stitch) => stitch.row === 2)!;
    const rowOneRadius = radialDistance(rowOne[0]!.position);
    const rowTwoRadius = radialDistance(rowTwoFirst.position);
    expect(rowTwoRadius).toBeGreaterThan(rowOneRadius);
  });
});
