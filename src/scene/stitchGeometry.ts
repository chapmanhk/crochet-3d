import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StitchNode, Vec3 } from '@engine/index';
import { StitchDefinitions, StitchType } from '@engine/index';
import { STITCH_SPACING } from '@engine/layout';

const YARN_RADIUS = 0.065;
const TUBE_RADIAL = 10;
const TUBE_SEGMENTS = 24;

function toVector3(position: Vec3, origin?: Vec3): THREE.Vector3 {
  if (!origin) {
    return new THREE.Vector3(position.x, position.y, position.z);
  }

  return new THREE.Vector3(
    position.x - origin.x,
    position.y - origin.y,
    position.z - origin.z,
  );
}

function createTube(curve: THREE.Curve<THREE.Vector3>, segments = TUBE_SEGMENTS): THREE.TubeGeometry {
  return new THREE.TubeGeometry(curve, segments, YARN_RADIUS, TUBE_RADIAL, false);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function getRowNeighbor(
  stitches: StitchNode[],
  stitch: StitchNode,
  columnDelta: number,
): StitchNode | undefined {
  return stitches.find(
    (candidate) =>
      candidate.row === stitch.row && candidate.column === stitch.column + columnDelta,
  );
}

function createChainGeometry(
  stitch: StitchNode,
  stitches: StitchNode[],
): THREE.BufferGeometry {
  const leftNeighbor = getRowNeighbor(stitches, stitch, -1);
  const rightNeighbor = getRowNeighbor(stitches, stitch, 1);
  const span = STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * 0.45;

  const leftAnchor = leftNeighbor
    ? midpoint(leftNeighbor.position, stitch.position)
    : {
        x: stitch.position.x - span,
        y: stitch.position.y,
        z: stitch.position.z,
      };
  const rightAnchor = rightNeighbor
    ? midpoint(stitch.position, rightNeighbor.position)
    : {
        x: stitch.position.x + span,
        y: stitch.position.y,
        z: stitch.position.z,
      };

  const loopCurve = new THREE.CatmullRomCurve3([
    toVector3(leftAnchor, stitch.position),
    new THREE.Vector3(-span * 0.35, 0.04, 0.08),
    new THREE.Vector3(0, 0.12, 0.16),
    new THREE.Vector3(span * 0.35, 0.04, 0.08),
    toVector3(rightAnchor, stitch.position),
  ]);

  return createTube(loopCurve, 28);
}

function createSingleCrochetGeometry(
  stitch: StitchNode,
  parent: StitchNode | undefined,
): THREE.BufferGeometry {
  const base = parent?.position ?? {
    x: stitch.position.x,
    y: stitch.position.y - 0.75,
    z: stitch.position.z - 0.05,
  };

  const basePoint = toVector3(base, stitch.position);
  const vHalfWidth = 0.11;
  const topY = 0.38;
  const topZ = 0.1;

  const leftLeg = createTube(
    new THREE.CatmullRomCurve3([
      basePoint,
      new THREE.Vector3(basePoint.x * 0.35 - 0.03, basePoint.y * 0.45 + 0.08, basePoint.z + 0.04),
      new THREE.Vector3(-vHalfWidth, topY * 0.75, topZ * 0.7),
      new THREE.Vector3(-vHalfWidth, topY, topZ),
    ]),
  );

  const rightLeg = createTube(
    new THREE.CatmullRomCurve3([
      basePoint,
      new THREE.Vector3(basePoint.x * 0.35 + 0.03, basePoint.y * 0.45 + 0.08, basePoint.z + 0.04),
      new THREE.Vector3(vHalfWidth, topY * 0.75, topZ * 0.7),
      new THREE.Vector3(vHalfWidth, topY, topZ),
    ]),
  );

  const topBar = createTube(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-vHalfWidth, topY, topZ),
      new THREE.Vector3(0, topY + 0.05, topZ + 0.05),
      new THREE.Vector3(vHalfWidth, topY, topZ),
    ]),
    12,
  );

  const post = createTube(
    new THREE.CatmullRomCurve3([
      basePoint,
      new THREE.Vector3(basePoint.x * 0.15, basePoint.y * 0.55, basePoint.z + 0.02),
      new THREE.Vector3(0, topY * 0.35, topZ * 0.35),
    ]),
    16,
  );

  const merged = mergeGeometries([leftLeg, rightLeg, topBar, post], false);
  leftLeg.dispose();
  rightLeg.dispose();
  topBar.dispose();
  post.dispose();

  return merged ?? leftLeg;
}

export function buildStitchGeometry(
  stitch: StitchNode,
  stitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.BufferGeometry {
  if (stitch.type === StitchType.CHAIN) {
    return createChainGeometry(stitch, stitches);
  }

  return createSingleCrochetGeometry(stitch, stitchById.get(stitch.attachToId ?? ''));
}

export function createYarnMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x8b4513,
    roughness: 0.78,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0xc49a6c),
  });
}
