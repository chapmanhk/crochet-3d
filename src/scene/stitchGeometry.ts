import * as THREE from 'three';
import type { StitchNode, Vec3, WorkingDirection } from '@engine/index';
import {
  defaultDirectionForRow,
  FoundationType,
  getPlacementKind,
  groupStitchesByRow,
  MAGIC_RING_BASE_RADIUS,
  MAGIC_RING_Z_CENTER,
  MAGIC_RING_Z_SCALE,
  PlacementKind,
  StitchDefinitions,
  StitchType,
  STITCH_SPACING,
  WorkingDirection as WorkingDirectionEnum,
} from '@engine/index';

import { mergeStrandGeometries } from './geometryMerge';
import type { InstancedStitchBatch, StitchInstance } from './instancedStitches';
import {
  getCachedPrototypeGeometry,
  setCachedPrototypeGeometry,
} from './prototypeGeometryCache';
import {
  buildCrossingVTopPoints,
  getStitchShapeAdjustments,
  helicalPoints,
  loopAnchorFromParent,
  ROUND_WORKING_TOP_Z_OFFSET,
  stitchPostHeight,
  stitchTopYFromAdjustments,
  VISUAL_ROW_HEIGHT,
  YARN_RADIUS,
  yarnOverHeights,
} from './stitchRealism';

/** Minimum flat working-row stitch count before switching from merged meshes to instancing. */
export const INSTANCED_ROW_MIN_STITCHES = 4;

/** How a yarn segment row is drawn: merged strand meshes or instanced stitch prototypes. */
export type YarnSegmentRenderMode = 'merged' | 'instanced';

/** Geometry payload for one yarn segment, either merged strands or an instanced batch. */
export interface YarnSegmentRenderData {
  mode: YarnSegmentRenderMode;
  geometries?: THREE.BufferGeometry[];
  instanced?: InstancedStitchBatch;
}

const MAGIC_RING_FOUNDATION_VISUAL_Z_DROP = 0.08;
const TUBE_RADIAL = 8;
const TUBE_SEGMENTS_MIN = 10;
const TUBE_SEGMENTS_MAX = 40;
const CURVE_TENSION = 0.08;

const CHAIN_CROWN_Z = 0.1;
const CHAIN_LOOP_SPAN_SCALE = 0.36;
const CHAIN_SPINE_Z = 0.015;
const CHAIN_HOOK_Y_LIFT = 0.012;

const SC_TOP_Z_BASE = 0.07;
const SC_TOP_Z_PER_ROW = 0.035;

export interface YarnSegmentManifest {
  key: string;
  fingerprint: string;
}

export interface YarnSegment {
  key: string;
  geometries: THREE.BufferGeometry[];
}

