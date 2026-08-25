import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Pattern, FoundationType, resetIdCounter, StitchType } from '@engine/index';
import { INSTANCED_ROW_MIN_STITCHES } from '../../src/scene/stitchGeometry';
import { StitchRenderer } from '../../src/scene/StitchRenderer';

describe('StitchRenderer', () => {
  let renderer: StitchRenderer;

  afterEach(() => {
    renderer?.dispose();
    resetIdCounter();
  });

  it('sync with empty stitches leaves the group empty', () => {
    renderer = new StitchRenderer();
    renderer.sync([], FoundationType.CHAIN);
    expect(renderer.group.children).toHaveLength(0);
  });

  it('sync adds one segment group for a foundation chain', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches(), FoundationType.CHAIN);

    expect(renderer.group.children).toHaveLength(1);
    const segmentGroup = renderer.group.children[0] as THREE.Group;
    expect(segmentGroup.children.length).toBe(2);
    expect(segmentGroup.children[0]).toBeInstanceOf(THREE.Mesh);
    expect(segmentGroup.children[1]).toBeInstanceOf(THREE.Mesh);
  });

  it('sync removes stale segments when the pattern shrinks', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches(), FoundationType.CHAIN);
    expect(renderer.group.children.length).toBeGreaterThan(1);

    renderer.sync(pattern.getStitches().filter((stitch) => stitch.row === 0), FoundationType.CHAIN);
    expect(renderer.group.children).toHaveLength(1);
  });

  it('sync is idempotent when stitch data is unchanged', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    const stitches = pattern.getStitches();

    renderer = new StitchRenderer();
    renderer.sync(stitches, FoundationType.CHAIN);
    const firstGeometry = rowSegmentGeometry(renderer, 0);

    renderer.sync(stitches, FoundationType.CHAIN);
    const secondGeometry = rowSegmentGeometry(renderer, 0);

    expect(secondGeometry).toBe(firstGeometry);
  });

  it('dispose clears all segment groups', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(2);

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches(), FoundationType.CHAIN);
    renderer.dispose();

    expect(renderer.group.children).toHaveLength(0);
  });

  it('updateOutlineSize refreshes the outline shader size uniform', () => {
    renderer = new StitchRenderer();
    const material = (renderer as unknown as { outlineMaterial: THREE.ShaderMaterial })
      .outlineMaterial;
    const size = material.uniforms.size!.value as THREE.Vector2;

    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 768 });
    renderer.updateOutlineSize();

    expect(size.x).toBe(1024);
    expect(size.y).toBe(768);

    renderer.dispose();
    vi.unstubAllGlobals();
  });

  it('sync uses instanced meshes for large flat working rows', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(INSTANCED_ROW_MIN_STITCHES);
    pattern.startNewRow();
    for (let index = 0; index < INSTANCED_ROW_MIN_STITCHES; index += 1) {
      pattern.addSingleCrochet();
    }

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches(), FoundationType.CHAIN);

    const workingRowGroup = renderer.group.children[1] as THREE.Group;
    expect(
      workingRowGroup.children.some((child) => child instanceof THREE.InstancedMesh),
    ).toBe(true);
  });

  it('foundation row segment uses exactly two merged meshes', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(6);

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches(), FoundationType.CHAIN);

    const foundationGroup = renderer.group.children[0] as THREE.Group;
    expect(foundationGroup.children).toHaveLength(2);
    expect(foundationGroup.children.every((child) => child instanceof THREE.Mesh)).toBe(true);
    expect(
      foundationGroup.children.some((child) => child instanceof THREE.InstancedMesh),
    ).toBe(false);
  });

  it('rebuilds row segment when increase-pair adjacency changes', () => {
    resetIdCounter();
    const normal = new Pattern();
    normal.addFoundationChain(4);
    normal.startNewRow();
    normal.addSingleCrochet();
    normal.addSingleCrochet();

    resetIdCounter();
    const increased = new Pattern();
    increased.addFoundationChain(4);
    increased.startNewRow();
    increased.addIncrease(StitchType.SINGLE_CROCHET);
    increased.addSingleCrochet();

    renderer = new StitchRenderer();
    renderer.sync(normal.getStitches(), FoundationType.CHAIN);
    const firstGeometry = rowSegmentGeometry(renderer, 1);

    renderer.sync(increased.getStitches(), FoundationType.CHAIN);
    const secondGeometry = rowSegmentGeometry(renderer, 1);

    expect(secondGeometry).not.toBe(firstGeometry);
  });
});

function rowSegmentGeometry(renderer: StitchRenderer, childIndex: number): THREE.BufferGeometry {
  const segmentGroup = renderer.group.children[childIndex] as THREE.Group;
  const fill = segmentGroup.children[1] as THREE.Mesh;
  return fill.geometry;
}
