import { describe, expect, it } from 'vitest';
import { getResetDisabledReason } from '@app/toolbarState';

describe('toolbarState', () => {
  it('explains why Reset is unavailable', () => {
    expect(getResetDisabledReason(0)).toContain('no pattern');
    expect(getResetDisabledReason(2)).toBeNull();
  });
});
