export type ConfirmAction = 'reset' | 'new-chain' | 'load-template';

export const CONFIRM_DIALOG_COPY: Record<
  ConfirmAction,
  { title: string; description: string; confirmLabel: string }
> = {
  'new-chain': {
    title: 'Start a new foundation?',
    description:
      'This will clear your current pattern and open the foundation dialog (chain or magic ring).',
    confirmLabel: 'Start new foundation',
  },
  'load-template': {
    title: 'Load a template?',
    description:
      'This will clear your current pattern and replace it with the selected template.',
    confirmLabel: 'Load template',
  },
  reset: {
    title: 'Reset the current pattern?',
    description:
      'This will remove all stitches and instructions. This cannot be undone.',
    confirmLabel: 'Reset pattern',
  },
};
