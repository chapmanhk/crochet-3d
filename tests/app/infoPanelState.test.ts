import { describe, expect, it } from 'vitest';
import { FoundationType, StitchType } from '@engine/index';
import {
  getNextStep,
  getRowLabel,
  getRowProgress,
} from '@app/infoPanelState';

describe('infoPanelState', () => {
  it('labels pattern status for each phase', () => {
    expect(getRowLabel(0, 0)).toBe('No pattern');
    expect(getRowLabel(3, 0)).toBe('Foundation');
    expect(getRowLabel(3, 0, FoundationType.MAGIC_RING)).toBe('Magic ring');
    expect(getRowLabel(3, 2)).toBe('Row 2');
  });

  it('formats row progress for working rows', () => {
    expect(getRowProgress(0, 3, 3, 0, 0)).toBe('—');
    expect(getRowProgress(1, 3, 3, 2, 2)).toBe('2/3');
    expect(getRowProgress(1, 4, 4, 3, 4)).toBe(
      '3 stitches (uses 4 of 4 stitches)',
    );
    expect(getRowProgress(2, 4, 2, 1, 1)).toBe('1/2');
  });

  it('describes the next step for beginners', () => {
    expect(getNextStep(0, 0, 0, 0, 0)).toContain('New foundation');
    expect(getNextStep(0, 0, 0, 0, 0)).toContain('Templates');
    expect(getNextStep(3, 0, 3, 0, 0)).toContain('New Row');
    expect(getNextStep(3, 1, 3, 1, 1, StitchType.HALF_DOUBLE_CROCHET)).toContain(
      '2 more half double crochet stitches',
    );
    expect(getNextStep(3, 1, 3, 3, 3)).toContain('is complete');
  });
});
