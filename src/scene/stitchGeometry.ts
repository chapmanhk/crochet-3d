import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StitchNode, Vec3 } from '@engine/index';
import {
  groupStitchesByRow,
  StitchDefinitions,
  StitchType,
  STITCH_SPACING,
} from '@engine/index';

// Visual tuning — derived from engine layout, not placement rules.
const YARN_RADIUS = 0.052;
const TUBE_RADIAL = 8;
const TUBE_SEGMENTS_MIN = 12;
const TUBE_SEGMENTS_MAX = 48;
const CURVE_TENSION = 0.12;

const CHAIN_CROWN_Z = 0.13;
const CHAIN_LOOP_SPAN_SCALE = 0.4;
const CHAIN_SPINE_Z = 0.02;

const SC_HEIGHT = 0.17;
const SC_V_HALF_WIDTH = 0.052;
const SC_TOP_FORWARD = 0.065;
const SC_HOOK_Y_LIFT = 0.02;
const SC_ROW_EXIT_X = 0.12;
const SC_ROW_EXIT_Y = 0.11;
const SC_ROW_EXIT_Z = 0.06;

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

function chainLoopCrown(position: Vec3): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z + CHAIN_CROWN_Z);
}

function hookPointForStitch(
  stitch: StitchNode,
  role: 'attach' | 'rowExit',
): THREE.Vector3 {
  if (stitch.type === StitchType.CHAIN) {
    return chainLoopCrown(stitch.position);
  }

  const xOffset = role === 'rowExit' ? SC_ROW_EXIT_X : 0;
  return new THREE.Vector3(
    stitch.position.x + xOffset,
    stitch.position.y + SC_ROW_EXIT_Y,
    stitch.position.z + SC_ROW_EXIT_Z,
  );
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
        position.y + SC_HOOK_Y_LIFT,
        (leftAnchor.z + crown.z) / 2,
      ),
      crown,
      new THREE.Vector3(
        (rightAnchor.x + crown.x) / 2,
        position.y + SC_HOOK_Y_LIFT,
        (rightAnchor.z + crown.z) / 2,
      ),
      rightAnchor,
    ],
    16,
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
    8,
    0.05,
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
        new THREE.Vector3(first.x - span * 1.1, first.y, first.z + CHAIN_SPINE_Z),
        new THREE.Vector3(first.x - span * 0.55, first.y, first.z + CHAIN_SPINE_Z),
      ],
      8,
      0.05,
    ),
  );

  for (let index = 0; index < chainStitches.length; index += 1) {
    const stitch = chainStitches[index]!;
    const position = stitch.position;
    const previous = chainStitches[index - 1];
    const next = chainStitches[index + 1];

    const leftAnchor = previous
      ? midpoint(previous.position, position)
      : new THREE.Vector3(position.x - span * 0.55, position.y, position.z + CHAIN_SPINE_Z);

    const rightAnchor = next
      ? midpoint(position, next.position)
      : new THREE.Vector3(position.x + span * 0.55, position.y, position.z + CHAIN_SPINE_Z);

    tubes.push(buildChainLoopGeometry(position, leftAnchor, rightAnchor));

    if (next) {
      const nextLeft = midpoint(position, next.position);
      tubes.push(buildChainSpineGeometry(rightAnchor, nextLeft));
    }
  }

  tubes.push(
    createTube(
      [
        new THREE.Vector3(last.x + span * 0.55, last.y, last.z + CHAIN_SPINE_Z),
        new THREE.Vector3(last.x + span * 1.1, last.y, last.z + CHAIN_SPINE_Z),
      ],
      8,
      0.05,
    ),
  );

  return mergeTubes(tubes);
}

function scTopPoints(stitch: StitchNode, hook: THREE.Vector3) {
  const x = stitch.position.x;
  const topY = hook.y + SC_HEIGHT;
  const topZ = hook.z + SC_TOP_FORWARD;

  return {
    leftTop: new THREE.Vector3(x - SC_V_HALF_WIDTH, topY, topZ),
    rightTop: new THREE.Vector3(x + SC_V_HALF_WIDTH, topY, topZ),
    crown: new THREE.Vector3(x, topY + 0.018, topZ + 0.012),
  };
}

