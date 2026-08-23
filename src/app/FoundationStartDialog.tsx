import { useEffect, useId, useRef, useState } from 'react';
import {
  formatChainLengthError,
  formatMagicRingCountError,
  MAX_CHAIN_LENGTH,
  MAX_MAGIC_RING_STITCHES,
  MIN_CHAIN_LENGTH,
  MIN_MAGIC_RING_STITCHES,
} from '@engine/index';
import { DialogShell } from './DialogShell';
import { useDialogFocusTrap } from './dialogUtils';

const DEFAULT_CHAIN_LENGTH = 10;
const DEFAULT_MAGIC_RING_STITCHES = 6;

type FoundationMode = 'chain' | 'magic_ring';

interface FoundationStartDialogProps {
  open: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSubmitChain: (length: number) => boolean;
  onSubmitMagicRing: (stitchCount: number) => boolean;
}

function parseLength(value: string): number | null {
  if (!value) {
    return null;
  }

  const length = Number.parseInt(value, 10);
  return Number.isInteger(length) ? length : null;
}

function clampLength(length: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, length));
}

export function FoundationStartDialog({
  open,
  serverError = null,
  onClose,
  onSubmitChain,
  onSubmitMagicRing,
}: FoundationStartDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const labelId = useId();
  const inputId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<FoundationMode>('chain');
  const [value, setValue] = useState(String(DEFAULT_CHAIN_LENGTH));
  const [localError, setLocalError] = useState<string | null>(null);

  const min = mode === 'chain' ? MIN_CHAIN_LENGTH : MIN_MAGIC_RING_STITCHES;
  const max = mode === 'chain' ? MAX_CHAIN_LENGTH : MAX_MAGIC_RING_STITCHES;
  const numericValue = parseLength(value);
  const stepBase = numericValue ?? (mode === 'chain' ? DEFAULT_CHAIN_LENGTH : DEFAULT_MAGIC_RING_STITCHES);
  const canDecrease = stepBase > min;
  const canIncrease = stepBase < max;
  const displayError = localError ?? serverError;

  useDialogFocusTrap(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue(
      String(mode === 'chain' ? DEFAULT_CHAIN_LENGTH : DEFAULT_MAGIC_RING_STITCHES),
    );
    setLocalError(null);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open, mode]);

  if (!open) {
    return null;
  }

  const handleModeChange = (nextMode: FoundationMode) => {
    setMode(nextMode);
    setValue(
      String(nextMode === 'chain' ? DEFAULT_CHAIN_LENGTH : DEFAULT_MAGIC_RING_STITCHES),
    );
    setLocalError(null);
    inputRef.current?.focus();
  };

  const handleChange = (raw: string) => {
    setValue(raw.replace(/\D/g, ''));
    setLocalError(null);
  };

  const adjustLength = (delta: number) => {
    const next = clampLength(stepBase + delta, min, max);
    setValue(String(next));
    setLocalError(null);
  };

  const handleSubmit = () => {
    const length = parseLength(value);
    if (length === null) {
      setLocalError(mode === 'chain' ? 'Enter a chain length.' : 'Enter a stitch count.');
      return;
    }

    if (length < min || length > max) {
      setLocalError(
        mode === 'chain' ? formatChainLengthError() : formatMagicRingCountError(),
      );
      return;
    }

    const success =
      mode === 'chain' ? onSubmitChain(length) : onSubmitMagicRing(length);
    if (!success) {
      setLocalError(null);
    }
  };

  const describedBy = displayError ? `${descriptionId} ${errorId}` : descriptionId;
  const fieldLabel = mode === 'chain' ? 'Chain length' : 'Stitches in ring';
  const submitLabel =
    mode === 'chain' ? 'Create foundation chain' : 'Create magic ring';

  return (
    <DialogShell
      dialogRef={dialogRef}
      role="dialog"
      titleId={titleId}
      descriptionId={descriptionId}
      onBackdropClick={onClose}
    >
      <h2 id={titleId}>Start foundation</h2>
      <p id={descriptionId} className="muted" aria-live="polite">
        {mode === 'chain'
          ? 'How many chains should the foundation row have?'
          : 'How many single crochet stitches should the magic ring start with? Magic ring foundations always use single crochet; choose other stitch types after the first round.'}
      </p>

      <div className="foundation-mode-toggle" role="group" aria-label="Foundation type">
        <button
          type="button"
          aria-pressed={mode === 'chain'}
          className={`btn${mode === 'chain' ? ' primary' : ''}`}
          onClick={() => handleModeChange('chain')}
        >
          Chain
        </button>
        <button
          type="button"
          aria-pressed={mode === 'magic_ring'}
          className={`btn${mode === 'magic_ring' ? ' primary' : ''}`}
          onClick={() => handleModeChange('magic_ring')}
        >
          Magic ring
        </button>
      </div>

      <div className="dialog-field">
        <label id={labelId} htmlFor={inputId}>
          {fieldLabel}
        </label>
        <div className="chain-stepper" role="group" aria-labelledby={labelId}>
          <button
            type="button"
            className="btn stepper-btn"
            aria-label={`Decrease ${fieldLabel.toLowerCase()}`}
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
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={numericValue ?? undefined}
            aria-invalid={displayError ? true : undefined}
            aria-describedby={describedBy}
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
            aria-label={`Increase ${fieldLabel.toLowerCase()}`}
            disabled={!canIncrease}
            onClick={() => adjustLength(1)}
          >
            +
          </button>
        </div>
      </div>

      <p className="dialog-hint muted">
        Between {min} and {max} {mode === 'chain' ? 'chains' : 'stitches'}.
      </p>

      {displayError ? (
        <p id={errorId} className="dialog-error" role="alert">
          {displayError}
        </p>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn subtle" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </DialogShell>
  );
}
