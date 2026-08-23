import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePatternStore } from '@store/patternStore';
import { ChainLengthDialog } from './ChainLengthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import {
  CONFIRM_DIALOG_COPY,
  type ConfirmAction,
} from './confirmDialogCopy';
import { ToolbarActionButton } from './ToolbarActionButton';
import { getResetDisabledReason } from './toolbarState';

export function Toolbar() {
  const {
    addFoundationChain,
    addSingleCrochet,
    startNewRow,
    resetPattern,
    undo,
    redo,
    clearError,
    lastError,
    foundationChainLength,
    addScDisabledReason,
    newRowDisabledReason,
    undoDisabledReason,
    redoDisabledReason,
    stitches,
  } = usePatternStore(
    useShallow((state) => ({
      addFoundationChain: state.addFoundationChain,
      addSingleCrochet: state.addSingleCrochet,
      startNewRow: state.startNewRow,
      resetPattern: state.resetPattern,
      undo: state.undo,
      redo: state.redo,
      clearError: state.clearError,
      lastError: state.lastError,
      foundationChainLength: state.foundationChainLength,
      addScDisabledReason: state.addScDisabledReason,
      newRowDisabledReason: state.newRowDisabledReason,
      undoDisabledReason: state.undoDisabledReason,
      redoDisabledReason: state.redoDisabledReason,
      stitches: state.stitches,
    })),
  );

  const [chainDialogOpen, setChainDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const newChainRef = useRef<HTMLButtonElement>(null);

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
    setConfirmAction('reset');
  };

  const handleConfirm = () => {
    const action = confirmAction;
    setConfirmAction(null);

    if (action === 'reset') {
      resetPattern();
      return;
    }

    if (action === 'new-chain') {
      resetPattern();
      openChainDialog();
    }
  };

  const confirmCopy = confirmAction ? CONFIRM_DIALOG_COPY[confirmAction] : null;

  return (
    <>
      <div className="toolbar panel" role="toolbar" aria-label="Pattern tools">
        <button
          ref={newChainRef}
          type="button"
          className="btn primary"
          onClick={handleNewChain}
        >
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
          label="Undo"
          disabledReason={undoDisabledReason}
          onClick={undo}
          variant="subtle"
        />
        <ToolbarActionButton
          label="Redo"
          disabledReason={redoDisabledReason}
          onClick={redo}
          variant="subtle"
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
        onClose={() => {
          setChainDialogOpen(false);
          newChainRef.current?.focus();
        }}
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
