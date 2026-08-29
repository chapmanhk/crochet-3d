import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createMergedOutlinedMeshes,
  disposeMergedOutlinedMeshes,
  mergeOutlinedStrands,
  mergeStrandGeometries,
} from '../../src/scene/geometryMerge';
import {
  createStitchFillMaterial,
  createStitchOutlineMaterial,
} from '../../src/scene/stitchMaterials';

describe('geometryMerge', () => {
  it('disposes source geometries after merging multiple strands', () => {
    const first = new THREE.BoxGeometry(1, 1, 1);
    const second = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const firstDispose = vi.spyOn(first, 'dispose');
    const secondDispose = vi.spyOn(second, 'dispose');

    const merged = mergeStrandGeometries([first, second]);

    expect(merged).toBeInstanceOf(THREE.BufferGeometry);
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).toHaveBeenCalledTimes(1);
    merged.dispose();
  });

  it('disposes intermediate outline sources after building a merged pair', () => {
    const first = new THREE.BoxGeometry(1, 1, 1);
    const second = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const firstDispose = vi.spyOn(first, 'dispose');
    const secondDispose = vi.spyOn(second, 'dispose');

    const { fill, outline } = mergeOutlinedStrands([first, second]);

    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).toHaveBeenCalledTimes(1);
    expect(fill).not.toBe(outline);

    fill.dispose();
    outline.dispose();
  });

  it('disposes merged segment meshes without touching instanced children', () => {
    const fillMaterial = createStitchFillMaterial();
    const outlineMaterial = createStitchOutlineMaterial();
    const group = createMergedOutlinedMeshes(
      [new THREE.BoxGeometry(1, 1, 1), new THREE.BoxGeometry(0.5, 0.5, 0.5)],
      fillMaterial,
      outlineMaterial,
    );

    const fill = group.children[1] as THREE.Mesh;
    const outline = group.children[0] as THREE.Mesh;
    const fillDispose = vi.spyOn(fill.geometry, 'dispose');
    const outlineDispose = vi.spyOn(outline.geometry, 'dispose');

    disposeMergedOutlinedMeshes(group);

    expect(fillDispose).toHaveBeenCalledTimes(1);
    expect(outlineDispose).toHaveBeenCalledTimes(1);

    fillMaterial.dispose();
    outlineMaterial.dispose();
  });
});
