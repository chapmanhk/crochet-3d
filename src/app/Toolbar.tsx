import { MAX_CHAIN_LENGTH, MIN_CHAIN_LENGTH } from '@engine/index';
import { usePatternStore } from '@store/patternStore';

function parseChainLength(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const length = Number.parseInt(trimmed, 10);
  return Number.isInteger(length) ? length : null;
}

export function Toolbar() {
  const addFoundationChain = usePatternStore((state) => state.addFoundationChain);
  const addSingleCrochet = usePatternStore((state) => state.addSingleCrochet);
  const startNewRow = usePatternStore((state) => state.startNewRow);
  const resetPattern = usePatternStore((state) => state.resetPattern);
  const setLastError = usePatternStore((state) => state.setLastError);
  const foundationChainLength = usePatternStore(
    (state) => state.foundationChainLength,
  );
  const stitches = usePatternStore((state) => state.stitches);

  const handleNewChain = () => {
    const input = window.prompt('Foundation chain length', '10');
    if (input === null) {
      return;
    }

    const length = parseChainLength(input);
    if (length === null) {
      setLastError('Enter a whole number for chain length.');
      return;
    }

    if (length < MIN_CHAIN_LENGTH || length > MAX_CHAIN_LENGTH) {
      setLastError(
        `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`,
      );
      return;
    }

    if (foundationChainLength > 0) {
      const confirmed = window.confirm(
        'Reset the current pattern and start a new chain?',
      );
      if (!confirmed) {
        return;
      }
      resetPattern();
    }

    addFoundationChain(length);
  };

  const handleReset = () => {
    if (stitches.length === 0) {
      resetPattern();
      return;
    }

    const confirmed = window.confirm('Reset the current pattern?');
    if (confirmed) {
      resetPattern();
    }
  };

  return (
    <div className="toolbar panel" role="toolbar" aria-label="Pattern tools">
      <button type="button" className="btn primary" onClick={handleNewChain}>
        New Chain
      </button>
      <button type="button" className="btn" onClick={addSingleCrochet}>
        Add SC
      </button>
      <button type="button" className="btn" onClick={startNewRow}>
        New Row
      </button>
      <button type="button" className="btn subtle" onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}
