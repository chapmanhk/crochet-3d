import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StitchNode, Vec3 } from '@engine/index';
import {
  groupStitchesByRow,
  StitchDefinitions,
  StitchType,
  STITCH_SPACING,
} from '@engine/index';

// Scene-only crochet fabric scale (engine layout Y is not used for stitch height).
const VISUAL_ROW_HEIGHT = 0.22;
const YARN_RADIUS = 0.048;
const TUBE_RADIAL = 8;
const TUBE_SEGMENTS_MIN = 10;
const TUBE_SEGMENTS_MAX = 40;
const CURVE_TENSION = 0.08;

const CHAIN_CROWN_Z = 0.1;
const CHAIN_LOOP_SPAN_SCALE = 0.36;
const CHAIN_SPINE_Z = 0.015;
const CHAIN_HOOK_Y_LIFT = 0.012;

const SC_V_HALF_WIDTH = 0.1;
const SC_TOP_Z_BASE = 0.07;
const SC_TOP_Z_PER_ROW = 0.035;

export interface YarnSegmentManifest {
  key: string;
  fingerprint: string;
}

export interface YarnSegment {
  key: string;
  geometry: THREE.BufferGeometry;
}

function midpoint(a: Vec3, b: Vec3): THREE.Vector3 {
  return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

function stitchFingerprint(stitch: StitchNode): string {
  const { x, y, z } = stitch.position;
  return `${stitch.id}:${stitch.column}:${stitch.attachToId ?? ''}:${x},${y},${z}`;
}

function scRowTopY(row: number): number {
  return row * VISUAL_ROW_HEIGHT;
}

function scRowTopZ(row: number): number {
  return SC_TOP_Z_BASE + row * SC_TOP_Z_PER_ROW;
}

function scInsertionY(parent: StitchNode): number {
  if (parent.type === StitchType.CHAIN) {
    return 0;
  }

  return scRowTopY(parent.row);
}

function chainLoopCrown(position: Vec3): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z + CHAIN_CROWN_Z);
}

function scInsertionPoint(stitch: StitchNode, parent: StitchNode): THREE.Vector3 {
  const x = stitch.position.x;
  const y = scInsertionY(parent);
  const z =
    parent.type === StitchType.CHAIN
      ? CHAIN_CROWN_Z - 0.015
      : scRowTopZ(parent.row) - 0.01;

  return new THREE.Vector3(x, y, z);
}

function scStitchPoints(stitch: StitchNode, insertion: THREE.Vector3) {
  const x = stitch.position.x;
  const topY = scRowTopY(stitch.row);
  const topZ = scRowTopZ(stitch.row);
  const midY = (insertion.y + topY) * 0.48;

  return {
    insertion,
    leftTop: new THREE.Vector3(x - SC_V_HALF_WIDTH, topY, topZ),
    rightTop: new THREE.Vector3(x + SC_V_HALF_WIDTH, topY, topZ),
    crown: new THREE.Vector3(x, topY + 0.008, topZ + 0.006),
    leftMid: new THREE.Vector3(x - SC_V_HALF_WIDTH * 0.55, midY, topZ - 0.02),
    rightMid: new THREE.Vector3(x + SC_V_HALF_WIDTH * 0.55, midY, topZ - 0.02),
    centerMid: new THREE.Vector3(x, midY, insertion.z + 0.01),
  };
}

function createTube(
  points: THREE.Vector3[],
  segments = TUBE_SEGMENTS_MIN,
  tension = CURVE_TENSION,
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
  const tubularSegments = Math.min(
    TUBE_SEGMENTS_MAX,
    Math.max(TUBE_SEGMENTS_MIN, segments),
  );
  return new THREE.TubeGeometry(curve, tubularSegments, YARN_RADIUS, TUBE_RADIAL, false);
}

function mergeTubes(tubes: THREE.TubeGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(tubes, false);
  for (const tube of tubes) {
    tube.dispose();
  }
  return merged ?? tubes[0]!;
}

function buildChainLoopGeometry(
  position: Vec3,
  leftAnchor: THREE.Vector3,
  rightAnchor: THREE.Vector3,
): THREE.TubeGeometry {
  const crown = chainLoopCrown(position);

  return createTube(
    [
      leftAnchor,
      new THREE.Vector3(
        (leftAnchor.x + crown.x) / 2,
        position.y + CHAIN_HOOK_Y_LIFT,
        (leftAnchor.z + crown.z) / 2,
      ),
      crown,
      new THREE.Vector3(
        (rightAnchor.x + crown.x) / 2,
        position.y + CHAIN_HOOK_Y_LIFT,
        (rightAnchor.z + crown.z) / 2,
      ),
      rightAnchor,
    ],
    14,
  );
}

