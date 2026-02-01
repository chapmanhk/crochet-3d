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
import { showConfirm, showPrompt, showAlert, showInstructions, showModal } from '../src/ui/Modal.js';

vi.mock('../src/ui/Modal.js', () => ({
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showPrompt: vi.fn(() => Promise.resolve('10')),
    showAlert: vi.fn(() => Promise.resolve()),
    showInstructions: vi.fn(() => Promise.resolve()),
    showModal: vi.fn(() => Promise.resolve('Cancel'))
}));

// Mock Pattern class for UIManager
class MockPattern {
    constructor() {
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.mode = 'flat';
        this.selectedStitchType = 'SINGLE_CROCHET';
        this.currentColor = 0x8B4513;
        this.currentLoopSelection = 'both';
        this.currentModifiers = [];
        this.currentSkipCount = 0;
        this.currentWorkIntoSpace = false;
        this.autoTurningChain = true;
        this.turningChainOverrides = {};
        this.graph = {
            size: 0,
            getStats: () => ({
                totalStitches: 10,
                rowCount: 3
            }),
            getRowSorted: vi.fn(() => []),
            getRow: vi.fn(() => []),
            clear: vi.fn(),
            toJSON: vi.fn(() => ({}))
        };
        this.history = [];
        this.historyIndex = -1;
        this.getAttachmentPoints = vi.fn(() => []);
        this.getChainSpaces = vi.fn(() => []);
        this.addStitch = vi.fn();
        this.startWithChain = vi.fn((length) => {
            this.graph.size = length;
        });
        this.startWithFoundationSC = vi.fn();
        this.startWithFoundationDC = vi.fn();
        this.startWithMagicRing = vi.fn();
        this.hasFoundationChain = vi.fn(() => false);
        this.loadState = vi.fn();
        this.metadata = { name: 'Mock' };
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

    it('applies current color to selected stitches', () => {
        const node = { name: 'Single Crochet', row: 0, column: 0, type: 'sc', isTurningChain: false };
        const callback = vi.fn();
        EventBus.on(Events.STITCH_COLOR_CHANGED, callback);

        EventBus.emit(Events.STITCH_SELECTED, { node });
        uiManager.selectColor(0x123456);

        const button = document.querySelector('#btn-apply-selection-color');
        button.click();

        expect(node.color).toBe(0x123456);
        expect(callback).toHaveBeenCalledWith({ nodes: [node], color: 0x123456 });
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

    it('opens start pattern modal when no pattern exists', async () => {
        mockPattern.graph.size = 0;
        showModal.mockResolvedValueOnce('Foundation Chain');
        showPrompt.mockResolvedValueOnce('5');

        await uiManager.addStitchAtNextPosition();

        expect(showModal).toHaveBeenCalled();
        expect(mockPattern.startWithChain).toHaveBeenCalledWith(5);
    });
});

describe('UIManager - Start Pattern and Templates', () => {
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

    it('renders start pattern button', () => {
        const button = document.querySelector('#btn-start-pattern');
        expect(button).not.toBeNull();
    });

    it('renders templates panel with buttons', () => {
        const panel = document.querySelector('.templates-panel');
        expect(panel).not.toBeNull();

        const buttons = panel.querySelectorAll('.template-btn');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('starts foundation double crochet from start modal', async () => {
        showModal.mockResolvedValueOnce('Foundation DC');
        showPrompt.mockResolvedValueOnce('8');

        await uiManager.showStartPatternModal();

        expect(mockPattern.startWithFoundationDC).toHaveBeenCalledWith(8);
    });
});

describe('UIManager - Row Count Warnings', () => {
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

    it('warns when row stitch count differs before starting new row', async () => {
        mockPattern.currentRow = 1;
        mockPattern.hasFoundationChain = vi.fn(() => false);
        mockPattern.graph.getRow.mockImplementation((row) => {
            if (row === 1) {
                return [{ type: 'sc' }, { type: 'sc' }];
            }
            return [{ type: 'sc' }, { type: 'sc' }, { type: 'sc' }];
        });

        const startSpy = vi.spyOn(mockPattern, 'startNewRow');
        showConfirm.mockResolvedValueOnce(false);

        await uiManager.handleStartNewRow();

        expect(showConfirm).toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
    });

    it('displays real-time stitch count with visual indicators', () => {
        // Mock a pattern with rows
        mockPattern.currentRow = 1;
        mockPattern.hasFoundationChain = vi.fn(() => true);

        // Row 0 (foundation) has 10 stitches, row 1 has 12 stitches
        mockPattern.graph.getRow.mockImplementation((row) => {
            if (row === 0) {
                return Array(10).fill({ type: 'ch', isTurningChain: false });
            }
            if (row === 1) {
                return Array(12).fill({ type: 'sc', isTurningChain: false });
            }
            return [];
        });

        uiManager.updateInfoPanel();

        const rowStitchesEl = document.querySelector('#info-row-stitches');
        expect(rowStitchesEl).toBeTruthy();

        // Should show "12 / 10 +2" with increase indicator
        expect(rowStitchesEl.innerHTML).toContain('12 / 10');
        expect(rowStitchesEl.innerHTML).toContain('+2');
        expect(rowStitchesEl.innerHTML).toContain('increase');
    });

    it('displays equal indicator when row count matches previous', () => {
        mockPattern.currentRow = 2;
        mockPattern.hasFoundationChain = vi.fn(() => false);

        // Row 1 has 10 stitches, row 2 has 10 stitches
        mockPattern.graph.getRow.mockImplementation((row) => {
            if (row === 1 || row === 2) {
                return Array(10).fill({ type: 'sc', isTurningChain: false });
            }
            return [];
        });

        uiManager.updateInfoPanel();

        const rowStitchesEl = document.querySelector('#info-row-stitches');
        expect(rowStitchesEl.innerHTML).toContain('10 / 10');
        expect(rowStitchesEl.innerHTML).toContain('=');
        expect(rowStitchesEl.innerHTML).toContain('equal');
    });

    it('displays decrease indicator when row count is less than previous', () => {
        mockPattern.currentRow = 1;
        mockPattern.hasFoundationChain = vi.fn(() => true);

        // Row 0 has 10 stitches, row 1 has 8 stitches
        mockPattern.graph.getRow.mockImplementation((row) => {
            if (row === 0) {
                return Array(10).fill({ type: 'ch', isTurningChain: false });
            }
            if (row === 1) {
                return Array(8).fill({ type: 'sc', isTurningChain: false });
            }
            return [];
        });

        uiManager.updateInfoPanel();

        const rowStitchesEl = document.querySelector('#info-row-stitches');
        expect(rowStitchesEl.innerHTML).toContain('8 / 10');
        expect(rowStitchesEl.innerHTML).toContain('-2');
        expect(rowStitchesEl.innerHTML).toContain('decrease');
    });
});

describe('UIManager - Keyboard Navigation & Accessibility', () => {
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

    describe('Panel Keyboard Navigation', () => {
        it('should add tabindex="0" to stitch palette panel', () => {
            const panel = document.querySelector('.stitch-palette');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should add tabindex="0" to templates panel', () => {
            const panel = document.querySelector('.templates-panel');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should add tabindex="0" to toolbar', () => {
            const panel = document.querySelector('.crochet-toolbar');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should add tabindex="0" to info panel', () => {
            const panel = document.querySelector('.info-panel');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should add tabindex="0" to view mode selector', () => {
            const panel = document.querySelector('.view-mode-selector');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should add tabindex="0" to row navigation panel', () => {
            const panel = document.querySelector('.row-navigation');
            expect(panel).not.toBeNull();
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('should have proper ARIA attributes on all panels', () => {
            const panels = document.querySelectorAll('.crochet-panel');
            expect(panels.length).toBeGreaterThan(0);

            panels.forEach(panel => {
                expect(panel.getAttribute('aria-label')).not.toBeNull();
                expect(panel.getAttribute('role')).not.toBeNull();
            });
        });
    });

    describe('WCAG Contrast Compliance', () => {
        it('should use accessible contrast for stitch button keyboard shortcuts', () => {
            // Verify .stitch-btn .key uses #666 instead of #888
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Should contain the correct color for .stitch-btn .key
            expect(styleContent).toContain('.stitch-btn .key');
            expect(styleContent).toContain('color: #666');

            // Should not contain the old low-contrast color
            const keyStyleMatch = styleContent.match(/\.stitch-btn \.key\s*\{[^}]*color:\s*#888/);
            expect(keyStyleMatch).toBeNull();
        });

        it('should use accessible contrast for option hints', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Verify .option-hint uses #666 instead of #888
            expect(styleContent).toContain('.option-hint');
            expect(styleContent).toContain('color: #666');

            // Should not contain the old low-contrast color
            const hintStyleMatch = styleContent.match(/\.option-hint\s*\{[^}]*color:\s*#888/);
            expect(hintStyleMatch).toBeNull();
        });

        it('should use accessible contrast for view mode shortcuts', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Verify .view-mode-btn .shortcut uses #666 instead of #888
            expect(styleContent).toContain('.view-mode-btn .shortcut');
            expect(styleContent).toContain('color: #666');

            // Should not contain the old low-contrast color
            const shortcutStyleMatch = styleContent.match(/\.view-mode-btn \.shortcut\s*\{[^}]*color:\s*#888/);
            expect(shortcutStyleMatch).toBeNull();
        });
    });

    describe('Responsive Design & Mobile Support', () => {
        it('should include responsive media queries in styles', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Check for tablet breakpoint
            expect(styleContent).toContain('@media (max-width: 1024px)');

            // Check for mobile breakpoint
            expect(styleContent).toContain('@media (max-width: 640px)');

            // Check for landscape orientation handling
            expect(styleContent).toContain('@media (max-width: 900px) and (orientation: landscape)');
        });

        it('should create panel toggle buttons', () => {
            expect(uiManager.panelToggles).toBeInstanceOf(Map);
            expect(uiManager.panelToggles.size).toBe(5); // 5 panels: stitches, info, templates, view-mode, row-nav
        });

        it('should create toggle buttons with correct classes', () => {
            const toggles = document.querySelectorAll('.panel-toggle');
            expect(toggles.length).toBe(5);

            // Check for specific toggle button classes
            expect(document.querySelector('.panel-toggle.stitches')).toBeTruthy();
            expect(document.querySelector('.panel-toggle.info')).toBeTruthy();
            expect(document.querySelector('.panel-toggle.templates')).toBeTruthy();
            expect(document.querySelector('.panel-toggle.view-mode')).toBeTruthy();
            expect(document.querySelector('.panel-toggle.row-nav')).toBeTruthy();
        });

        it('should have proper ARIA attributes on toggle buttons', () => {
            const toggles = document.querySelectorAll('.panel-toggle');

            toggles.forEach(toggle => {
                expect(toggle.getAttribute('aria-label')).toContain('Toggle');
                expect(toggle.getAttribute('aria-expanded')).not.toBeNull();
                expect(toggle.getAttribute('aria-controls')).not.toBeNull();
            });
        });

        it('should apply minimum touch target sizes for mobile in CSS', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Check for 44x44px touch targets
            expect(styleContent).toContain('min-height: 44px');
            expect(styleContent).toContain('min-width: 44px');
        });

        it('should ensure all interactive buttons meet 44px minimum on mobile', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\{[^}]*\})*[^}]*\}/s);
            expect(mobileMediaQuery).toBeTruthy();
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';

            // All interactive buttons should have min-height: 44px for WCAG compliance
            expect(mobileContent).toMatch(/\.stitch-btn\s*\{[^}]*min-height:\s*44px/);
            expect(mobileContent).toMatch(/\.toolbar-btn\s*\{[^}]*min-height:\s*44px/);
            expect(mobileContent).toMatch(/\.row-nav-btn,[\s\S]*?min-height:\s*44px/);
            expect(mobileContent).toMatch(/\.row-goto-row button[^}]*min-height:\s*44px/);
        });

        it('should ensure all interactive buttons meet 44px minimum on tablet', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const tabletMediaQuery = styleContent.match(/@media \(max-width: 1024px\) \{([^}]*\{[^}]*\})*[^}]*\}/s);
            expect(tabletMediaQuery).toBeTruthy();
            const tabletContent = tabletMediaQuery ? tabletMediaQuery[0] : '';

            // All interactive buttons should have min-height: 44px for touch devices
            expect(tabletContent).toMatch(/\.stitch-btn\s*\{[^}]*min-height:\s*44px/);
            expect(tabletContent).toMatch(/\.toolbar-btn\s*\{[^}]*min-height:\s*44px/);
            expect(tabletContent).toMatch(/\.row-nav-btn,[\s\S]*?min-height:\s*44px/);
            expect(tabletContent).toMatch(/\.row-goto-row button[^}]*min-height:\s*44px/);
        });

        it('should define panel-toggle styles', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            expect(styleContent).toContain('.panel-toggle {');
            expect(styleContent).toContain('.panel-toggle:hover');
            expect(styleContent).toContain('.panel-toggle.active');
        });

        it('should adjust panel widths for tablet breakpoint', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            // Check that tablet breakpoint reduces panel widths
            const tabletMediaQuery = styleContent.match(/@media \(max-width: 1024px\) \{([^}]*\})*[^}]*\}/s);
            expect(tabletMediaQuery).toBeTruthy();

            // Within tablet breakpoint, check for reduced widths
            const tabletContent = tabletMediaQuery ? tabletMediaQuery[0] : '';
            expect(tabletContent).toContain('width: 150px'); // stitch palette
            expect(tabletContent).toContain('width: 170px'); // info panel
        });

        it('should make panels responsive with auto width on mobile', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\})*[^}]*\}/s);
            expect(mobileMediaQuery).toBeTruthy();

            // Check for auto width and max-width on mobile
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';
            expect(mobileContent).toContain('width: auto');
            expect(mobileContent).toContain('max-width: 320px');
        });

        it('should reduce stitch grid columns for tablet', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const tabletMediaQuery = styleContent.match(/@media \(max-width: 1024px\) \{([^}]*\})*[^}]*\}/s);
            const tabletContent = tabletMediaQuery ? tabletMediaQuery[0] : '';

            // Tablet should use 2 columns instead of 3
            expect(tabletContent).toContain('grid-template-columns: repeat(2, 1fr)');
        });

        it('should maintain 3 columns on mobile for better spacing', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\})*[^}]*\}/s);
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';

            // Mobile keeps 3 columns for stitches
            expect(mobileContent).toContain('grid-template-columns: repeat(3, 1fr)');
        });

        it('should include collapsed class styling', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            expect(styleContent).toContain('.crochet-panel.collapsed');
            expect(styleContent).toContain('display: none');
        });

        it('should add max-height to panels for scrolling on mobile', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\})*[^}]*\}/s);
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';

            expect(mobileContent).toContain('max-height: 60vh');
            expect(mobileContent).toContain('overflow-y: auto');
        });

        it('should make toolbar wrap on mobile', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\})*[^}]*\}/s);
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';

            expect(mobileContent).toContain('flex-wrap: wrap');
        });

        it('should reduce font sizes for mobile', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const mobileMediaQuery = styleContent.match(/@media \(max-width: 640px\) \{([^}]*\})*[^}]*\}/s);
            const mobileContent = mobileMediaQuery ? mobileMediaQuery[0] : '';

            // Check for smaller font sizes
            expect(mobileContent).toContain('font-size: 12px');
            expect(mobileContent).toContain('font-size: 11px');
            expect(mobileContent).toContain('font-size: 10px');
            expect(mobileContent).toContain('font-size: 9px');
        });

        it('should handle landscape orientation', () => {
            const style = document.querySelector('style');
            const styleContent = style.textContent;

            const landscapeMediaQuery = styleContent.match(/@media \(max-width: 900px\) and \(orientation: landscape\) \{([^}]*\})*[^}]*\}/s);
            expect(landscapeMediaQuery).toBeTruthy();

            const landscapeContent = landscapeMediaQuery ? landscapeMediaQuery[0] : '';
            expect(landscapeContent).toContain('max-height: 50vh');
            expect(landscapeContent).toContain('max-height: 40vh');
        });

        it('should have togglePanel method', () => {
            expect(typeof uiManager.togglePanel).toBe('function');
        });

        it('should have handleResponsiveLayout method', () => {
            expect(typeof uiManager.handleResponsiveLayout).toBe('function');
        });

        it('should toggle panel visibility when toggle button is clicked', () => {
            const stitchesToggle = document.querySelector('.panel-toggle.stitches');
            const stitchPalette = uiManager.stitchPalette;

            // Initially collapsed on mobile (if window is small enough)
            // For testing, we'll just verify the toggle mechanism works
            const initialState = stitchPalette.classList.contains('collapsed');

            stitchesToggle.click();

            expect(stitchPalette.classList.contains('collapsed')).toBe(!initialState);
        });

        it('should update aria-expanded when toggling panels', () => {
            const infoToggle = document.querySelector('.panel-toggle.info');
            const infoPanel = uiManager.infoPanel;

            const initialExpanded = infoToggle.getAttribute('aria-expanded');
            const initialCollapsed = infoPanel.classList.contains('collapsed');

            infoToggle.click();

            const newExpanded = infoToggle.getAttribute('aria-expanded');
            const newCollapsed = infoPanel.classList.contains('collapsed');

            // Either the panel state changed, or aria-expanded reflects the new state correctly
            expect(newCollapsed).toBe(!initialCollapsed);
            expect(newExpanded).toBe(newCollapsed ? 'false' : 'true');
        });

        it('should add active class to toggle button when panel is shown', () => {
            const templatesToggle = document.querySelector('.panel-toggle.templates');
            const templatesPanel = uiManager.templatesPanel;

            // Get initial state
            const initialCollapsed = templatesPanel.classList.contains('collapsed');

            // Click to toggle
            templatesToggle.click();

            const newCollapsed = templatesPanel.classList.contains('collapsed');
            const newActive = templatesToggle.classList.contains('active');

            // Verify panel state changed
            expect(newCollapsed).toBe(!initialCollapsed);

            // When panel is shown (not collapsed), active class should be true
            // When panel is hidden (collapsed), active class should be false
            if (!newCollapsed) {
                expect(newActive).toBe(true);
            } else {
                expect(newActive).toBe(false);
            }
        });
    });
});
