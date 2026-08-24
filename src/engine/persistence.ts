import { generateInstructions } from './instructions';
import type { PatternSnapshot, StitchNode, WorkingStitchType } from './types';
import {
  FoundationType,
  PlacementKind,
  StitchType,
  WORKING_STITCH_TYPES,
} from './types';

export const PATTERN_FILE_VERSION = 1;
export const AUTOSAVE_STORAGE_KEY = 'crochet-3d-autosave';

export interface PatternUiState {
  yarnColor: string;
  selectedStitchType: WorkingStitchType;
}

export interface SavedPatternFile {
  version: number;
  exportedAt: string;
  pattern: PatternSnapshot;
  ui: PatternUiState;
}

export class PatternPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatternPersistenceError';
  }
}

const STITCH_TYPES = new Set<string>(Object.values(StitchType));
const FOUNDATION_TYPES = new Set<string>(Object.values(FoundationType));
const PLACEMENT_KINDS = new Set<string>(Object.values(PlacementKind));
const WORKING_TYPES = new Set<string>(WORKING_STITCH_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVec3(value: unknown): value is { x: number; y: number; z: number } {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number'
  );
}

function validateStitchNode(value: unknown, index: number): StitchNode {
  if (!isRecord(value)) {
    throw new PatternPersistenceError(`Stitch ${index} is not a valid object.`);
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    throw new PatternPersistenceError(`Stitch ${index} is missing a valid id.`);
  }

  if (!STITCH_TYPES.has(String(value.type))) {
    throw new PatternPersistenceError(`Stitch ${index} has an unsupported type.`);
  }

  if (typeof value.row !== 'number' || value.row < 0) {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid row.`);
  }

  if (typeof value.column !== 'number' || value.column < 0) {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid column.`);
  }

  if (value.attachToId !== undefined && value.attachToId !== null && typeof value.attachToId !== 'string') {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid attachToId.`);
  }

  if (
    value.secondaryAttachToId !== undefined &&
    value.secondaryAttachToId !== null &&
    typeof value.secondaryAttachToId !== 'string'
  ) {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid secondaryAttachToId.`);
  }

  if (
    value.placementKind !== undefined &&
    !PLACEMENT_KINDS.has(String(value.placementKind))
  ) {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid placement kind.`);
  }

  if (!isVec3(value.position)) {
    throw new PatternPersistenceError(`Stitch ${index} is missing a valid position.`);
  }

  return {
    id: value.id,
    type: value.type as StitchNode['type'],
    row: value.row,
    column: value.column,
    attachToId: (value.attachToId as string | null | undefined) ?? null,
    secondaryAttachToId:
      (value.secondaryAttachToId as string | null | undefined) ?? null,
    placementKind: value.placementKind as StitchNode['placementKind'],
    position: value.position,
  };
}

function validatePatternSnapshot(value: unknown): PatternSnapshot {
  if (!isRecord(value)) {
    throw new PatternPersistenceError('Pattern data is missing.');
  }

  if (!Array.isArray(value.stitches)) {
    throw new PatternPersistenceError('Pattern stitches must be an array.');
  }

  if (typeof value.currentRow !== 'number' || value.currentRow < 0) {
    throw new PatternPersistenceError('Pattern current row is invalid.');
  }

  if (typeof value.foundationChainLength !== 'number' || value.foundationChainLength < 0) {
    throw new PatternPersistenceError('Pattern foundation length is invalid.');
  }

  if (
    value.foundationType !== undefined &&
    !FOUNDATION_TYPES.has(String(value.foundationType))
  ) {
    throw new PatternPersistenceError('Pattern foundation type is invalid.');
  }

  const stitches = value.stitches.map(validateStitchNode);
  const stitchIds = new Set(stitches.map((stitch) => stitch.id));

  for (const stitch of stitches) {
    if (stitch.attachToId && !stitchIds.has(stitch.attachToId)) {
      throw new PatternPersistenceError(
        `Stitch ${stitch.id} references a missing parent stitch.`,
      );
    }

    if (stitch.secondaryAttachToId && !stitchIds.has(stitch.secondaryAttachToId)) {
      throw new PatternPersistenceError(
        `Stitch ${stitch.id} references a missing secondary parent stitch.`,
      );
    }
  }

  const rowDirections: PatternSnapshot['rowDirections'] = {};
  if (isRecord(value.rowDirections)) {
    for (const [rowKey, direction] of Object.entries(value.rowDirections)) {
      if (direction === 'left_to_right' || direction === 'right_to_left') {
        rowDirections[Number(rowKey)] = direction;
      }
    }
  }

  return {
    stitches,
    currentRow: value.currentRow,
    foundationChainLength: value.foundationChainLength,
    foundationType: (value.foundationType as FoundationType | undefined) ?? FoundationType.CHAIN,
    rowDirections,
  };
}

function validateUiState(value: unknown): PatternUiState {
  if (!isRecord(value)) {
    throw new PatternPersistenceError('Pattern UI settings are missing.');
  }

  if (typeof value.yarnColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value.yarnColor)) {
    throw new PatternPersistenceError('Pattern yarn color is invalid.');
  }

  if (!WORKING_TYPES.has(String(value.selectedStitchType))) {
    throw new PatternPersistenceError('Pattern stitch type selection is invalid.');
  }

  return {
    yarnColor: value.yarnColor,
    selectedStitchType: value.selectedStitchType as WorkingStitchType,
  };
}

export function createSavedPatternFile(
  pattern: PatternSnapshot,
  ui: PatternUiState,
): SavedPatternFile {
  return {
    version: PATTERN_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    pattern,
    ui,
  };
}

export function validateSavedPatternFile(value: unknown): SavedPatternFile {
  if (!isRecord(value)) {
    throw new PatternPersistenceError('Could not load pattern file.');
  }

  if (value.version !== PATTERN_FILE_VERSION) {
    throw new PatternPersistenceError(
      'This pattern file version is not supported. Save again from the latest app version.',
    );
  }

  return {
    version: PATTERN_FILE_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date(0).toISOString(),
    pattern: validatePatternSnapshot(value.pattern),
    ui: validateUiState(value.ui),
  };
}

export function serializePatternFile(file: SavedPatternFile): string {
  return JSON.stringify(file, null, 2);
}

export function parsePatternFile(json: string): SavedPatternFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new PatternPersistenceError('Could not load pattern file.');
  }

  return validateSavedPatternFile(parsed);
}

export function formatInstructionsMarkdown(
  instructions: string[],
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  const title =
    foundationType === FoundationType.MAGIC_RING
      ? '# Crochet pattern (magic ring)'
      : '# Crochet pattern';

  if (instructions.length === 0) {
    return `${title}\n\n_No stitches yet._\n`;
  }

  const lines = instructions.map((instruction, index) => `${index + 1}. ${instruction}`);
  return `${title}\n\n${lines.join('\n')}\n`;
}

export function formatInstructionsPlainText(
  instructions: string[],
  foundationType: FoundationType = FoundationType.CHAIN,
): string {
  if (instructions.length === 0) {
    return 'No stitches yet.';
  }

  const title =
    foundationType === FoundationType.MAGIC_RING ? 'Crochet pattern (magic ring)' : 'Crochet pattern';

  return [title, '', ...instructions.map((line, index) => `${index + 1}. ${line}`)].join('\n');
}

export function buildInstructionsExport(
  snapshot: PatternSnapshot,
): { markdown: string; plainText: string; instructions: string[] } {
  const instructions = generateInstructions(snapshot.stitches, snapshot.foundationType);

  return {
    instructions,
    markdown: formatInstructionsMarkdown(instructions, snapshot.foundationType),
    plainText: formatInstructionsPlainText(instructions, snapshot.foundationType),
  };
}

export function defaultPatternFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `crochet-pattern-${stamp}.json`;
}

export function defaultInstructionsFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `crochet-instructions-${stamp}.md`;
}