function midpoint(a: Vec3, b: Vec3): THREE.Vector3 {
  return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

function stitchFingerprint(stitch: StitchNode): string {
  const { x, y, z } = stitch.position;
  const kind = stitch.placementKind ?? 'normal';
  return `${stitch.id}:${stitch.type}:${kind}:${stitch.secondaryAttachToId ?? ''}:${stitch.column}:${stitch.attachToId ?? ''}:${x},${y},${z}`;
}

function stitchHeightOffset(type: StitchType): number {
  return stitchPostHeight(type) - VISUAL_ROW_HEIGHT;
}

function scRowTopY(row: number, stitch?: StitchNode): number {
  const rowBase = row * VISUAL_ROW_HEIGHT;
  return stitch ? rowBase + stitchHeightOffset(stitch.type) : rowBase;
}

function scRowTopZ(row: number): number {
  return SC_TOP_Z_BASE + row * SC_TOP_Z_PER_ROW;
}

function scInsertionY(parent: StitchNode): number {
  if (parent.type === StitchType.CHAIN) {
    return 0;
  }

  return scRowTopY(parent.row, parent);
}

function parentTopZ(parent: StitchNode, roundFoundation: boolean): number {
  return roundFoundation
    ? parent.position.z + ROUND_WORKING_TOP_Z_OFFSET
    : scRowTopZ(parent.row);
}

function workingStitchTopZ(stitch: StitchNode, roundFoundation: boolean, zShift: number): number {
  return (roundFoundation ? stitch.position.z + ROUND_WORKING_TOP_Z_OFFSET : scRowTopZ(stitch.row)) + zShift;
}

function baseInsertionPoint(
  stitch: StitchNode,
  parent: StitchNode,
  roundFoundation = false,
): THREE.Vector3 {
  if (parent.type !== StitchType.CHAIN) {
    const parentTopY = scRowTopY(parent.row, parent);
    const anchor = loopAnchorFromParent(parent, parentTopY, parentTopZ(parent, roundFoundation));
    return new THREE.Vector3(stitch.position.x, anchor.y, anchor.z);
  }

  const x = stitch.position.x;
  const y = scInsertionY(parent);
  const z = CHAIN_CROWN_Z - 0.015;

  return new THREE.Vector3(x, y, z);
}

function scInsertionPoint(
  stitch: StitchNode,
  parent: StitchNode,
  stitchById: Map<string, StitchNode>,
  roundFoundation = false,
): THREE.Vector3 {
  if (stitch.secondaryAttachToId) {
    const secondary = stitchById.get(stitch.secondaryAttachToId);
    if (secondary) {
      const primaryPoint = baseInsertionPoint(stitch, parent, roundFoundation);
      const secondaryPoint = baseInsertionPoint(stitch, secondary, roundFoundation);
      return new THREE.Vector3(
        (primaryPoint.x + secondaryPoint.x) / 2,
        (primaryPoint.y + secondaryPoint.y) / 2,
        (primaryPoint.z + secondaryPoint.z) / 2,
      );
    }
  }

  return baseInsertionPoint(stitch, parent, roundFoundation);
}

function scStitchPoints(
  stitch: StitchNode,
  insertion: THREE.Vector3,
  roundFoundation = false,
  options: { increasePairFirst?: boolean } = {},
) {
  const adjustments = getStitchShapeAdjustments(stitch, options);
  const x = stitch.position.x + adjustments.xShift;
  const topY = stitchTopYFromAdjustments(insertion.y, stitch, adjustments);
  const topZ = workingStitchTopZ(stitch, roundFoundation, adjustments.zShift);
  const vTop = buildCrossingVTopPoints(
    x,
    topY,
    topZ,
    adjustments.vHalfWidth,
    adjustments.leanRadians,
  );

  return {
    insertion,
    leftTop: vTop.leftTop,
    rightTop: vTop.rightTop,
    crossLeft: vTop.crossLeft,
    crossRight: vTop.crossRight,
    centerX: x,
    vHalfWidth: adjustments.vHalfWidth,
    topZ,
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

function finalizeStrandGeometries(tubes: THREE.TubeGeometry[]): THREE.BufferGeometry[] {
  if (tubes.length === 0) {
    throw new Error('Cannot finalize an empty tube list.');
  }

  return tubes;
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

function chainLoopCrown(position: Vec3): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z + CHAIN_CROWN_Z);
}

function isMagicRingFoundation(foundationType: FoundationType): boolean {
  return foundationType === FoundationType.MAGIC_RING;
}

function buildMagicRingFoundationGeometry(stitches: StitchNode[]): THREE.BufferGeometry[] | null {
  if (stitches.length === 0) {
    return null;
  }

  const tubes: THREE.TubeGeometry[] = [];
  const center = new THREE.Vector3(0, 0, MAGIC_RING_Z_CENTER - MAGIC_RING_FOUNDATION_VISUAL_Z_DROP);
  const ringRadius = MAGIC_RING_BASE_RADIUS;

  tubes.push(
    createTube(
      Array.from({ length: 13 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          0.01,
          Math.sin(angle) * ringRadius * MAGIC_RING_Z_SCALE +
            MAGIC_RING_Z_CENTER -
            MAGIC_RING_FOUNDATION_VISUAL_Z_DROP,
        );
      }),
      16,
      0.08,
    ),
  );

  for (const stitch of stitches) {
    const position = stitch.position;
    const crown = new THREE.Vector3(
      position.x,
      position.y + 0.02,
      position.z + ROUND_WORKING_TOP_Z_OFFSET,
    );
    tubes.push(
      createTube(
        [center, crown, new THREE.Vector3(position.x, position.y, position.z)],
        8,
        0.1,
      ),
    );
  }

  return finalizeStrandGeometries(tubes);
}

function buildFoundationRowGeometry(rowStitches: StitchNode[]): THREE.BufferGeometry[] | null {
  if (rowStitches.length === 0) {
    return null;
  }

  if (rowStitches[0]?.type !== StitchType.CHAIN) {
    return buildMagicRingFoundationGeometry(rowStitches);
  }

  const span =
    STITCH_SPACING * StitchDefinitions[StitchType.CHAIN].width * CHAIN_LOOP_SPAN_SCALE;
  const tubes: THREE.TubeGeometry[] = [];
  const first = rowStitches[0]!.position;
  const last = rowStitches[rowStitches.length - 1]!.position;

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

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const position = stitch.position;
    const previous = rowStitches[index - 1];
    const next = rowStitches[index + 1];

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

  return finalizeStrandGeometries(tubes);
}

function buildYarnOverWrapGeometry(
  centerX: number,
  vHalfWidth: number,
  insertion: THREE.Vector3,
  topY: number,
  topZ: number,
  stitchType: StitchType,
): THREE.TubeGeometry[] {
  const postHeight = topY - insertion.y;
  if (postHeight <= 0) {
    return [];
  }

  return yarnOverHeights(stitchType).map((fraction) => {
    const wrapY = insertion.y + postHeight * fraction;
    const left = new THREE.Vector3(centerX - vHalfWidth * 0.62, wrapY, topZ - 0.01);
    const right = new THREE.Vector3(centerX + vHalfWidth * 0.62, wrapY, topZ + 0.018);
    const front = new THREE.Vector3(centerX, wrapY + 0.006, topZ + 0.03);
    return createTube([left, front, right], 7, 0.06);
  });
}

function buildWorkingStitchGeometry(
  stitch: StitchNode,
  insertion: THREE.Vector3,
  roundFoundation: boolean,
  options: { increasePairFirst?: boolean } = {},
): THREE.TubeGeometry[] {
  const points = scStitchPoints(stitch, insertion, roundFoundation, options);
  const topY = points.leftTop.y;

  const leftLeg = createTube(
    helicalPoints(points.leftTop, points.insertion, stitch.column, stitch.row),
    12,
    0.1,
  );

  const rightLeg = createTube(
    helicalPoints(points.rightTop, points.insertion, stitch.column + 0.5, stitch.row),
    12,
    0.1,
  );

  const crossLeft = createTube(
    [points.leftTop, points.crossLeft, points.crossRight],
    6,
    0.03,
  );

  const crossRight = createTube(
    [points.rightTop, points.crossRight, points.crossLeft],
    6,
    0.03,
  );

  const wraps = buildYarnOverWrapGeometry(
    points.centerX,
    points.vHalfWidth,
    insertion,
    topY,
    points.topZ,
    stitch.type,
  );

  return [crossLeft, crossRight, leftLeg, rightLeg, ...wraps];
}

function buildWorkingYarnGeometry(
  from: THREE.Vector3,
  to: THREE.Vector3,
): THREE.TubeGeometry {
  const midX = (from.x + to.x) / 2;
  const topY = from.y;

  return createTube(
    [
      from,
      new THREE.Vector3(midX, topY + 0.004, from.z - 0.018),
      to,
    ],
    8,
    0.05,
  );
}

function workingYarnEndpoints(
  previousPoints: ReturnType<typeof scStitchPoints>,
  currentPoints: ReturnType<typeof scStitchPoints>,
  direction: WorkingDirection,
  roundFoundation = false,
): [THREE.Vector3, THREE.Vector3] {
  if (roundFoundation) {
    return [previousPoints.rightTop, currentPoints.leftTop];
  }

  return direction === WorkingDirectionEnum.LEFT_TO_RIGHT
    ? [previousPoints.rightTop, currentPoints.leftTop]
    : [previousPoints.leftTop, currentPoints.rightTop];
}

function isIncreasePairFirst(
  stitch: StitchNode,
  rowStitches: StitchNode[],
  index: number,
): boolean {
  const next = rowStitches[index + 1];
  return (
    getPlacementKind(stitch) === PlacementKind.NORMAL &&
    next !== undefined &&
    getPlacementKind(next) === PlacementKind.INCREASE_SECOND &&
    next.attachToId === stitch.attachToId
  );
}

function buildWorkingRowGeometry(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
  rowNumber: number,
  roundFoundation = false,
): THREE.BufferGeometry[] | null {
  if (rowStitches.length === 0) {
    return null;
  }

  const direction = defaultDirectionForRow(rowNumber);
  const tubes: THREE.TubeGeometry[] = [];

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const parent = stitchById.get(stitch.attachToId ?? '');
    if (!parent) {
      return null;
    }

    const shapeOptions = {
      increasePairFirst: isIncreasePairFirst(stitch, rowStitches, index),
    };

    const insertion = scInsertionPoint(stitch, parent, stitchById, roundFoundation);
    tubes.push(...buildWorkingStitchGeometry(stitch, insertion, roundFoundation, shapeOptions));

    if (index > 0) {
      const previous = rowStitches[index - 1]!;
      const previousParent = stitchById.get(previous.attachToId ?? '')!;
      const previousInsertion = scInsertionPoint(
        previous,
        previousParent,
        stitchById,
        roundFoundation,
      );
      const previousPoints = scStitchPoints(
        previous,
        previousInsertion,
        roundFoundation,
        { increasePairFirst: isIncreasePairFirst(previous, rowStitches, index - 1) },
      );
      const currentPoints = scStitchPoints(stitch, insertion, roundFoundation, shapeOptions);
      const [from, to] = workingYarnEndpoints(
        previousPoints,
        currentPoints,
        direction,
        roundFoundation,
      );
      tubes.push(buildWorkingYarnGeometry(from, to));
    }
  }

  return finalizeStrandGeometries(tubes);
}

