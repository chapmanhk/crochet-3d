import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StitchNode, Vec3 } from '@engine/index';
import { StitchDefinitions, StitchType } from '@engine/index';
import { STITCH_SPACING } from '@engine/layout';

const YARN_RADIUS = 0.072;
const TUBE_RADIAL = 8;
const TUBE_SEGMENTS = 18;

function toLocal(position: Vec3, origin: Vec3): THREE.Vector3 {
  return new THREE.Vector3(
    position.x - origin.x,
    position.y - origin.y,
    position.z - origin.z,
  );
}

function createTube(curve: THREE.Curve<THREE.Vector3>, segments = TUBE_SEGMENTS): THREE.TubeGeometry {
  return new THREE.TubeGeometry(curve, segments, YARN_RADIUS, TUBE_RADIAL, false);
}

function mergeTubes(tubes: THREE.TubeGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(tubes, false);
  for (const tube of tubes) {
    tube.dispose();
  }
  return merged ?? tubes[0]!;
}

function createChainGeometry(): THREE.BufferGeometry {
  const halfWidth = STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * 0.34;

  // Horseshoe loop opening downward — one classic chain stitch silhouette.
  const arc = new THREE.EllipseCurve(0, 0.055, halfWidth, 0.085, Math.PI, 0, true);
  const loopPoints = arc
    .getPoints(18)
    .map((point) => new THREE.Vector3(point.x, 0, point.y));

  const loopCurve = new THREE.CatmullRomCurve3(loopPoints);
  return createTube(loopCurve, 20);
}

function createSingleCrochetGeometry(
  stitch: StitchNode,
  parent: StitchNode | undefined,
): THREE.BufferGeometry {
  const hookPoint = parent
    ? toLocal(parent.position, stitch.position).add(new THREE.Vector3(0, 0.02, 0.12))
    : new THREE.Vector3(0, -0.3, -0.02);

  const scHeight = 0.2;
  const topY = hookPoint.y + scHeight;
  const topZ = hookPoint.z + 0.04;
  const vHalfWidth = 0.042;

  const leftLeg = createTube(
    new THREE.CatmullRomCurve3([
      hookPoint,
      new THREE.Vector3(hookPoint.x - vHalfWidth * 0.4, hookPoint.y + scHeight * 0.45, hookPoint.z + 0.02),
      new THREE.Vector3(hookPoint.x - vHalfWidth, topY, topZ),
    ]),
    12,
  );

  const rightLeg = createTube(
    new THREE.CatmullRomCurve3([
      hookPoint,
      new THREE.Vector3(hookPoint.x + vHalfWidth * 0.4, hookPoint.y + scHeight * 0.45, hookPoint.z + 0.02),
      new THREE.Vector3(hookPoint.x + vHalfWidth, topY, topZ),
    ]),
    12,
  );

  const topBar = createTube(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(hookPoint.x - vHalfWidth, topY, topZ),
      new THREE.Vector3(hookPoint.x, topY + 0.018, topZ + 0.015),
      new THREE.Vector3(hookPoint.x + vHalfWidth, topY, topZ),
    ]),
    8,
  );

  return mergeTubes([leftLeg, rightLeg, topBar]);
}

export function buildStitchGeometry(
  stitch: StitchNode,
  _stitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.BufferGeometry {
  if (stitch.type === StitchType.CHAIN) {
    return createChainGeometry();
  }

  return createSingleCrochetGeometry(stitch, stitchById.get(stitch.attachToId ?? ''));
}
