import { describe, expect, it, beforeEach } from 'vitest';
import {
  __resetPatternStoreForTests,
  usePatternStore,
} from '@store/patternStore';

describe('patternStore', () => {
  beforeEach(() => {
    __resetPatternStoreForTests();
  });

  it('syncs stitches, instructions, and row state after a successful foundation chain', () => {
    const store = usePatternStore.getState();

    expect(store.addFoundationChain(3)).toBe(true);

    const state = usePatternStore.getState();
    expect(state.stitches).toHaveLength(3);
    expect(state.foundationChainLength).toBe(3);
    expect(state.currentRow).toBe(0);
    expect(state.instructions).toEqual(['Foundation: ch 3']);
    expect(state.lastError).toBeNull();
  });

  it('returns false and sets lastError when foundation chain creation fails', () => {
    const store = usePatternStore.getState();

    expect(store.addFoundationChain(3)).toBe(true);
    expect(store.addFoundationChain(3)).toBe(false);
    expect(usePatternStore.getState().lastError).toContain(
      'Foundation chain already exists',
    );
    expect(usePatternStore.getState().stitches).toHaveLength(3);
  });

  it('returns false when single crochet is added without a foundation chain', () => {
    const store = usePatternStore.getState();

    expect(store.addSingleCrochet()).toBe(false);
    expect(usePatternStore.getState().lastError).toContain(
      'Add a foundation chain before placing single crochet stitches.',
    );
  });

  it('returns false when starting a new row before the current row is complete', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);
    store.startNewRow();
    store.addSingleCrochet();

    expect(store.startNewRow()).toBe(false);
    expect(usePatternStore.getState().lastError).toContain(
      'Complete row 1 before starting a new row',
    );
    expect(usePatternStore.getState().currentRow).toBe(1);
  });

  it('clears errors and pattern state on reset', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(2);
    store.startNewRow();
    store.addSingleCrochet();

    store.resetPattern();

    const state = usePatternStore.getState();
    expect(state.stitches).toHaveLength(0);
    expect(state.foundationChainLength).toBe(0);
    expect(state.instructions).toEqual([]);
    expect(state.lastError).toBeNull();
  });

  it('clears lastError when clearError is called', () => {
    const store = usePatternStore.getState();
    store.addSingleCrochet();

    expect(usePatternStore.getState().lastError).not.toBeNull();
    store.clearError();
    expect(usePatternStore.getState().lastError).toBeNull();
  });
});
