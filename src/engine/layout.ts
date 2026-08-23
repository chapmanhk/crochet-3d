import type { Vec3 } from './types';
import { PlacementKind, StitchDefinitions, StitchType } from './types';

const ROW_HEIGHT = 1.2;
const STITCH_SPACING = 0.8;

const MAGIC_RING_Z_CENTER = 0.12;
const MAGIC_RING_Z_SCALE = 0.35;
const MAGIC_RING_BASE_RADIUS = STITCH_SPACING * 0.45;
const MAGIC_RING_RADIUS_GROWTH = STITCH_SPACING * 0.35;
const MAGIC_RING_INCREASE_ANGLE_OFFSET = 0.12;

function radialMagicRingPosition(angle: number, row: number): Vec3 {
  const radius = MAGIC_RING_BASE_RADIUS + row * MAGIC_RING_RADIUS_GROWTH;
  return {
    x: Math.cos(angle) * radius,
    y: row * ROW_HEIGHT,
    z: Math.sin(angle) * radius * MAGIC_RING_Z_SCALE + MAGIC_RING_Z_CENTER,
  };
}

function positionAngle(position: Vec3): number {
  return Math.atan2(
    (position.z - MAGIC_RING_Z_CENTER) / MAGIC_RING_Z_SCALE,
    position.x,
  );
}

function midpointAngle(left: number, right: number): number {
  let delta = right - left;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return left + delta / 2;
}

export function layoutPosition(
  type: StitchType,
  row: number,
  column: number,
): Vec3 {
  const def = StitchDefinitions[type];
  const x = column * STITCH_SPACING * def.width;
  const y = row * ROW_HEIGHT;
  const z = type === StitchType.CHAIN ? 0 : 0.15;
  return { x, y, z };
}

export function layoutMagicRingPosition(index: number, count: number): Vec3 {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return radialMagicRingPosition(angle, 0);
}

export interface MagicRingWorkingLayoutOptions {
  row: number;
  parentPosition: Vec3;
  secondaryParentPosition?: Vec3 | null;
  placementKind?: PlacementKind;
}

export function layoutMagicRingWorkingPosition(
  options: MagicRingWorkingLayoutOptions,
): Vec3 {
  const {
    row,
    parentPosition,
    secondaryParentPosition,
    placementKind = PlacementKind.NORMAL,
  } = options;

  if (placementKind === PlacementKind.DECREASE && secondaryParentPosition) {
    const angle = midpointAngle(
      positionAngle(parentPosition),
      positionAngle(secondaryParentPosition),
    );
    return radialMagicRingPosition(angle, row);
  }

  let angle = positionAngle(parentPosition);
  if (placementKind === PlacementKind.INCREASE_SECOND) {
    angle += MAGIC_RING_INCREASE_ANGLE_OFFSET;
  }

  return radialMagicRingPosition(angle, row);
}

export function layoutStitchPositions(
  stitches: Array<{ type: StitchType; row: number; column: number }>,
): Vec3[] {
  return stitches.map((stitch) =>
    layoutPosition(stitch.type, stitch.row, stitch.column),
  );
}

export {
  ROW_HEIGHT,
  STITCH_SPACING,
  MAGIC_RING_BASE_RADIUS,
  MAGIC_RING_RADIUS_GROWTH,
  MAGIC_RING_Z_CENTER,
  MAGIC_RING_Z_SCALE,
};
