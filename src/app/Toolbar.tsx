import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { type TemplateId } from '@engine/index';
import { usePatternStore } from '@store/patternStore';
import { ConfirmDialog } from './ConfirmDialog';
import {
  CONFIRM_DIALOG_COPY,
  type ConfirmAction,
} from './confirmDialogCopy';
import { FoundationStartDialog } from './FoundationStartDialog';
import { getAddStitchButtonLabel } from './infoPanelState';
import { StitchTypeSelector } from './StitchTypeSelector';
import { TemplateDialog } from './TemplateDialog';
import { ToolbarActionButton } from './ToolbarActionButton';
import { getResetDisabledReason } from './toolbarState';

export function Toolbar() {
  const {
    addFoundationChain,
    addMagicRing,
    addWorkingStitch,
    addIncrease,
    addDecrease,
    startNewRow,
    resetPattern,
    undo,
    redo,
    loadTemplate,
    clearError,
    lastError,
    foundationChainLength,
    selectedStitchType,
    setSelectedStitchType,
    addStitchDisabledReason,
    addIncreaseDisabledReason,
    addDecreaseDisabledReason,
    newRowDisabledReason,
    undoDisabledReason,
    redoDisabledReason,
    stitches,
  } = usePatternStore(
    useShallow((state) => ({
      addFoundationChain: state.addFoundationChain,
      addMagicRing: state.addMagicRing,
      addWorkingStitch: state.addWorkingStitch,
      addIncrease: state.addIncrease,
      addDecrease: state.addDecrease,
      startNewRow: state.startNewRow,
      resetPattern: state.resetPattern,
      undo: state.undo,
      redo: state.redo,
      loadTemplate: state.loadTemplate,
      clearError: state.clearError,
      lastError: state.lastError,
      foundationChainLength: state.foundationChainLength,
      selectedStitchType: state.selectedStitchType,
      setSelectedStitchType: state.setSelectedStitchType,
      addStitchDisabledReason: state.addStitchDisabledReason,
      addIncreaseDisabledReason: state.addIncreaseDisabledReason,
      addDecreaseDisabledReason: state.addDecreaseDisabledReason,
      newRowDisabledReason: state.newRowDisabledReason,
      undoDisabledReason: state.undoDisabledReason,
      redoDisabledReason: state.redoDisabledReason,
      stitches: state.stitches,
    })),
  );

  const [foundationDialogOpen, setFoundationDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<TemplateId | null>(null);
  const newChainRef = useRef<HTMLButtonElement>(null);

  const resetDisabledReason = getResetDisabledReason(stitches.length);
  const addStitchLabel = getAddStitchButtonLabel(selectedStitchType);

  const openFoundationDialog = () => {
    clearError();
    setFoundationDialogOpen(true);
  };

  const handleNewChain = () => {
    if (foundationChainLength > 0) {
      setConfirmAction('new-chain');
      return;
    }

    openFoundationDialog();
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
      openFoundationDialog();
      return;
    }

    if (action === 'load-template' && pendingTemplateId) {
      resetPattern();
      loadTemplate(pendingTemplateId);
      setPendingTemplateId(null);
      setTemplateDialogOpen(false);
    }
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    if (foundationChainLength > 0) {
      setPendingTemplateId(templateId);
      setConfirmAction('load-template');
      return;
    }

    loadTemplate(templateId);
    setTemplateDialogOpen(false);
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
        <button
          type="button"
          className="btn"
          onClick={() => setTemplateDialogOpen(true)}
        >
          Templates
        </button>
        <StitchTypeSelector
          value={selectedStitchType}
          onChange={setSelectedStitchType}
        />
        <ToolbarActionButton
          label={addStitchLabel}
          disabledReason={addStitchDisabledReason}
          onClick={addWorkingStitch}
        />
        <ToolbarActionButton
          label="Inc"
          ariaLabel="Increase stitch"
          disabledReason={addIncreaseDisabledReason}
          onClick={addIncrease}
        />
        <ToolbarActionButton
          label="Dec"
          ariaLabel="Decrease stitch"
          disabledReason={addDecreaseDisabledReason}
          onClick={addDecrease}
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
          onClick={() => setConfirmAction('reset')}
          variant="subtle"
        />
      </div>

      <FoundationStartDialog
        open={foundationDialogOpen}
        serverError={foundationDialogOpen ? lastError : null}
        onClose={() => {
          setFoundationDialogOpen(false);
          newChainRef.current?.focus();
        }}
        onSubmitChain={(length) => {
          clearError();
          const success = addFoundationChain(length);
          if (success) {
            setFoundationDialogOpen(false);
          }
          return success;
        }}
        onSubmitMagicRing={(stitchCount) => {
          clearError();
          const success = addMagicRing(stitchCount);
          if (success) {
            setFoundationDialogOpen(false);
          }
          return success;
        }}
      />

      <TemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSelect={handleTemplateSelect}
      />

      {confirmCopy ? (
        <ConfirmDialog
          open
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          onConfirm={handleConfirm}
          onCancel={() => {
            setConfirmAction(null);
            setPendingTemplateId(null);
          }}
        />
      ) : null}
    </>
  );
}
