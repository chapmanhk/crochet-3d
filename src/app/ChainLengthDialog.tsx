import { useEffect, useId, useRef, useState } from 'react';
import { MAX_CHAIN_LENGTH, MIN_CHAIN_LENGTH } from '@engine/index';

interface ChainLengthDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (length: number) => void;
}

export function ChainLengthDialog({
  open,
  onClose,
  onSubmit,
}: ChainLengthDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('10');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue('10');
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

  const handleSubmit = () => {
    if (!value) {
      setError('Enter a chain length.');
      return;
    }

    const length = Number.parseInt(value, 10);
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

        <label className="dialog-field" htmlFor="chain-length-input">
          Chain length
          <input
            ref={inputRef}
            id="chain-length-input"
            className="dialog-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
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
            }}
          />
        </label>

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
