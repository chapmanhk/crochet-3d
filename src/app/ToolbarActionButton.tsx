import { useId } from 'react';

interface ToolbarActionButtonProps {
  label: string;
  disabledReason: string | null;
  onClick: () => void;
  variant?: 'default' | 'subtle';
  ariaLabel?: string;
  pressed?: boolean;
  testId?: string;
}

export function ToolbarActionButton({
  label,
  disabledReason,
  onClick,
  variant = 'default',
  ariaLabel,
  pressed,
  testId,
}: ToolbarActionButtonProps) {
  const reasonId = useId();
  const isDisabled = Boolean(disabledReason);
  const className = variant === 'subtle' ? 'btn subtle' : 'btn';

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      aria-disabled={isDisabled || undefined}
      aria-describedby={isDisabled ? reasonId : undefined}
      data-testid={testId}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }
        onClick();
      }}
    >
      {label}
      {isDisabled ? (
        <span id={reasonId} className="visually-hidden">
          {disabledReason}
        </span>
      ) : null}
    </button>
  );
}
