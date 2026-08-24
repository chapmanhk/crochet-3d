import { generateInstructions } from './instructions';
import {
  MAX_CHAIN_LENGTH,
  MAX_MAGIC_RING_STITCHES,
  MIN_CHAIN_LENGTH,
  MIN_MAGIC_RING_STITCHES,
} from './Pattern';
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

export const INVALID_PATTERN_FILE_MESSAGE =
  'Could not load pattern file. Choose a .json file saved from this app.';

const STITCH_TYPES = new Set<string>(Object.values(StitchType));
const FOUNDATION_TYPES = new Set<string>(Object.values(FoundationType));
const PLACEMENT_KINDS = new Set<string>(Object.values(PlacementKind));
const WORKING_TYPES = new Set<string>(WORKING_STITCH_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVec3(value: unknown): value is { x: number; y: number; z: number } {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);
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

  if (!isFiniteNumber(value.row) || value.row < 0) {
    throw new PatternPersistenceError(`Stitch ${index} has an invalid row.`);
  }

  if (!isFiniteNumber(value.column) || value.column < 0) {
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

function getPlacementKind(stitch: StitchNode): PlacementKind {
  return stitch.placementKind ?? PlacementKind.NORMAL;
}

function validateRowColumnIndices(rowStitches: StitchNode[], row: number): void {
  if (rowStitches.length === 0) {
    return;
  }

  const columns = rowStitches.map((stitch) => stitch.column);
  const uniqueColumns = new Set(columns);
  if (uniqueColumns.size !== columns.length) {
    throw new PatternPersistenceError(`Row ${row} has duplicate column indices.`);
  }

  for (let column = 0; column < rowStitches.length; column++) {
    if (!uniqueColumns.has(column)) {
      throw new PatternPersistenceError(`Row ${row} has invalid column indices.`);
    }
  }
}

function validateFoundationBounds(
  foundationType: FoundationType,
  foundationChainLength: number,
): void {
  if (foundationChainLength === 0) {
    return;
  }

  if (foundationType === FoundationType.CHAIN) {
    if (
      foundationChainLength < MIN_CHAIN_LENGTH ||
      foundationChainLength > MAX_CHAIN_LENGTH
    ) {
      throw new PatternPersistenceError('Pattern foundation length is out of range.');
    }
    return;
  }

  if (
    foundationChainLength < MIN_MAGIC_RING_STITCHES ||
    foundationChainLength > MAX_MAGIC_RING_STITCHES
  ) {
    throw new PatternPersistenceError('Pattern foundation length is out of range.');
  }
}

function validatePatternSemantics(
  snapshot: Pick<
    PatternSnapshot,
    'stitches' | 'currentRow' | 'foundationChainLength' | 'foundationType'
  >,
  stitchById: Map<string, StitchNode>,
): void {
  const { stitches, currentRow, foundationChainLength, foundationType } = snapshot;

  validateFoundationBounds(foundationType, foundationChainLength);

  if (foundationChainLength === 0) {
    if (stitches.length > 0) {
      throw new PatternPersistenceError('Pattern has stitches but no foundation length.');
    }
    if (currentRow !== 0) {
      throw new PatternPersistenceError('Pattern current row is invalid.');
    }
    return;
  }

  const rowStitchesMap = new Map<number, StitchNode[]>();
  for (const stitch of stitches) {
    const rowList = rowStitchesMap.get(stitch.row) ?? [];
    rowList.push(stitch);
    rowStitchesMap.set(stitch.row, rowList);
  }

  const foundationRow = rowStitchesMap.get(0) ?? [];
  if (foundationRow.length !== foundationChainLength) {
    throw new PatternPersistenceError(
      'Pattern foundation length does not match foundation stitches.',
    );
  }

  for (const [row, rowStitches] of rowStitchesMap.entries()) {
    validateRowColumnIndices(rowStitches, row);
  }

  for (const stitch of foundationRow) {
    if (foundationType === FoundationType.CHAIN) {
      if (stitch.type !== StitchType.CHAIN) {
        throw new PatternPersistenceError('Foundation chain row has invalid stitch types.');
      }
    } else if (stitch.type !== StitchType.SINGLE_CROCHET) {
      throw new PatternPersistenceError('Magic ring foundation has invalid stitch types.');
    }

    if (stitch.attachToId) {
      throw new PatternPersistenceError('Foundation stitches must not attach to another stitch.');
    }

    if (stitch.secondaryAttachToId) {
      throw new PatternPersistenceError(
        'Foundation stitches must not have a secondary attachment.',
      );
    }
  }

  if (stitches.some((stitch) => stitch.row > 0) && currentRow === 0) {
    throw new PatternPersistenceError('Pattern current row is invalid.');
  }

  for (const stitch of stitches) {
    if (stitch.row === 0) {
      continue;
    }

    if (stitch.type === StitchType.CHAIN) {
      throw new PatternPersistenceError(
        `Stitch ${stitch.id} is a chain outside the foundation row.`,
      );
    }

    if (!stitch.attachToId) {
      throw new PatternPersistenceError(`Stitch ${stitch.id} is missing a parent attachment.`);
    }

    const parent = stitchById.get(stitch.attachToId);
    if (parent && parent.row !== stitch.row - 1) {
      throw new PatternPersistenceError(`Stitch ${stitch.id} must attach to the previous row.`);
    }

    const placementKind = getPlacementKind(stitch);

    if (placementKind === PlacementKind.DECREASE) {
      if (!stitch.secondaryAttachToId) {
        throw new PatternPersistenceError(
          `Stitch ${stitch.id} is missing a secondary parent for decrease.`,
        );
      }

      if (stitch.secondaryAttachToId === stitch.attachToId) {
        throw new PatternPersistenceError(
          `Stitch ${stitch.id} decrease references duplicate parents.`,
        );
      }

      const secondaryParent = stitchById.get(stitch.secondaryAttachToId);
      if (secondaryParent && secondaryParent.row !== stitch.row - 1) {
        throw new PatternPersistenceError(
          `Stitch ${stitch.id} secondary parent must be in the previous row.`,
        );
      }
    } else if (stitch.secondaryAttachToId) {
      throw new PatternPersistenceError(`Stitch ${stitch.id} has an unexpected secondary attachment.`);
    }

    if (placementKind === PlacementKind.INCREASE_SECOND) {
      const previousStitch = rowStitchesMap
        .get(stitch.row)
        ?.find((candidate) => candidate.column === stitch.column - 1);

      if (!previousStitch) {
        throw new PatternPersistenceError(
          `Stitch ${stitch.id} increase_second has no preceding stitch.`,
        );
      }

      if (previousStitch.attachToId !== stitch.attachToId) {
        throw new PatternPersistenceError(
          `Stitch ${stitch.id} increase_second must share its parent with the prior stitch.`,
        );
      }
    }
  }
}

function validatePatternSnapshot(value: unknown): PatternSnapshot {
  if (!isRecord(value)) {
    throw new PatternPersistenceError('Pattern data is missing.');
  }

  if (!Array.isArray(value.stitches)) {
    throw new PatternPersistenceError('Pattern stitches must be an array.');
  }

  if (!isFiniteNumber(value.currentRow) || value.currentRow < 0) {
    throw new PatternPersistenceError('Pattern current row is invalid.');
  }

  if (!isFiniteNumber(value.foundationChainLength) || value.foundationChainLength < 0) {
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

  if (stitchIds.size !== stitches.length) {
    throw new PatternPersistenceError('Pattern contains duplicate stitch ids.');
  }

  const maxRow = stitches.reduce((highest, stitch) => Math.max(highest, stitch.row), 0);
  if (value.currentRow > maxRow) {
    throw new PatternPersistenceError('Pattern current row is invalid.');
  }

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

  const foundationType =
    (value.foundationType as FoundationType | undefined) ?? FoundationType.CHAIN;

  const rowDirections: PatternSnapshot['rowDirections'] = {};
  if (isRecord(value.rowDirections)) {
    for (const [rowKey, direction] of Object.entries(value.rowDirections)) {
      if (direction === 'left_to_right' || direction === 'right_to_left') {
        rowDirections[Number(rowKey)] = direction;
      }
    }
  }

  const snapshot: PatternSnapshot = {
    stitches,
    currentRow: value.currentRow,
    foundationChainLength: value.foundationChainLength,
    foundationType,
    rowDirections,
  };

  const stitchById = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  validatePatternSemantics(snapshot, stitchById);

  return snapshot;
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
    throw new PatternPersistenceError(INVALID_PATTERN_FILE_MESSAGE);
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
    throw new PatternPersistenceError(INVALID_PATTERN_FILE_MESSAGE);
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
