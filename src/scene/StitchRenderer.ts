import * as THREE from 'three';
import type { StitchNode } from '@engine/index';
import {
  buildYarnSegmentGeometry,
  getYarnSegmentManifests,
} from './stitchGeometry';
import {
  createOutlinedStitch,
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  disposeOutlinedStitch,
  updateFillMaterialColor,
  updateOutlineMaterialColor,
  updateOutlineMaterialSize,
} from './stitchMaterials';

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly segments = new Map<string, THREE.Group>();
  private readonly fingerprints = new Map<string, string>();
  private readonly fillMaterial = createStitchFillMaterial();
  private readonly outlineMaterial = createStitchOutlineMaterial();

  sync(stitches: StitchNode[]): void {
    const manifests = getYarnSegmentManifests(stitches);
    const incomingKeys = new Set(manifests.map((manifest) => manifest.key));

    for (const key of this.segments.keys()) {
      if (!incomingKeys.has(key)) {
        this.removeSegment(key);
      }
    }

    for (const manifest of manifests) {
      if (this.fingerprints.get(manifest.key) === manifest.fingerprint) {
        continue;
      }

      const geometry = buildYarnSegmentGeometry(manifest.key, stitches);
      if (!geometry) {
        this.removeSegment(manifest.key);
        continue;
      }

      this.upsertSegment(manifest.key, geometry);
      this.fingerprints.set(manifest.key, manifest.fingerprint);
    }
  }

  dispose(): void {
    for (const key of [...this.segments.keys()]) {
      this.removeSegment(key);
    }
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  updateOutlineSize(): void {
    updateOutlineMaterialSize(this.outlineMaterial);
  }

  setYarnColor(hexColor: string): void {
    const color = Number.parseInt(hexColor.replace('#', ''), 16);
    updateFillMaterialColor(this.fillMaterial, color);
    updateOutlineMaterialColor(this.outlineMaterial, color);
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
    this.fingerprints.delete(key);
  }
}
