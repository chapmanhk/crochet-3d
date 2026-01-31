/**
 * Tests for throttle utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { throttle } from '../throttle.js';

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('executes immediately on first call', () => {
        const func = vi.fn();
        const throttled = throttle(func, 100);

        throttled('arg1');

        expect(func).toHaveBeenCalledTimes(1);
        expect(func).toHaveBeenCalledWith('arg1');
    });

    it('schedules a trailing call after wait period', () => {
        const func = vi.fn();
        const throttled = throttle(func, 100);

        // First call executes immediately
        throttled('call1');
        expect(func).toHaveBeenCalledTimes(1);

        // Rapid calls within wait period
        throttled('call2');
        throttled('call3');
        expect(func).toHaveBeenCalledTimes(1); // Still only 1 call

        // Advance time to trigger trailing call
        vi.advanceTimersByTime(100);
        expect(func).toHaveBeenCalledTimes(2);
        expect(func).toHaveBeenLastCalledWith('call3'); // Latest arguments
    });

    it('does not cause extra immediate invocations for rapid calls', () => {
        const func = vi.fn();
        const throttled = throttle(func, 50);

        // First call
        throttled('first');
        expect(func).toHaveBeenCalledTimes(1);

        // Rapid calls
        for (let i = 0; i < 10; i++) {
            throttled(`rapid${i}`);
        }
        expect(func).toHaveBeenCalledTimes(1); // Still just 1

        // Wait for trailing edge
        vi.advanceTimersByTime(50);
        expect(func).toHaveBeenCalledTimes(2);
        expect(func).toHaveBeenLastCalledWith('rapid9');
    });

    it('preserves context (this) when called', () => {
        const func = vi.fn(function() {
            return this.value;
        });
        const throttled = throttle(func, 50);

        const context = { value: 42 };
        throttled.call(context);

        expect(func).toHaveBeenCalledTimes(1);
        expect(func.mock.contexts[0]).toBe(context);
    });

    it('uses default wait time of 50ms when not specified', () => {
        const func = vi.fn();
        const throttled = throttle(func);

        throttled('first');
        expect(func).toHaveBeenCalledTimes(1);

        throttled('second');
        expect(func).toHaveBeenCalledTimes(1);

        // Default should be 50ms
        vi.advanceTimersByTime(50);
        expect(func).toHaveBeenCalledTimes(2);
    });

    it('allows calls after wait period has elapsed', () => {
        const func = vi.fn();
        const throttled = throttle(func, 50);

        throttled('first');
        expect(func).toHaveBeenCalledTimes(1);

        // Wait longer than the throttle period
        vi.advanceTimersByTime(60);

        // Next call should execute immediately
        throttled('second');
        expect(func).toHaveBeenCalledTimes(2);
        expect(func).toHaveBeenLastCalledWith('second');
    });

    it('handles multiple arguments correctly', () => {
        const func = vi.fn();
        const throttled = throttle(func, 50);

        throttled('arg1', 'arg2', 'arg3');
        expect(func).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');

        throttled('new1', 'new2', 'new3');
        vi.advanceTimersByTime(50);
        expect(func).toHaveBeenLastCalledWith('new1', 'new2', 'new3');
    });

    it('only schedules one trailing call at a time', () => {
        const func = vi.fn();
        const throttled = throttle(func, 100);

        // First immediate call
        throttled('first');
        expect(func).toHaveBeenCalledTimes(1);

        // Multiple rapid calls - should only schedule one trailing call
        throttled('second');
        throttled('third');
        throttled('fourth');
        expect(func).toHaveBeenCalledTimes(1);

        // Wait for trailing call
        vi.advanceTimersByTime(100);
        expect(func).toHaveBeenCalledTimes(2);
        expect(func).toHaveBeenLastCalledWith('fourth'); // Latest args
    });
});
