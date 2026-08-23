import { afterEach, describe, expect, it } from 'vitest';
import { Pattern, resetIdCounter, StitchType } from '@engine/index';
import { buildYarnSegments, getYarnSegmentManifests, measureSegmentsHeight, VISUAL_ROW_HEIGHT } from '../../src/scene/stitchGeometry';
import { ROW_HEIGHT } from '@engine/index';

function stitchesFromPattern(setup: (pattern: Pattern) => void) {
  resetIdCounter();
  const pattern = new Pattern();
  setup(pattern);
  return pattern.getStitches();
}

function disposeSegments(segments: ReturnType<typeof buildYarnSegments>) {
  for (const segment of segments) {
    segment.geometry.dispose();
  }
}

describe('stitchGeometry', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('returns no segments for an empty pattern', () => {
    expect(getYarnSegmentManifests([])).toEqual([]);
    expect(buildYarnSegments([])).toEqual([]);
  });

  it('emits a single foundation row segment', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addFoundationChain(3);
    });

    const manifests = getYarnSegmentManifests(stitches);
    expect(manifests.map((manifest) => manifest.key)).toEqual(['row-0']);

    const segments = buildYarnSegments(stitches);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.geometry.attributes.position.count).toBeGreaterThan(0);
    disposeSegments(segments);
  });

  it('emits row and join segments for a working row', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addFoundationChain(3);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
    });

    expect(getYarnSegmentManifests(stitches).map((manifest) => manifest.key)).toEqual([
      'row-0',
      'row-1',
      'join-1',
    ]);

    const segments = buildYarnSegments(stitches);
    expect(segments).toHaveLength(3);
    disposeSegments(segments);
  });

  it('emits join segments for each consecutive row pair', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addFoundationChain(3);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
      pattern.startNewRow();
      pattern.addSingleCrochet();
    });

    const keys = getYarnSegmentManifests(stitches).map((manifest) => manifest.key);
    expect(keys).toEqual(['row-0', 'row-1', 'row-2', 'join-1', 'join-2']);

    disposeSegments(buildYarnSegments(stitches));
  });

  it('produces stable segment keys when stitches are out of order', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addFoundationChain(3);
      pattern.startNewRow();
      pattern.addSingleCrochet();
    });

    const shuffled = [...stitches].reverse();
    expect(getYarnSegmentManifests(shuffled).map((manifest) => manifest.key)).toEqual([
      'row-0',
      'row-1',
      'join-1',
    ]);
  });

  it('produces more vertices for longer foundation chains', () => {
    const short = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(1);
      }),
    );
    const long = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(5);
      }),
    );

    expect(long[0]!.geometry.attributes.position.count).toBeGreaterThan(
      short[0]!.geometry.attributes.position.count,
    );

    disposeSegments(short);
    disposeSegments(long);
  });

  it('omits working row segment when stitches lack valid parents', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addFoundationChain(3);
    });

    const orphan: (typeof stitches)[number] = {
      id: 'orphan',
      type: StitchType.SINGLE_CROCHET,
      row: 1,
      column: 0,
      attachToId: 'missing',
      position: { x: 0, y: 1.2, z: 0.15 },
    };

    const keys = getYarnSegmentManifests([...stitches, orphan]).map((manifest) => manifest.key);
    expect(keys).toContain('row-0');
    expect(keys).toContain('join-1');
    expect(keys).not.toContain('row-1');
  });

  it('stacks each working row by a consistent visual height', () => {
    const oneRow = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(5);
        pattern.startNewRow();
        for (let index = 0; index < 5; index += 1) {
          pattern.addSingleCrochet();
        }
      }),
    );

    const twoRows = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(5);
        pattern.startNewRow();
        for (let index = 0; index < 5; index += 1) {
          pattern.addSingleCrochet();
        }
        pattern.startNewRow();
        for (let index = 0; index < 5; index += 1) {
          pattern.addSingleCrochet();
        }
      }),
    );

    const oneRowHeight = measureSegmentsHeight(oneRow);
    const twoRowHeight = measureSegmentsHeight(twoRows);
    const addedHeight = twoRowHeight - oneRowHeight;

    expect(addedHeight).toBeGreaterThan(VISUAL_ROW_HEIGHT * 0.85);
    expect(addedHeight).toBeLessThan(VISUAL_ROW_HEIGHT * 1.2);

    disposeSegments(oneRow);
    disposeSegments(twoRows);
  });

  it('working row geometry is taller than foundation-only geometry', () => {
    const foundationOnly = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(3);
      }),
    );
    const withScRow = buildYarnSegments(
      stitchesFromPattern((pattern) => {
        pattern.addFoundationChain(3);
        pattern.startNewRow();
        pattern.addSingleCrochet();
        pattern.addSingleCrochet();
        pattern.addSingleCrochet();
      }),
    );

    expect(measureSegmentsHeight(withScRow)).toBeGreaterThan(
      measureSegmentsHeight(foundationOnly),
    );

    disposeSegments(foundationOnly);
    disposeSegments(withScRow);
  });

  it('uses scene VISUAL_ROW_HEIGHT instead of engine ROW_HEIGHT for stacking', () => {
    expect(VISUAL_ROW_HEIGHT).toBeLessThan(ROW_HEIGHT * 0.25);
    expect(VISUAL_ROW_HEIGHT).toBe(0.22);
  });

  it('emits row and join segments for a magic ring working row', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addMagicRing(4);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
    });

    expect(getYarnSegmentManifests(stitches).map((manifest) => manifest.key)).toEqual([
      'row-0',
      'row-1',
      'join-1',
    ]);

    const segments = buildYarnSegments(stitches);
    expect(segments).toHaveLength(3);
    disposeSegments(segments);
  });

  it('renders multi-row magic ring patterns with expanding rounds', () => {
    const stitches = stitchesFromPattern((pattern) => {
      pattern.addMagicRing(4);
      pattern.startNewRow();
      for (let index = 0; index < 4; index += 1) {
        pattern.addSingleCrochet();
      }
      pattern.startNewRow();
      for (let index = 0; index < 4; index += 1) {
        pattern.addSingleCrochet();
      }
    });

    const keys = getYarnSegmentManifests(stitches).map((manifest) => manifest.key);
    expect(keys).toEqual(['row-0', 'row-1', 'row-2', 'join-1', 'join-2']);

    const segments = buildYarnSegments(stitches);
    expect(segments).toHaveLength(5);
    expect(measureSegmentsHeight(segments)).toBeGreaterThan(VISUAL_ROW_HEIGHT * 1.5);
    disposeSegments(segments);
  });
});
