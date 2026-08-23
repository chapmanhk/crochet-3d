import { useEffect, useId, useRef, useState } from 'react';
import { DialogShell } from './DialogShell';
import { useDialogFocusTrap } from './dialogUtils';

const ONBOARDING_STORAGE_KEY = 'crochet-3d-onboarding-seen';

export function OnboardingDialog() {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setOpen(false);
  };

  useDialogFocusTrap(open, dialogRef, dismiss);

  useEffect(() => {
    if (open) {
      dismissRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <DialogShell
      dialogRef={dialogRef}
      role="dialog"
      titleId={titleId}
      descriptionId={descriptionId}
      onBackdropClick={dismiss}
    >
      <h2 id={titleId}>Welcome to Crochet 3D</h2>
      <p id={descriptionId}>
        Design crochet patterns visually in 3D. Start with a foundation chain or magic ring,
        pick a template, and work rows or rounds in single crochet, half double crochet, or double crochet.
        Click attachment points in the canvas or use the toolbar to place stitches.
      </p>
      <div className="dialog-actions">
        <button
          ref={dismissRef}
          type="button"
          className="btn primary"
          onClick={dismiss}
        >
          Get started
        </button>
      </div>
    </DialogShell>
  );
}