function hookPointForRowEnd(
  stitch: StitchNode,
  role: 'attach' | 'rowExit',
  stitchById: Map<string, StitchNode>,
  rowStitches: StitchNode[],
  stitchIndex: number,
  roundFoundation = false,
): THREE.Vector3 {
  if (stitch.type === StitchType.CHAIN) {
    return chainLoopCrown(stitch.position);
  }

  const parent = stitchById.get(stitch.attachToId ?? '');
  if (!parent) {
    const topY = scRowTopY(stitch.row, stitch);
    const topZ = roundFoundation
      ? stitch.position.z + ROUND_WORKING_TOP_Z_OFFSET
      : scRowTopZ(stitch.row);
    const xOffset = role === 'rowExit' ? 0.08 : 0;
    return new THREE.Vector3(stitch.position.x + xOffset, topY, topZ);
  }

  const insertion = scInsertionPoint(stitch, parent, stitchById, roundFoundation);
  const points = scStitchPoints(stitch, insertion, roundFoundation, {
    increasePairFirst: isIncreasePairFirst(stitch, rowStitches, stitchIndex),
  });

  if (roundFoundation && role === 'rowExit') {
    const angle = Math.atan2(
      stitch.position.z - MAGIC_RING_Z_CENTER,
      stitch.position.x,
    );
    const tangentX = -Math.sin(angle) * 0.08;
    const tangentZ = Math.cos(angle) * MAGIC_RING_Z_SCALE * 0.08;
    return new THREE.Vector3(
      points.rightTop.x + tangentX,
      points.rightTop.y,
      points.rightTop.z + tangentZ,
    );
  }

  if (role === 'rowExit') {
    return new THREE.Vector3(
      points.rightTop.x + 0.08,
      points.rightTop.y,
      points.rightTop.z,
    );
  }

  return points.rightTop;
}

