import type { Vec3 } from './types';
import { StitchDefinitions, StitchType } from './types';

const ROW_HEIGHT = 1.2;
const STITCH_SPACING = 0.8;

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
  const radius = STITCH_SPACING * 0.45;
  return {
    x: Math.cos(angle) * radius,
    y: 0,
    z: Math.sin(angle) * radius * 0.35 + 0.12,
  };
}

export function layoutStitchPositions(
  stitches: Array<{ type: StitchType; row: number; column: number }>,
): Vec3[] {
  return stitches.map((stitch) =>
    layoutPosition(stitch.type, stitch.row, stitch.column),
  );
}

export { ROW_HEIGHT, STITCH_SPACING };
