import { describe, expect, it } from 'vitest';
import {
  getAddScDisabledReason,
  getNewRowDisabledReason,
  getResetDisabledReason,
} from '@app/toolbarState';

describe('toolbarState', () => {
  it('explains why Add SC is unavailable', () => {
    expect(
      getAddScDisabledReason({
        foundationChainLength: 0,
        currentRow: 0,
        currentRowStitchCount: 0,
        canAddSingleCrochet: false,
        canStartNewRow: false,
      }),
    ).toContain('foundation chain');

    expect(
      getAddScDisabledReason({
        foundationChainLength: 3,
        currentRow: 0,
        currentRowStitchCount: 0,
        canAddSingleCrochet: false,
        canStartNewRow: true,
      }),
    ).toContain('working row');
  });

  it('explains why New Row is unavailable', () => {
    expect(
      getNewRowDisabledReason({
        foundationChainLength: 0,
        currentRow: 0,
        currentRowStitchCount: 0,
        canAddSingleCrochet: false,
        canStartNewRow: false,
      }),
    ).toContain('foundation chain');

    expect(
      getNewRowDisabledReason({
        foundationChainLength: 3,
        currentRow: 1,
        currentRowStitchCount: 1,
        canAddSingleCrochet: true,
        canStartNewRow: false,
      }),
    ).toContain('Complete row 1');

    expect(
      getNewRowDisabledReason({
        foundationChainLength: 3,
        currentRow: 2,
        currentRowStitchCount: 0,
        canAddSingleCrochet: false,
        canStartNewRow: false,
      }),
    ).toContain('Place at least one single crochet stitch');
  });

  it('explains why Reset is unavailable', () => {
    expect(getResetDisabledReason(0)).toContain('no pattern');
    expect(getResetDisabledReason(2)).toBeNull();
  });
});
