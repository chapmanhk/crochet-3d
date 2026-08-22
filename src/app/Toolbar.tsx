import { useState } from 'react';
import { usePatternStore } from '@store/patternStore';
import { ChainLengthDialog } from './ChainLengthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import {
  getAddScDisabledReason,
  getNewRowDisabledReason,
  getResetDisabledReason,
} from './toolbarState';

type ConfirmAction = 'reset' | 'new-chain' | null;

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
  const currentRow = usePatternStore((state) => state.currentRow);
  const canAddSingleCrochet = usePatternStore(
    (state) => state.canAddSingleCrochet,
  );
  const canStartNewRow = usePatternStore((state) => state.canStartNewRow);
  const stitches = usePatternStore((state) => state.stitches);
  const [chainDialogOpen, setChainDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const toolbarState = {
    foundationChainLength,
    currentRow,
    canAddSingleCrochet,
    canStartNewRow,
    stitches,
  };

  const addScDisabledReason = getAddScDisabledReason(toolbarState);
  const newRowDisabledReason = getNewRowDisabledReason(toolbarState);
  const resetDisabledReason = getResetDisabledReason(stitches.length);

  const openChainDialog = () => {
    clearError();
    setChainDialogOpen(true);
  };

  const handleNewChain = () => {
    if (foundationChainLength > 0) {
      setConfirmAction('new-chain');
      return;
    }

    openChainDialog();
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
      return;
    }

    setConfirmAction('reset');
  };

  const handleConfirm = () => {
    if (confirmAction === 'reset') {
      resetPattern();
    }

    if (confirmAction === 'new-chain') {
      resetPattern();
      openChainDialog();
    }

    setConfirmAction(null);
  };

  const confirmCopy =
    confirmAction === 'new-chain'
      ? {
          title: 'Start a new foundation chain?',
          description:
            'This will clear your current pattern and open the chain length dialog.',
          confirmLabel: 'Start new chain',
        }
      : {
          title: 'Reset the current pattern?',
          description:
            'This will remove all stitches and instructions. This cannot be undone.',
          confirmLabel: 'Reset pattern',
        };

  return (
    <>
      <div className="toolbar panel" role="toolbar" aria-label="Pattern tools">
        <button type="button" className="btn primary" onClick={handleNewChain}>
          New Chain
        </button>
        <button
          type="button"
          className="btn"
          disabled={Boolean(addScDisabledReason)}
          title={addScDisabledReason ?? undefined}
          onClick={addSingleCrochet}
        >
          Add SC
        </button>
        <button
          type="button"
          className="btn"
          disabled={Boolean(newRowDisabledReason)}
          title={newRowDisabledReason ?? undefined}
          onClick={startNewRow}
        >
          New Row
        </button>
        <button
          type="button"
          className="btn subtle"
          disabled={Boolean(resetDisabledReason)}
          title={resetDisabledReason ?? undefined}
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      <ChainLengthDialog
        open={chainDialogOpen}
        serverError={chainDialogOpen ? lastError : null}
        onClose={() => setChainDialogOpen(false)}
        onSubmit={handleChainSubmit}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
