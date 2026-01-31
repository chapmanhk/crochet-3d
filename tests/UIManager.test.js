/**
 * Tests for UIManager - Phase 5 UI features
 *
 * Tests for:
 * - View mode switching (perspective, top, front, side, schematic)
 * - Row navigation UI (go to row, prev/next row)
 * - Keyboard shortcuts for view modes
 * - Event emission for view/row changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, Events } from '../src/utils/EventBus.js';
import { showConfirm, showPrompt, showAlert, showInstructions } from '../src/ui/Modal.js';

vi.mock('../src/ui/Modal.js', () => ({
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showPrompt: vi.fn(() => Promise.resolve('10')),
    showAlert: vi.fn(() => Promise.resolve()),
    showInstructions: vi.fn(() => Promise.resolve())
}));

// Mock Pattern class for UIManager
class MockPattern {
    constructor() {
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.selectedStitchType = 'SINGLE_CROCHET';
        this.currentColor = 0x8B4513;
        this.currentLoopSelection = 'both';
        this.currentModifiers = [];
        this.currentSkipCount = 0;
        this.currentWorkIntoSpace = false;
        this.graph = {
            size: 0,
            getStats: () => ({
                totalStitches: 10,
                rowCount: 3
            }),
            getRowSorted: vi.fn(() => []),
            getRow: vi.fn(() => []),
            clear: vi.fn()
        };
        this.history = [];
        this.historyIndex = -1;
        this.getAttachmentPoints = vi.fn(() => []);
        this.getChainSpaces = vi.fn(() => []);
        this.addStitch = vi.fn();
        this.startWithChain = vi.fn((length) => {
            this.graph.size = length;
        });
    }
    canUndo() { return false; }
    canRedo() { return false; }
    undo() {}
    redo() {}
    startNewRow() { this.currentRow++; }
    generateInstructions() { return 'Row 1: ch 10'; }
    getRowCount() { return 3; }
    goToRow(row) {
        if (row >= 0 && row < 3) {
            this.currentRow = row;
            return true;
        }
        return false;
    }
}

// Mock SceneManager for view mode tests
class MockSceneManager {
    constructor() {
        this.currentViewMode = 'perspective';
    }
    setViewMode(mode) {
        this.currentViewMode = mode;
    }
    getViewMode() {
        return this.currentViewMode;
    }
}

describe('UIManager - View Modes', () => {
    let UIManager;
    let uiManager;
    let mockPattern;
    let mockSceneManager;

    beforeEach(async () => {
        // Clear EventBus
        EventBus.clear();

        // Reset DOM
        document.body.innerHTML = '';

        // Create mocks
        mockPattern = new MockPattern();
        mockSceneManager = new MockSceneManager();

        // Import UIManager dynamically to get fresh instance
        const module = await import('../src/ui/UIManager.js');
        UIManager = module.UIManager;

        // Create UIManager with scene manager reference
        uiManager = new UIManager(mockPattern, mockSceneManager);
    });

    afterEach(() => {
        if (uiManager && uiManager.dispose) {
            uiManager.dispose();
        }
        document.body.innerHTML = '';
    });

    describe('View Mode Controls', () => {
        it('should create view mode selector panel', () => {
            const viewModePanel = document.querySelector('.view-mode-selector');
            expect(viewModePanel).not.toBeNull();
        });

        it('should have buttons for all view modes', () => {
            const viewModes = ['perspective', 'top', 'front', 'side', 'schematic'];

            viewModes.forEach(mode => {
                const button = document.querySelector(`[data-view-mode="${mode}"]`);
                expect(button).not.toBeNull();
            });
        });

        it('should have perspective mode selected by default', () => {
            const perspectiveBtn = document.querySelector('[data-view-mode="perspective"]');
            expect(perspectiveBtn.classList.contains('selected')).toBe(true);
        });

        it('should change view mode when button is clicked', () => {
            const topBtn = document.querySelector('[data-view-mode="top"]');
            topBtn.click();

            expect(mockSceneManager.currentViewMode).toBe('top');
        });

        it('should update button selection state when view mode changes', () => {
            const topBtn = document.querySelector('[data-view-mode="top"]');
            const perspectiveBtn = document.querySelector('[data-view-mode="perspective"]');

            topBtn.click();

            expect(topBtn.classList.contains('selected')).toBe(true);
            expect(perspectiveBtn.classList.contains('selected')).toBe(false);
        });

        it('should emit VIEW_MODE_CHANGED event when view mode changes', () => {
            const callback = vi.fn();
            EventBus.on(Events.VIEW_MODE_CHANGED, callback);

            const frontBtn = document.querySelector('[data-view-mode="front"]');
            frontBtn.click();

            expect(callback).toHaveBeenCalledWith({ mode: 'front', previousMode: 'perspective' });
        });
    });

    describe('View Mode Keyboard Shortcuts', () => {
        it('should switch to perspective view with "1" key', () => {
            // First switch to another mode
            uiManager.setViewMode('top');

            const event = new KeyboardEvent('keydown', { key: '1' });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('perspective');
        });

        it('should switch to top view with "2" key', () => {
            const event = new KeyboardEvent('keydown', { key: '2' });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('top');
        });

        it('should switch to front view with "3" key', () => {
            const event = new KeyboardEvent('keydown', { key: '3' });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('front');
        });

        it('should switch to side view with "4" key', () => {
            const event = new KeyboardEvent('keydown', { key: '4' });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('side');
        });

        it('should switch to schematic view with "5" key', () => {
            const event = new KeyboardEvent('keydown', { key: '5' });
            window.dispatchEvent(event);

            // Schematic mode uses 'top' camera position in scene manager
            // but UIManager tracks it as 'schematic'
            expect(uiManager.currentViewMode).toBe('schematic');
            expect(mockSceneManager.currentViewMode).toBe('top');
        });

        it('should not trigger view mode change when typing in input', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            const event = new KeyboardEvent('keydown', { key: '2', target: input });
            Object.defineProperty(event, 'target', { value: input });
            window.dispatchEvent(event);

            // Should still be perspective since we're typing in input
            expect(mockSceneManager.currentViewMode).toBe('perspective');
        });

        it('should not trigger view mode change when focus is on select', () => {
            const select = document.querySelector('#select-loop');
            const event = new KeyboardEvent('keydown', { key: '2' });
            Object.defineProperty(event, 'target', { value: select });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('perspective');
        });

        it('should not trigger view mode change when modal is open', () => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);

            const event = new KeyboardEvent('keydown', { key: '2' });
            window.dispatchEvent(event);

            expect(mockSceneManager.currentViewMode).toBe('perspective');
            overlay.remove();
        });
    });

    describe('Schematic View Mode', () => {
        it('should toggle 2D schematic rendering when schematic mode is selected', () => {
            const schematicBtn = document.querySelector('[data-view-mode="schematic"]');
            schematicBtn.click();

            expect(uiManager.isSchematicMode).toBe(true);
        });

        it('should emit SCHEMATIC_MODE_CHANGED event', () => {
            const callback = vi.fn();
            EventBus.on(Events.SCHEMATIC_MODE_CHANGED, callback);

            uiManager.setViewMode('schematic');

            expect(callback).toHaveBeenCalledWith({ enabled: true });
        });

        it('should restore 3D rendering when switching from schematic to 3D mode', () => {
            uiManager.setViewMode('schematic');
            uiManager.setViewMode('perspective');

            expect(uiManager.isSchematicMode).toBe(false);
        });
    });

    describe('setViewMode() method', () => {
        it('should update current view mode', () => {
            uiManager.setViewMode('top');
            expect(uiManager.currentViewMode).toBe('top');
        });

        it('should call sceneManager.setViewMode for 3D modes', () => {
            const setViewModeSpy = vi.spyOn(mockSceneManager, 'setViewMode');

            uiManager.setViewMode('front');

            expect(setViewModeSpy).toHaveBeenCalledWith('front');
        });

        it('should update button UI to reflect current mode', () => {
            uiManager.setViewMode('side');

            const sideBtn = document.querySelector('[data-view-mode="side"]');
            expect(sideBtn.classList.contains('selected')).toBe(true);
        });

        it('should return false for invalid view mode', () => {
            const result = uiManager.setViewMode('invalid-mode');
            expect(result).toBe(false);
        });
    });
});

describe('UIManager - Row Navigation', () => {
    let UIManager;
    let uiManager;
    let mockPattern;
    let mockSceneManager;

    beforeEach(async () => {
        EventBus.clear();
        document.body.innerHTML = '';

        mockPattern = new MockPattern();
        mockSceneManager = new MockSceneManager();

        const module = await import('../src/ui/UIManager.js');
        UIManager = module.UIManager;

        uiManager = new UIManager(mockPattern, mockSceneManager);
    });

    afterEach(() => {
        if (uiManager && uiManager.dispose) {
            uiManager.dispose();
        }
        document.body.innerHTML = '';
    });

    describe('Row Navigation Panel', () => {
        it('should create row navigation panel', () => {
            const rowNavPanel = document.querySelector('.row-navigation');
            expect(rowNavPanel).not.toBeNull();
        });

        it('should display current row number', () => {
            const currentRowDisplay = document.querySelector('#current-row-display');
            expect(currentRowDisplay).not.toBeNull();
            expect(currentRowDisplay.textContent).toContain('1'); // Row 1 (0-indexed as 0)
        });

        it('should display total row count', () => {
            const totalRowsDisplay = document.querySelector('#total-rows-display');
            expect(totalRowsDisplay).not.toBeNull();
            expect(totalRowsDisplay.textContent).toContain('3');
        });

        it('shows foundation row label when on foundation row', () => {
            mockPattern.hasFoundationChain = vi.fn(() => true);
            mockPattern.graph.getStats = () => ({
                totalStitches: 5,
                rowCount: 1
            });
            mockPattern.currentRow = 0;

            uiManager.updateRowNavigation();

            const rowLabel = document.querySelector('#row-label');
            const currentRowDisplay = document.querySelector('#current-row-display');
            const totalRowsDisplay = document.querySelector('#total-rows-display');
            const rowOfLabel = document.querySelector('#row-of-label');

            expect(rowLabel.textContent).toBe('Foundation Row');
            expect(currentRowDisplay.style.display).toBe('none');
            expect(totalRowsDisplay.style.display).toBe('none');
            expect(rowOfLabel.style.display).toBe('none');
        });

        it('sets go-to-row min to 0 when foundation exists', () => {
            mockPattern.hasFoundationChain = vi.fn(() => true);
            mockPattern.graph.getStats = () => ({
                totalStitches: 5,
                rowCount: 1
            });
            mockPattern.currentRow = 0;

            uiManager.updateRowNavigation();

            const input = document.querySelector('#input-go-to-row');
            expect(input.min).toBe('0');
        });

        it('should have previous row button', () => {
            const prevBtn = document.querySelector('#btn-prev-row');
            expect(prevBtn).not.toBeNull();
        });

        it('should have next row button', () => {
            const nextBtn = document.querySelector('#btn-next-row');
            expect(nextBtn).not.toBeNull();
        });

        it('should have go-to-row input field', () => {
            const goToInput = document.querySelector('#input-go-to-row');
            expect(goToInput).not.toBeNull();
            expect(goToInput.type).toBe('number');
        });

        it('should have go button for row navigation', () => {
            const goBtn = document.querySelector('#btn-go-to-row');
            expect(goBtn).not.toBeNull();
        });
    });

    describe('Previous/Next Row Navigation', () => {
        it('should navigate to next row when next button is clicked', () => {
            mockPattern.currentRow = 0;

            const nextBtn = document.querySelector('#btn-next-row');
            nextBtn.click();

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should navigate to previous row when prev button is clicked', () => {
            mockPattern.currentRow = 2;
            uiManager.updateRowNavigation();

            const prevBtn = document.querySelector('#btn-prev-row');
            prevBtn.click();

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should disable prev button on first row', () => {
            mockPattern.currentRow = 0;
            uiManager.updateRowNavigation();

            const prevBtn = document.querySelector('#btn-prev-row');
            expect(prevBtn.disabled).toBe(true);
        });

        it('should disable next button on last row', () => {
            mockPattern.currentRow = 2; // Last row (0-indexed, 3 rows total)
            uiManager.updateRowNavigation();

            const nextBtn = document.querySelector('#btn-next-row');
            expect(nextBtn.disabled).toBe(true);
        });

        it('should update display after navigation', () => {
            mockPattern.currentRow = 0;

            const nextBtn = document.querySelector('#btn-next-row');
            nextBtn.click();

            const currentRowDisplay = document.querySelector('#current-row-display');
            expect(currentRowDisplay.textContent).toContain('2');
        });

        it('should emit ROW_NAVIGATED event when navigating', () => {
            const callback = vi.fn();
            EventBus.on(Events.ROW_NAVIGATED, callback);

            mockPattern.currentRow = 0;
            const nextBtn = document.querySelector('#btn-next-row');
            nextBtn.click();

            expect(callback).toHaveBeenCalledWith({ row: 1, previousRow: 0 });
        });
    });

    describe('Go-to-Row Navigation', () => {
        it('should navigate to specified row when go button is clicked', () => {
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '2';
            goBtn.click();

            expect(mockPattern.currentRow).toBe(1); // 0-indexed, so row 2 = index 1
        });

        it('should navigate when Enter is pressed in input', () => {
            const input = document.querySelector('#input-go-to-row');

            input.value = '3';
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            input.dispatchEvent(event);

            expect(mockPattern.currentRow).toBe(2); // 0-indexed
        });

        it('should not navigate to invalid row number (too high)', () => {
            mockPattern.currentRow = 0;
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '100';
            goBtn.click();

            // Should stay at current row
            expect(mockPattern.currentRow).toBe(0);
        });

        it('should not navigate to invalid row number (negative)', () => {
            mockPattern.currentRow = 1;
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '-1';
            goBtn.click();

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should not navigate to invalid row number (zero)', () => {
            mockPattern.currentRow = 1;
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '0';
            goBtn.click();

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should clear input after successful navigation', () => {
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '2';
            goBtn.click();

            expect(input.value).toBe('');
        });

        it('should show error feedback for invalid row', () => {
            const input = document.querySelector('#input-go-to-row');
            const goBtn = document.querySelector('#btn-go-to-row');

            input.value = '999';
            goBtn.click();

            expect(input.classList.contains('error')).toBe(true);
        });
    });

    describe('Row Navigation Keyboard Shortcuts', () => {
        it('should navigate to previous row with PageUp', () => {
            mockPattern.currentRow = 2;

            const event = new KeyboardEvent('keydown', { key: 'PageUp' });
            window.dispatchEvent(event);

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should navigate to next row with PageDown', () => {
            mockPattern.currentRow = 0;

            const event = new KeyboardEvent('keydown', { key: 'PageDown' });
            window.dispatchEvent(event);

            expect(mockPattern.currentRow).toBe(1);
        });

        it('should navigate to first row with Home', () => {
            mockPattern.currentRow = 2;

            const event = new KeyboardEvent('keydown', { key: 'Home' });
            window.dispatchEvent(event);

            expect(mockPattern.currentRow).toBe(0);
        });

        it('should navigate to last row with End', () => {
            mockPattern.currentRow = 0;

            const event = new KeyboardEvent('keydown', { key: 'End' });
            window.dispatchEvent(event);

            expect(mockPattern.currentRow).toBe(2);
        });
    });

    describe('Row Highlight', () => {
        it('should emit ROW_HIGHLIGHT_CHANGED when row is navigated', () => {
            const callback = vi.fn();
            EventBus.on(Events.ROW_HIGHLIGHT_CHANGED, callback);

            uiManager.goToRow(1);

            expect(callback).toHaveBeenCalledWith({ row: 1 });
        });

        it('should have method to highlight specific row in 3D view', () => {
            expect(typeof uiManager.highlightRow).toBe('function');
        });

        it('should update highlighted row when navigating', () => {
            uiManager.goToRow(1);

            expect(uiManager.highlightedRow).toBe(1);
        });
    });

    describe('updateRowNavigation() method', () => {
        it('should update current row display', () => {
            mockPattern.currentRow = 1;
            uiManager.updateRowNavigation();

            const display = document.querySelector('#current-row-display');
            expect(display.textContent).toContain('2'); // 1-indexed display
        });

        it('should update total rows display', () => {
            mockPattern.graph.getStats = () => ({ totalStitches: 20, rowCount: 5 });
            uiManager.updateRowNavigation();

            const display = document.querySelector('#total-rows-display');
            expect(display.textContent).toContain('5');
        });

        it('should update button disabled states', () => {
            mockPattern.currentRow = 0;
            uiManager.updateRowNavigation();

            const prevBtn = document.querySelector('#btn-prev-row');
            const nextBtn = document.querySelector('#btn-next-row');

            expect(prevBtn.disabled).toBe(true);
            expect(nextBtn.disabled).toBe(false);
        });
    });

    describe('goToRow() method', () => {
        it('should update pattern current row', () => {
            uiManager.goToRow(2);
            expect(mockPattern.currentRow).toBe(2);
        });

        it('should return true for valid row', () => {
            const result = uiManager.goToRow(1);
            expect(result).toBe(true);
        });

        it('should return false for invalid row', () => {
            const result = uiManager.goToRow(100);
            expect(result).toBe(false);
        });

        it('should emit events for valid navigation', () => {
            const navCallback = vi.fn();
            const highlightCallback = vi.fn();

            EventBus.on(Events.ROW_NAVIGATED, navCallback);
            EventBus.on(Events.ROW_HIGHLIGHT_CHANGED, highlightCallback);

            uiManager.goToRow(1);

            expect(navCallback).toHaveBeenCalled();
            expect(highlightCallback).toHaveBeenCalled();
        });

        it('should update UI after navigation', () => {
            uiManager.goToRow(2);

            const display = document.querySelector('#current-row-display');
            expect(display.textContent).toContain('3'); // 1-indexed
        });
    });
});

describe('UIManager - Events Integration', () => {
    let UIManager;
    let uiManager;
    let mockPattern;
    let mockSceneManager;

    beforeEach(async () => {
        EventBus.clear();
        document.body.innerHTML = '';

        mockPattern = new MockPattern();
        mockSceneManager = new MockSceneManager();

        const module = await import('../src/ui/UIManager.js');
        UIManager = module.UIManager;

        uiManager = new UIManager(mockPattern, mockSceneManager);
    });

    afterEach(() => {
        if (uiManager && uiManager.dispose) {
            uiManager.dispose();
        }
        document.body.innerHTML = '';
    });

    it('should define VIEW_MODE_CHANGED event', () => {
        expect(Events.VIEW_MODE_CHANGED).toBeDefined();
    });

    it('should define ROW_NAVIGATED event', () => {
        expect(Events.ROW_NAVIGATED).toBeDefined();
    });

    it('should define ROW_HIGHLIGHT_CHANGED event', () => {
        expect(Events.ROW_HIGHLIGHT_CHANGED).toBeDefined();
    });

    it('should define SCHEMATIC_MODE_CHANGED event', () => {
        expect(Events.SCHEMATIC_MODE_CHANGED).toBeDefined();
    });

    it('should update row navigation when ROW_ADDED event is emitted', () => {
        const updateSpy = vi.spyOn(uiManager, 'updateRowNavigation');

        EventBus.emit(Events.ROW_ADDED, {});

        expect(updateSpy).toHaveBeenCalled();
    });

    it('should update row navigation when PATTERN_LOADED event is emitted', () => {
        const updateSpy = vi.spyOn(uiManager, 'updateRowNavigation');

        EventBus.emit(Events.PATTERN_LOADED, {});

        expect(updateSpy).toHaveBeenCalled();
    });
});

describe('UIManager - Stitch options and actions', () => {
    let UIManager;
    let uiManager;
    let mockPattern;
    let mockSceneManager;

    beforeEach(async () => {
        EventBus.clear();
        document.body.innerHTML = '';

        mockPattern = new MockPattern();
        mockSceneManager = new MockSceneManager();

        const module = await import('../src/ui/UIManager.js');
        UIManager = module.UIManager;
        uiManager = new UIManager(mockPattern, mockSceneManager);
    });

    afterEach(() => {
        if (uiManager && uiManager.dispose) {
            uiManager.dispose();
        }
        document.body.innerHTML = '';
    });

    it('updates loop selection and emits attachment options change', () => {
        const callback = vi.fn();
        EventBus.on(Events.ATTACHMENT_OPTIONS_CHANGED, callback);

        const loopSelect = document.querySelector('#select-loop');
        loopSelect.value = 'front';
        loopSelect.dispatchEvent(new Event('change', { bubbles: true }));

        expect(mockPattern.currentLoopSelection).toBe('front');
        expect(callback).toHaveBeenCalledWith({ type: 'loop', value: 'front' });
    });

    it('updates modifiers and skip count', () => {
        const callback = vi.fn();
        EventBus.on(Events.ATTACHMENT_OPTIONS_CHANGED, callback);

        const modifierSelect = document.querySelector('#select-modifier');
        modifierSelect.value = 'inc';
        modifierSelect.dispatchEvent(new Event('change', { bubbles: true }));

        expect(mockPattern.currentModifiers).toHaveLength(1);
        expect(callback).toHaveBeenCalledWith({ type: 'modifier', value: 'inc' });

        const skipInput = document.querySelector('#input-skip-count');
        skipInput.value = '2';
        skipInput.dispatchEvent(new Event('change', { bubbles: true }));

        expect(mockPattern.currentSkipCount).toBe(2);
        expect(callback).toHaveBeenCalledWith({ type: 'skip', value: 2 });
    });

    it('updates skip input value when set programmatically', () => {
        uiManager.updateSkipInput(3);

        const skipInput = document.querySelector('#input-skip-count');
        expect(skipInput.value).toBe('3');
    });

    it('toggles work into space option', () => {
        const callback = vi.fn();
        EventBus.on(Events.ATTACHMENT_OPTIONS_CHANGED, callback);

        const toggle = document.querySelector('#toggle-work-space');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));

        expect(mockPattern.currentWorkIntoSpace).toBe(true);
        expect(callback).toHaveBeenCalledWith({ type: 'space', value: true });
    });

    it('selects yarn color and emits event', () => {
        const callback = vi.fn();
        EventBus.on(Events.COLOR_SELECTED, callback);

        uiManager.selectColor(0xff0000);

        expect(mockPattern.currentColor).toBe(0xff0000);
        expect(callback).toHaveBeenCalledWith({ color: 0xff0000 });

        const colorPicker = document.querySelector('#color-picker');
        expect(colorPicker.value).toBe('#ff0000');
    });

    it('adds a stitch at next available attachment point', async () => {
        const stitch = { id: 'attach', row: 0, column: 0, connections: { above: [] } };
        const nextStitch = { id: 'next', row: 0, column: 1 };
        mockPattern.getAttachmentPoints.mockReturnValue([
            { stitch, type: 'above', available: true, suggested: true }
        ]);
        mockPattern.graph.getRowSorted.mockReturnValue([stitch, nextStitch]);
        mockPattern.graph.getRow.mockReturnValue([stitch, nextStitch]);
        mockPattern.currentSkipCount = 1;

        await uiManager.addStitchAtNextPosition();

        expect(mockPattern.addStitch).toHaveBeenCalledWith(
            uiManager.selectedStitchType,
            stitch,
            expect.objectContaining({
                modifiers: mockPattern.currentModifiers,
                skipCount: 1,
                loopSelection: mockPattern.currentLoopSelection,
                workIntoSpace: false
            })
        );
    });

    it('prompts before starting new row if attachments remain', async () => {
        mockPattern.getAttachmentPoints.mockReturnValue([
            { stitch: { id: 'attach' }, available: true }
        ]);
        showConfirm.mockResolvedValueOnce(false);

        await uiManager.handleStartNewRow();

        expect(mockPattern.currentRow).toBe(0);
    });

    it('shows instructions via modal helper', () => {
        const button = document.querySelector('#btn-instructions');
        button.click();
        expect(showInstructions).toHaveBeenCalled();
    });

    it('uses alert when chain length is adjusted', async () => {
        mockPattern.graph.size = 0;
        showPrompt.mockResolvedValueOnce('999');

        await uiManager.addStitchAtNextPosition();

        expect(showAlert).toHaveBeenCalled();
    });
});
