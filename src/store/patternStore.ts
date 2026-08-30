import { create } from 'zustand';
import {
  AUTOSAVE_STORAGE_KEY,
  buildInstructionsExport,
  createSavedPatternFile,
  createTemplateSnapshot,
  FoundationType,
  generateInstructions,
  INVALID_PATTERN_FILE_MESSAGE,
  parsePatternFile,
  Pattern,
  PatternPersistenceError,
  PlacementError,
  serializePatternFile,
  StitchType,
  type PatternSnapshot,
  type PatternUiState,
  type SavedPatternFile,
  type StitchNode,
  type TemplateId,
  type WorkingStitchType,
} from '@engine/index';
import { DEFAULT_YARN_COLOR_HEX } from '../shared/yarnColor';

interface PatternState {
  stitches: StitchNode[];
  currentRow: number;
  foundationChainLength: number;
  foundationType: FoundationType;
  currentRowStitchCount: number;
  currentRowSlotsConsumed: number;
  currentRowWidthTarget: number;
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
  lastNotice: string | null;
  drapePreviewEnabled: boolean;
  setDrapePreviewEnabled: (enabled: boolean) => void;
  toggleDrapePreview: () => void;
  setLastError: (message: string) => void;
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
  loadSnapshot: (snapshot: PatternSnapshot, options?: { clearHistory?: boolean }) => void;
  importSavedPattern: (file: SavedPatternFile, options?: { clearHistory?: boolean }) => void;
  importPatternJson: (json: string, options?: { clearHistory?: boolean }) => boolean;
  exportSavedPattern: () => SavedPatternFile;
  exportPatternJson: () => string;
  exportInstructionsMarkdown: () => string;
  exportInstructionsPlainText: () => string;
  persistAutosave: () => void;
  restoreAutosave: () => boolean;
  clearAutosave: () => void;
  clearNotice: () => void;
  setNotice: (message: string) => void;
  startNewRow: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
  resetPattern: () => void;
  clearError: () => void;
}

const DEFAULT_YARN_COLOR = DEFAULT_YARN_COLOR_HEX;

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
  | 'currentRowWidthTarget'
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

  return {
    stitches: snapshot.stitches,
    currentRow: snapshot.currentRow,
    foundationChainLength: snapshot.foundationChainLength,
    foundationType: snapshot.foundationType,
    currentRowStitchCount: pattern.getRowStitchCount(snapshot.currentRow),
    currentRowSlotsConsumed: pattern.getParentSlotsConsumed(snapshot.currentRow),
    currentRowWidthTarget: pattern.getRowWidthTarget(snapshot.currentRow),
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

function getUiState(get: () => PatternState): PatternUiState {
  return {
    yarnColor: get().yarnColor,
    selectedStitchType: get().selectedStitchType,
  };
}

function applySavedPattern(
  file: SavedPatternFile,
  options: { clearHistory?: boolean } = {},
): void {
  const { clearHistory = true } = options;
  pattern.loadSnapshot(file.pattern);

  if (clearHistory) {
    clearHistoryStack();
  }
}

function applyHistoryEntry(
  source: PatternSnapshot[],
  destination: PatternSnapshot[],
): boolean {
  if (source.length === 0) {
    return false;
  }

  destination.push(cloneSnapshot(pattern.getSnapshot()));
  pattern.loadSnapshot(source.pop()!);
  return true;
}

function withLocalStorage(run: (storage: Storage) => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  run(window.localStorage);
}

function readAutosave(): SavedPatternFile | null {
  let saved: SavedPatternFile | null = null;

  withLocalStorage((storage) => {
    const raw = storage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      saved = parsePatternFile(raw);
    } catch {
      storage.removeItem(AUTOSAVE_STORAGE_KEY);
    }
  });

  return saved;
}

function writeAutosave(file: SavedPatternFile): void {
  withLocalStorage((storage) => {
    try {
      storage.setItem(AUTOSAVE_STORAGE_KEY, serializePatternFile(file));
    } catch {
      // Ignore quota or storage errors; manual save remains available.
    }
  });
}

function clearHistoryStack(): void {
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
    set({ lastError: getErrorMessage(error, fallback), lastNotice: null });
    return false;
  }
}

