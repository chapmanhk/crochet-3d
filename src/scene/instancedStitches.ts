import * as THREE from 'three';
import { toCreasedNormals } from 'three-stdlib';
import { isCachedPrototypeGeometry } from './prototypeGeometryCache';
import { mergeStrandGeometries } from './geometryMerge';

const OUTLINE_CREASE_ANGLE = Math.PI;
const INITIAL_INSTANCE_CAPACITY = 16;

/** One placed stitch body referencing a shared prototype geometry key and world matrix. */
export interface StitchInstance {
  prototypeKey: string;
  matrix: THREE.Matrix4;
}

/** Prototype geometries plus instance transforms for one instanced working-row segment. */
export interface InstancedStitchBatch {
  prototypes: Map<string, THREE.BufferGeometry>;
  instances: StitchInstance[];
  bridgeGeometries: THREE.BufferGeometry[];
}

/**
 * Build a segment group from instanced outline/fill meshes per prototype, plus merged bridge strands.
 */
export function createInstancedOutlinedSegment(
  batch: InstancedStitchBatch,
  fillMaterial: THREE.MeshBasicMaterial,
  outlineMaterial: THREE.ShaderMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const instancesByKey = groupInstancesByPrototype(batch.instances);

  for (const [prototypeKey, matrices] of instancesByKey) {
    const prototype = batch.prototypes.get(prototypeKey);
    if (!prototype || matrices.length === 0) {
      continue;
    }

    const outlineGeometry = toCreasedNormals(prototype.clone(), OUTLINE_CREASE_ANGLE);
    group.add(createInstancedMesh(outlineGeometry, outlineMaterial, matrices, 0));
    group.add(createInstancedMesh(prototype, fillMaterial, matrices, 1));
  }

  if (batch.bridgeGeometries.length > 0) {
    const mergedBridges = mergeStrandGeometries(batch.bridgeGeometries);
    const outlineBridges = toCreasedNormals(mergedBridges.clone(), OUTLINE_CREASE_ANGLE);

    const outlineMesh = new THREE.Mesh(outlineBridges, outlineMaterial);
    outlineMesh.renderOrder = 0;
    const fillMesh = new THREE.Mesh(mergedBridges, fillMaterial);
    fillMesh.renderOrder = 1;

    group.add(outlineMesh);
    group.add(fillMesh);
  }

  return group;
}

/** Dispose instanced segment geometries while keeping shared prototype cache entries alive. */
export function disposeInstancedOutlinedSegment(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();

  for (const child of group.children) {
    if (child instanceof THREE.InstancedMesh || child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
    }
  }

  for (const geometry of geometries) {
    if (!isCachedPrototypeGeometry(geometry)) {
      geometry.dispose();
    }
  }
}

function groupInstancesByPrototype(
  instances: StitchInstance[],
): Map<string, THREE.Matrix4[]> {
  const grouped = new Map<string, THREE.Matrix4[]>();

  for (const instance of instances) {
    const matrices = grouped.get(instance.prototypeKey) ?? [];
    matrices.push(instance.matrix);
    grouped.set(instance.prototypeKey, matrices);
  }

  return grouped;
}

function createInstancedMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: THREE.Matrix4[],
  renderOrder: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    geometry,
    material,
    Math.max(matrices.length, INITIAL_INSTANCE_CAPACITY),
  );
  mesh.count = matrices.length;
  mesh.renderOrder = renderOrder;

  for (let index = 0; index < matrices.length; index += 1) {
    mesh.setMatrixAt(index, matrices[index]!);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
