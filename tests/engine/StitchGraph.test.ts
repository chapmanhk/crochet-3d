import { describe, expect, it, beforeEach } from 'vitest';
import { StitchGraph } from '@engine/StitchGraph';
import { createStitchNode, resetIdCounter } from '@engine/StitchNode';
import { StitchType } from '@engine/index';

describe('StitchGraph', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('stores stitches and returns defensive copies', () => {
    const graph = new StitchGraph();
    const stitch = createStitchNode(StitchType.CHAIN, 0, 0);
    graph.add(stitch);

    const stored = graph.get(stitch.id);
    expect(stored).toEqual(stitch);
    expect(stored).not.toBe(stitch);

    stored!.column = 99;
    expect(graph.get(stitch.id)?.column).toBe(0);
  });

  it('returns stitches sorted by row then column', () => {
    const graph = new StitchGraph();
    graph.add(createStitchNode(StitchType.SINGLE_CROCHET, 1, 1));
    graph.add(createStitchNode(StitchType.CHAIN, 0, 1));
    graph.add(createStitchNode(StitchType.CHAIN, 0, 0));

    expect(graph.getAll().map((stitch) => [stitch.row, stitch.column])).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ]);
  });

  it('filters stitches by row', () => {
    const graph = new StitchGraph();
    graph.add(createStitchNode(StitchType.CHAIN, 0, 0));
    graph.add(createStitchNode(StitchType.SINGLE_CROCHET, 1, 0));

    expect(graph.getByRow(1)).toHaveLength(1);
    expect(graph.getByRow(1)[0]?.type).toBe(StitchType.SINGLE_CROCHET);
  });

  it('clears all stitches', () => {
    const graph = new StitchGraph();
    graph.add(createStitchNode(StitchType.CHAIN, 0, 0));
    graph.clear();

    expect(graph.count()).toBe(0);
    expect(graph.getAll()).toEqual([]);
  });
});
