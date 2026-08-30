import { useId } from 'react';

interface ToolbarActionButtonProps {
  label: string;
  disabledReason: string | null;
  onClick: () => void;
  variant?: 'default' | 'subtle';
  ariaLabel?: string;
  pressed?: boolean;
  toggle?: boolean;
  testId?: string;
}

export function ToolbarActionButton({
  label,
  disabledReason,
  onClick,
  variant = 'default',
  ariaLabel,
  pressed,
  toggle = false,
  testId,
}: ToolbarActionButtonProps) {
  const reasonId = useId();
  const isDisabled = Boolean(disabledReason);
  const className = variant === 'subtle' ? 'btn subtle' : 'btn';
  const resolvedAriaLabel =
    ariaLabel ?? (toggle && pressed !== undefined ? `${label} ${pressed ? 'on' : 'off'}` : undefined);

  return (
    <button
      type="button"
      className={className}
      aria-label={resolvedAriaLabel}
      aria-pressed={pressed}
      disabled={isDisabled}
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
