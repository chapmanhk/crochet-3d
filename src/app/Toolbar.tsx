import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  defaultInstructionsFilename,
  defaultPatternFilename,
  parsePatternFile,
  type SavedPatternFile,
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
  getExportInstructionsDisabledReason,
  getDrapePreviewDisabledReason,
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
    setLastError,
    lastError,
    exportPatternJson,
    importSavedPattern,
    exportInstructionsMarkdown,
    exportInstructionsPlainText,
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
    drapePreviewEnabled,
    toggleDrapePreview,
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
      setLastError: state.setLastError,
      lastError: state.lastError,
      exportPatternJson: state.exportPatternJson,
      importSavedPattern: state.importSavedPattern,
      exportInstructionsMarkdown: state.exportInstructionsMarkdown,
      exportInstructionsPlainText: state.exportInstructionsPlainText,
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
      drapePreviewEnabled: state.drapePreviewEnabled,
      toggleDrapePreview: state.toggleDrapePreview,
    })),
  );

  const [foundationDialogOpen, setFoundationDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<TemplateId | null>(null);
  const [pendingPatternFile, setPendingPatternFile] = useState<SavedPatternFile | null>(null);
  const newChainRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadPatternRef = useRef<HTMLButtonElement>(null);

  const resetDisabledReason = getResetDisabledReason(stitches.length);
  const savePatternDisabledReason = getSavePatternDisabledReason(stitches.length);
  const copyInstructionsDisabledReason = getCopyInstructionsDisabledReason(stitches.length);
  const exportInstructionsDisabledReason = getExportInstructionsDisabledReason(stitches.length);
  const drapePreviewDisabledReason = getDrapePreviewDisabledReason(stitches.length);
  const hasPattern = stitches.length > 0;
  const addStitchLabel = getAddStitchButtonLabel(selectedStitchType);
  const advanceActionLabel = getAdvanceActionLabel(foundationType);
  const newRowReason = relabelForFoundationType(newRowDisabledReason, foundationType);

  const clearFeedback = () => {
    clearError();
    clearNotice();
  };

  const openFoundationDialog = () => {
    clearError();
    setFoundationDialogOpen(true);
  };

  const handleNewChain = () => {
    if (hasPattern) {
      setConfirmAction('new-chain');
      return;
    }

    openFoundationDialog();
  };

  const handleConfirm = () => {
    const action = confirmAction;
    setConfirmAction(null);

    switch (action) {
      case 'reset':
        resetPattern();
        return;
      case 'new-chain':
        resetPattern();
        openFoundationDialog();
        return;
      case 'load-template':
        if (pendingTemplateId) {
          resetPattern();
          loadTemplate(pendingTemplateId);
          setPendingTemplateId(null);
          setTemplateDialogOpen(false);
        }
        return;
      case 'import-pattern':
        if (pendingPatternFile) {
          importSavedPattern(pendingPatternFile);
          setPendingPatternFile(null);
        }
        return;
      default:
        return;
    }
  };

  const handleSavePattern = () => {
    clearFeedback();
    downloadTextFile(
      defaultPatternFilename(),
      exportPatternJson(),
      'application/json',
    );
    setNotice('Pattern file downloaded.');
  };

  const handleLoadPatternClick = () => {
    clearError();
    fileInputRef.current?.click();
  };

  const handlePatternFileSelected = async (selectedFile: File | undefined) => {
    if (!selectedFile) {
      return;
    }

    try {
      const json = await readTextFile(selectedFile);
      const patternFile = parsePatternFile(json);

      if (hasPattern) {
        setPendingPatternFile(patternFile);
        setConfirmAction('import-pattern');
        return;
      }

      importSavedPattern(patternFile);
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : 'Could not read the selected file.',
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyInstructions = async () => {
    clearFeedback();
    const copied = await copyTextToClipboard(exportInstructionsPlainText());
    setNotice(
      copied
        ? 'Instructions copied to clipboard.'
        : 'Could not copy instructions. Try Export instructions instead.',
    );
  };

  const handleExportInstructions = () => {
    clearFeedback();
    downloadTextFile(
      defaultInstructionsFilename(),
      exportInstructionsMarkdown(),
      'text/markdown',
    );
    setNotice('Instructions exported.');
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    if (hasPattern) {
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
        <div className="toolbar-group" role="group" aria-label="Pattern file">
          <ToolbarActionButton
            label="Save pattern"
            disabledReason={savePatternDisabledReason}
            onClick={handleSavePattern}
            variant="subtle"
          />
          <button
            ref={loadPatternRef}
            type="button"
            className="btn subtle"
            onClick={handleLoadPatternClick}
            aria-describedby="load-pattern-hint"
          >
            Load pattern
          </button>
          <span id="load-pattern-hint" className="visually-hidden">
            Choose a .json pattern file saved from this app.
          </span>
          <ToolbarActionButton
            label="Copy instructions"
            disabledReason={copyInstructionsDisabledReason}
            onClick={handleCopyInstructions}
            variant="subtle"
          />
          <ToolbarActionButton
            label="Export instructions"
            disabledReason={exportInstructionsDisabledReason}
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
        </div>
        <div className="toolbar-divider" aria-hidden="true" />
        <div className="toolbar-group" role="group" aria-label="Preview">
          <ToolbarActionButton
            label="Drape preview"
            disabledReason={drapePreviewDisabledReason}
            pressed={drapePreviewEnabled}
            toggle
            testId="drape-preview-toggle"
            variant="subtle"
            onClick={toggleDrapePreview}
          />
        </div>
        <div className="toolbar-divider" aria-hidden="true" />
        <div className="toolbar-group" role="group" aria-label="Stitch actions">
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
          returnFocusRef={confirmAction === 'import-pattern' ? loadPatternRef : undefined}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (pendingTemplateId) {
              setTemplateDialogOpen(true);
            }
            if (pendingPatternFile && fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setConfirmAction(null);
            setPendingTemplateId(null);
            setPendingPatternFile(null);
          }}
        />
      ) : null}
    </>
  );
}
