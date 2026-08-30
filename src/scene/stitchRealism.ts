import type { StitchNode } from '@engine/index';
import { PlacementKind, StitchType } from '@engine/index';
import * as THREE from 'three';

export const VISUAL_ROW_HEIGHT = 0.22;
export const YARN_RADIUS = 0.052;
export const SC_V_HALF_WIDTH = 0.1;
export const CHAIN_TURN_LIFT = VISUAL_ROW_HEIGHT * 0.18;
export const ROUND_WORKING_TOP_Z_OFFSET = 0.05;

const PLY_TWIST_AMPLITUDE_X = 0.009;
const PLY_TWIST_AMPLITUDE_Z = 0.007;
const PLY_TWIST_TURNS = 1.35;

export function stitchPostHeight(type: StitchType): number {
  switch (type) {
    case StitchType.HALF_DOUBLE_CROCHET:
      return VISUAL_ROW_HEIGHT * 1.5;
    case StitchType.DOUBLE_CROCHET:
      return VISUAL_ROW_HEIGHT * 2;
    default:
      return VISUAL_ROW_HEIGHT;
  }
}

function stitchSeed(stitch: StitchNode): number {
  let hash = 0;
  for (let index = 0; index < stitch.id.length; index += 1) {
    hash = (hash * 31 + stitch.id.charCodeAt(index)) | 0;
  }
  return hash;
}

function deterministicUnit(stitch: StitchNode, salt: number): number {
  const value = Math.sin(stitchSeed(stitch) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function stitchJitter(stitch: StitchNode, salt: number, amplitude: number): number {
  return (deterministicUnit(stitch, salt) - 0.5) * 2 * amplitude;
}

export interface StitchShapeAdjustments {
  xShift: number;
  yShift: number;
  zShift: number;
  vHalfWidth: number;
  leanRadians: number;
}

export function getStitchShapeAdjustments(
  stitch: StitchNode,
  options: { increasePairFirst?: boolean } = {},
): StitchShapeAdjustments {
  const placementKind = stitch.placementKind ?? PlacementKind.NORMAL;
  let vHalfWidth = SC_V_HALF_WIDTH;
  let xShift = stitchJitter(stitch, 1, 0.01);
  let yShift = stitchJitter(stitch, 2, 0.004);
  let zShift = stitchJitter(stitch, 3, 0.006);
  let leanRadians = stitchJitter(stitch, 4, 0.05);

  if (options.increasePairFirst) {
    xShift -= 0.04;
    vHalfWidth *= 0.9;
    leanRadians -= 0.09;
  }

  if (placementKind === PlacementKind.INCREASE_SECOND) {
    xShift += 0.045;
    vHalfWidth *= 0.88;
    leanRadians += 0.1;
  }

  if (placementKind === PlacementKind.DECREASE) {
    vHalfWidth *= 0.62;
    xShift *= 0.25;
    leanRadians *= 0.4;
  }

  if (stitch.column === 0 && stitch.row >= 1) {
    yShift += CHAIN_TURN_LIFT;
  }

  return { xShift, yShift, zShift, vHalfWidth, leanRadians };
}

export function stitchTopYFromAdjustments(
  insertionY: number,
  stitch: StitchNode,
  adjustments: StitchShapeAdjustments,
): number {
  return insertionY + stitchPostHeight(stitch.type) + adjustments.yShift;
}

export function stitchTopY(
  insertionY: number,
  stitch: StitchNode,
  options?: { increasePairFirst?: boolean },
): number {
  return stitchTopYFromAdjustments(
    insertionY,
    stitch,
    getStitchShapeAdjustments(stitch, options),
  );
}

export function yarnOverHeights(type: StitchType): number[] {
  switch (type) {
    case StitchType.HALF_DOUBLE_CROCHET:
      return [0.42];
    case StitchType.DOUBLE_CROCHET:
      return [0.34, 0.68];
    default:
      return [];
  }
}

export function helicalPoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  column: number,
  row: number,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segments = 6;
  const phase = column * 0.85 + row * 0.35;

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const y = THREE.MathUtils.lerp(start.y, end.y, t);
    const baseX = THREE.MathUtils.lerp(start.x, end.x, t);
    const baseZ = THREE.MathUtils.lerp(start.z, end.z, t);
    const twist = t * Math.PI * 2 * PLY_TWIST_TURNS + phase;
    points.push(
      new THREE.Vector3(
        baseX + Math.sin(twist) * PLY_TWIST_AMPLITUDE_X,
        y,
        baseZ + Math.cos(twist) * PLY_TWIST_AMPLITUDE_Z,
      ),
    );
  }

  return points;
}

export function buildCrossingVTopPoints(
  centerX: number,
  topY: number,
  topZ: number,
  vHalfWidth: number,
  leanRadians: number,
): {
  leftTop: THREE.Vector3;
  rightTop: THREE.Vector3;
  crossLeft: THREE.Vector3;
  crossRight: THREE.Vector3;
} {
  const leanX = Math.sin(leanRadians) * 0.012;
  const leanZ = Math.cos(leanRadians) * 0.008;
  const leftTop = new THREE.Vector3(centerX - vHalfWidth + leanX, topY, topZ - leanZ);
  const rightTop = new THREE.Vector3(centerX + vHalfWidth + leanX, topY, topZ - leanZ);
  const crossY = topY + 0.012;
  const crossZ = topZ + 0.014;
  const crossLeft = new THREE.Vector3(centerX - vHalfWidth * 0.22, crossY, crossZ);
  const crossRight = new THREE.Vector3(centerX + vHalfWidth * 0.22, crossY, crossZ);

  return { leftTop, rightTop, crossLeft, crossRight };
}

export function loopAnchorFromParent(
  parent: StitchNode,
  parentTopY: number,
  parentTopZ: number,
): THREE.Vector3 {
  return new THREE.Vector3(parent.position.x, parentTopY - 0.012, parentTopZ - 0.008);
}
