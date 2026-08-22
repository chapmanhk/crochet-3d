import * as THREE from 'three';
import type { StitchNode, Vec3 } from '@engine/index';
import { StitchDefinitions, StitchType } from '@engine/index';
import { STITCH_SPACING } from '@engine/layout';

const YARN_RADIUS = 0.068;
const TUBE_RADIAL = 8;

export interface YarnSegment {
  key: string;
  geometry: THREE.BufferGeometry;
}

function vec(position: Vec3): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z);
}

function midpoint(a: Vec3, b: Vec3): THREE.Vector3 {
  return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

function createTube(points: THREE.Vector3[], segments?: number): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.42);
  const tubularSegments = segments ?? Math.max(24, points.length * 10);
  return new THREE.TubeGeometry(curve, tubularSegments, YARN_RADIUS, TUBE_RADIAL, false);
}

function chainLoopCrown(position: Vec3): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z + 0.13);
}

function groupStitchesByRow(stitches: StitchNode[]): Map<number, StitchNode[]> {
  const byRow = new Map<number, StitchNode[]>();

  for (const stitch of stitches) {
    const rowStitches = byRow.get(stitch.row) ?? [];
    rowStitches.push(stitch);
    byRow.set(stitch.row, rowStitches);
  }

  for (const rowStitches of byRow.values()) {
    rowStitches.sort((left, right) => left.column - right.column);
  }

  return byRow;
}

function buildFoundationYarnPath(chainStitches: StitchNode[]): THREE.Vector3[] {
  if (chainStitches.length === 0) {
    return [];
  }

  const span = STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * 0.34;
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
        position.y + 0.025,
        (leftAnchor.z + crown.z) / 2,
      ),
      crown,
      new THREE.Vector3(
        (rightAnchor.x + crown.x) / 2,
        position.y + 0.025,
        (rightAnchor.z + crown.z) / 2,
      ),
      new THREE.Vector3(rightAnchor.x, rightAnchor.y, rightAnchor.z),
    );
  }

  points.push(new THREE.Vector3(last.x + span * 1.1, last.y, last.z + 0.02));
  return points;
}

function hookPointForParent(parent: StitchNode): THREE.Vector3 {
  if (parent.type === StitchType.CHAIN) {
    return chainLoopCrown(parent.position);
  }

  return new THREE.Vector3(
    parent.position.x,
    parent.position.y + 0.14,
    parent.position.z + 0.08,
  );
}

function buildWorkingRowYarnPath(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.Vector3[] {
  if (rowStitches.length === 0) {
    return [];
  }

  const points: THREE.Vector3[] = [];
  const vHalfWidth = 0.04;
  const stitchHeight = 0.13;

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const parent = stitchById.get(stitch.attachToId ?? '');
    if (!parent) {
      continue;
    }

    const position = stitch.position;
    const hook = hookPointForParent(parent);
    const leftTop = new THREE.Vector3(
      position.x - vHalfWidth,
      position.y + stitchHeight,
      position.z + 0.06,
    );
    const rightTop = new THREE.Vector3(
      position.x + vHalfWidth,
      position.y + stitchHeight,
      position.z + 0.06,
    );
    const crown = new THREE.Vector3(
      position.x,
      position.y + stitchHeight + 0.018,
      position.z + 0.075,
    );

    if (index === 0) {
      points.push(
        new THREE.Vector3(position.x - 0.18, position.y + stitchHeight * 0.45, position.z + 0.03),
      );
    } else {
      const previous = rowStitches[index - 1]!;
      points.push(
        new THREE.Vector3(
          (previous.position.x + position.x) / 2,
          previous.position.y + stitchHeight + 0.02,
          (previous.position.z + position.z) / 2 + 0.07,
        ),
      );
    }

    points.push(
      new THREE.Vector3(
        (hook.x + position.x) / 2,
        (hook.y + position.y) / 2 - 0.02,
        (hook.z + position.z) / 2,
      ),
      hook,
      new THREE.Vector3(position.x, position.y - 0.01, position.z + 0.02),
      leftTop,
      crown,
      rightTop,
    );

    if (index < rowStitches.length - 1) {
      const next = rowStitches[index + 1]!;
      points.push(
        new THREE.Vector3(
          (position.x + next.position.x) / 2,
          position.y + stitchHeight + 0.02,
          (position.z + next.position.z) / 2 + 0.07,
        ),
      );
    }
  }

  const last = rowStitches[rowStitches.length - 1]!.position;
  points.push(
    new THREE.Vector3(last.x + 0.16, last.y + stitchHeight + 0.02, last.z + 0.075),
  );

  return points;
}

function buildRowJoinPath(
  lowerRow: StitchNode[],
  upperRow: StitchNode[],
  stitchById: Map<string, StitchNode>,
): THREE.Vector3[] | null {
  if (lowerRow.length === 0 || upperRow.length === 0) {
    return null;
  }

  const lowerSorted = [...lowerRow].sort((left, right) => left.column - right.column);
  const upperSorted = [...upperRow].sort((left, right) => left.column - right.column);
  const lowerEnd = lowerSorted[lowerSorted.length - 1]!;
  const upperStart = upperSorted[0]!;

  const lowerExit =
    lowerEnd.type === StitchType.CHAIN
      ? chainLoopCrown(lowerEnd.position)
      : new THREE.Vector3(
          lowerEnd.position.x + 0.12,
          lowerEnd.position.y + 0.14,
          lowerEnd.position.z + 0.08,
        );

  const upperParent = stitchById.get(upperStart.attachToId ?? '');
  const upperEntry = upperParent
    ? hookPointForParent(upperParent)
    : vec(upperStart.position);

  const turn = new THREE.Vector3(
    (lowerExit.x + upperEntry.x) / 2 + 0.08,
    (lowerExit.y + upperEntry.y) / 2,
    (lowerExit.z + upperEntry.z) / 2 + 0.05,
  );

  return [lowerExit, turn, upperEntry];
}

export function buildYarnSegments(stitches: StitchNode[]): YarnSegment[] {
  if (stitches.length === 0) {
    return [];
  }

  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const byRow = groupStitchesByRow(stitches);
  const rowNumbers = [...byRow.keys()].sort((left, right) => left - right);
  const segments: YarnSegment[] = [];

  for (const rowNumber of rowNumbers) {
    const rowStitches = byRow.get(rowNumber)!;
    const isFoundation = rowStitches[0]?.type === StitchType.CHAIN;
    const points = isFoundation
      ? buildFoundationYarnPath(rowStitches)
      : buildWorkingRowYarnPath(rowStitches, stitchById);

    if (points.length < 2) {
      continue;
    }

    segments.push({
      key: `row-${rowNumber}`,
      geometry: createTube(points),
    });
  }

  for (let index = 1; index < rowNumbers.length; index += 1) {
    const lowerRow = byRow.get(rowNumbers[index - 1]!)!;
    const upperRow = byRow.get(rowNumbers[index]!)!;
    const joinPoints = buildRowJoinPath(lowerRow, upperRow, stitchById);

    if (!joinPoints || joinPoints.length < 2) {
      continue;
    }

    segments.push({
      key: `join-${rowNumbers[index]}`,
      geometry: createTube(joinPoints, 18),
    });
  }

  return segments;
}
