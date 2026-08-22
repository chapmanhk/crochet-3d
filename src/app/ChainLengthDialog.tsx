import { useEffect, useId, useRef, useState } from 'react';
import { MAX_CHAIN_LENGTH, MIN_CHAIN_LENGTH } from '@engine/index';

export const DEFAULT_CHAIN_LENGTH = 10;

interface ChainLengthDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (length: number) => void;
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
  onClose,
  onSubmit,
}: ChainLengthDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(String(DEFAULT_CHAIN_LENGTH));
  const [error, setError] = useState<string | null>(null);

  const numericValue = parseLength(value);
  const stepBase = numericValue ?? DEFAULT_CHAIN_LENGTH;
  const canDecrease = stepBase > MIN_CHAIN_LENGTH;
  const canIncrease = stepBase < MAX_CHAIN_LENGTH;

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue(String(DEFAULT_CHAIN_LENGTH));
    setError(null);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (raw: string) => {
    setValue(raw.replace(/\D/g, ''));
    setError(null);
  };

  const adjustLength = (delta: number) => {
    const next = clampLength(stepBase + delta);
    setValue(String(next));
    setError(null);
  };

  const handleSubmit = () => {
    if (!value) {
      setError('Enter a chain length.');
      return;
    }

    const length = parseLength(value);
    if (length === null) {
      setError('Enter a chain length.');
      return;
    }

    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      setError(
        `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`,
      );
      return;
    }

    onSubmit(length);
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Foundation chain</h2>
        <p id={descriptionId} className="muted">
          How many chains should the foundation row have?
        </p>

        <div className="dialog-field">
          <span id={labelId}>Chain length</span>
          <div
            className="chain-stepper"
            role="group"
            aria-labelledby={labelId}
          >
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
              id="chain-length-input"
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
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
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

        {error ? (
          <p className="dialog-error" role="alert">
            {error}
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
