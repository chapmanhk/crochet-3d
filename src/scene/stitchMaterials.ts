import * as THREE from 'three';
import { toCreasedNormals } from 'three-stdlib';

export const STITCH_COLORS = {
  fill: 0xd98952,
  outline: 0x5c3d2e,
} as const;

// Screen-space stroke width in pixels (approximate).
const OUTLINE_THICKNESS_PX = 3.5;
const OUTLINE_CREASE_ANGLE = Math.PI;

const outlineVertexShader = /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
uniform float thickness;
uniform vec2 size;

void main() {
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  #include <clipping_planes_vertex>

  vec4 tNormal = vec4(objectNormal, 0.0);
  vec4 tPosition = vec4(transformed, 1.0);
  vec4 clipPosition = projectionMatrix * modelViewMatrix * tPosition;
  vec4 clipNormal = projectionMatrix * modelViewMatrix * tNormal;
  vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
  clipPosition.xy += offset;
  gl_Position = clipPosition;
}
`;

const outlineFragmentShader = /* glsl */ `
uniform vec3 color;
uniform float opacity;
#include <clipping_planes_pars_fragment>

void main() {
  #include <clipping_planes_fragment>
  gl_FragColor = vec4(color, opacity);
}
`;

function getDrawingBufferSize(): THREE.Vector2 {
  if (typeof window !== 'undefined') {
    return new THREE.Vector2(window.innerWidth, window.innerHeight);
  }

  return new THREE.Vector2(1280, 800);
}

export function createStitchFillMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: STITCH_COLORS.fill,
  });
}

export function createStitchOutlineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: false,
    uniforms: {
      thickness: { value: OUTLINE_THICKNESS_PX },
      size: { value: getDrawingBufferSize() },
      color: { value: new THREE.Color(STITCH_COLORS.outline) },
      opacity: { value: 1 },
    },
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
  });
}

export function updateOutlineMaterialSize(material: THREE.ShaderMaterial): void {
  const size = material.uniforms.size?.value as THREE.Vector2 | undefined;
  if (size) {
    size.copy(getDrawingBufferSize());
  }
}

export function createOutlinedStitch(
  geometry: THREE.BufferGeometry,
  fillMaterial: THREE.MeshBasicMaterial,
  outlineMaterial: THREE.ShaderMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const outlineGeometry = toCreasedNormals(geometry, OUTLINE_CREASE_ANGLE);

  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.renderOrder = 0;

  const fill = new THREE.Mesh(geometry, fillMaterial);
  fill.renderOrder = 1;

  group.add(outline);
  group.add(fill);

  return group;
}

export function disposeOutlinedStitch(group: THREE.Group): void {
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
