import { describe, expect, it } from 'vitest';
import {
  getDrapePreviewDisabledReason,
  getResetDisabledReason,
} from '@app/toolbarState';

describe('toolbarState', () => {
  it('explains why Reset is unavailable', () => {
    expect(getResetDisabledReason(0)).toContain('no pattern');
    expect(getResetDisabledReason(2)).toBeNull();
  });

  it('explains why drape preview is unavailable', () => {
    expect(getDrapePreviewDisabledReason(0)).toContain('foundation');
    expect(getDrapePreviewDisabledReason(3)).toBeNull();
  });
});
