import * as THREE from 'three';
import type { StitchNode } from '@engine/index';
import { buildYarnSegments } from './stitchGeometry';
import {
  createOutlinedStitch,
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  disposeOutlinedStitch,
} from './stitchMaterials';

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly segments = new Map<string, THREE.Group>();
  private readonly fillMaterial = createStitchFillMaterial();
  private readonly outlineMaterial = createStitchOutlineMaterial();

  sync(stitches: StitchNode[]): void {
    const yarnSegments = buildYarnSegments(stitches);
    const incomingKeys = new Set(yarnSegments.map((segment) => segment.key));

    for (const key of this.segments.keys()) {
      if (!incomingKeys.has(key)) {
        this.removeSegment(key);
      }
    }

    for (const segment of yarnSegments) {
      this.upsertSegment(segment.key, segment.geometry);
    }
  }

  dispose(): void {
    for (const key of [...this.segments.keys()]) {
      this.removeSegment(key);
    }
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private upsertSegment(key: string, geometry: THREE.BufferGeometry): void {
    const existing = this.segments.get(key);
    if (existing) {
      this.group.remove(existing);
      disposeOutlinedStitch(existing);
    }

    const segmentGroup = createOutlinedStitch(
      geometry,
      this.fillMaterial,
      this.outlineMaterial,
    );
    this.segments.set(key, segmentGroup);
    this.group.add(segmentGroup);
  }

  private removeSegment(key: string): void {
    const segmentGroup = this.segments.get(key);
    if (!segmentGroup) {
      return;
    }

    this.group.remove(segmentGroup);
    disposeOutlinedStitch(segmentGroup);
    this.segments.delete(key);
  }
}
