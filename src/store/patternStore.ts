import { create } from 'zustand';
import {
  createTemplateSnapshot,
  FoundationType,
  generateInstructions,
  Pattern,
  PlacementError,
  StitchType,
  type PatternSnapshot,
  type StitchNode,
  type TemplateId,
  type WorkingStitchType,
  countParentSlotsConsumed,
} from '@engine/index';

interface PatternState {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
  foundationType: FoundationType;
  currentRowStitchCount: number;
  currentRowSlotsConsumed: number;
  rowDirections: Record<number, import('@engine/index').WorkingDirectionType>;
  selectedStitchType: WorkingStitchType;
  yarnColor: string;
  instructions: string[];
  canAddStitch: boolean;
  canAddIncrease: boolean;
  canAddDecrease: boolean;
  canAddSingleCrochet: boolean;
  canStartNewRow: boolean;
  addStitchDisabledReason: string | null;
  addIncreaseDisabledReason: string | null;
  addDecreaseDisabledReason: string | null;
  addScDisabledReason: string | null;
  newRowDisabledReason: string | null;
  nextAttachmentTargetId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undoDisabledReason: string | null;
  redoDisabledReason: string | null;
  lastError: string | null;
  addFoundationChain: (length: number) => boolean;
  addMagicRing: (stitchCount: number) => boolean;
  addWorkingStitch: () => boolean;
  addSingleCrochet: () => boolean;
  addWorkingStitchAt: (attachToId: string) => boolean;
  addSingleCrochetAt: (attachToId: string) => boolean;
  addIncrease: () => boolean;
  addDecrease: () => boolean;
  setSelectedStitchType: (type: WorkingStitchType) => void;
  setYarnColor: (color: string) => void;
  loadTemplate: (templateId: TemplateId) => boolean;
  loadSnapshot: (snapshot: PatternSnapshot) => void;
  startNewRow: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
  resetPattern: () => void;
  clearError: () => void;
}

const DEFAULT_YARN_COLOR = '#d98952';

const pattern = new Pattern();
let historyPast: PatternSnapshot[] = [];
let historyFuture: PatternSnapshot[] = [];

function cloneSnapshot(snapshot: PatternSnapshot): PatternSnapshot {
  return {
    stitches: snapshot.stitches.map((stitch) => ({
      ...stitch,
      position: { ...stitch.position },
    })),
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    foundationType: snapshot.foundationType ?? FoundationType.CHAIN,
    rowDirections: { ...snapshot.rowDirections },
  };
}

function syncState(selectedStitchType: WorkingStitchType): Pick<
  PatternState,
  | 'stitches'
  | 'currentRow'
  | 'foundationChainLength'
  | 'foundationType'
  | 'currentRowStitchCount'
  | 'currentRowSlotsConsumed'
  | 'rowDirections'
  | 'instructions'
  | 'canAddStitch'
  | 'canAddIncrease'
  | 'canAddDecrease'
  | 'canAddSingleCrochet'
  | 'canStartNewRow'
  | 'addStitchDisabledReason'
  | 'addIncreaseDisabledReason'
  | 'addDecreaseDisabledReason'
  | 'addScDisabledReason'
  | 'newRowDisabledReason'
  | 'nextAttachmentTargetId'
  | 'canUndo'
  | 'canRedo'
  | 'undoDisabledReason'
  | 'redoDisabledReason'
