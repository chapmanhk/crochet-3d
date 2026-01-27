/**
 * Tests for EventBus and EventSubscriptions
 *
 * Verifies:
 * - Event subscription and emission
 * - Once listeners
 * - Event unsubscription
 * - EventSubscriptions helper class
 * - Error handling in listeners
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    EventBus,
    Events,
    EventSubscriptions,
    createEventSubscriptions
} from '../src/utils/EventBus.js';

describe('EventBus', () => {
    beforeEach(() => {
        // Clear all listeners before each test
        EventBus.clear();
    });

    describe('on()', () => {
        it('should register event listener', () => {
            const callback = vi.fn();
            EventBus.on('test:event', callback);

            EventBus.emit('test:event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should support multiple listeners for same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            EventBus.on('test:event', callback1);
            EventBus.on('test:event', callback2);

            EventBus.emit('test:event', { data: 'test' });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = EventBus.on('test:event', callback);

            unsubscribe();
            EventBus.emit('test:event', {});

            expect(callback).not.toHaveBeenCalled();
        });

        it('should call listener on every emit', () => {
            const callback = vi.fn();
            EventBus.on('test:event', callback);

            EventBus.emit('test:event', {});
            EventBus.emit('test:event', {});
            EventBus.emit('test:event', {});

            expect(callback).toHaveBeenCalledTimes(3);
        });
    });

    describe('once()', () => {
        it('should call listener only once', () => {
            const callback = vi.fn();
            EventBus.once('test:event', callback);

            EventBus.emit('test:event', { first: true });
            EventBus.emit('test:event', { second: true });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ first: true });
        });

        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = EventBus.once('test:event', callback);

            unsubscribe();
            EventBus.emit('test:event', {});

            expect(callback).not.toHaveBeenCalled();
        });

        it('should work alongside regular listeners', () => {
            const onceCallback = vi.fn();
            const regularCallback = vi.fn();

            EventBus.once('test:event', onceCallback);
            EventBus.on('test:event', regularCallback);

            EventBus.emit('test:event', {});
            EventBus.emit('test:event', {});

            expect(onceCallback).toHaveBeenCalledTimes(1);
            expect(regularCallback).toHaveBeenCalledTimes(2);
        });
    });

    describe('off()', () => {
        it('should remove specific listener', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            EventBus.on('test:event', callback1);
            EventBus.on('test:event', callback2);

            EventBus.off('test:event', callback1);
            EventBus.emit('test:event', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle removing non-existent listener', () => {
            const callback = vi.fn();

            expect(() => {
                EventBus.off('test:event', callback);
            }).not.toThrow();
        });

        it('should handle removing from non-existent event', () => {
            const callback = vi.fn();

            expect(() => {
                EventBus.off('nonexistent:event', callback);
            }).not.toThrow();
        });
    });

    describe('emit()', () => {
        it('should pass data to listeners', () => {
            const callback = vi.fn();
            EventBus.on('test:event', callback);

            const testData = { id: 1, name: 'test', nested: { value: true } };
            EventBus.emit('test:event', testData);

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

            EventBus.on('test:event', errorCallback);
            EventBus.on('test:event', normalCallback);

            // Should not throw
            expect(() => {
                EventBus.emit('test:event', {});
            }).not.toThrow();

            // Error callback was called
            expect(errorCallback).toHaveBeenCalled();
            // Normal callback still runs despite error
            expect(normalCallback).toHaveBeenCalled();
        });
    });

    describe('clear()', () => {
        it('should clear all listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            EventBus.on('event1', callback1);
            EventBus.on('event2', callback2);

            EventBus.clear();

            EventBus.emit('event1', {});
            EventBus.emit('event2', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should clear listeners for specific event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            EventBus.on('event1', callback1);
            EventBus.on('event2', callback2);

            EventBus.clear('event1');

            EventBus.emit('event1', {});
            EventBus.emit('event2', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should clear once listeners too', () => {
            const callback = vi.fn();
            EventBus.once('test:event', callback);

            EventBus.clear();
            EventBus.emit('test:event', {});

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('getEvents()', () => {
        it('should return set of registered event names', () => {
            EventBus.on('event1', () => {});
            EventBus.on('event2', () => {});
            EventBus.once('event3', () => {});

            const events = EventBus.getEvents();

            expect(events).toBeInstanceOf(Set);
            expect(events.has('event1')).toBe(true);
            expect(events.has('event2')).toBe(true);
            expect(events.has('event3')).toBe(true);
        });

        it('should return empty set when no listeners', () => {
            const events = EventBus.getEvents();
            expect(events.size).toBe(0);
        });
    });
});

describe('Events constants', () => {
    it('should define stitch events', () => {
        expect(Events.STITCH_ADDED).toBe('stitch:added');
        expect(Events.STITCH_REMOVED).toBe('stitch:removed');
        expect(Events.STITCH_SELECTED).toBe('stitch:selected');
        expect(Events.STITCH_DESELECTED).toBe('stitch:deselected');
        expect(Events.STITCH_HOVERED).toBe('stitch:hovered');
        expect(Events.STITCH_UNHOVERED).toBe('stitch:unhovered');
        expect(Events.STITCH_TYPE_CHANGED).toBe('stitch:typeChanged');
        expect(Events.STITCH_COLOR_CHANGED).toBe('stitch:colorChanged');
    });

    it('should define pattern events', () => {
        expect(Events.PATTERN_LOADED).toBe('pattern:loaded');
        expect(Events.PATTERN_CLEARED).toBe('pattern:cleared');
        expect(Events.PATTERN_SAVED).toBe('pattern:saved');
        expect(Events.ROW_ADDED).toBe('pattern:rowAdded');
        expect(Events.ROW_COMPLETED).toBe('pattern:rowCompleted');
    });

    it('should define tool events', () => {
        expect(Events.TOOL_CHANGED).toBe('tool:changed');
        expect(Events.STITCH_TYPE_SELECTED).toBe('tool:stitchTypeSelected');
        expect(Events.COLOR_SELECTED).toBe('tool:colorSelected');
    });

    it('should define history events', () => {
        expect(Events.UNDO).toBe('history:undo');
        expect(Events.REDO).toBe('history:redo');
        expect(Events.HISTORY_CHANGED).toBe('history:changed');
    });

    it('should define physics events', () => {
        expect(Events.PHYSICS_STARTED).toBe('physics:started');
        expect(Events.PHYSICS_SETTLED).toBe('physics:settled');
        expect(Events.PHYSICS_STEP).toBe('physics:step');
    });
});

describe('EventSubscriptions', () => {
    beforeEach(() => {
        EventBus.clear();
    });

    describe('constructor', () => {
        it('should create empty subscriptions collection', () => {
            const subs = new EventSubscriptions();
            expect(subs.count).toBe(0);
        });
    });

    describe('add()', () => {
        it('should add unsubscribe function', () => {
            const subs = new EventSubscriptions();
            const unsub = EventBus.on('test', () => {});

            subs.add(unsub);

            expect(subs.count).toBe(1);
        });

        it('should return the unsubscribe function', () => {
            const subs = new EventSubscriptions();
            const unsub = vi.fn();

            const result = subs.add(unsub);

            expect(result).toBe(unsub);
        });

        it('should ignore non-function values', () => {
            const subs = new EventSubscriptions();

            subs.add(null);
            subs.add(undefined);
            subs.add('string');
            subs.add({});

            expect(subs.count).toBe(0);
        });
    });

    describe('on()', () => {
        it('should subscribe to event and track subscription', () => {
            const subs = new EventSubscriptions();
            const callback = vi.fn();

            subs.on('test:event', callback);

            expect(subs.count).toBe(1);

            EventBus.emit('test:event', { data: 'test' });
            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should return unsubscribe function', () => {
            const subs = new EventSubscriptions();
            const callback = vi.fn();

            const unsub = subs.on('test:event', callback);

            expect(typeof unsub).toBe('function');
        });
    });

    describe('once()', () => {
        it('should subscribe once and track subscription', () => {
            const subs = new EventSubscriptions();
            const callback = vi.fn();

            subs.once('test:event', callback);

            expect(subs.count).toBe(1);

            EventBus.emit('test:event', {});
            EventBus.emit('test:event', {});

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('dispose()', () => {
        it('should unsubscribe all tracked subscriptions', () => {
            const subs = new EventSubscriptions();
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            subs.on('event1', callback1);
            subs.on('event2', callback2);

            subs.dispose();

            EventBus.emit('event1', {});
            EventBus.emit('event2', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should reset count to 0', () => {
            const subs = new EventSubscriptions();
            subs.on('test', () => {});
            subs.on('test2', () => {});

            subs.dispose();

            expect(subs.count).toBe(0);
        });

        it('should handle errors in unsubscribe functions', () => {
            const subs = new EventSubscriptions();
            const badUnsub = () => { throw new Error('Cleanup error'); };
            const goodUnsub = vi.fn();

            subs.add(badUnsub);
            subs.add(goodUnsub);

            // Should not throw
            expect(() => subs.dispose()).not.toThrow();

            // Good unsub should still be called
            expect(goodUnsub).toHaveBeenCalled();
        });

        it('should allow multiple dispose calls', () => {
            const subs = new EventSubscriptions();
            subs.on('test', () => {});

            subs.dispose();

            expect(() => subs.dispose()).not.toThrow();
        });
    });

    describe('count', () => {
        it('should return number of tracked subscriptions', () => {
            const subs = new EventSubscriptions();

            expect(subs.count).toBe(0);

            subs.on('event1', () => {});
            expect(subs.count).toBe(1);

            subs.on('event2', () => {});
            expect(subs.count).toBe(2);

            subs.dispose();
            expect(subs.count).toBe(0);
        });
    });
});

describe('createEventSubscriptions()', () => {
    it('should create new EventSubscriptions instance', () => {
        const subs = createEventSubscriptions();

        expect(subs).toBeInstanceOf(EventSubscriptions);
        expect(subs.count).toBe(0);
    });
});

describe('Integration: EventBus with EventSubscriptions', () => {
    beforeEach(() => {
        EventBus.clear();
    });

    it('should work together for component lifecycle', () => {
        // Simulate a component
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
        expect(component.data).toHaveLength(1); // No new items after dispose
    });

    it('should support multiple components', () => {
        const comp1Data = [];
        const comp2Data = [];

        const comp1Subs = new EventSubscriptions();
        const comp2Subs = new EventSubscriptions();

        comp1Subs.on('shared:event', (d) => comp1Data.push(d));
        comp2Subs.on('shared:event', (d) => comp2Data.push(d));

        EventBus.emit('shared:event', { id: 1 });

        expect(comp1Data).toHaveLength(1);
        expect(comp2Data).toHaveLength(1);

        // Dispose only comp1
        comp1Subs.dispose();

        EventBus.emit('shared:event', { id: 2 });

        expect(comp1Data).toHaveLength(1); // No new events
        expect(comp2Data).toHaveLength(2); // Still receiving

        comp2Subs.dispose();
    });
});
