import { useEffect } from 'react';
import { usePatternStore } from '@store/patternStore';

const AUTOSAVE_DEBOUNCE_MS = 400;

export function usePatternAutosave() {
  const restoreAutosave = usePatternStore((state) => state.restoreAutosave);
  const persistAutosave = usePatternStore((state) => state.persistAutosave);
  const stitches = usePatternStore((state) => state.stitches);
  const yarnColor = usePatternStore((state) => state.yarnColor);
  const selectedStitchType = usePatternStore((state) => state.selectedStitchType);
  const currentRow = usePatternStore((state) => state.currentRow);
  const foundationType = usePatternStore((state) => state.foundationType);
  const foundationChainLength = usePatternStore((state) => state.foundationChainLength);
  const rowDirections = usePatternStore((state) => state.rowDirections);

  useEffect(() => {
    restoreAutosave();
  }, [restoreAutosave]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      persistAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);

    const flushAutosave = () => {
      window.clearTimeout(timeoutId);
      persistAutosave();
    };

    window.addEventListener('pagehide', flushAutosave);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pagehide', flushAutosave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    persistAutosave,
    stitches,
    yarnColor,
    selectedStitchType,
    currentRow,
    foundationType,
    foundationChainLength,
    rowDirections,
  ]);
}
