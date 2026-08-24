import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  defaultInstructionsFilename,
  defaultPatternFilename,
  type TemplateId,
} from '@engine/index';
import { usePatternStore } from '@store/patternStore';
import { copyTextToClipboard, downloadTextFile, readTextFile } from '../shared/fileUtils';
import { ConfirmDialog } from './ConfirmDialog';
import {
  CONFIRM_DIALOG_COPY,
  type ConfirmAction,
} from './confirmDialogCopy';
import { FoundationStartDialog } from './FoundationStartDialog';
import { getAddStitchButtonLabel, getAdvanceActionLabel, relabelForFoundationType } from './infoPanelState';
import { StitchTypeSelector } from './StitchTypeSelector';
import { TemplateDialog } from './TemplateDialog';
import { ToolbarActionButton } from './ToolbarActionButton';
import {
  getCopyInstructionsDisabledReason,
  getResetDisabledReason,
  getSavePatternDisabledReason,
} from './toolbarState';

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
    clearNotice,
    setNotice,
    lastError,
    exportPatternJson,
    importPatternJson,
    exportInstructionsMarkdown,
    exportInstructionsPlainText,
    foundationChainLength,
    foundationType,
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
      clearNotice: state.clearNotice,
      setNotice: state.setNotice,
      lastError: state.lastError,
      exportPatternJson: state.exportPatternJson,
      importPatternJson: state.importPatternJson,
      exportInstructionsMarkdown: state.exportInstructionsMarkdown,
      exportInstructionsPlainText: state.exportInstructionsPlainText,
      foundationChainLength: state.foundationChainLength,
      foundationType: state.foundationType,
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
  const [pendingPatternJson, setPendingPatternJson] = useState<string | null>(null);
  const newChainRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDisabledReason = getResetDisabledReason(stitches.length);
  const savePatternDisabledReason = getSavePatternDisabledReason(stitches.length);
  const copyInstructionsDisabledReason = getCopyInstructionsDisabledReason(stitches.length);
  const addStitchLabel = getAddStitchButtonLabel(selectedStitchType);
  const advanceActionLabel = getAdvanceActionLabel(foundationType);
  const newRowReason = relabelForFoundationType(newRowDisabledReason, foundationType);

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
      return;
    }

    if (action === 'import-pattern' && pendingPatternJson) {
      importPatternJson(pendingPatternJson);
      setPendingPatternJson(null);
    }
  };

  const handleSavePattern = () => {
    clearError();
    clearNotice();
    downloadTextFile(
      defaultPatternFilename(),
      exportPatternJson(),
      'application/json',
    );
    setNotice('Pattern saved.');
  };

  const handleLoadPatternClick = () => {
    clearError();
    fileInputRef.current?.click();
  };

  const handlePatternFileSelected = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const json = await readTextFile(file);
      if (foundationChainLength > 0) {
        setPendingPatternJson(json);
        setConfirmAction('import-pattern');
        return;
      }

      importPatternJson(json);
    } catch {
      importPatternJson('{');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyInstructions = async () => {
    clearError();
    clearNotice();
    const copied = await copyTextToClipboard(exportInstructionsPlainText());
    setNotice(
      copied
        ? 'Instructions copied to clipboard.'
        : 'Could not copy instructions. Try Export instructions instead.',
    );
  };

  const handleExportInstructions = () => {
    clearError();
    clearNotice();
    downloadTextFile(
      defaultInstructionsFilename(),
      exportInstructionsMarkdown(),
      'text/markdown',
    );
    setNotice('Instructions exported.');
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    if (foundationChainLength > 0) {
      setPendingTemplateId(templateId);
      setTemplateDialogOpen(false);
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
          New foundation
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setTemplateDialogOpen(true)}
        >
          Templates
        </button>
        <ToolbarActionButton
          label="Save pattern"
          disabledReason={savePatternDisabledReason}
          onClick={handleSavePattern}
          variant="subtle"
        />
        <button
          type="button"
          className="btn subtle"
          onClick={handleLoadPatternClick}
        >
          Load pattern
        </button>
        <ToolbarActionButton
          label="Copy instructions"
          disabledReason={copyInstructionsDisabledReason}
          onClick={handleCopyInstructions}
          variant="subtle"
        />
        <ToolbarActionButton
          label="Export instructions"
          disabledReason={copyInstructionsDisabledReason}
          onClick={handleExportInstructions}
          variant="subtle"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            void handlePatternFileSelected(event.target.files?.[0]);
          }}
        />
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
          label="Increase"
          disabledReason={addIncreaseDisabledReason}
          onClick={addIncrease}
        />
        <ToolbarActionButton
          label="Decrease"
          disabledReason={addDecreaseDisabledReason}
          onClick={addDecrease}
        />
        <ToolbarActionButton
          label={advanceActionLabel}
          disabledReason={newRowReason}
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
            if (pendingTemplateId) {
              setTemplateDialogOpen(true);
            }
            if (pendingPatternJson && fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setConfirmAction(null);
            setPendingTemplateId(null);
            setPendingPatternJson(null);
          }}
        />
      ) : null}
    </>
  );
}