function buildChainSpineGeometry(
  left: THREE.Vector3,
  right: THREE.Vector3,
): THREE.TubeGeometry {
  return createTube(
    [
      left,
      new THREE.Vector3((left.x + right.x) / 2, left.y, (left.z + right.z) / 2),
      right,
    ],
    6,
    0.04,
  );
}

function buildFoundationRowGeometry(chainStitches: StitchNode[]): THREE.BufferGeometry | null {
  if (chainStitches.length === 0) {
    return null;
  }

  const span =
    STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * CHAIN_LOOP_SPAN_SCALE;
  const tubes: THREE.TubeGeometry[] = [];
  const first = chainStitches[0]!.position;
  const last = chainStitches[chainStitches.length - 1]!.position;

  tubes.push(
    createTube(
      [
        new THREE.Vector3(first.x - span * 1.05, first.y, first.z + CHAIN_SPINE_Z),
        new THREE.Vector3(first.x - span * 0.5, first.y, first.z + CHAIN_SPINE_Z),
      ],
      6,
      0.04,
    ),
  );

  for (let index = 0; index < chainStitches.length; index += 1) {
    const stitch = chainStitches[index]!;
    const position = stitch.position;
    const previous = chainStitches[index - 1];
    const next = chainStitches[index + 1];

    const leftAnchor = previous
      ? midpoint(previous.position, position)
      : new THREE.Vector3(position.x - span * 0.5, position.y, position.z + CHAIN_SPINE_Z);

    const rightAnchor = next
      ? midpoint(position, next.position)
      : new THREE.Vector3(position.x + span * 0.5, position.y, position.z + CHAIN_SPINE_Z);

    tubes.push(buildChainLoopGeometry(position, leftAnchor, rightAnchor));

    if (next) {
      tubes.push(buildChainSpineGeometry(rightAnchor, midpoint(position, next.position)));
    }
  }

  tubes.push(
    createTube(
      [
        new THREE.Vector3(last.x + span * 0.5, last.y, last.z + CHAIN_SPINE_Z),
        new THREE.Vector3(last.x + span * 1.05, last.y, last.z + CHAIN_SPINE_Z),
      ],
      6,
      0.04,
    ),
  );

  return mergeTubes(tubes);
}

function buildSingleCrochetGeometry(
  stitch: StitchNode,
  insertion: THREE.Vector3,
): THREE.TubeGeometry[] {
  const points = scStitchPoints(stitch, insertion);

  const topArc = createTube([points.leftTop, points.crown, points.rightTop], 8, 0.04);

  const leftLeg = createTube(
    [points.leftTop, points.leftMid, points.centerMid, points.insertion],
    10,
    0.1,
  );

  const rightLeg = createTube(
    [points.rightTop, points.rightMid, points.centerMid, points.insertion],
    10,
    0.1,
  );

  return [topArc, leftLeg, rightLeg];
}

function buildWorkingYarnGeometry(
  fromRightTop: THREE.Vector3,
  toLeftTop: THREE.Vector3,
): THREE.TubeGeometry {
  const midX = (fromRightTop.x + toLeftTop.x) / 2;
  const topY = fromRightTop.y;

  return createTube(
    [
      fromRightTop,
      new THREE.Vector3(midX, topY + 0.004, fromRightTop.z - 0.018),
      toLeftTop,
    ],
    8,
    0.05,
  );
}

function buildWorkingRowGeometry(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.BufferGeometry | null {
  if (rowStitches.length === 0) {
    return null;
  }

  const tubes: THREE.TubeGeometry[] = [];

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const parent = stitchById.get(stitch.attachToId ?? '');
    if (!parent) {
      return null;
    }

    const insertion = scInsertionPoint(stitch, parent);
    tubes.push(...buildSingleCrochetGeometry(stitch, insertion));

    if (index > 0) {
      const previous = rowStitches[index - 1]!;
      const previousParent = stitchById.get(previous.attachToId ?? '')!;
      const previousInsertion = scInsertionPoint(previous, previousParent);
      const previousPoints = scStitchPoints(previous, previousInsertion);
      const currentPoints = scStitchPoints(stitch, insertion);
      tubes.push(
        buildWorkingYarnGeometry(previousPoints.rightTop, currentPoints.leftTop),
      );
    }
  }

  return mergeTubes(tubes);
}

function hookPointForRowEnd(stitch: StitchNode, role: 'attach' | 'rowExit'): THREE.Vector3 {
  if (stitch.type === StitchType.CHAIN) {
    return chainLoopCrown(stitch.position);
  }

  const topY = scRowTopY(stitch.row);
  const topZ = scRowTopZ(stitch.row);
  const xOffset = role === 'rowExit' ? 0.08 : 0;

  return new THREE.Vector3(stitch.position.x + xOffset, topY, topZ);
}

