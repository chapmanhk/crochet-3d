/**
 * Tests for EventBus and EventSubscriptions
 *
 * Verifies:
 * - Event subscription and emission
 * - Event unsubscription
 * - EventSubscriptions helper class
 * - Error handling in listeners
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, Events, EventSubscriptions } from '../src/utils/EventBus.js';

describe('EventBus', () => {
    // Store subscriptions for cleanup
    let cleanupFns;

    beforeEach(() => {
        cleanupFns = [];
    });

    afterEach(() => {
        cleanupFns.forEach(fn => fn());
    });

    function trackOn(event, callback) {
        const unsub = EventBus.on(event, callback);
        cleanupFns.push(unsub);
        return unsub;
    }

    describe('on()', () => {
        it('should register event listener', () => {
            const callback = vi.fn();
            trackOn('test:event', callback);

            EventBus.emit('test:event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should support multiple listeners for same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            trackOn('test:event', callback1);
            trackOn('test:event', callback2);

            EventBus.emit('test:event', { data: 'test' });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = EventBus.on('test:unsub', callback);

            unsubscribe();
            EventBus.emit('test:unsub', {});

            expect(callback).not.toHaveBeenCalled();
        });

        it('should call listener on every emit', () => {
            const callback = vi.fn();
            trackOn('test:multi', callback);

            EventBus.emit('test:multi', {});
            EventBus.emit('test:multi', {});
            EventBus.emit('test:multi', {});

            expect(callback).toHaveBeenCalledTimes(3);
        });
    });

    describe('off()', () => {
        it('should remove specific listener', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            trackOn('test:off', callback1);
            trackOn('test:off', callback2);

            EventBus.off('test:off', callback1);
            EventBus.emit('test:off', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle removing non-existent listener', () => {
            const callback = vi.fn();

            expect(() => {
                EventBus.off('test:nonexistent', callback);
            }).not.toThrow();
        });
    });

    describe('emit()', () => {
        it('should pass data to listeners', () => {
            const callback = vi.fn();
            trackOn('test:data', callback);

            const testData = { id: 1, name: 'test', nested: { value: true } };
            EventBus.emit('test:data', testData);

            expect(callback).toHaveBeenCalledWith(testData);
        });

        it('should not throw for events with no listeners', () => {
            expect(() => {
                EventBus.emit('nonexistent:event', {});
            }).not.toThrow();
        });

        it('should catch errors in listeners', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = vi.fn();

            trackOn('test:error', errorCallback);
            trackOn('test:error', normalCallback);

            expect(() => {
                EventBus.emit('test:error', {});
            }).not.toThrow();

            expect(errorCallback).toHaveBeenCalled();
            expect(normalCallback).toHaveBeenCalled();
        });
    });
});

describe('Events constants', () => {
    it('should define stitch events', () => {
        expect(Events.STITCH_ADDED).toBe('stitch:added');
        expect(Events.STITCH_REMOVED).toBe('stitch:removed');
    });

    it('should define pattern events', () => {
        expect(Events.PATTERN_LOADED).toBe('pattern:loaded');
        expect(Events.PATTERN_CLEARED).toBe('pattern:cleared');
        expect(Events.ROW_ADDED).toBe('pattern:rowAdded');
    });

    it('should define render events', () => {
        expect(Events.RENDER_FRAME).toBe('render:frame');
    });
});

describe('EventSubscriptions', () => {
    let cleanupFns;

    beforeEach(() => {
        cleanupFns = [];
    });

    afterEach(() => {
        cleanupFns.forEach(fn => fn());
    });

    describe('constructor', () => {
        it('should create empty subscriptions collection', () => {
            const subs = new EventSubscriptions();
            expect(subs.unsubscribers).toEqual([]);
        });
    });

    describe('on()', () => {
        it('should subscribe to event and track subscription', () => {
            const subs = new EventSubscriptions();
            const callback = vi.fn();

            subs.on('test:sub', callback);

            expect(subs.unsubscribers).toHaveLength(1);

            EventBus.emit('test:sub', { data: 'test' });
            expect(callback).toHaveBeenCalledWith({ data: 'test' });

            subs.dispose();
        });

        it('should return unsubscribe function', () => {
            const subs = new EventSubscriptions();
            const callback = vi.fn();

            const unsub = subs.on('test:subreturn', callback);

            expect(typeof unsub).toBe('function');

            subs.dispose();
        });
    });

    describe('dispose()', () => {
        it('should unsubscribe all tracked subscriptions', () => {
            const subs = new EventSubscriptions();
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            subs.on('test:dispose1', callback1);
            subs.on('test:dispose2', callback2);

            subs.dispose();

            EventBus.emit('test:dispose1', {});
            EventBus.emit('test:dispose2', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should reset unsubscribers to empty', () => {
            const subs = new EventSubscriptions();
            subs.on('test:reset', () => {});
            subs.on('test:reset2', () => {});

            subs.dispose();

            expect(subs.unsubscribers).toEqual([]);
        });

        it('should allow multiple dispose calls', () => {
            const subs = new EventSubscriptions();
            subs.on('test:multidispose', () => {});

            subs.dispose();

            expect(() => subs.dispose()).not.toThrow();
        });
    });
});

describe('Integration: EventBus with EventSubscriptions', () => {
    it('should work together for component lifecycle', () => {
        const component = {
            subs: new EventSubscriptions(),
            data: [],
            init() {
                this.subs.on(Events.STITCH_ADDED, (e) => this.data.push(e));
                this.subs.on(Events.STITCH_REMOVED, (e) => this.data.push(e));
            },
            dispose() {
                this.subs.dispose();
            }
        };

        component.init();

        EventBus.emit(Events.STITCH_ADDED, { type: 'add' });
        expect(component.data).toHaveLength(1);

        component.dispose();

        EventBus.emit(Events.STITCH_ADDED, { type: 'add2' });
        expect(component.data).toHaveLength(1);
    });

    it('should support multiple components', () => {
        const comp1Data = [];
        const comp2Data = [];

        const comp1Subs = new EventSubscriptions();
        const comp2Subs = new EventSubscriptions();

        comp1Subs.on('shared:integration', (d) => comp1Data.push(d));
        comp2Subs.on('shared:integration', (d) => comp2Data.push(d));

        EventBus.emit('shared:integration', { id: 1 });

        expect(comp1Data).toHaveLength(1);
        expect(comp2Data).toHaveLength(1);

        comp1Subs.dispose();

        EventBus.emit('shared:integration', { id: 2 });

        expect(comp1Data).toHaveLength(1);
        expect(comp2Data).toHaveLength(2);

        comp2Subs.dispose();
    });
});
