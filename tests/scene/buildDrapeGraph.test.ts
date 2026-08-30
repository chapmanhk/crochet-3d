import { afterEach, describe, expect, it } from 'vitest';
import { FoundationType, Pattern, resetIdCounter, StitchType } from '@engine/index';
import {
  buildDrapeGraph,
  DRAPE_SPRING_TUNING,
  MAX_DRAPE_SIMULATION_NODES,
} from '../../src/scene/preview/buildDrapeGraph';
import { getDrapeLoopAnchorPosition } from '../../src/scene/stitchGeometry';

describe('buildDrapeGraph', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('returns an empty graph for no stitches', () => {
    expect(buildDrapeGraph([])).toEqual({ nodes: [], edges: [] });
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

  it('links decreases to secondary parent loop anchors', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(4);
    pattern.startNewRow();
    pattern.addSingleCrochet();
    pattern.addSingleCrochet();
    pattern.addDecrease(StitchType.SINGLE_CROCHET);

    const graph = buildDrapeGraph(pattern.getStitches());
    const secondaryEdges = graph.edges.filter((edge) => edge.kind === 'secondary');

    expect(secondaryEdges).toHaveLength(1);
    expect(secondaryEdges[0]!.stiffness).toBe(DRAPE_SPRING_TUNING.secondary.stiffness);
  });

  it('uses scene loop anchors for foundation parents', () => {
    const pattern = new Pattern();
    const chains = pattern.addFoundationChain(4);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    const stitches = pattern.getStitches();
    const graph = buildDrapeGraph(stitches, FoundationType.CHAIN);
    const chain = stitches.find((stitch) => stitch.id === chains[0]!.id)!;
    const expectedAnchor = getDrapeLoopAnchorPosition(chain, FoundationType.CHAIN);
    const anchorNode = graph.nodes.find((node) => node.id === `anchor-${chain.id}`);

    expect(anchorNode?.position).toEqual(expectedAnchor);
    expect(anchorNode?.fixed).toBe(true);
  });

  it('positions magic ring loop anchors with round foundation Z', () => {
    const pattern = new Pattern();
    pattern.addMagicRing(4);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    const stitches = pattern.getStitches();
    const chainGraph = buildDrapeGraph(stitches, FoundationType.CHAIN);
    const ringGraph = buildDrapeGraph(stitches, FoundationType.MAGIC_RING);
    const foundationStitch = stitches.find((stitch) => stitch.row === 0)!;
    const chainAnchor = chainGraph.nodes.find((node) => node.id === `anchor-${foundationStitch.id}`);
    const ringAnchor = ringGraph.nodes.find((node) => node.id === `anchor-${foundationStitch.id}`);

    expect(ringAnchor?.position[2]).not.toBe(chainAnchor?.position[2]);
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
    expect(includedRows).toEqual(new Set([2, 3, 4]));
  });

  it('orders magic ring post springs by angular position', () => {
    const pattern = new Pattern();
    pattern.addMagicRing(6);
    pattern.startNewRow();
    for (let index = 0; index < 6; index += 1) {
      pattern.addSingleCrochet();
    }

    const stitches = pattern.getStitches();
    const rowStitches = stitches.filter((stitch) => stitch.row === 1);
    const angleById = new Map(
      rowStitches.map((stitch) => [
        stitch.id,
        Math.atan2(stitch.position.z, stitch.position.x),
      ]),
    );
    const graph = buildDrapeGraph(stitches, FoundationType.MAGIC_RING);
    const postEdges = graph.edges.filter((edge) => edge.kind === 'post');

    expect(postEdges).toHaveLength(5);
    for (const edge of postEdges) {
      expect(angleById.get(edge.toId)!).toBeGreaterThan(angleById.get(edge.fromId)!);
    }
  });
});
