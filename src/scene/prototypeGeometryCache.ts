import * as THREE from 'three';

const prototypeGeometryCache = new Map<string, THREE.BufferGeometry>();

/** Return a cached stitch prototype geometry, if one exists for `cacheKey`. */
export function getCachedPrototypeGeometry(cacheKey: string): THREE.BufferGeometry | undefined {
  return prototypeGeometryCache.get(cacheKey);
}

/** Store a stitch prototype geometry for reuse across instanced rows. */
export function setCachedPrototypeGeometry(
  cacheKey: string,
  geometry: THREE.BufferGeometry,
): void {
  prototypeGeometryCache.set(cacheKey, geometry);
}

/** True when `geometry` is a shared prototype still referenced by the cache. */
export function isCachedPrototypeGeometry(geometry: THREE.BufferGeometry): boolean {
  for (const cached of prototypeGeometryCache.values()) {
    if (cached === geometry) {
      return true;
    }
  }

  return false;
}
