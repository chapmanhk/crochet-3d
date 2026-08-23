export const StitchType = {
  CHAIN: 'chain',
  SINGLE_CROCHET: 'single_crochet',
} as const;

export type StitchType = (typeof StitchType)[keyof typeof StitchType];

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
  position: Vec3;
}

export interface PatternSnapshot {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
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
};

export type PlacementErrorCode =
  | 'NO_FOUNDATION'
  | 'INVALID_CHAIN_LENGTH'
  | 'FOUNDATION_EXISTS'
  | 'NO_TARGET_STITCH'
  | 'INVALID_ATTACHMENT_TARGET'
  | 'ROW_FULL'
  | 'CANNOT_START_ROW';

export class PlacementError extends Error {
  constructor(
    public readonly code: PlacementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}
