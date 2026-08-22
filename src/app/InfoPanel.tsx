import { usePatternStore } from '@store/patternStore';
import {
  getNextStep,
  getRowLabel,
  getRowProgress,
} from './infoPanelState';

export function InfoPanel() {
  const stitches = usePatternStore((state) => state.stitches);
  const currentRow = usePatternStore((state) => state.currentRow);
  const foundationChainLength = usePatternStore(
    (state) => state.foundationChainLength,
  );
  const currentRowStitchCount = usePatternStore(
    (state) => state.currentRowStitchCount,
  );
  const instructions = usePatternStore((state) => state.instructions);
  const lastError = usePatternStore((state) => state.lastError);
  const clearError = usePatternStore((state) => state.clearError);

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
        <p className="muted">Start with a foundation chain.</p>
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
          <button type="button" className="btn subtle" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}
    </aside>
  );
}
