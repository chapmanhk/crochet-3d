import * as THREE from 'three';
import type { FoundationType, StitchNode } from '@engine/index';
import {
  buildYarnSegmentRenderData,
  getYarnSegmentManifests,
} from './stitchGeometry';
import {
  createMergedOutlinedMeshes,
  disposeMergedOutlinedMeshes,
} from './geometryMerge';
import {
  createInstancedOutlinedSegment,
  disposeInstancedOutlinedSegment,
} from './instancedStitches';
import {
  createStitchFillMaterial,
  createStitchOutlineMaterial,
  STITCH_YARN_COLOR,
  updateFillMaterialColor,
  updateOutlineMaterialColor,
  updateOutlineMaterialSize,
} from './stitchMaterials';

function segmentUsesInstancing(segmentGroup: THREE.Group): boolean {
  return segmentGroup.children.some((child) => child instanceof THREE.InstancedMesh);
}

export class StitchRenderer {
  readonly group = new THREE.Group();
  private readonly segments = new Map<string, THREE.Group>();
  private readonly fingerprints = new Map<string, string>();
  private readonly fillMaterial = createStitchFillMaterial();
  private readonly outlineMaterial = createStitchOutlineMaterial();

  sync(stitches: StitchNode[], foundationType: FoundationType): void {
    const manifests = getYarnSegmentManifests(stitches, foundationType);
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

      const renderData = buildYarnSegmentRenderData(manifest.key, stitches, foundationType);
      if (!renderData) {
        this.removeSegment(manifest.key);
        continue;
      }

      this.upsertSegment(manifest.key, renderData);
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
    const parsed = Number.parseInt(hexColor.replace('#', ''), 16);
    const color = Number.isNaN(parsed) ? STITCH_YARN_COLOR : parsed;
    updateFillMaterialColor(this.fillMaterial, color);
    updateOutlineMaterialColor(this.outlineMaterial, color);
  }

  private upsertSegment(
    key: string,
    renderData: NonNullable<ReturnType<typeof buildYarnSegmentRenderData>>,
  ): void {
    const existing = this.segments.get(key);
    if (existing) {
      this.group.remove(existing);
      this.disposeSegmentGroup(existing);
    }

    const segmentGroup = this.createSegmentGroup(renderData);
    this.segments.set(key, segmentGroup);
    this.group.add(segmentGroup);
  }

  private createSegmentGroup(
    renderData: NonNullable<ReturnType<typeof buildYarnSegmentRenderData>>,
  ): THREE.Group {
    if (renderData.mode === 'instanced' && renderData.instanced) {
      return createInstancedOutlinedSegment(
        renderData.instanced,
        this.fillMaterial,
        this.outlineMaterial,
      );
    }

    return createMergedOutlinedMeshes(
      renderData.geometries ?? [],
      this.fillMaterial,
      this.outlineMaterial,
    );
  }

  private disposeSegmentGroup(segmentGroup: THREE.Group): void {
    if (segmentUsesInstancing(segmentGroup)) {
      disposeInstancedOutlinedSegment(segmentGroup);
      return;
    }

    disposeMergedOutlinedMeshes(segmentGroup);
  }

  private removeSegment(key: string): void {
    const segmentGroup = this.segments.get(key);
    if (!segmentGroup) {
      return;
    }

    this.group.remove(segmentGroup);
    this.disposeSegmentGroup(segmentGroup);
    this.segments.delete(key);
    this.fingerprints.delete(key);
  }
}
