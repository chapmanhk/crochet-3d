import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createOutlinedStitch,
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  disposeOutlinedStitch,
} from '../../src/scene/stitchMaterials';

describe('stitchMaterials', () => {
  it('creates an outlined stitch group with fill above outline', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const fillMaterial = createStitchFillMaterial();
    const outlineMaterial = createStitchOutlineMaterial();
    const group = createOutlinedStitch(geometry, fillMaterial, outlineMaterial);

    expect(group.children).toHaveLength(2);

    const outline = group.children[0] as THREE.Mesh;
    const fill = group.children[1] as THREE.Mesh;

    expect(outline.geometry).toBe(fill.geometry);
    expect(outline.scale.x).toBeGreaterThan(fill.scale.x);
    expect(outline.renderOrder).toBeLessThan(fill.renderOrder);

    disposeOutlinedStitch(group);
    fillMaterial.dispose();
    outlineMaterial.dispose();
  });

  it('disposes shared geometry only once', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const disposeSpy = vi.spyOn(geometry, 'dispose');
    const group = createOutlinedStitch(
      geometry,
      createStitchFillMaterial(),
      createStitchOutlineMaterial(),
    );

    disposeOutlinedStitch(group);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