> {
  const snapshot = pattern.getSnapshot();
  const nextTarget = pattern.getNextAttachmentTarget(selectedStitchType);
  const rowStitches = snapshot.stitches.filter((stitch) => stitch.row === snapshot.currentRow);

  return {
    stitches: snapshot.stitches,
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    foundationType: snapshot.foundationType,
    currentRowStitchCount: pattern.getRowStitchCount(snapshot.currentRow),
    currentRowSlotsConsumed: countParentSlotsConsumed(rowStitches),
    rowDirections: snapshot.rowDirections,
    instructions: generateInstructions(snapshot.stitches, snapshot.foundationType),
    canAddStitch: pattern.canAddWorkingStitch(selectedStitchType),
    canAddIncrease: pattern.canAddIncrease(selectedStitchType),
    canAddDecrease: pattern.canAddDecrease(selectedStitchType),
    canAddSingleCrochet: pattern.canAddSingleCrochet(),
    canStartNewRow: pattern.canStartNewRow(),
    addStitchDisabledReason: pattern.getAddWorkingStitchError(selectedStitchType),
    addIncreaseDisabledReason: pattern.getAddIncreaseError(selectedStitchType),
    addDecreaseDisabledReason: pattern.getAddDecreaseError(selectedStitchType),
    addScDisabledReason: pattern.getAddSingleCrochetError(),
    newRowDisabledReason: pattern.getStartNewRowError(),
    nextAttachmentTargetId: nextTarget?.id ?? null,
    canUndo: historyPast.length > 0,
    canRedo: historyFuture.length > 0,
    undoDisabledReason:
      historyPast.length > 0 ? null : 'Nothing to undo.',
    redoDisabledReason:
      historyFuture.length > 0 ? null : 'Nothing to redo.',
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PlacementError ? error.message : fallback;
}

function clearHistory(): void {
  historyPast = [];
  historyFuture = [];
}

function pushHistory(): void {
  historyPast.push(cloneSnapshot(pattern.getSnapshot()));
  historyFuture = [];
}

function runPatternAction(
  set: (partial: Partial<PatternState>) => void,
  get: () => PatternState,
  action: () => void,
  fallback: string,
  options: { recordHistory?: boolean } = {},
): boolean {
  const { recordHistory = true } = options;

  try {
    if (recordHistory) {
      pushHistory();
    }
    action();
    const { selectedStitchType } = get();
    set({ ...syncState(selectedStitchType), lastError: null });
    return true;
  } catch (error) {
    if (recordHistory) {
      historyPast.pop();
    }
    set({ lastError: getErrorMessage(error, fallback) });
    return false;
  }
}

export const usePatternStore = create<PatternState>((set, get) => ({
  ...syncState(StitchType.SINGLE_CROCHET),
  selectedStitchType: StitchType.SINGLE_CROCHET,
  yarnColor: DEFAULT_YARN_COLOR,
  lastError: null,

  addFoundationChain: (length: number) =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addFoundationChain(length);
      },
      'Failed to add foundation chain.',
    ),

  addMagicRing: (stitchCount: number) =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addMagicRing(stitchCount);
      },
      'Failed to create magic ring.',
    ),

  addWorkingStitch: () =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addWorkingStitch(get().selectedStitchType);
      },
      'Failed to add stitch.',
    ),

  addSingleCrochet: () =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addSingleCrochet();
      },
      'Failed to add single crochet.',
    ),

  addWorkingStitchAt: (attachToId: string) =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addWorkingStitchAt(get().selectedStitchType, attachToId);
      },
      'Failed to place stitch.',
    ),

  addSingleCrochetAt: (attachToId: string) =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addSingleCrochetAt(attachToId);
      },
      'Failed to place single crochet.',
    ),

  addIncrease: () =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addIncrease(get().selectedStitchType);
      },
      'Failed to add increase.',
    ),

  addDecrease: () =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.addDecrease(get().selectedStitchType);
      },
      'Failed to add decrease.',
    ),

  setSelectedStitchType: (type: WorkingStitchType) => {
    set({
      selectedStitchType: type,
      ...syncState(type),
    });
  },

  setYarnColor: (color: string) => {
    set({ yarnColor: color });
  },

  loadTemplate: (templateId: TemplateId) =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.loadSnapshot(createTemplateSnapshot(templateId));
      },
      'Failed to load template.',
    ),

  loadSnapshot: (snapshot: PatternSnapshot) => {
    pattern.loadSnapshot(snapshot);
    set({ ...syncState(get().selectedStitchType), lastError: null });
  },

  startNewRow: () =>
    runPatternAction(
      set,
      get,
      () => {
        pattern.startNewRow();
      },
      'Failed to start new row.',
    ),

  undo: () => {
    if (historyPast.length === 0) {
      set({ lastError: 'Nothing to undo.' });
      return false;
    }

    const current = cloneSnapshot(pattern.getSnapshot());
    const previous = historyPast.pop()!;
    historyFuture.push(current);
    pattern.loadSnapshot(previous);
    set({ ...syncState(get().selectedStitchType), lastError: null });
    return true;
  },

  redo: () => {
    if (historyFuture.length === 0) {
      set({ lastError: 'Nothing to redo.' });
      return false;
    }

    const current = cloneSnapshot(pattern.getSnapshot());
    const next = historyFuture.pop()!;
    historyPast.push(current);
    pattern.loadSnapshot(next);
    set({ ...syncState(get().selectedStitchType), lastError: null });
    return true;
  },

  resetPattern: () => {
    pattern.reset();
    clearHistory();
    set({ ...syncState(get().selectedStitchType), lastError: null });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));

export function __resetPatternStoreForTests(): void {
  pattern.reset();
  clearHistory();
  usePatternStore.setState({
    ...syncState(StitchType.SINGLE_CROCHET),
    selectedStitchType: StitchType.SINGLE_CROCHET,
    yarnColor: DEFAULT_YARN_COLOR,
    lastError: null,
  });
}
