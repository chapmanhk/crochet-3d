import * as THREE from 'three';

const prototypeGeometryCache = new Map<string, THREE.BufferGeometry>();
const cachedGeometrySet = new Set<THREE.BufferGeometry>();

/** Return a cached stitch prototype geometry, if one exists for `cacheKey`. */
export function getCachedPrototypeGeometry(cacheKey: string): THREE.BufferGeometry | undefined {
  return prototypeGeometryCache.get(cacheKey);
}

/** Store a stitch prototype geometry for reuse across instanced rows. */
export function setCachedPrototypeGeometry(
  cacheKey: string,
  geometry: THREE.BufferGeometry,
): void {
  const previous = prototypeGeometryCache.get(cacheKey);
  if (previous) {
    cachedGeometrySet.delete(previous);
  }

  prototypeGeometryCache.set(cacheKey, geometry);
  cachedGeometrySet.add(geometry);
}

/** True when `geometry` is a shared prototype still referenced by the cache. */
export function isCachedPrototypeGeometry(geometry: THREE.BufferGeometry): boolean {
  return cachedGeometrySet.has(geometry);
}
