import { useState } from 'react';
import { usePatternStore } from '@store/patternStore';
import { ChainLengthDialog } from './ChainLengthDialog';

export function Toolbar() {
  const addFoundationChain = usePatternStore((state) => state.addFoundationChain);
  const addSingleCrochet = usePatternStore((state) => state.addSingleCrochet);
  const startNewRow = usePatternStore((state) => state.startNewRow);
  const resetPattern = usePatternStore((state) => state.resetPattern);
  const clearError = usePatternStore((state) => state.clearError);
  const lastError = usePatternStore((state) => state.lastError);
  const foundationChainLength = usePatternStore(
    (state) => state.foundationChainLength,
  );
  const stitches = usePatternStore((state) => state.stitches);
  const [chainDialogOpen, setChainDialogOpen] = useState(false);

  const handleNewChain = () => {
    if (foundationChainLength > 0) {
      const confirmed = window.confirm(
        'Reset the current pattern and start a new chain?',
      );
      if (!confirmed) {
        return;
      }
      resetPattern();
    }

    clearError();
    setChainDialogOpen(true);
  };

  const handleChainSubmit = (length: number): boolean => {
    clearError();
    const success = addFoundationChain(length);
    if (success) {
      setChainDialogOpen(false);
    }
    return success;
  };

  const handleReset = () => {
    if (stitches.length === 0) {
      resetPattern();
      return;
    }

    const confirmed = window.confirm('Reset the current pattern?');
    if (confirmed) {
      resetPattern();
    }
  };

  return (
    <>
      <div className="toolbar panel" role="toolbar" aria-label="Pattern tools">
        <button type="button" className="btn primary" onClick={handleNewChain}>
          New Chain
        </button>
        <button type="button" className="btn" onClick={addSingleCrochet}>
          Add SC
        </button>
        <button type="button" className="btn" onClick={startNewRow}>
          New Row
        </button>
        <button type="button" className="btn subtle" onClick={handleReset}>
          Reset
        </button>
      </div>

      <ChainLengthDialog
        open={chainDialogOpen}
        serverError={chainDialogOpen ? lastError : null}
        onClose={() => setChainDialogOpen(false)}
        onSubmit={handleChainSubmit}
      />
    </>
  );
}
