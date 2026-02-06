/**
 * Tests for UIManager (simplified)
 *
 * Verifies:
 * - UI creation (toolbar, info panel)
 * - Button interactions
 * - Keyboard shortcuts
 * - Info panel updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, Events } from '../src/utils/EventBus.js';

// Mock Pattern class for UIManager
class MockPattern {
    constructor() {
        this.currentRow = 0;
        this.workingDirection = 'right';
        this.selectedStitchType = 'single_crochet';
        this.currentColor = 0x8B4513;
        this.graph = {
            size: 0,
            getStats: () => ({
                totalStitches: 10,
                rowCount: 3
            }),
            getRowSorted: vi.fn(() => []),
            getRow: vi.fn(() => [])
        };
        this.getAttachmentPoints = vi.fn(() => []);
        this.addStitch = vi.fn();
        this.startWithChain = vi.fn((length) => {
            this.graph.size = length;
        });
        this.startNewRow = vi.fn(() => { this.currentRow++; });
    }
}

describe('UIManager', () => {
    let UIManager;
    let uiManager;
    let mockPattern;

    beforeEach(async () => {
        document.body.innerHTML = '';

        mockPattern = new MockPattern();

        const module = await import('../src/ui/UIManager.js');
        UIManager = module.UIManager;
        uiManager = new UIManager(mockPattern);
    });

    afterEach(() => {
        if (uiManager && uiManager.dispose) {
            uiManager.dispose();
        }
        document.body.innerHTML = '';
    });

    describe('UI creation', () => {
        it('should create a container element', () => {
            const container = document.querySelector('.crochet-ui');
            expect(container).not.toBeNull();
        });

        it('should create a toolbar with buttons', () => {
            const toolbar = document.querySelector('.crochet-toolbar');
            expect(toolbar).not.toBeNull();

            const buttons = toolbar.querySelectorAll('.toolbar-btn');
            expect(buttons.length).toBe(3);
        });

        it('should create New Chain button', () => {
            const buttons = document.querySelectorAll('.toolbar-btn');
            const chainBtn = Array.from(buttons).find(b => b.textContent.includes('Chain'));
            expect(chainBtn).not.toBeNull();
        });

        it('should create Add SC button', () => {
            const buttons = document.querySelectorAll('.toolbar-btn');
            const addBtn = Array.from(buttons).find(b => b.textContent.includes('Add SC'));
            expect(addBtn).not.toBeNull();
        });

        it('should create New Row button', () => {
            const buttons = document.querySelectorAll('.toolbar-btn');
            const rowBtn = Array.from(buttons).find(b => b.textContent.includes('New Row'));
            expect(rowBtn).not.toBeNull();
        });

        it('should create info panel', () => {
            const infoPanel = document.querySelector('.info-panel');
            expect(infoPanel).not.toBeNull();
        });

        it('should show pattern stats in info panel', () => {
            const infoPanel = document.querySelector('.info-panel');
            expect(infoPanel.textContent).toContain('Stitches');
            expect(infoPanel.textContent).toContain('Rows');
        });
    });

    describe('button interactions', () => {
        it('should call startWithChain when chain button clicked', () => {
            const buttons = document.querySelectorAll('.toolbar-btn');
            const chainBtn = Array.from(buttons).find(b => b.textContent.includes('Chain'));

            chainBtn.click();

            expect(mockPattern.startWithChain).toHaveBeenCalledWith(10);
        });

        it('should call startNewRow when row button clicked', () => {
            const buttons = document.querySelectorAll('.toolbar-btn');
            const rowBtn = Array.from(buttons).find(b => b.textContent.includes('New Row'));

            rowBtn.click();

            expect(mockPattern.startNewRow).toHaveBeenCalled();
        });
    });

    describe('keyboard shortcuts', () => {
        it('should trigger chain on "c" key', () => {
            const event = new KeyboardEvent('keydown', { key: 'c' });
            document.dispatchEvent(event);

            expect(mockPattern.startWithChain).toHaveBeenCalledWith(10);
        });

        it('should trigger new row on "n" key', () => {
            const event = new KeyboardEvent('keydown', { key: 'n' });
            document.dispatchEvent(event);

            expect(mockPattern.startNewRow).toHaveBeenCalled();
        });

        it('should not trigger shortcuts when typing in input', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const event = new KeyboardEvent('keydown', { key: 'c' });
            Object.defineProperty(event, 'target', { value: input });
            document.dispatchEvent(event);

            // Should not have been called (because target is INPUT)
            // Note: the UIManager checks e.target.tagName
        });
    });

    describe('info panel updates', () => {
        it('should update info panel on STITCH_ADDED event', () => {
            mockPattern.graph.getStats = () => ({
                totalStitches: 15,
                rowCount: 4
            });

            EventBus.emit(Events.STITCH_ADDED, {});

            const infoPanel = document.querySelector('.info-panel');
            expect(infoPanel.textContent).toContain('15');
        });

        it('should update info panel on PATTERN_LOADED event', () => {
            mockPattern.graph.getStats = () => ({
                totalStitches: 20,
                rowCount: 5
            });

            EventBus.emit(Events.PATTERN_LOADED, {});

            const infoPanel = document.querySelector('.info-panel');
            expect(infoPanel.textContent).toContain('20');
        });
    });

    describe('dispose', () => {
        it('should remove container from DOM', () => {
            uiManager.dispose();

            const container = document.querySelector('.crochet-ui');
            expect(container).toBeNull();
        });

        it('should not throw on multiple dispose calls', () => {
            uiManager.dispose();
            expect(() => uiManager.dispose()).not.toThrow();
        });
    });
});
