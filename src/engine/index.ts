export { Pattern } from './Pattern';
export { StitchGraph } from './StitchGraph';
export { createStitchNode, resetIdCounter } from './StitchNode';
export { generateInstructions, getStitchLabel } from './instructions';
export { layoutPosition, layoutStitchPositions, ROW_HEIGHT, STITCH_SPACING } from './layout';
export {
  PlacementError,
  StitchDefinitions,
  StitchType,
} from './types';
export type {
  PatternSnapshot,
  PlacementErrorCode,
  StitchDefinition,
  StitchNode,
  Vec3,
} from './types';
