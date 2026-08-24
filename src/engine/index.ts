export { Pattern, MIN_CHAIN_LENGTH, MAX_CHAIN_LENGTH, MIN_MAGIC_RING_STITCHES, MAX_MAGIC_RING_STITCHES, formatChainLengthError, formatMagicRingCountError } from './Pattern';
export { StitchGraph } from './StitchGraph';
export { createStitchNode, resetIdCounter, restoreIdCounter } from './StitchNode';
export { groupStitchesByRow } from './stitchRows';
export { generateInstructions, getStitchLabel, getWorkingStitchLabel, getWorkingStitchName } from './instructions';
export {
  layoutPosition,
  layoutMagicRingPosition,
  layoutMagicRingWorkingPosition,
  layoutStitchPositions,
  ROW_HEIGHT,
  STITCH_SPACING,
  MAGIC_RING_BASE_RADIUS,
  MAGIC_RING_RADIUS_GROWTH,
  MAGIC_RING_Z_CENTER,
  MAGIC_RING_Z_SCALE,
  magicRingRadialDistance,
} from './layout';
export type { MagicRingWorkingLayoutOptions } from './layout';
export {
  countParentSlotsConsumed,
  isRowComplete,
  remainingParentSlots,
  canPlaceDecrease,
  getPlacementKind,
} from './placement';
export {
  createTemplateSnapshot,
  getTemplateById,
  PATTERN_TEMPLATES,
} from './templates';
export type { PatternTemplate, TemplateId } from './templates';
export {
  AUTOSAVE_STORAGE_KEY,
  PATTERN_FILE_VERSION,
  PatternPersistenceError,
  buildInstructionsExport,
  createSavedPatternFile,
  defaultInstructionsFilename,
  defaultPatternFilename,
  formatInstructionsMarkdown,
  formatInstructionsPlainText,
  parsePatternFile,
  serializePatternFile,
  validateSavedPatternFile,
} from './persistence';
export type { PatternUiState, SavedPatternFile } from './persistence';
export {
  defaultDirectionForRow,
  resolveAttachColumn,
  WorkingDirection,
} from './workingDirection';
export {
  FoundationType,
  PlacementKind,
  PlacementError,
  StitchDefinitions,
  StitchType,
  WorkingStitchType,
  WORKING_STITCH_TYPES,
  isWorkingStitchType,
} from './types';
export type {
  FoundationType as FoundationTypeValue,
  PatternSnapshot,
  PlacementErrorCode,
  PlacementKind as PlacementKindType,
  StitchDefinition,
  StitchNode,
  Vec3,
  WorkingDirection as WorkingDirectionType,
  WorkingStitchType as WorkingStitchTypeValue,
} from './types';
