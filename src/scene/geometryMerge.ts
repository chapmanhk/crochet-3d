import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toCreasedNormals } from 'three-stdlib';
import { OUTLINE_CREASE_ANGLE } from './stitchMaterials';

function disposeGeometries(geometries: Iterable<THREE.BufferGeometry>): void {
  for (const geometry of geometries) {
    geometry.dispose();
  }
}

export function addOutlinedMeshes(
  parent: THREE.Object3D,
  fillGeometry: THREE.BufferGeometry,
  outlineGeometry: THREE.BufferGeometry,
  fillMaterial: THREE.MeshBasicMaterial,
  outlineMaterial: THREE.ShaderMaterial,
): void {
  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outlineMesh.renderOrder = 0;

  const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
  fillMesh.renderOrder = 1;

  parent.add(outlineMesh);
  parent.add(fillMesh);
}

export function mergeStrandGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) {
    throw new Error('Cannot merge an empty geometry list.');
  }

  if (geometries.length === 1) {
    return geometries[0]!;
  }

  const merged = mergeGeometries(geometries, false);
  if (!merged) {
    throw new Error('Failed to merge strand geometries.');
  }

  disposeGeometries(geometries);
  return merged;
}

export function mergeOutlinedStrands(geometries: THREE.BufferGeometry[]): {
  fill: THREE.BufferGeometry;
  outline: THREE.BufferGeometry;
} {
  if (geometries.length === 1) {
    const fill = geometries[0]!;
    const outline = toCreasedNormals(fill.clone(), OUTLINE_CREASE_ANGLE);
    return { fill, outline };
  }

  const outlineSources = geometries.map((geometry) =>
    toCreasedNormals(geometry.clone(), OUTLINE_CREASE_ANGLE),
  );
  const fill = mergeStrandGeometries(geometries);
  const outline = mergeStrandGeometries(outlineSources);

  return { fill, outline };
}

export function createMergedOutlinedMeshes(
  geometries: THREE.BufferGeometry[],
  fillMaterial: THREE.MeshBasicMaterial,
  outlineMaterial: THREE.ShaderMaterial,
): THREE.Group {
  const { fill, outline } = mergeOutlinedStrands(geometries);
  const group = new THREE.Group();
  addOutlinedMeshes(group, fill, outline, fillMaterial, outlineMaterial);
  return group;
}

export function disposeMergedOutlinedMeshes(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();

  for (const child of group.children) {
    if (child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh)) {
      geometries.add(child.geometry);
    }
  }

  disposeGeometries(geometries);
}
