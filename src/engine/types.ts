export const StitchType = {
  CHAIN: 'chain',
  SINGLE_CROCHET: 'single_crochet',
  HALF_DOUBLE_CROCHET: 'half_double_crochet',
  DOUBLE_CROCHET: 'double_crochet',
} as const;

export type StitchType = (typeof StitchType)[keyof typeof StitchType];

export const WorkingStitchType = {
  SINGLE_CROCHET: StitchType.SINGLE_CROCHET,
  HALF_DOUBLE_CROCHET: StitchType.HALF_DOUBLE_CROCHET,
  DOUBLE_CROCHET: StitchType.DOUBLE_CROCHET,
} as const;

export type WorkingStitchType =
  (typeof WorkingStitchType)[keyof typeof WorkingStitchType];

export const WORKING_STITCH_TYPES = Object.values(WorkingStitchType);

export const FoundationType = {
  CHAIN: 'chain',
  MAGIC_RING: 'magic_ring',
} as const;

export type FoundationType =
  (typeof FoundationType)[keyof typeof FoundationType];

export const PlacementKind = {
  NORMAL: 'normal',
  INCREASE_SECOND: 'increase_second',
  DECREASE: 'decrease',
} as const;

export type PlacementKind =
  (typeof PlacementKind)[keyof typeof PlacementKind];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface StitchNode {
  id: string;
  type: StitchType;
  row: number;
  column: number;
  attachToId: string | null;
  secondaryAttachToId?: string | null;
  placementKind?: PlacementKind;
  position: Vec3;
}

export interface PatternSnapshot {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
  foundationType: FoundationType;
  rowDirections: Record<number, WorkingDirection>;
}

export const WorkingDirection = {
  LEFT_TO_RIGHT: 'left_to_right',
  RIGHT_TO_LEFT: 'right_to_left',
} as const;

export type WorkingDirection =
  (typeof WorkingDirection)[keyof typeof WorkingDirection];

export interface StitchDefinition {
  name: string;
  abbreviation: string;
  height: number;
  width: number;
}

export const StitchDefinitions: Record<StitchType, StitchDefinition> = {
  [StitchType.CHAIN]: {
    name: 'Chain',
    abbreviation: 'ch',
    height: 0.5,
    width: 0.6,
  },
  [StitchType.SINGLE_CROCHET]: {
    name: 'Single Crochet',
    abbreviation: 'sc',
    height: 1.0,
    width: 0.7,
  },
  [StitchType.HALF_DOUBLE_CROCHET]: {
    name: 'Half Double Crochet',
    abbreviation: 'hdc',
    height: 1.5,
    width: 0.75,
  },
  [StitchType.DOUBLE_CROCHET]: {
    name: 'Double Crochet',
    abbreviation: 'dc',
    height: 2.0,
    width: 0.8,
  },
};

export function isWorkingStitchType(type: StitchType): type is WorkingStitchType {
  return WORKING_STITCH_TYPES.includes(type as WorkingStitchType);
}

export type PlacementErrorCode =
  | 'NO_FOUNDATION'
  | 'INVALID_CHAIN_LENGTH'
  | 'INVALID_MAGIC_RING_COUNT'
  | 'FOUNDATION_EXISTS'
  | 'NO_TARGET_STITCH'
  | 'INVALID_ATTACHMENT_TARGET'
  | 'ROW_FULL'
  | 'CANNOT_START_ROW'
  | 'CANNOT_DECREASE'
  | 'INVALID_STITCH_TYPE';

export class PlacementError extends Error {
  constructor(
    public readonly code: PlacementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}