function buildRoundRowJoinPath(
  lowerRow: StitchNode[],
  upperStart: StitchNode,
  stitchById: Map<string, StitchNode>,
): THREE.Vector3[] | null {
  const lowerEnd = lowerRow[lowerRow.length - 1]!;
  const lowerExit = hookPointForRowEnd(
    lowerEnd,
    'rowExit',
    stitchById,
    lowerRow,
    lowerRow.length - 1,
    true,
  );
  const upperParent = stitchById.get(upperStart.attachToId ?? '');
  if (!upperParent) {
    return null;
  }

  const upperEntry = scInsertionPoint(upperStart, upperParent, stitchById, true);
  const turn = new THREE.Vector3(
    (lowerExit.x + upperEntry.x) / 2,
    (lowerExit.y + upperEntry.y) / 2 + VISUAL_ROW_HEIGHT * 0.12,
    (lowerExit.z + upperEntry.z) / 2,
  );

  return [lowerExit, turn, upperEntry];
}

function buildRowJoinPath(
  lowerRow: StitchNode[],
  upperRow: StitchNode[],
  stitchById: Map<string, StitchNode>,
  foundationType: FoundationType = FoundationType.CHAIN,
): THREE.Vector3[] | null {
  if (lowerRow.length === 0 || upperRow.length === 0) {
    return null;
  }

  const lowerEnd = lowerRow[lowerRow.length - 1]!;
  const upperStart = upperRow[0]!;
  const roundFoundation = isMagicRingFoundation(foundationType);

  if (roundFoundation) {
    return buildRoundRowJoinPath(lowerRow, upperStart, stitchById);
  }

  const lowerExit = hookPointForRowEnd(
    lowerEnd,
    lowerEnd.type === StitchType.CHAIN ? 'attach' : 'rowExit',
    stitchById,
    lowerRow,
    lowerRow.length - 1,
  );

  const upperParent = stitchById.get(upperStart.attachToId ?? '');
  const upperEntry = upperParent
    ? scInsertionPoint(upperStart, upperParent, stitchById)
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
  const pairFlags = rowStitches
    .map((stitch, index) => (isIncreasePairFirst(stitch, rowStitches, index) ? '1' : '0'))
    .join('');
  return `row:${rowNumber}:${pairFlags}:${rowStitches.map(stitchFingerprint).join(';')}`;
}

