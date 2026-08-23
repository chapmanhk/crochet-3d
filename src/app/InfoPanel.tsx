import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import {
  getNextStep,
  getRowLabel,
  getRowProgress,
} from './infoPanelState';

export function InfoPanel() {
  const {
    stitches,
    currentRow,
    foundationChainLength,
    currentRowStitchCount,
    instructions,
    lastError,
    clearError,
  } = usePatternStore(
    useShallow((state) => ({
      stitches: state.stitches,
      currentRow: state.currentRow,
      foundationChainLength: state.foundationChainLength,
      currentRowStitchCount: state.currentRowStitchCount,
      instructions: state.instructions,
      lastError: state.lastError,
      clearError: state.clearError,
    })),
  );

  const rowLabel = getRowLabel(foundationChainLength, currentRow);
  const rowProgress = getRowProgress(
    currentRow,
    foundationChainLength,
    currentRowStitchCount,
  );
  const nextStep = getNextStep(
    foundationChainLength,
    currentRow,
    currentRowStitchCount,
  );

  return (
    <aside className="info panel" aria-label="Pattern information">
      <h2>Pattern</h2>
      <div aria-live="polite" aria-atomic="true" className="info-live-region">
        <dl className="info-grid">
          <div>
            <dt>Status</dt>
            <dd>{rowLabel}</dd>
          </div>
          <div>
            <dt>Stitches</dt>
            <dd>{stitches.length}</dd>
          </div>
          <div>
            <dt>Foundation</dt>
            <dd>{foundationChainLength || '—'}</dd>
          </div>
          <div>
            <dt>Row progress</dt>
            <dd>{rowProgress}</dd>
          </div>
        </dl>
        <p className="next-step muted">{nextStep}</p>
      </div>

      <h3>Instructions</h3>
      {instructions.length === 0 ? (
        <p className="muted">
          Start with a foundation chain. Choose <strong>New Chain</strong> in the toolbar.
        </p>
      ) : (
        <ol className="instructions">
          {instructions.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ol>
      )}

      {lastError ? (
        <div className="error-banner" role="alert">
          <p>{lastError}</p>
          <button
            type="button"
            className="btn subtle"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </aside>
  );
}
