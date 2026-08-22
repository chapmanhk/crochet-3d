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
  lastError: string | null;
  addFoundationChain: (length: number) => void;
  addSingleCrochet: () => void;
  startNewRow: () => void;
  resetPattern: () => void;
  clearError: () => void;
}

const pattern = new Pattern();

function syncState(): Pick<
  PatternState,
  'stitches' | 'currentRow' | 'foundationChainLength' | 'instructions'
> {
  const snapshot = pattern.getSnapshot();
  return {
    stitches: snapshot.stitches,
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    instructions: generateInstructions(snapshot.stitches),
  };
}

export const usePatternStore = create<PatternState>((set) => ({
  ...syncState(),
  lastError: null,

  addFoundationChain: (length: number) => {
    try {
      pattern.addFoundationChain(length);
      set({ ...syncState(), lastError: null });
    } catch (error) {
      set({
        lastError:
          error instanceof PlacementError
            ? error.message
            : 'Failed to add foundation chain.',
      });
    }
  },

  addSingleCrochet: () => {
    try {
      pattern.addSingleCrochet();
      set({ ...syncState(), lastError: null });
    } catch (error) {
      set({
        lastError:
          error instanceof PlacementError
            ? error.message
            : 'Failed to add single crochet.',
      });
    }
  },

  startNewRow: () => {
    try {
      pattern.startNewRow();
      set({ ...syncState(), lastError: null });
    } catch (error) {
      set({
        lastError:
          error instanceof PlacementError
            ? error.message
            : 'Failed to start new row.',
      });
    }
  },

  resetPattern: () => {
    pattern.reset();
    set({ ...syncState(), lastError: null });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));