function buildRowJoinPath(
  lowerRow: StitchNode[],
  upperRow: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.Vector3[] | null {
  if (lowerRow.length === 0 || upperRow.length === 0) {
    return null;
  }

  const lowerEnd = lowerRow[lowerRow.length - 1]!;
  const upperStart = upperRow[0]!;

  const lowerExit = hookPointForRowEnd(
    lowerEnd,
    lowerEnd.type === StitchType.CHAIN ? 'attach' : 'rowExit',
  );

  const upperParent = stitchById.get(upperStart.attachToId ?? '');
  const upperEntry = upperParent
    ? scInsertionPoint(upperStart, upperParent)
    : new THREE.Vector3(
        upperStart.position.x,
        scRowTopY(upperStart.row - 1),
        scRowTopZ(upperStart.row),
      );

  const turn = new THREE.Vector3(
    (lowerExit.x + upperEntry.x) / 2 + 0.05,
    (lowerExit.y + upperEntry.y) / 2 + VISUAL_ROW_HEIGHT * 0.2,
    (lowerExit.z + upperEntry.z) / 2 - 0.03,
  );

  return [lowerExit, turn, upperEntry];
}

function rowFingerprint(rowNumber: number, rowStitches: StitchNode[]): string {
  return `row:${rowNumber}:${rowStitches.map(stitchFingerprint).join(';')}`;
}

function joinFingerprint(lowerRow: StitchNode[], upperRow: StitchNode[]): string {
  const lowerEnd = lowerRow[lowerRow.length - 1]!;
  const upperStart = upperRow[0]!;
  return `join:${lowerEnd.id}->${upperStart.id}`;
}

function canRenderWorkingRow(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): boolean {
  return rowStitches.every((stitch) => stitchById.has(stitch.attachToId ?? ''));
}

export function measureSegmentsHeight(segments: YarnSegment[]): number {
  const bounds = new THREE.Box3();

  for (const segment of segments) {
    segment.geometry.computeBoundingBox();
    if (segment.geometry.boundingBox) {
      bounds.union(segment.geometry.boundingBox);
    }
  }

  return bounds.max.y - bounds.min.y;
}

export function getYarnSegmentManifests(stitches: StitchNode[]): YarnSegmentManifest[] {
  if (stitches.length === 0) {
    return [];
  }

  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const byRow = groupStitchesByRow(stitches);
  const rowNumbers = [...byRow.keys()].sort((left, right) => left - right);
  const manifests: YarnSegmentManifest[] = [];

  for (const rowNumber of rowNumbers) {
    const rowStitches = byRow.get(rowNumber)!;
    const canRenderRow =
      rowNumber === 0 || canRenderWorkingRow(rowStitches, stitchById);

    if (!canRenderRow) {
      continue;
    }

    manifests.push({
      key: `row-${rowNumber}`,
      fingerprint: rowFingerprint(rowNumber, rowStitches),
    });
  }

  for (let index = 1; index < rowNumbers.length; index += 1) {
    const lowerRow = byRow.get(rowNumbers[index - 1]!)!;
    const upperRow = byRow.get(rowNumbers[index]!)!;
    const joinPoints = buildRowJoinPath(lowerRow, upperRow, stitchById);

    if (!joinPoints || joinPoints.length < 2) {
      continue;
    }

    manifests.push({
      key: `join-${rowNumbers[index]}`,
      fingerprint: joinFingerprint(lowerRow, upperRow),
    });
  }

  return manifests;
}

export function buildYarnSegmentGeometry(
  key: string,
  stitches: StitchNode[],
): THREE.BufferGeometry | null {
  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const byRow = groupStitchesByRow(stitches);
  const rowNumbers = [...byRow.keys()].sort((left, right) => left - right);

  if (key.startsWith('row-')) {
    const rowNumber = Number.parseInt(key.slice(4), 10);
    const rowStitches = byRow.get(rowNumber);
    if (!rowStitches) {
      return null;
    }

    return rowNumber === 0
      ? buildFoundationRowGeometry(rowStitches)
      : buildWorkingRowGeometry(rowStitches, stitchById);
  }

  if (key.startsWith('join-')) {
    const rowNumber = Number.parseInt(key.slice(5), 10);
    const lowerIndex = rowNumbers.indexOf(rowNumber);
    if (lowerIndex <= 0) {
      return null;
    }

    const lowerRow = byRow.get(rowNumbers[lowerIndex - 1]!)!;
    const upperRow = byRow.get(rowNumber)!;
    const joinPoints = buildRowJoinPath(lowerRow, upperRow, stitchById);

    if (!joinPoints || joinPoints.length < 2) {
      return null;
    }

    return createTube(joinPoints, 10, 0.15);
  }

  return null;
}

export function buildYarnSegments(stitches: StitchNode[]): YarnSegment[] {
  return getYarnSegmentManifests(stitches).flatMap((manifest) => {
    const geometry = buildYarnSegmentGeometry(manifest.key, stitches);
    if (!geometry) {
      return [];
    }

    return [{ key: manifest.key, geometry }];
  });
}

export { VISUAL_ROW_HEIGHT };
