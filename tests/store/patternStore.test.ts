import { describe, expect, it, beforeEach } from 'vitest';
import {
  __resetPatternStoreForTests,
  usePatternStore,
} from '@store/patternStore';

describe('patternStore', () => {
  beforeEach(() => {
    __resetPatternStoreForTests();
  });

  it('returns false and sets lastError when foundation chain creation fails', () => {
    const store = usePatternStore.getState();

    expect(store.addFoundationChain(3)).toBe(true);
    expect(store.addFoundationChain(3)).toBe(false);
    expect(usePatternStore.getState().lastError).toContain('Foundation chain already exists');
    expect(usePatternStore.getState().stitches).toHaveLength(3);
  });
});
