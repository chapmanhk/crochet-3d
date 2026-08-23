import { useId, useRef } from 'react';
import { PATTERN_TEMPLATES, type TemplateId } from '@engine/index';
import { DialogShell } from './DialogShell';
import { useDialogFocusTrap } from './dialogUtils';

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: TemplateId) => void;
}

export function TemplateDialog({ open, onClose, onSelect }: TemplateDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(open, dialogRef, onClose);

  if (!open) {
    return null;
  }

  return (
    <DialogShell
      dialogRef={dialogRef}
      role="dialog"
      titleId={titleId}
      descriptionId={descriptionId}
      onBackdropClick={onClose}
    >
      <h2 id={titleId}>Pattern templates</h2>
      <p id={descriptionId} className="muted">
        Start from a small example pattern.
      </p>

      <ul className="template-list">
        {PATTERN_TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              className="template-card"
              onClick={() => onSelect(template.id)}
            >
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="dialog-actions">
        <button type="button" className="btn subtle" onClick={onClose}>
          Cancel
        </button>
      </div>
    </DialogShell>
  );
}
