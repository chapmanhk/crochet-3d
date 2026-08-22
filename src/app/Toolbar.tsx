import { usePatternStore } from '@store/patternStore';

export function Toolbar() {
  const addFoundationChain = usePatternStore((state) => state.addFoundationChain);
  const addSingleCrochet = usePatternStore((state) => state.addSingleCrochet);
  const startNewRow = usePatternStore((state) => state.startNewRow);
  const resetPattern = usePatternStore((state) => state.resetPattern);
  const foundationChainLength = usePatternStore(
    (state) => state.foundationChainLength,
  );

  const handleNewChain = () => {
    const input = window.prompt('Foundation chain length', '10');
    if (!input) {
      return;
    }

    const length = Number.parseInt(input, 10);
    if (Number.isNaN(length)) {
      return;
    }

    if (foundationChainLength > 0) {
      const confirmed = window.confirm('Reset the current pattern and start a new chain?');
      if (!confirmed) {
        return;
      }
      resetPattern();
    }

    addFoundationChain(length);
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
      <button type="button" className="btn subtle" onClick={resetPattern}>
        Reset
      </button>
    </div>
  );
}
