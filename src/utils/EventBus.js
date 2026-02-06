/**
 * EventBus - Central event system for application-wide communication
 */

class EventBusClass {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const idx = listeners.indexOf(callback);
            if (idx !== -1) listeners.splice(idx, 1);
        }
    }

    emit(event, data) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in event listener for ${event}:`, err);
                }
            });
        }
    }
}

export const EventBus = new EventBusClass();

/**
 * EventSubscriptions - Helper for managing event listener cleanup
 */
export class EventSubscriptions {
    constructor() {
        this.unsubscribers = [];
    }

    on(event, callback) {
        const unsub = EventBus.on(event, callback);
        this.unsubscribers.push(unsub);
        return unsub;
    }

    dispose() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
}

// Event name constants
export const Events = {
    STITCH_ADDED: 'stitch:added',
    STITCH_REMOVED: 'stitch:removed',
    PATTERN_LOADED: 'pattern:loaded',
    PATTERN_CLEARED: 'pattern:cleared',
    ROW_ADDED: 'pattern:rowAdded',
    RENDER_FRAME: 'render:frame'
};