export const usePatternStore = create<PatternState>((set, get) => ({
  ...syncState(StitchType.SINGLE_CROCHET),
  selectedStitchType: StitchType.SINGLE_CROCHET,
  yarnColor: DEFAULT_YARN_COLOR,
  lastError: null,
  lastNotice: null,
  drapePreviewEnabled: false,

  setDrapePreviewEnabled: (enabled: boolean) => {
    set({ drapePreviewEnabled: enabled });
  },

  toggleDrapePreview: () => {
    set((state) => {
      const enabled = !state.drapePreviewEnabled;
      return {
        drapePreviewEnabled: enabled,
        lastNotice: enabled ? 'Loading drape preview…' : state.lastNotice,
      };
    });
  },

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
    set({ yarnColor: color, lastNotice: null });
  },

  loadTemplate: (templateId: TemplateId) =>
    runPatternAction(
      set,
      get,
      () => {
        applySavedPattern(
          createSavedPatternFile(createTemplateSnapshot(templateId), getUiState(get)),
          { clearHistory: true },
        );
      },
      'Failed to load template.',
    ),

  loadSnapshot: (snapshot: PatternSnapshot, options = {}) => {
    pattern.loadSnapshot(snapshot);
    if (options.clearHistory ?? true) {
      clearHistoryStack();
    }
    set({ ...syncState(get().selectedStitchType), lastError: null, lastNotice: null });
  },

  importSavedPattern: (file: SavedPatternFile, options = {}) => {
    applySavedPattern(file, options);
    set({
      yarnColor: file.ui.yarnColor,
      selectedStitchType: file.ui.selectedStitchType,
      ...syncState(file.ui.selectedStitchType),
      lastError: null,
      lastNotice: 'Pattern loaded.',
    });
  },

  importPatternJson: (json: string, options = {}) => {
    try {
      const file = parsePatternFile(json);
      get().importSavedPattern(file, options);
      return true;
    } catch (error) {
      set({
        lastError:
          error instanceof PatternPersistenceError
            ? error.message
            : INVALID_PATTERN_FILE_MESSAGE,
        lastNotice: null,
      });
      return false;
    }
  },

  exportSavedPattern: () =>
    createSavedPatternFile(pattern.getSnapshot(), getUiState(get)),

  exportPatternJson: () => serializePatternFile(get().exportSavedPattern()),

  exportInstructionsMarkdown: () =>
    buildInstructionsExport(pattern.getSnapshot()).markdown,

  exportInstructionsPlainText: () =>
    buildInstructionsExport(pattern.getSnapshot()).plainText,

  persistAutosave: () => {
    const snapshot = pattern.getSnapshot();
    if (snapshot.stitches.length === 0) {
      get().clearAutosave();
      return;
    }

    writeAutosave(createSavedPatternFile(snapshot, getUiState(get)));
  },

  restoreAutosave: () => {
    const saved = readAutosave();
    if (!saved || saved.pattern.stitches.length === 0) {
      return false;
    }

    get().importSavedPattern(saved, { clearHistory: true });
    set({
      lastNotice: 'Restored your last pattern.',
      lastError: null,
    });
    return true;
  },

  clearAutosave: () => {
    withLocalStorage((storage) => {
      storage.removeItem(AUTOSAVE_STORAGE_KEY);
    });
  },

  clearNotice: () => {
    set({ lastNotice: null });
  },

  setNotice: (message: string) => {
    set({ lastNotice: message, lastError: null });
  },

  setLastError: (message: string) => {
    set({ lastError: message, lastNotice: null });
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
    if (!applyHistoryEntry(historyPast, historyFuture)) {
      set({ lastError: 'Nothing to undo.' });
      return false;
    }

    set({ ...syncState(get().selectedStitchType), lastError: null });
    return true;
  },

  redo: () => {
    if (!applyHistoryEntry(historyFuture, historyPast)) {
      set({ lastError: 'Nothing to redo.' });
      return false;
    }

    set({ ...syncState(get().selectedStitchType), lastError: null });
    return true;
  },

  resetPattern: () => {
    pattern.reset();
    clearHistoryStack();
    get().clearAutosave();
    set({
      ...syncState(get().selectedStitchType),
      lastError: null,
      lastNotice: null,
      drapePreviewEnabled: false,
    });
  },

  clearError: () => {
    set({ lastError: null });
  },
}));

export function __resetPatternStoreForTests(): void {
  pattern.reset();
  clearHistoryStack();
  withLocalStorage((storage) => {
    storage.removeItem(AUTOSAVE_STORAGE_KEY);
  });
  usePatternStore.setState({
    ...syncState(StitchType.SINGLE_CROCHET),
    selectedStitchType: StitchType.SINGLE_CROCHET,
    yarnColor: DEFAULT_YARN_COLOR,
    lastError: null,
    lastNotice: null,
    drapePreviewEnabled: false,
  });
}
