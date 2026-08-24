import { afterEach, describe, expect, it } from 'vitest';
import {
  buildInstructionsExport,
  FoundationType,
  Pattern,
  PatternPersistenceError,
  PlacementKind,
  StitchType,
  createSavedPatternFile,
  createStitchNode,
  INVALID_PATTERN_FILE_MESSAGE,
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
    resetIdCounter();
    const originalPattern = new Pattern();
    originalPattern.addFoundationChain(2);
    originalPattern.startNewRow();
    originalPattern.addSingleCrochet();
    originalPattern.addSingleCrochet();
    const originalStitchCount = originalPattern.getStitches().length;

    const exported = createSavedPatternFile(
      originalPattern.getSnapshot(),
      sampleUiState(),
    );
    const importedFile = parsePatternFile(serializePatternFile(exported));

    const restoredPattern = new Pattern();
    restoredPattern.loadSnapshot(importedFile.pattern);

    expect(restoredPattern.getStitches()).toHaveLength(originalStitchCount);
    expect(restoredPattern.getStitches()).toHaveLength(4);
    expect(restoredPattern.getCurrentRow()).toBe(1);
    expect(importedFile.pattern.foundationChainLength).toBe(2);
    expect(importedFile.ui.yarnColor).toBe('#d98952');
  });

  it('builds markdown and plain-text instruction exports from a saved snapshot', () => {
    const file = patternFileFromSetup((pattern) => {
      pattern.addFoundationChain(3);
    });

    const exported = buildInstructionsExport(file.pattern);

    expect(exported.instructions).toEqual(['Foundation: ch 3']);
    expect(exported.plainText).toContain('Foundation: ch 3');
    expect(exported.markdown).toContain('# Crochet pattern');
    expect(exported.markdown).toContain('1. Foundation: ch 3');
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

  it('rejects files with missing secondary parent references', () => {
    const parent = createStitchNode(StitchType.CHAIN, 0, 0);
    const stitch = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0, parent.id);
    stitch.secondaryAttachToId = 'missing-secondary';
    const file = createSavedPatternFile(
      {
        stitches: [parent, stitch],
        currentRow: 1,
        foundationChainLength: 2,
        foundationType: FoundationType.CHAIN,
        rowDirections: {},
      },
      sampleUiState(),
    );

    expect(() => validateSavedPatternFile(file)).toThrow(
      'references a missing secondary parent stitch',
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePatternFile('{not json')).toThrow(INVALID_PATTERN_FILE_MESSAGE);
  });

  it('rejects duplicate stitch ids', () => {
    const stitch = createStitchNode(StitchType.SINGLE_CROCHET, 1, 0, 'parent');
    const duplicate = { ...stitch, column: 1 };
    const file = createSavedPatternFile(
      {
        stitches: [stitch, duplicate],
        currentRow: 1,
        foundationChainLength: 2,
        foundationType: FoundationType.CHAIN,
        rowDirections: {},
      },
      sampleUiState(),
    );

    expect(() => validateSavedPatternFile(file)).toThrow('duplicate stitch ids');
  });

  it('round-trips a magic ring pattern', () => {
    const original = patternFileFromSetup((pattern) => {
      pattern.addMagicRing(6);
      pattern.startNewRow();
      pattern.addSingleCrochet();
    });

    const imported = parsePatternFile(serializePatternFile(original));
    expect(imported.pattern.foundationType).toBe(FoundationType.MAGIC_RING);
    expect(imported.pattern.stitches.length).toBeGreaterThan(6);
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
