import { afterEach, describe, expect, it } from 'vitest';
import {
  FoundationType,
  Pattern,
  PatternPersistenceError,
  PlacementKind,
  StitchType,
  createSavedPatternFile,
  createStitchNode,
  parsePatternFile,
  resetIdCounter,
  serializePatternFile,
  validateSavedPatternFile,
} from '@engine/index';

function sampleUiState() {
  return {
    yarnColor: '#d98952',
    selectedStitchType: StitchType.SINGLE_CROCHET,
  };
}

function patternFileFromSetup(setup: (pattern: Pattern) => void) {
  resetIdCounter();
  const pattern = new Pattern();
  setup(pattern);
  return createSavedPatternFile(pattern.getSnapshot(), sampleUiState());
}

describe('persistence', () => {
  afterEach(() => {
    resetIdCounter();
  });

  it('round-trips a saved pattern through JSON export and import', () => {
    const original = patternFileFromSetup((pattern) => {
      pattern.addFoundationChain(2);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
    });

    const imported = parsePatternFile(serializePatternFile(original));

    expect(imported.pattern.stitches).toHaveLength(original.pattern.stitches.length);
    expect(imported.pattern.foundationChainLength).toBe(2);
    expect(imported.pattern.currentRow).toBe(1);
    expect(imported.ui.yarnColor).toBe('#d98952');
  });

  it('rejects unsupported file versions', () => {
    const file = patternFileFromSetup((pattern) => {
      pattern.addFoundationChain(2);
    });

    const json = serializePatternFile({ ...file, version: 99 });
    expect(() => parsePatternFile(json)).toThrow(PatternPersistenceError);
  });

  it('rejects files with missing parent references', () => {
    const stitch = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0, 'missing-parent');
    const file = createSavedPatternFile(
      {
        stitches: [stitch],
        currentRow: 1,
        foundationChainLength: 2,
        foundationType: FoundationType.CHAIN,
        rowDirections: {},
      },
      sampleUiState(),
    );

    expect(() => validateSavedPatternFile(file)).toThrow(
      'references a missing parent stitch',
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePatternFile('{not json')).toThrow('Could not load pattern file.');
  });

  it('preserves increase and decrease placement metadata', () => {
    const file = patternFileFromSetup((pattern) => {
      pattern.addFoundationChain(4);
      pattern.startNewRow();
      pattern.addIncrease(StitchType.SINGLE_CROCHET);
      pattern.addSingleCrochet();
      pattern.addDecrease(StitchType.SINGLE_CROCHET);
    });

    const imported = parsePatternFile(serializePatternFile(file));
    const kinds = imported.pattern.stitches
      .filter((stitch) => stitch.row === 1)
      .map((stitch) => stitch.placementKind);

    expect(kinds).toContain(PlacementKind.INCREASE_SECOND);
    expect(kinds).toContain(PlacementKind.DECREASE);
  });
});
