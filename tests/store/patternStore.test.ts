import { describe, expect, it, beforeEach } from 'vitest';
import {
  __resetPatternStoreForTests,
  usePatternStore,
} from '@store/patternStore';

describe('patternStore', () => {
  beforeEach(() => {
    __resetPatternStoreForTests();
  });

  it('syncs engine snapshots into stitches, instructions, and row state', () => {
    const store = usePatternStore.getState();

    expect(store.addFoundationChain(3)).toBe(true);

    const state = usePatternStore.getState();
    expect(state.stitches).toHaveLength(3);
    expect(state.foundationChainLength).toBe(3);
    expect(state.currentRow).toBe(0);
    expect(state.currentRowStitchCount).toBe(3);
    expect(state.instructions).toEqual(['Foundation: ch 3']);
    expect(state.lastError).toBeNull();
  });

  it('surfaces PlacementError messages via lastError without mutating pattern state', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);

    expect(store.addFoundationChain(5)).toBe(false);

    const state = usePatternStore.getState();
    expect(state.lastError).toContain('Foundation chain already exists');
    expect(state.stitches).toHaveLength(3);
    expect(state.foundationChainLength).toBe(3);
  });

  it('clears lastError after a successful action', () => {
    const store = usePatternStore.getState();
    store.addSingleCrochet();

    expect(usePatternStore.getState().lastError).not.toBeNull();

    store.addFoundationChain(2);
    store.startNewRow();
    expect(store.addSingleCrochet()).toBe(true);
    expect(usePatternStore.getState().lastError).toBeNull();
  });

  it('rejects startNewRow when the current row has no stitches', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);
    store.startNewRow();
    store.addSingleCrochet();
    store.addSingleCrochet();
    store.addSingleCrochet();
    store.startNewRow();

    expect(store.startNewRow()).toBe(false);
    expect(usePatternStore.getState().lastError).toContain('no stitches');
    expect(usePatternStore.getState().currentRow).toBe(2);
  });

  it('preserves currentRow when startNewRow fails', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(3);
    store.startNewRow();
    store.addSingleCrochet();

    expect(store.startNewRow()).toBe(false);
    expect(usePatternStore.getState().currentRow).toBe(1);
    expect(usePatternStore.getState().lastError).toContain(
      'Complete row 1 before starting a new row',
    );
  });

  it('exposes can* flags and currentRowStitchCount from the engine', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(2);

    let state = usePatternStore.getState();
    expect(state.canAddSingleCrochet).toBe(false);
    expect(state.canStartNewRow).toBe(true);

    store.startNewRow();
    state = usePatternStore.getState();
    expect(state.canAddSingleCrochet).toBe(true);
    expect(state.canStartNewRow).toBe(false);
    expect(state.currentRowStitchCount).toBe(0);

    store.addSingleCrochet();
    store.addSingleCrochet();
    state = usePatternStore.getState();
    expect(state.canAddSingleCrochet).toBe(false);
    expect(state.canStartNewRow).toBe(true);
    expect(state.currentRowStitchCount).toBe(2);
  });

  it('clears all bridged state on reset', () => {
    const store = usePatternStore.getState();
    store.addFoundationChain(2);
    store.startNewRow();
    store.addSingleCrochet();

    store.resetPattern();

    const state = usePatternStore.getState();
    expect(state.stitches).toHaveLength(0);
    expect(state.foundationChainLength).toBe(0);
    expect(state.currentRowStitchCount).toBe(0);
    expect(state.canAddSingleCrochet).toBe(false);
    expect(state.canStartNewRow).toBe(false);
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
