import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';

const AUTOSAVE_DEBOUNCE_MS = 400;

export function usePatternAutosave() {
  const { restoreAutosave, persistAutosave, autosaveDeps } = usePatternStore(
    useShallow((state) => ({
      restoreAutosave: state.restoreAutosave,
      persistAutosave: state.persistAutosave,
      autosaveDeps: {
        stitches: state.stitches,
        yarnColor: state.yarnColor,
        selectedStitchType: state.selectedStitchType,
        currentRow: state.currentRow,
        foundationType: state.foundationType,
        foundationChainLength: state.foundationChainLength,
        rowDirections: state.rowDirections,
      },
    })),
  );

  useEffect(() => {
    restoreAutosave();
  }, [restoreAutosave]);

  useEffect(() => {
    const timeoutId = window.setTimeout(persistAutosave, AUTOSAVE_DEBOUNCE_MS);

    const flushAutosave = () => {
      window.clearTimeout(timeoutId);
      persistAutosave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosave();
      }
    };

    window.addEventListener('pagehide', flushAutosave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pagehide', flushAutosave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistAutosave, autosaveDeps]);
}
