import { afterEach, describe, expect, it } from 'vitest';
import { Pattern, resetIdCounter, StitchType } from '@engine/index';
import {
  buildDrapeGraph,
  DRAPE_SPRING_TUNING,
  MAX_DRAPE_SIMULATION_NODES,
} from '../../src/scene/preview/buildDrapeGraph';

describe('buildDrapeGraph', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('connects working stitches to parent loop anchors', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(4);
    pattern.startNewRow();
    for (let index = 0; index < 4; index += 1) {
      pattern.addSingleCrochet();
    }

    const graph = buildDrapeGraph(pattern.getStitches());
    const loopEdges = graph.edges.filter((edge) => edge.kind === 'loop');

    expect(loopEdges).toHaveLength(4);
    expect(loopEdges.every((edge) => edge.stiffness === DRAPE_SPRING_TUNING.loop.stiffness)).toBe(
      true,
    );
    expect(graph.nodes.some((node) => node.fixed && node.id.startsWith('anchor-'))).toBe(true);
  });

  it('links same-row neighbors with post springs', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(4);
    pattern.startNewRow();
    for (let index = 0; index < 4; index += 1) {
      pattern.addSingleCrochet();
    }

    const graph = buildDrapeGraph(pattern.getStitches());
    const postEdges = graph.edges.filter((edge) => edge.kind === 'post');

    expect(postEdges).toHaveLength(3);
    expect(postEdges.every((edge) => edge.stiffness === DRAPE_SPRING_TUNING.post.stiffness)).toBe(
      true,
    );
  });

  it('caps simulation nodes for very large patterns', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(50);
    for (let row = 0; row < 8; row += 1) {
      pattern.startNewRow();
      for (let index = 0; index < 50; index += 1) {
        pattern.addWorkingStitch(StitchType.SINGLE_CROCHET);
      }
    }

    const graph = buildDrapeGraph(pattern.getStitches());
    const dynamicNodes = graph.nodes.filter((node) => !node.fixed);

    expect(dynamicNodes.length).toBeLessThanOrEqual(MAX_DRAPE_SIMULATION_NODES);
  });

  it('includes only complete rows when capping simulation size', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(60);
    for (let row = 0; row < 4; row += 1) {
      pattern.startNewRow();
      for (let index = 0; index < 60; index += 1) {
        pattern.addSingleCrochet();
      }
    }

    const graph = buildDrapeGraph(pattern.getStitches());
    const dynamicNodeIds = new Set(graph.nodes.filter((node) => !node.fixed).map((node) => node.id));
    const includedRows = new Set(
      pattern
        .getStitches()
        .filter((stitch) => stitch.row > 0 && dynamicNodeIds.has(stitch.id))
        .map((stitch) => stitch.row),
    );

    expect(dynamicNodeIds.size).toBe(180);
    expect(includedRows).toEqual(new Set([1, 2, 3]));
  });
});
