import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createInstancedOutlinedSegment,
  disposeInstancedOutlinedSegment,
  type InstancedStitchBatch,
} from '../../src/scene/instancedStitches';
import {
  createStitchFillMaterial,
  createStitchOutlineMaterial,
} from '../../src/scene/stitchMaterials';

describe('instancedStitches', () => {
  let fillMaterial: THREE.MeshBasicMaterial;
  let outlineMaterial: THREE.ShaderMaterial;

  afterEach(() => {
    fillMaterial?.dispose();
    outlineMaterial?.dispose();
  });

  it('creates instanced outline and fill meshes grouped by prototype', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const batch: InstancedStitchBatch = {
      prototypes: new Map([['sc', geometry]]),
      instances: [
        { prototypeKey: 'sc', matrix: new THREE.Matrix4().makeTranslation(0, 0, 0) },
        { prototypeKey: 'sc', matrix: new THREE.Matrix4().makeTranslation(1, 0, 0) },
      ],
      bridgeGeometries: [],
    };

    fillMaterial = createStitchFillMaterial();
    outlineMaterial = createStitchOutlineMaterial();
    const group = createInstancedOutlinedSegment(batch, fillMaterial, outlineMaterial);

    expect(group.children).toHaveLength(2);
    expect(group.children.every((child) => child instanceof THREE.InstancedMesh)).toBe(true);

    const fillMesh = group.children[1] as THREE.InstancedMesh;
    expect(fillMesh.count).toBe(2);
    expect(fillMesh.renderOrder).toBe(1);

    const outlineMesh = group.children[0] as THREE.InstancedMesh;
    expect(outlineMesh.renderOrder).toBe(0);

    disposeInstancedOutlinedSegment(group);
  });

  it('adds merged bridge meshes alongside instanced stitch bodies', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const bridge = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const batch: InstancedStitchBatch = {
      prototypes: new Map([['sc', geometry]]),
      instances: [
        { prototypeKey: 'sc', matrix: new THREE.Matrix4() },
        { prototypeKey: 'sc', matrix: new THREE.Matrix4().makeTranslation(1, 0, 0) },
      ],
      bridgeGeometries: [bridge],
    };

    fillMaterial = createStitchFillMaterial();
    outlineMaterial = createStitchOutlineMaterial();
    const group = createInstancedOutlinedSegment(batch, fillMaterial, outlineMaterial);

    expect(group.children).toHaveLength(4);
    expect(
      group.children.filter((child) => child instanceof THREE.InstancedMesh),
    ).toHaveLength(2);
    expect(
      group.children.filter(
        (child) => child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh),
      ),
    ).toHaveLength(2);

    disposeInstancedOutlinedSegment(group);
  });
});
