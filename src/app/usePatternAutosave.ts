import { useEffect } from 'react';
import { usePatternStore } from '@store/patternStore';

const AUTOSAVE_DEBOUNCE_MS = 400;

export function usePatternAutosave() {
  const restoreAutosave = usePatternStore((state) => state.restoreAutosave);
  const persistAutosave = usePatternStore((state) => state.persistAutosave);
  const stitches = usePatternStore((state) => state.stitches);
  const yarnColor = usePatternStore((state) => state.yarnColor);
  const selectedStitchType = usePatternStore((state) => state.selectedStitchType);

  useEffect(() => {
    restoreAutosave();
  }, [restoreAutosave]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      persistAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [persistAutosave, stitches, yarnColor, selectedStitchType]);
}
