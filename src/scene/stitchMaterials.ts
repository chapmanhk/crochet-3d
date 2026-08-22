import * as THREE from 'three';

const STITCH_COLORS = {
  fill: 0xd98952,
  outline: 0x5c3d2e,
} as const;

const OUTLINE_SCALE = 1.055;

export function createStitchFillMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: STITCH_COLORS.fill,
  });
}

export function createStitchOutlineMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: STITCH_COLORS.outline,
    side: THREE.BackSide,
  });
}

export function createOutlinedStitch(
  geometry: THREE.BufferGeometry,
  fillMaterial: THREE.MeshBasicMaterial,
  outlineMaterial: THREE.MeshBasicMaterial,
): THREE.Group {
  const group = new THREE.Group();

  const outline = new THREE.Mesh(geometry, outlineMaterial);
  outline.scale.setScalar(OUTLINE_SCALE);
  outline.renderOrder = 0;

  const fill = new THREE.Mesh(geometry, fillMaterial);
  fill.renderOrder = 1;

  group.add(outline);
  group.add(fill);

  return group;
}

export function disposeOutlinedStitch(group: THREE.Group): void {
  let geometry: THREE.BufferGeometry | null = null;

  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) {
      continue;
    }

    if (!geometry) {
      geometry = child.geometry;
    }
  }

  geometry?.dispose();
}
