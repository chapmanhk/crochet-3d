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
        canAddSingleCrochet: false,
        canStartNewRow: false,
        stitches: [],
      }),
    ).toContain('foundation chain');

    expect(
      getAddScDisabledReason({
        foundationChainLength: 3,
        currentRow: 0,
        canAddSingleCrochet: false,
        canStartNewRow: true,
        stitches: [],
      }),
    ).toContain('working row');
  });

  it('explains why New Row is unavailable', () => {
    expect(
      getNewRowDisabledReason({
        foundationChainLength: 0,
        currentRow: 0,
        canAddSingleCrochet: false,
        canStartNewRow: false,
        stitches: [],
      }),
    ).toContain('foundation chain');

    expect(
      getNewRowDisabledReason({
        foundationChainLength: 3,
        currentRow: 1,
        canAddSingleCrochet: true,
        canStartNewRow: false,
        stitches: [{ row: 1 }],
      }),
    ).toContain('Complete row 1');
  });

  it('explains why Reset is unavailable', () => {
    expect(getResetDisabledReason(0)).toContain('no pattern');
    expect(getResetDisabledReason(2)).toBeNull();
  });
});
