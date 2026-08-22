import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import { ChainLengthDialog } from './ChainLengthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import {
  CONFIRM_DIALOG_COPY,
  type ConfirmAction,
} from './confirmDialogCopy';
import { ToolbarActionButton } from './ToolbarActionButton';
import {
  getAddScDisabledReason,
  getNewRowDisabledReason,
  getResetDisabledReason,
} from './toolbarState';

export function Toolbar() {
  const {
    addFoundationChain,
    addSingleCrochet,
    startNewRow,
    resetPattern,
    clearError,
    lastError,
    foundationChainLength,
    currentRow,
    currentRowStitchCount,
    canAddSingleCrochet,
    canStartNewRow,
    stitches,
  } = usePatternStore(
    useShallow((state) => ({
      addFoundationChain: state.addFoundationChain,
      addSingleCrochet: state.addSingleCrochet,
      startNewRow: state.startNewRow,
      resetPattern: state.resetPattern,
      clearError: state.clearError,
      lastError: state.lastError,
      foundationChainLength: state.foundationChainLength,
      currentRow: state.currentRow,
      currentRowStitchCount: state.currentRowStitchCount,
      canAddSingleCrochet: state.canAddSingleCrochet,
      canStartNewRow: state.canStartNewRow,
      stitches: state.stitches,
    })),
  );

  const [chainDialogOpen, setChainDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const toolbarState = {
    foundationChainLength,
    currentRow,
    currentRowStitchCount,
    canAddSingleCrochet,
    canStartNewRow,
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

  const confirmCopy = confirmAction ? CONFIRM_DIALOG_COPY[confirmAction] : null;

  return (
    <>
      <div className="toolbar panel" role="toolbar" aria-label="Pattern tools">
        <button type="button" className="btn primary" onClick={handleNewChain}>
          New Chain
        </button>
        <ToolbarActionButton
          label="Add SC"
          disabledReason={addScDisabledReason}
          onClick={addSingleCrochet}
        />
        <ToolbarActionButton
          label="New Row"
          disabledReason={newRowDisabledReason}
          onClick={startNewRow}
        />
        <ToolbarActionButton
          label="Reset"
          disabledReason={resetDisabledReason}
          onClick={handleReset}
          variant="subtle"
        />
      </div>

      <ChainLengthDialog
        open={chainDialogOpen}
        serverError={chainDialogOpen ? lastError : null}
        onClose={() => setChainDialogOpen(false)}
        onSubmit={handleChainSubmit}
      />

      {confirmCopy ? (
        <ConfirmDialog
          open
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </>
  );
}
