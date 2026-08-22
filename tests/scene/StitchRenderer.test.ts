import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pattern, resetIdCounter } from '@engine/index';
import { StitchRenderer } from '../../src/scene/StitchRenderer';

describe('StitchRenderer', () => {
  let renderer: StitchRenderer;

  afterEach(() => {
    renderer?.dispose();
    resetIdCounter();
  });

  it('sync with empty stitches leaves the group empty', () => {
    renderer = new StitchRenderer();
    renderer.sync([]);
    expect(renderer.group.children).toHaveLength(0);
  });

  it('sync adds one segment group for a foundation chain', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches());

    expect(renderer.group.children).toHaveLength(1);
    expect((renderer.group.children[0] as THREE.Group).children).toHaveLength(2);
  });

  it('sync removes stale segments when the pattern shrinks', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    pattern.startNewRow();
    pattern.addSingleCrochet();

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches());
    expect(renderer.group.children.length).toBeGreaterThan(1);

    renderer.sync(pattern.getStitches().filter((stitch) => stitch.row === 0));
    expect(renderer.group.children).toHaveLength(1);
  });

  it('sync is idempotent when stitch data is unchanged', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    const stitches = pattern.getStitches();

    renderer = new StitchRenderer();
    renderer.sync(stitches);
    const firstGeometry = (renderer.group.children[0] as THREE.Group).children[0] as THREE.Mesh;

    renderer.sync(stitches);
    const secondGeometry = (renderer.group.children[0] as THREE.Group).children[0] as THREE.Mesh;

    expect(secondGeometry.geometry).toBe(firstGeometry.geometry);
  });

  it('dispose clears all segment groups', () => {
    resetIdCounter();
    const pattern = new Pattern();
    pattern.addFoundationChain(2);

    renderer = new StitchRenderer();
    renderer.sync(pattern.getStitches());
    renderer.dispose();

    expect(renderer.group.children).toHaveLength(0);
  });
});
