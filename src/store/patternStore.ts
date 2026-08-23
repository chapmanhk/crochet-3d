import { create } from 'zustand';
import {
  generateInstructions,
  Pattern,
  PlacementError,
  type PatternSnapshot,
  type StitchNode,
} from '@engine/index';

interface PatternState {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
  currentRowStitchCount: number;
  rowDirections: Record<number, import('@engine/index').WorkingDirectionType>;
  instructions: string[];
  canAddSingleCrochet: boolean;
  canStartNewRow: boolean;
  addScDisabledReason: string | null;
  newRowDisabledReason: string | null;
  nextAttachmentTargetId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undoDisabledReason: string | null;
  redoDisabledReason: string | null;
  lastError: string | null;
  addFoundationChain: (length: number) => boolean;
  addSingleCrochet: () => boolean;
  addSingleCrochetAt: (attachToId: string) => boolean;
  startNewRow: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
  resetPattern: () => void;
  clearError: () => void;
}

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
    rowDirections: { ...snapshot.rowDirections },
  };
}

function syncState(): Pick<
  PatternState,
  | 'stitches'
  | 'currentRow'
  | 'foundationChainLength'
  | 'currentRowStitchCount'
  | 'rowDirections'
  | 'instructions'
  | 'canAddSingleCrochet'
  | 'canStartNewRow'
  | 'addScDisabledReason'
  | 'newRowDisabledReason'
  | 'nextAttachmentTargetId'
  | 'canUndo'
  | 'canRedo'
  | 'undoDisabledReason'
  | 'redoDisabledReason'
> {
  const snapshot = pattern.getSnapshot();
  const nextTarget = pattern.getNextAttachmentTarget();

  return {
    stitches: snapshot.stitches,
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    currentRowStitchCount: pattern.getRowStitchCount(snapshot.currentRow),
    rowDirections: snapshot.rowDirections,
    instructions: generateInstructions(snapshot.stitches),
    canAddSingleCrochet: pattern.canAddSingleCrochet(),
    canStartNewRow: pattern.canStartNewRow(),
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
    set({ ...syncState(), lastError: null });
    return true;
  } catch (error) {
    if (recordHistory) {
      historyPast.pop();
    }
    set({ lastError: getErrorMessage(error, fallback) });
    return false;
  }
}

export const usePatternStore = create<PatternState>((set) => ({
  ...syncState(),
  lastError: null,

  addFoundationChain: (length: number) =>
    runPatternAction(
      set,
      () => {
        pattern.addFoundationChain(length);
      },
      'Failed to add foundation chain.',
    ),

  addSingleCrochet: () =>
    runPatternAction(
      set,
      () => {
        pattern.addSingleCrochet();
      },
      'Failed to add single crochet.',
    ),

  addSingleCrochetAt: (attachToId: string) =>
    runPatternAction(
      set,
      () => {
        pattern.addSingleCrochetAt(attachToId);
      },
      'Failed to place single crochet.',
    ),

  startNewRow: () =>
    runPatternAction(
      set,
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
    set({ ...syncState(), lastError: null });
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
    set({ ...syncState(), lastError: null });
    return true;
  },

  resetPattern: () => {
    pattern.reset();
    clearHistory();
    set({ ...syncState(), lastError: null });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));

/** Test helper to reset the module-scoped pattern between store tests. */
export function __resetPatternStoreForTests(): void {
  pattern.reset();
  clearHistory();
  usePatternStore.setState({ ...syncState(), lastError: null });
}
