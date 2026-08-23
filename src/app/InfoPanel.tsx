import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import {
  getNextStep,
  getRowLabel,
  getRowProgress,
} from './infoPanelState';

const NARROW_PANEL_QUERY = '(max-width: 960px)';

export function InfoPanel() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(NARROW_PANEL_QUERY);
    const handleChange = () => {
      if (!mediaQuery.matches) {
        setCollapsed(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const {
    stitches,
    currentRow,
    foundationChainLength,
    foundationType,
    currentRowStitchCount,
    currentRowSlotsConsumed,
    selectedStitchType,
    yarnColor,
    setYarnColor,
    instructions,
    lastError,
    clearError,
  } = usePatternStore(
    useShallow((state) => ({
      stitches: state.stitches,
      currentRow: state.currentRow,
      foundationChainLength: state.foundationChainLength,
      foundationType: state.foundationType,
      currentRowStitchCount: state.currentRowStitchCount,
      currentRowSlotsConsumed: state.currentRowSlotsConsumed,
      selectedStitchType: state.selectedStitchType,
      yarnColor: state.yarnColor,
      setYarnColor: state.setYarnColor,
      instructions: state.instructions,
      lastError: state.lastError,
      clearError: state.clearError,
    })),
  );

  const rowLabel = getRowLabel(foundationChainLength, currentRow, foundationType);
  const rowProgress = getRowProgress(
    currentRow,
    foundationChainLength,
    currentRowStitchCount,
    currentRowSlotsConsumed,
  );
  const nextStep = getNextStep(
    foundationChainLength,
    currentRow,
    currentRowStitchCount,
    currentRowSlotsConsumed,
    selectedStitchType,
    foundationType,
  );

  return (
    <aside
      className={`info panel${collapsed ? ' info-collapsed' : ''}`}
      aria-label="Pattern information"
    >
      <div className="info-header">
        <h2>Pattern</h2>
        <button
          type="button"
          className="btn subtle info-toggle"
          aria-expanded={!collapsed}
          aria-controls="info-panel-content"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? 'Show panel' : 'Hide panel'}
        </button>
      </div>

      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {rowLabel}. {stitches.length} stitches. Row progress {rowProgress}.
      </div>

      <div id="info-panel-content" className="info-content" hidden={collapsed}>
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

        <div className="yarn-color-field">
          <label htmlFor="yarn-color">Yarn color</label>
          <input
            id="yarn-color"
            type="color"
            value={yarnColor}
            onChange={(event) => setYarnColor(event.target.value)}
          />
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
      </div>

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
