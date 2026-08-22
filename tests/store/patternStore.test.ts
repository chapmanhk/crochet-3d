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

  it('returns false for invalid foundation chain lengths', () => {
    const store = usePatternStore.getState();

    expect(store.addFoundationChain(0)).toBe(false);
    expect(usePatternStore.getState().lastError).toContain(
      'Chain length must be between 1 and 500.',
    );
    expect(usePatternStore.getState().stitches).toHaveLength(0);
  });

  it('returns false when single crochet is added on the foundation row', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);

    expect(store.addSingleCrochet()).toBe(false);
    expect(usePatternStore.getState().lastError).toMatch(/row 1 or later/i);
    expect(usePatternStore.getState().stitches).toHaveLength(3);
  });

  it('returns false when starting a new row with no stitches on the current row', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);
    store.startNewRow();

    expect(store.startNewRow()).toBe(false);
    expect(usePatternStore.getState().lastError).toContain(
      'Current row has no stitches',
    );
    expect(usePatternStore.getState().currentRow).toBe(1);
  });

  it('syncs state after successful single crochet and new row', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(2);
    store.startNewRow();
    store.addSingleCrochet();
    store.addSingleCrochet();
    store.startNewRow();
    store.addSingleCrochet();

    const state = usePatternStore.getState();
    expect(state.stitches).toHaveLength(5);
    expect(state.currentRow).toBe(2);
    expect(state.instructions).toEqual([
      'Foundation: ch 2',
      'Row 1: sc in each st across (2 sc)',
      'Row 2: sc in each st across (1 sc)',
    ]);
    expect(state.lastError).toBeNull();
  });
});
