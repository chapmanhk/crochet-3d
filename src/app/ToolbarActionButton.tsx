import { useId } from 'react';

interface ToolbarActionButtonProps {
  label: string;
  disabledReason: string | null;
  onClick: () => void;
  variant?: 'default' | 'subtle';
}

export function ToolbarActionButton({
  label,
  disabledReason,
  onClick,
  variant = 'default',
}: ToolbarActionButtonProps) {
  const reasonId = useId();
  const className = variant === 'subtle' ? 'btn subtle' : 'btn';

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        aria-describedby={disabledReason ? reasonId : undefined}
        onClick={onClick}
      >
        {label}
      </button>
      {disabledReason ? (
        <span id={reasonId} className="visually-hidden">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}
