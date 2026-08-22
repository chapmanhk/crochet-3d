import * as THREE from 'three';
import type { StitchNode } from '@engine/index';
import { buildStitchGeometry } from './stitchGeometry';
import {
  createOutlinedStitch,
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  disposeOutlinedStitch,
} from './stitchMaterials';

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly stitches = new Map<string, THREE.Group>();
  private readonly fillMaterial = createStitchFillMaterial();
  private readonly outlineMaterial = createStitchOutlineMaterial();

  sync(stitches: StitchNode[]): void {
    const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
    const incomingIds = new Set(stitches.map((stitch) => stitch.id));

    for (const id of this.stitches.keys()) {
      if (!incomingIds.has(id)) {
        this.removeStitch(id);
      }
    }

    for (const stitch of stitches) {
      this.upsertStitch(stitch, stitches, stitchById);
    }
  }

  dispose(): void {
    for (const id of [...this.stitches.keys()]) {
      this.removeStitch(id);
    }
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private upsertStitch(
    stitch: StitchNode,
    stitches: StitchNode[],
    stitchById: Map<string, StitchNode>,
  ): void {
    const existing = this.stitches.get(stitch.id);
    if (existing) {
      this.group.remove(existing);
      disposeOutlinedStitch(existing);
    }

    const geometry = buildStitchGeometry(stitch, stitches, stitchById);
    const stitchGroup = createOutlinedStitch(
      geometry,
      this.fillMaterial,
      this.outlineMaterial,
    );
    stitchGroup.position.set(stitch.position.x, stitch.position.y, stitch.position.z);
    this.stitches.set(stitch.id, stitchGroup);
    this.group.add(stitchGroup);
  }

  private removeStitch(id: string): void {
    const stitchGroup = this.stitches.get(id);
    if (!stitchGroup) {
      return;
    }

    this.group.remove(stitchGroup);
    disposeOutlinedStitch(stitchGroup);
    this.stitches.delete(id);
  }
}
