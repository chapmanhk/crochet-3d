import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toCreasedNormals } from 'three-stdlib';

const OUTLINE_CREASE_ANGLE = Math.PI;

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

  return merged;
}

export function mergeOutlinedStrands(geometries: THREE.BufferGeometry[]): {
  fill: THREE.BufferGeometry;
  outline: THREE.BufferGeometry;
} {
  const fill = mergeStrandGeometries(geometries);
  const outlineSources = geometries.map((geometry) =>
    toCreasedNormals(geometry.clone(), OUTLINE_CREASE_ANGLE),
  );
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

  const outlineMesh = new THREE.Mesh(outline, outlineMaterial);
  outlineMesh.renderOrder = 0;

  const fillMesh = new THREE.Mesh(fill, fillMaterial);
  fillMesh.renderOrder = 1;

  group.add(outlineMesh);
  group.add(fillMesh);

  return group;
}

export function disposeMergedOutlinedMeshes(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();

  for (const child of group.children) {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
    }
  }

  for (const geometry of geometries) {
    geometry.dispose();
  }
}
