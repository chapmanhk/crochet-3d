import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createOutlinedStitch,
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  disposeOutlinedStitch,
  updateOutlineMaterialSize,
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

    expect(outline.geometry).not.toBe(fill.geometry);
    expect(outline.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(outline.renderOrder).toBeLessThan(fill.renderOrder);

    disposeOutlinedStitch(group);
    fillMaterial.dispose();
    outlineMaterial.dispose();
  });

  it('uses a slightly darker yarn color for the outline stroke', () => {
    const fillMaterial = createStitchFillMaterial();
    const outlineMaterial = createStitchOutlineMaterial();
    const fillHsl = { h: 0, s: 0, l: 0 };
    const outlineHsl = { h: 0, s: 0, l: 0 };

    fillMaterial.color.getHSL(fillHsl);
    (outlineMaterial.uniforms.color?.value as THREE.Color).getHSL(outlineHsl);

    expect(outlineHsl.l).toBeLessThan(fillHsl.l);
    expect(outlineHsl.h).toBeCloseTo(fillHsl.h, 5);

    fillMaterial.dispose();
    outlineMaterial.dispose();
  });

  it('disposes fill and outline geometries', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const group = createOutlinedStitch(
      geometry,
      createStitchFillMaterial(),
      createStitchOutlineMaterial(),
    );

    const outline = group.children[0] as THREE.Mesh;
    const fill = group.children[1] as THREE.Mesh;
    const outlineDispose = vi.spyOn(outline.geometry, 'dispose');
    const fillDispose = vi.spyOn(fill.geometry, 'dispose');

    disposeOutlinedStitch(group);
    expect(outlineDispose).toHaveBeenCalledTimes(1);
    expect(fillDispose).toHaveBeenCalledTimes(1);
  });

  it('updates outline shader size uniform on resize', () => {
    const outlineMaterial = createStitchOutlineMaterial();
    const size = outlineMaterial.uniforms.size!.value as THREE.Vector2;

    vi.stubGlobal('window', { innerWidth: 800, innerHeight: 600 });
    updateOutlineMaterialSize(outlineMaterial);

    expect(size.x).toBe(800);
    expect(size.y).toBe(600);

    outlineMaterial.dispose();
    vi.unstubAllGlobals();
  });
});
