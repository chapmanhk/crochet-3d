import * as THREE from 'three';
import type { StitchNode, Vec3 } from '@engine/index';
import {
  groupStitchesByRow,
  StitchDefinitions,
  StitchType,
  STITCH_SPACING,
} from '@engine/index';

// Visual tuning — derived from engine layout, not placement rules.
const YARN_RADIUS = 0.06;
const TUBE_RADIAL = 8;
const TUBE_SEGMENTS_MIN = 24;
const TUBE_SEGMENTS_MAX = 192;
const TUBE_SEGMENTS_PER_POINT = 8;

const CHAIN_CROWN_Z = 0.13;
const CHAIN_LOOP_SPAN_SCALE = 0.34;
// Tall enough to read above yarn thickness, but anchored to the hook — not layout y.
const SC_HEIGHT = 0.16;
const SC_V_HALF_WIDTH = 0.044;
const SC_TOP_FORWARD = 0.07;
const SC_VALLEY_HEIGHT = 0.045;
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

function dedupePoints(points: THREE.Vector3[], epsilon = 1e-4): THREE.Vector3[] {
  if (points.length === 0) {
    return points;
  }

  const deduped = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const previous = deduped[deduped.length - 1]!;
    const current = points[index]!;
    if (previous.distanceTo(current) > epsilon) {
      deduped.push(current);
    }
  }

  return deduped;
}

function createTube(points: THREE.Vector3[]): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.42);
  const tubularSegments = Math.min(
    TUBE_SEGMENTS_MAX,
    Math.max(TUBE_SEGMENTS_MIN, points.length * TUBE_SEGMENTS_PER_POINT),
  );
  return new THREE.TubeGeometry(curve, tubularSegments, YARN_RADIUS, TUBE_RADIAL, false);
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

function buildFoundationYarnPath(chainStitches: StitchNode[]): THREE.Vector3[] {
  if (chainStitches.length === 0) {
    return [];
  }

  const span =
    STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * CHAIN_LOOP_SPAN_SCALE;
  const points: THREE.Vector3[] = [];
  const first = chainStitches[0]!.position;
  const last = chainStitches[chainStitches.length - 1]!.position;

  points.push(new THREE.Vector3(first.x - span * 1.1, first.y, first.z + 0.02));

  for (let index = 0; index < chainStitches.length; index += 1) {
    const stitch = chainStitches[index]!;
    const position = stitch.position;
    const previous = chainStitches[index - 1];
    const next = chainStitches[index + 1];

    const leftAnchor = previous
      ? midpoint(previous.position, position)
      : new THREE.Vector3(position.x - span * 0.55, position.y, position.z + 0.02);

    const rightAnchor = next
      ? midpoint(position, next.position)
      : new THREE.Vector3(position.x + span * 0.55, position.y, position.z + 0.02);

    const crown = chainLoopCrown(position);

    points.push(
      new THREE.Vector3(leftAnchor.x, leftAnchor.y, leftAnchor.z),
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
      new THREE.Vector3(rightAnchor.x, rightAnchor.y, rightAnchor.z),
    );
  }

  points.push(new THREE.Vector3(last.x + span * 1.1, last.y, last.z + 0.02));
  return dedupePoints(points);
}

function scRowPoint(
  stitch: StitchNode,
  hook: THREE.Vector3,
  offsets: { x?: number; y?: number; z?: number },
): THREE.Vector3 {
  return new THREE.Vector3(
    stitch.position.x + (offsets.x ?? 0),
    hook.y + (offsets.y ?? 0),
    hook.z + SC_TOP_FORWARD + (offsets.z ?? 0),
  );
}

function scValleyBetween(
  left: StitchNode,
  right: StitchNode,
  leftHook: THREE.Vector3,
  rightHook: THREE.Vector3,
): THREE.Vector3 {
  return new THREE.Vector3(
    (left.position.x + right.position.x) / 2,
    (leftHook.y + rightHook.y) / 2 + SC_VALLEY_HEIGHT,
    (leftHook.z + rightHook.z) / 2 + SC_TOP_FORWARD * 0.45,
  );
}

function buildWorkingRowYarnPath(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.Vector3[] | null {
  if (rowStitches.length === 0) {
    return null;
  }

  const points: THREE.Vector3[] = [];

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const parent = stitchById.get(stitch.attachToId ?? '');
    if (!parent) {
      return null;
    }

    const hook = hookPointForStitch(parent, 'attach');
    const leftTop = scRowPoint(stitch, hook, { x: -SC_V_HALF_WIDTH, y: SC_HEIGHT });
    const rightTop = scRowPoint(stitch, hook, { x: SC_V_HALF_WIDTH, y: SC_HEIGHT });
    const crown = scRowPoint(stitch, hook, { y: SC_HEIGHT + 0.016, z: 0.012 });
    const pullThrough = scRowPoint(stitch, hook, { y: SC_HEIGHT * 0.42, z: -0.018 });
    const base = scRowPoint(stitch, hook, { y: SC_HEIGHT * 0.12, z: -0.03 });

    if (index === 0) {
      points.push(
        scRowPoint(stitch, hook, { x: -0.16, y: SC_HEIGHT * 0.35, z: -0.01 }),
      );
    } else {
      const previous = rowStitches[index - 1]!;
      const previousParent = stitchById.get(previous.attachToId ?? '')!;
      const previousHook = hookPointForStitch(previousParent, 'attach');
      points.push(scValleyBetween(previous, stitch, previousHook, hook));
    }

    points.push(hook, base, pullThrough, leftTop, crown, rightTop);

    if (index < rowStitches.length - 1) {
      const next = rowStitches[index + 1]!;
      const nextParent = stitchById.get(next.attachToId ?? '')!;
      const nextHook = hookPointForStitch(nextParent, 'attach');
      points.push(scValleyBetween(stitch, next, hook, nextHook));
    }
  }

  const last = rowStitches[rowStitches.length - 1]!;
  const lastParent = stitchById.get(last.attachToId ?? '');
  const lastHook = lastParent ? hookPointForStitch(lastParent, 'attach') : new THREE.Vector3();
  points.push(
    scRowPoint(last, lastHook, { x: 0.16, y: SC_HEIGHT * 0.35, z: -0.01 }),
  );

  return dedupePoints(points);
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
      rowNumber === 0 ||
      buildWorkingRowYarnPath(rowStitches, stitchById) !== null;

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

    const points =
      rowNumber === 0
        ? buildFoundationYarnPath(rowStitches)
        : buildWorkingRowYarnPath(rowStitches, stitchById);

    if (!points || points.length < 2) {
      return null;
    }

    return createTube(points);
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

    return createTube(joinPoints);
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
