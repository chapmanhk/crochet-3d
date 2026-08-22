import * as THREE from 'three';
import type { StitchNode } from '@engine/index';
import { StitchType } from '@engine/index';

const YARN_COLOR = 0x8b4513;

function createStitchGeometries(): Record<StitchType, THREE.BufferGeometry> {
  return {
    [StitchType.CHAIN]: new THREE.TorusGeometry(0.25, 0.08, 12, 24),
    [StitchType.SINGLE_CROCHET]: new THREE.CylinderGeometry(0.18, 0.18, 0.5, 16),
  };
}

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly geometries = createStitchGeometries();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly material = new THREE.MeshStandardMaterial({
    color: YARN_COLOR,
    roughness: 0.85,
    metalness: 0.05,
  });

  sync(stitches: StitchNode[]): void {
    const incomingIds = new Set(stitches.map((stitch) => stitch.id));

    for (const id of this.meshes.keys()) {
      if (!incomingIds.has(id)) {
        const mesh = this.meshes.get(id);
        if (mesh) {
          this.group.remove(mesh);
        }
        this.meshes.delete(id);
      }
    }

    for (const stitch of stitches) {
      let mesh = this.meshes.get(stitch.id);
      if (!mesh) {
        mesh = this.createMesh(stitch);
        this.meshes.set(stitch.id, mesh);
        this.group.add(mesh);
      }

      mesh.position.set(stitch.position.x, stitch.position.y, stitch.position.z);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
    }
    this.meshes.clear();
    this.material.dispose();
    for (const geometry of Object.values(this.geometries)) {
      geometry.dispose();
    }
  }

  private createMesh(stitch: StitchNode): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometries[stitch.type], this.material);
    if (stitch.type === StitchType.CHAIN) {
      mesh.rotation.x = Math.PI / 2;
    }
    return mesh;
  }
}
