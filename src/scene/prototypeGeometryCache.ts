import * as THREE from 'three';

const prototypeGeometryCache = new Map<string, THREE.BufferGeometry>();

export function getCachedPrototypeGeometry(cacheKey: string): THREE.BufferGeometry | undefined {
  return prototypeGeometryCache.get(cacheKey);
}

export function setCachedPrototypeGeometry(
  cacheKey: string,
  geometry: THREE.BufferGeometry,
): void {
  prototypeGeometryCache.set(cacheKey, geometry);
}

export function isCachedPrototypeGeometry(geometry: THREE.BufferGeometry): boolean {
  for (const cached of prototypeGeometryCache.values()) {
    if (cached === geometry) {
      return true;
    }
  }

  return false;
}
