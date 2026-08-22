import { usePatternStore } from '@store/patternStore';

export function InfoPanel() {
  const stitches = usePatternStore((state) => state.stitches);
  const currentRow = usePatternStore((state) => state.currentRow);
  const foundationChainLength = usePatternStore(
    (state) => state.foundationChainLength,
  );
  const instructions = usePatternStore((state) => state.instructions);
  const lastError = usePatternStore((state) => state.lastError);
  const clearError = usePatternStore((state) => state.clearError);

  const rowLabel =
    foundationChainLength === 0
      ? 'No pattern'
      : currentRow === 0
        ? 'Foundation'
        : `Row ${currentRow}`;

  return (
    <aside className="info panel" aria-label="Pattern information">
      <h2>Pattern</h2>
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
      </dl>

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
