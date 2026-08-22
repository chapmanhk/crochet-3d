import { describe, expect, it } from 'vitest';
import {
  getNextStep,
  getRowLabel,
  getRowProgress,
} from '@app/infoPanelState';

describe('infoPanelState', () => {
  it('labels pattern status for each phase', () => {
    expect(getRowLabel(0, 0)).toBe('No pattern');
    expect(getRowLabel(3, 0)).toBe('Foundation');
    expect(getRowLabel(3, 2)).toBe('Row 2');
  });

  it('formats row progress for working rows', () => {
    expect(getRowProgress(0, 3, 0)).toBe('—');
    expect(getRowProgress(1, 3, 2)).toBe('2/3');
  });

  it('describes the next step for beginners', () => {
    expect(getNextStep(0, 0, 0)).toContain('New Chain');
    expect(getNextStep(3, 0, 0)).toContain('New Row');
    expect(getNextStep(3, 1, 1)).toContain('2 more single crochet stitches');
    expect(getNextStep(3, 1, 3)).toContain('is complete');
  });
});
