import { useEffect, useId, useRef } from 'react';
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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useDialogFocusTrap(open, dialogRef, onCancel);

  useEffect(() => {
    if (!open) {
      return;
    }

    confirmRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="muted">
          {description}
        </p>

        <div className="dialog-actions">
          <button type="button" className="btn subtle" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
