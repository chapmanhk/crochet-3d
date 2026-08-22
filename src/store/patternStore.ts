import { create } from 'zustand';
import {
  generateInstructions,
  Pattern,
  PlacementError,
  type StitchNode,
} from '@engine/index';

interface PatternState {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
  instructions: string[];
  canAddSingleCrochet: boolean;
  canStartNewRow: boolean;
  lastError: string | null;
  addFoundationChain: (length: number) => boolean;
  addSingleCrochet: () => boolean;
  startNewRow: () => boolean;
  resetPattern: () => void;
  clearError: () => void;
}

const pattern = new Pattern();

function syncState(): Pick<
  PatternState,
  | 'stitches'
  | 'currentRow'
  | 'foundationChainLength'
  | 'instructions'
  | 'canAddSingleCrochet'
  | 'canStartNewRow'
> {
  const snapshot = pattern.getSnapshot();
  return {
    stitches: snapshot.stitches,
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    instructions: generateInstructions(snapshot.stitches),
    canAddSingleCrochet: pattern.canAddSingleCrochet(),
    canStartNewRow: pattern.canStartNewRow(),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PlacementError ? error.message : fallback;
}

function runPatternAction(
  set: (partial: Partial<PatternState>) => void,
  action: () => void,
  fallback: string,
): boolean {
  try {
    action();
    set({ ...syncState(), lastError: null });
    return true;
  } catch (error) {
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

  startNewRow: () =>
    runPatternAction(
      set,
      () => {
        pattern.startNewRow();
      },
      'Failed to start new row.',
    ),

  resetPattern: () => {
    pattern.reset();
    set({ ...syncState(), lastError: null });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));

/** Test helper to reset the module-scoped pattern between store tests. */
export function __resetPatternStoreForTests(): void {
  pattern.reset();
  usePatternStore.setState({ ...syncState(), lastError: null });
}
