import type { ReactNode, RefObject } from 'react';

interface DialogShellProps {
  dialogRef: RefObject<HTMLDivElement | null>;
  role: 'dialog' | 'alertdialog';
  titleId: string;
  descriptionId?: string;
  onBackdropClick?: () => void;
  children: ReactNode;
}

export function DialogShell({
  dialogRef,
  role,
  titleId,
  descriptionId,
  onBackdropClick,
  children,
}: DialogShellProps) {
  return (
    <div className="dialog-backdrop" onClick={onBackdropClick}>
      <div
        ref={dialogRef}
        className="dialog panel"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
