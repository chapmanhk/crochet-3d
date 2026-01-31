/**
 * Tests for Modal helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showModal, showAlert, showConfirm, showPrompt } from '../src/ui/Modal.js';
import { UIConstants } from '../src/utils/Constants.js';

describe('Modal helpers', () => {
    let rafSpy;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
        }
        rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0);
            return 0;
        });
    });

    afterEach(() => {
        rafSpy.mockRestore();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('resolves with clicked button label and closes', async () => {
        const onClick = vi.fn();
        const resultPromise = showModal({
            title: 'Test',
            content: 'Body',
            buttons: [{ text: 'OK', primary: true, onClick }]
        });

        const overlay = document.querySelector('.modal-overlay');
        expect(overlay).not.toBeNull();

        const okButton = overlay.querySelector('.modal-btn');
        okButton.click();

        expect(onClick).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe('OK');
        expect(document.querySelector('.modal-overlay')).toBeNull();
    });

    it('closes when clicking outside the modal', async () => {
        const resultPromise = showModal({
            title: 'Overlay Close',
            content: 'Click outside',
            buttons: [{ text: 'OK', primary: true }]
        });

        const overlay = document.querySelector('.modal-overlay');
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBeNull();
    });

    it('closes when pressing Escape', async () => {
        const resultPromise = showModal({
            title: 'Escape Close',
            content: 'Press Escape',
            buttons: [{ text: 'OK', primary: true }]
        });

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBeNull();
    });

    it('showAlert resolves after OK', async () => {
        const resultPromise = showAlert('Alert message', 'Alert');
        const overlay = document.querySelector('.modal-overlay');
        overlay.querySelector('.modal-btn').click();

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe('OK');
    });

    it('showConfirm resolves true for OK', async () => {
        const resultPromise = showConfirm('Confirm?', 'Confirm');
        const overlay = document.querySelector('.modal-overlay');
        const buttons = Array.from(overlay.querySelectorAll('.modal-btn'));
        const okButton = buttons.find((btn) => btn.textContent === 'OK');
        okButton.click();

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe(true);
    });

    it('showConfirm resolves false for Cancel', async () => {
        const resultPromise = showConfirm('Confirm?', 'Confirm');
        const overlay = document.querySelector('.modal-overlay');
        const buttons = Array.from(overlay.querySelectorAll('.modal-btn'));
        const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
        cancelButton.click();

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe(false);
    });

    it('showPrompt resolves with input value on OK', async () => {
        const resultPromise = showPrompt('Enter value', 'default', 'Prompt');
        const overlay = document.querySelector('.modal-overlay');
        const input = overlay.querySelector('.modal-input');
        input.value = 'custom';

        const buttons = Array.from(overlay.querySelectorAll('.modal-btn'));
        const okButton = buttons.find((btn) => btn.textContent === 'OK');
        okButton.click();

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe('custom');
    });

    it('showPrompt resolves with input value on Enter', async () => {
        const resultPromise = showPrompt('Enter value', 'default', 'Prompt');
        const overlay = document.querySelector('.modal-overlay');
        const input = overlay.querySelector('.modal-input');
        input.value = 'from-enter';

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        vi.advanceTimersByTime(UIConstants.TRANSITION_DURATION);
        await Promise.resolve();

        await expect(resultPromise).resolves.toBe('from-enter');
    });
});
