import { useEffect, useId, useRef, useState } from 'react';
import { MAX_CHAIN_LENGTH, MIN_CHAIN_LENGTH } from '@engine/index';
import { useDialogFocusTrap } from './dialogUtils';

export const DEFAULT_CHAIN_LENGTH = 10;

interface ChainLengthDialogProps {
  open: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (length: number) => boolean;
}

function parseLength(value: string): number | null {
  if (!value) {
    return null;
  }

  const length = Number.parseInt(value, 10);
  return Number.isInteger(length) ? length : null;
}

function clampLength(length: number): number {
  return Math.min(MAX_CHAIN_LENGTH, Math.max(MIN_CHAIN_LENGTH, length));
}

export function ChainLengthDialog({
  open,
  serverError = null,
  onClose,
  onSubmit,
}: ChainLengthDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(String(DEFAULT_CHAIN_LENGTH));
  const [localError, setLocalError] = useState<string | null>(null);

  const numericValue = parseLength(value);
  const stepBase = numericValue ?? DEFAULT_CHAIN_LENGTH;
  const canDecrease = stepBase > MIN_CHAIN_LENGTH;
  const canIncrease = stepBase < MAX_CHAIN_LENGTH;
  const displayError = localError ?? serverError;

  useDialogFocusTrap(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue(String(DEFAULT_CHAIN_LENGTH));
    setLocalError(null);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (raw: string) => {
    setValue(raw.replace(/\D/g, ''));
    setLocalError(null);
  };

  const adjustLength = (delta: number) => {
    const next = clampLength(stepBase + delta);
    setValue(String(next));
    setLocalError(null);
  };

  const handleSubmit = () => {
    if (!value) {
      setLocalError('Enter a chain length.');
      return;
    }

    const length = parseLength(value);
    if (length === null) {
      setLocalError('Enter a chain length.');
      return;
    }

    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      setLocalError(
        `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`,
      );
      return;
    }

    const success = onSubmit(length);
    if (!success) {
      setLocalError(null);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>Foundation chain</h2>
        <p id={descriptionId} className="muted">
          How many chains should the foundation row have?
        </p>

        <div className="dialog-field">
          <label htmlFor={inputId}>Chain length</label>
          <div className="chain-stepper" role="group" aria-labelledby={inputId}>
            <button
              type="button"
              className="btn stepper-btn"
              aria-label="Decrease chain length"
              disabled={!canDecrease}
              onClick={() => adjustLength(-1)}
            >
              −
            </button>
            <input
              ref={inputRef}
              id={inputId}
              className="dialog-input stepper-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              role="spinbutton"
              aria-valuemin={MIN_CHAIN_LENGTH}
              aria-valuemax={MAX_CHAIN_LENGTH}
              aria-valuenow={numericValue ?? undefined}
              aria-label="Chain length"
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmit();
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (canIncrease) {
                    adjustLength(1);
                  }
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (canDecrease) {
                    adjustLength(-1);
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn stepper-btn"
              aria-label="Increase chain length"
              disabled={!canIncrease}
              onClick={() => adjustLength(1)}
            >
              +
            </button>
          </div>
        </div>

        <p className="dialog-hint muted">
          Between {MIN_CHAIN_LENGTH} and {MAX_CHAIN_LENGTH} chains.
        </p>

        {displayError ? (
          <p className="dialog-error" role="alert">
            {displayError}
          </p>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={handleSubmit}>
            Create chain
          </button>
        </div>
      </div>
    </div>
  );
}
