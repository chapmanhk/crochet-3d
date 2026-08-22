import * as THREE from 'three';
import type { StitchNode } from '@engine/index';
import { buildStitchGeometry, createYarnMaterial } from './stitchGeometry';

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly material = createYarnMaterial();

  sync(stitches: StitchNode[]): void {
    const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
    const incomingIds = new Set(stitches.map((stitch) => stitch.id));

    for (const id of this.meshes.keys()) {
      if (!incomingIds.has(id)) {
        const mesh = this.meshes.get(id);
        if (mesh) {
          this.group.remove(mesh);
          mesh.geometry.dispose();
        }
        this.meshes.delete(id);
      }
    }

    for (const stitch of stitches) {
      const geometry = buildStitchGeometry(stitch, stitches, stitchById);
      let mesh = this.meshes.get(stitch.id);

      if (!mesh) {
        mesh = new THREE.Mesh(geometry, this.material);
        this.meshes.set(stitch.id, mesh);
        this.group.add(mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = geometry;
      }

      mesh.position.set(stitch.position.x, stitch.position.y, stitch.position.z);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.clear();
    this.material.dispose();
  }
}
