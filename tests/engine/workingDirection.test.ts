import { describe, expect, it } from 'vitest';
import {
  defaultDirectionForRow,
  resolveAttachColumn,
  WorkingDirection,
} from '@engine/index';

describe('workingDirection', () => {
  it('alternates row working direction', () => {
    expect(defaultDirectionForRow(1)).toBe(WorkingDirection.LEFT_TO_RIGHT);
    expect(defaultDirectionForRow(2)).toBe(WorkingDirection.RIGHT_TO_LEFT);
    expect(defaultDirectionForRow(3)).toBe(WorkingDirection.LEFT_TO_RIGHT);
  });

  it('resolves attach columns for left-to-right rows', () => {
    expect(
      resolveAttachColumn(0, 3, WorkingDirection.LEFT_TO_RIGHT),
    ).toBe(0);
    expect(
      resolveAttachColumn(2, 3, WorkingDirection.LEFT_TO_RIGHT),
    ).toBe(2);
  });

  it('resolves attach columns for right-to-left rows', () => {
    expect(
      resolveAttachColumn(0, 3, WorkingDirection.RIGHT_TO_LEFT),
    ).toBe(2);
    expect(
      resolveAttachColumn(2, 3, WorkingDirection.RIGHT_TO_LEFT),
    ).toBe(0);
  });
});