function buildSingleCrochetGeometry(stitch: StitchNode, hook: THREE.Vector3): THREE.TubeGeometry[] {
  const x = stitch.position.x;
  const { leftTop, rightTop, crown } = scTopPoints(stitch, hook);
  const postBase = new THREE.Vector3(x, hook.y - 0.018, hook.z - 0.035);

  const post = createTube(
    [
      hook,
      postBase,
      new THREE.Vector3(x, hook.y + SC_HEIGHT * 0.22, hook.z + 0.008),
    ],
    12,
  );

  const leftLeg = createTube(
    [
      hook,
      new THREE.Vector3(x - SC_V_HALF_WIDTH * 0.55, hook.y + SC_HEIGHT * 0.48, hook.z + 0.018),
      leftTop,
    ],
    10,
  );

  const rightLeg = createTube(
    [
      hook,
      new THREE.Vector3(x + SC_V_HALF_WIDTH * 0.55, hook.y + SC_HEIGHT * 0.48, hook.z + 0.018),
      rightTop,
    ],
    10,
  );

  const topBar = createTube([leftTop, crown, rightTop], 8, 0.05);

  return [post, leftLeg, rightLeg, topBar];
}

function buildWorkingYarnGeometry(
  from: { leftTop: THREE.Vector3; rightTop: THREE.Vector3; crown: THREE.Vector3 },
  toHook: THREE.Vector3,
  toLeftTop: THREE.Vector3,
  midX: number,
  hookY: number,
  hookZ: number,
): THREE.TubeGeometry {
  return createTube(
    [
      from.rightTop,
      new THREE.Vector3(midX, hookY + SC_HEIGHT * 0.72, hookZ + SC_TOP_FORWARD * 0.35),
      new THREE.Vector3(midX, hookY + SC_HEIGHT * 0.18, hookZ - 0.02),
      toHook,
      toLeftTop,
    ],
    12,
    0.18,
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

    const hook = hookPointForStitch(parent, 'attach');
    tubes.push(...buildSingleCrochetGeometry(stitch, hook));

    if (index > 0) {
      const previous = rowStitches[index - 1]!;
      const previousParent = stitchById.get(previous.attachToId ?? '')!;
      const previousHook = hookPointForStitch(previousParent, 'attach');
      const previousTops = scTopPoints(previous, previousHook);
      const currentTops = scTopPoints(stitch, hook);

      tubes.push(
        buildWorkingYarnGeometry(
          previousTops,
          hook,
          currentTops.leftTop,
          (previous.position.x + stitch.position.x) / 2,
          (previousHook.y + hook.y) / 2,
          (previousHook.z + hook.z) / 2,
        ),
      );
    }
  }

  const first = rowStitches[0]!;
  const firstParent = stitchById.get(first.attachToId ?? '')!;
  const firstHook = hookPointForStitch(firstParent, 'attach');
  tubes.push(
    createTube(
      [
        new THREE.Vector3(
          first.position.x - 0.16,
          firstHook.y + SC_HEIGHT * 0.35,
          firstHook.z + SC_TOP_FORWARD * 0.2,
        ),
        firstHook,
      ],
      8,
      0.1,
    ),
  );

  const last = rowStitches[rowStitches.length - 1]!;
  const lastParent = stitchById.get(last.attachToId ?? '')!;
  const lastHook = hookPointForStitch(lastParent, 'attach');
  const lastTops = scTopPoints(last, lastHook);
  tubes.push(
    createTube(
      [
        lastTops.rightTop,
        new THREE.Vector3(
          last.position.x + 0.16,
          lastHook.y + SC_HEIGHT * 0.35,
          lastHook.z + SC_TOP_FORWARD * 0.2,
        ),
      ],
      8,
      0.1,
    ),
  );

  return mergeTubes(tubes);
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

  const lowerExit = hookPointForStitch(
    lowerEnd,
    lowerEnd.type === StitchType.CHAIN ? 'attach' : 'rowExit',
  );

  const upperParent = stitchById.get(upperStart.attachToId ?? '');
  const upperEntry = upperParent
    ? hookPointForStitch(upperParent, 'attach')
    : new THREE.Vector3(
        upperStart.position.x,
        upperStart.position.y,
        upperStart.position.z,
      );

  const turn = new THREE.Vector3(
    (lowerExit.x + upperEntry.x) / 2 + 0.08,
    (lowerExit.y + upperEntry.y) / 2,
    (lowerExit.z + upperEntry.z) / 2 + 0.05,
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

    return createTube(joinPoints, 12, 0.2);
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
