import { afterEach, describe, expect, it } from 'vitest';
import { Pattern, FoundationType, resetIdCounter, StitchType } from '@engine/index';
import {
  buildYarnSegmentRenderData,
  INSTANCED_ROW_MIN_STITCHES,
} from '../../src/scene/stitchGeometry';

describe('instanced stitch rendering', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('uses instanced rendering for large flat working rows', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(INSTANCED_ROW_MIN_STITCHES + 2);
    pattern.startNewRow();
    for (let index = 0; index < INSTANCED_ROW_MIN_STITCHES + 2; index += 1) {
      pattern.addSingleCrochet();
    }

    const renderData = buildYarnSegmentRenderData(
      'row-1',
      pattern.getStitches(),
      FoundationType.CHAIN,
    );

    expect(renderData?.mode).toBe('instanced');
    expect(renderData?.instanced?.instances.length).toBe(INSTANCED_ROW_MIN_STITCHES + 2);
    expect(renderData?.instanced?.prototypes.size).toBeGreaterThan(0);
  });

  it('merges foundation row geometry into a single mesh pair', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(6);

    const renderData = buildYarnSegmentRenderData(
      'row-0',
      pattern.getStitches(),
      FoundationType.CHAIN,
    );

    expect(renderData?.mode).toBe('merged');
    expect(renderData?.geometries?.length).toBeGreaterThan(1);
  });

  it('uses merged rendering for small working rows below the instanced threshold', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    for (let index = 0; index < 3; index += 1) {
      pattern.addSingleCrochet();
    }

    const renderData = buildYarnSegmentRenderData(
      'row-1',
      pattern.getStitches(),
      FoundationType.CHAIN,
    );

    expect(renderData?.mode).toBe('merged');
    expect(renderData?.geometries?.length).toBeGreaterThan(0);
  });

  it('keeps magic ring working rows on merged geometry even at scale', () => {
    const stitchCount = INSTANCED_ROW_MIN_STITCHES + 5;
    const pattern = new Pattern();
    pattern.addMagicRing(stitchCount);
    pattern.startNewRow();
    for (let index = 0; index < stitchCount; index += 1) {
      pattern.addSingleCrochet();
    }

    const renderData = buildYarnSegmentRenderData(
      'row-1',
      pattern.getStitches(),
      FoundationType.MAGIC_RING,
    );

    expect(renderData?.mode).toBe('merged');
    expect(renderData?.geometries?.length).toBeGreaterThan(0);
  });

  it('reuses stitch prototypes across instances', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(10);
    pattern.startNewRow();
    for (let index = 0; index < 10; index += 1) {
      pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
    }

    const renderData = buildYarnSegmentRenderData(
      'row-1',
      pattern.getStitches(),
      FoundationType.CHAIN,
    );

    expect(renderData?.mode).toBe('instanced');
    const batch = renderData?.instanced;
    expect(batch?.prototypes.size).toBeLessThan(batch?.instances.length ?? 0);
  });
});
