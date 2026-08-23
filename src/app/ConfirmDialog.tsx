import { useEffect, useId, useRef } from 'react';
import { DialogShell } from './DialogShell';
import { useDialogFocusTrap } from './dialogUtils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useDialogFocusTrap(open, dialogRef, onCancel);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <DialogShell
      dialogRef={dialogRef}
      role="alertdialog"
      titleId={titleId}
      descriptionId={descriptionId}
      onBackdropClick={onCancel}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId} className="muted">
        {description}
      </p>

      <div className="dialog-actions">
        <button ref={cancelRef} type="button" className="btn subtle" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}