function joinFingerprint(lowerRow: StitchNode[], upperRow: StitchNode[]): string {
  const lowerEnd = lowerRow[lowerRow.length - 1]!;
  const upperStart = upperRow[0]!;
  return `join:${lowerEnd.id}->${upperStart.id}`;
}

function indexStitches(stitches: StitchNode[]) {
  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const byRow = groupStitchesByRow(stitches);
  const rowNumbers = [...byRow.keys()].sort((left, right) => left - right);

  return { stitchById, byRow, rowNumbers };
}

function canRenderWorkingRow(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
): boolean {
  return rowStitches.every((stitch) => {
    if (!stitch.attachToId || !stitchById.has(stitch.attachToId)) {
      return false;
    }

    if (stitch.secondaryAttachToId) {
      return stitchById.has(stitch.secondaryAttachToId);
    }

    return true;
  });
}

export function measureSegmentsHeight(segments: YarnSegment[]): number {
  const bounds = new THREE.Box3();

  for (const segment of segments) {
    for (const geometry of segment.geometries) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        bounds.union(geometry.boundingBox);
      }
    }
  }

  return bounds.max.y - bounds.min.y;
}

export function getYarnSegmentManifests(
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): YarnSegmentManifest[] {
  if (stitches.length === 0) {
    return [];
  }

  const { stitchById, byRow, rowNumbers } = indexStitches(stitches);
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
    const joinPoints = buildRowJoinPath(lowerRow, upperRow, stitchById, foundationType);

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

function getStitchPrototypeKey(
  stitch: StitchNode,
  increasePairFirst: boolean,
): string {
  const kind = getPlacementKind(stitch);
  return `${stitch.type}:${kind}:${increasePairFirst ? 'inc-first' : 'inc-normal'}`;
}

function buildSyntheticPrototypeContext(prototypeKey: string): {
  stitch: StitchNode;
  parent: StitchNode;
  stitchById: Map<string, StitchNode>;
  insertion: THREE.Vector3;
} {
  const [typeValue, kindValue] = prototypeKey.split(':');
  const stitchType = typeValue as StitchType;
  const placementKind = kindValue as PlacementKind;

  const parent: StitchNode = {
    id: 'prototype-parent',
    type: StitchType.CHAIN,
    row: 0,
    column: 0,
    position: { x: 0, y: 0, z: 0 },
    attachToId: null,
    placementKind: PlacementKind.NORMAL,
  };

  const stitch: StitchNode = {
    id: 'prototype-stitch',
    type: stitchType,
    row: 1,
    column: 0,
    position: { x: 0, y: VISUAL_ROW_HEIGHT, z: 0 },
    attachToId: parent.id,
    placementKind,
    secondaryAttachToId:
      placementKind === PlacementKind.DECREASE ? 'prototype-secondary' : undefined,
  };

  const stitchById = new Map<string, StitchNode>([
    [parent.id, parent],
    [stitch.id, stitch],
  ]);

  if (placementKind === PlacementKind.DECREASE) {
    const secondary: StitchNode = {
      id: 'prototype-secondary',
      type: StitchType.SINGLE_CROCHET,
      row: 0,
      column: 1,
      position: { x: STITCH_SPACING, y: 0, z: 0 },
      attachToId: null,
      placementKind: PlacementKind.NORMAL,
    };
    stitchById.set(secondary.id, secondary);
  }

  const insertion = scInsertionPoint(stitch, parent, stitchById, false);

  return { stitch, parent, stitchById, insertion };
}

function getStitchPrototypeGeometry(
  prototypeKey: string,
  roundFoundation: boolean,
): THREE.BufferGeometry {
  const cacheKey = `${prototypeKey}:${roundFoundation ? 'round' : 'flat'}`;
  const cached = getCachedPrototypeGeometry(cacheKey);
  if (cached) {
    return cached;
  }

  const { stitch, insertion } = buildSyntheticPrototypeContext(prototypeKey);
  const increasePairFirst = prototypeKey.endsWith('inc-first');
  const tubes = buildWorkingStitchGeometry(stitch, insertion, roundFoundation, {
    increasePairFirst,
  });
  const merged = mergeStrandGeometries(tubes);
  setCachedPrototypeGeometry(cacheKey, merged);
  return merged;
}

function buildWorkingRowInstancedBatch(
  rowStitches: StitchNode[],
  stitchById: Map<string, StitchNode>,
  rowNumber: number,
  roundFoundation: boolean,
): InstancedStitchBatch {
  const prototypes = new Map<string, THREE.BufferGeometry>();
  const instances: StitchInstance[] = [];
  const bridgeGeometries: THREE.BufferGeometry[] = [];
  const direction = defaultDirectionForRow(rowNumber);
  const prototypeReferences = new Map<string, THREE.Vector3>();

  for (let index = 0; index < rowStitches.length; index += 1) {
    const stitch = rowStitches[index]!;
    const parent = stitchById.get(stitch.attachToId ?? '');
    if (!parent) {
      continue;
    }

    const increasePairFirst = isIncreasePairFirst(stitch, rowStitches, index);
    const prototypeKey = getStitchPrototypeKey(stitch, increasePairFirst);
    if (!prototypes.has(prototypeKey)) {
      prototypes.set(prototypeKey, getStitchPrototypeGeometry(prototypeKey, roundFoundation));
      prototypeReferences.set(
        prototypeKey,
        buildSyntheticPrototypeContext(prototypeKey).insertion,
      );
    }

    const insertion = scInsertionPoint(stitch, parent, stitchById, roundFoundation);
    const prototypeInsertion = prototypeReferences.get(prototypeKey)!;
    const matrix = new THREE.Matrix4().makeTranslation(
      insertion.x - prototypeInsertion.x,
      insertion.y - prototypeInsertion.y,
      insertion.z - prototypeInsertion.z,
    );

    instances.push({ prototypeKey, matrix });

    if (index > 0) {
      const previous = rowStitches[index - 1]!;
      const previousParent = stitchById.get(previous.attachToId ?? '')!;
      const previousInsertion = scInsertionPoint(
        previous,
        previousParent,
        stitchById,
        roundFoundation,
      );
      const previousPoints = scStitchPoints(
        previous,
        previousInsertion,
        roundFoundation,
        { increasePairFirst: isIncreasePairFirst(previous, rowStitches, index - 1) },
      );
      const currentPoints = scStitchPoints(stitch, insertion, roundFoundation, {
        increasePairFirst,
      });
      const [from, to] = workingYarnEndpoints(
        previousPoints,
        currentPoints,
        direction,
        roundFoundation,
      );
      bridgeGeometries.push(buildWorkingYarnGeometry(from, to));
    }
  }

  return { prototypes, instances, bridgeGeometries };
}

/**
 * Resolve merged or instanced geometry for one yarn segment key (`row-N`, `join-N`).
 * Flat working rows at or above `INSTANCED_ROW_MIN_STITCHES` prefer instanced rendering.
 */
export function buildYarnSegmentRenderData(
  key: string,
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): YarnSegmentRenderData | null {
  const { stitchById, byRow } = indexStitches(stitches);
  const roundFoundation = isMagicRingFoundation(foundationType);

  if (key.startsWith('row-')) {
    const rowNumber = Number.parseInt(key.slice(4), 10);
    const rowStitches = byRow.get(rowNumber);
    if (!rowStitches) {
      return null;
    }

    if (
      rowNumber > 0 &&
      !roundFoundation &&
      rowStitches.length >= INSTANCED_ROW_MIN_STITCHES &&
      canRenderWorkingRow(rowStitches, stitchById)
    ) {
      return {
        mode: 'instanced',
        instanced: buildWorkingRowInstancedBatch(
          rowStitches,
          stitchById,
          rowNumber,
          roundFoundation,
        ),
      };
    }

    const geometries =
      rowNumber === 0
        ? buildFoundationRowGeometry(rowStitches)
        : buildWorkingRowGeometry(rowStitches, stitchById, rowNumber, roundFoundation);

    if (!geometries || geometries.length === 0) {
      return null;
    }

    return { mode: 'merged', geometries };
  }

  const geometries = buildYarnSegmentGeometry(key, stitches, foundationType);
  if (!geometries || geometries.length === 0) {
    return null;
  }

  return { mode: 'merged', geometries };
}

export function buildYarnSegmentGeometry(
  key: string,
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): THREE.BufferGeometry[] | null {
  const { stitchById, byRow, rowNumbers } = indexStitches(stitches);
  const roundFoundation = isMagicRingFoundation(foundationType);

  if (key.startsWith('row-')) {
    const rowNumber = Number.parseInt(key.slice(4), 10);
    const rowStitches = byRow.get(rowNumber);
    if (!rowStitches) {
      return null;
    }

    return rowNumber === 0
      ? buildFoundationRowGeometry(rowStitches)
      : buildWorkingRowGeometry(rowStitches, stitchById, rowNumber, roundFoundation);
  }

  if (key.startsWith('join-')) {
    const rowNumber = Number.parseInt(key.slice(5), 10);
    const lowerIndex = rowNumbers.indexOf(rowNumber);
    if (lowerIndex <= 0) {
      return null;
    }

    const lowerRow = byRow.get(rowNumbers[lowerIndex - 1]!)!;
    const upperRow = byRow.get(rowNumber)!;
    const joinPoints = buildRowJoinPath(lowerRow, upperRow, stitchById, foundationType);

    if (!joinPoints || joinPoints.length < 2) {
      return null;
    }

    return [createTube(joinPoints, 10, 0.15)];
  }

  return null;
}

export function buildYarnSegments(
  stitches: StitchNode[],
  foundationType: FoundationType = FoundationType.CHAIN,
): YarnSegment[] {
  return getYarnSegmentManifests(stitches, foundationType).flatMap((manifest) => {
    const geometries = buildYarnSegmentGeometry(manifest.key, stitches, foundationType);
    if (!geometries || geometries.length === 0) {
      return [];
    }

    return [{ key: manifest.key, geometries }];
  });
}

export { VISUAL_ROW_HEIGHT } from './stitchRealism';

export function getAttachmentInsertionPosition(
  parent: StitchNode,
  _childType: StitchType = StitchType.SINGLE_CROCHET,
  foundationType: FoundationType = FoundationType.CHAIN,
): { x: number; y: number; z: number } {
  const roundFoundation = isMagicRingFoundation(foundationType);

  if (parent.type === StitchType.CHAIN) {
    return {
      x: parent.position.x,
      y: scInsertionY(parent),
      z: CHAIN_CROWN_Z - 0.015,
    };
  }

  const parentTopY = scRowTopY(parent.row, parent);
  const anchor = loopAnchorFromParent(parent, parentTopY, parentTopZ(parent, roundFoundation));

  return { x: parent.position.x, y: anchor.y, z: anchor.z };
}

/** Loop anchor used by the drape preview spring graph. */
export function getDrapeLoopAnchorPosition(
  parent: StitchNode,
  foundationType: FoundationType = FoundationType.CHAIN,
): [number, number, number] {
  const position = getAttachmentInsertionPosition(
    parent,
    StitchType.SINGLE_CROCHET,
    foundationType,
  );
  return [position.x, position.y, position.z];
}

/** Top-of-stitch proxy position for drape preview dynamics. */
export function getDrapeStitchTopPosition(
  stitch: StitchNode,
  stitchById: Map<string, StitchNode>,
  foundationType: FoundationType = FoundationType.CHAIN,
): [number, number, number] {
  const roundFoundation = isMagicRingFoundation(foundationType);
  const parent = stitch.attachToId ? stitchById.get(stitch.attachToId) : undefined;
  if (!parent) {
    return [stitch.position.x, stitch.position.y, stitch.position.z];
  }

  const rowStitches = [...stitchById.values()]
    .filter((candidate) => candidate.row === stitch.row)
    .sort((left, right) => left.column - right.column);
  const stitchIndex = rowStitches.findIndex((candidate) => candidate.id === stitch.id);

  const insertion = scInsertionPoint(stitch, parent, stitchById, roundFoundation);
  const adjustments = getStitchShapeAdjustments(stitch, {
    increasePairFirst:
      stitchIndex >= 0 && isIncreasePairFirst(stitch, rowStitches, stitchIndex),
  });
  const x = stitch.position.x + adjustments.xShift;
  const y = stitchTopYFromAdjustments(insertion.y, stitch, adjustments);
  const z = workingStitchTopZ(stitch, roundFoundation, adjustments.zShift);

  return [x, y, z];
}
