/**
 * EventBus - Central event system for application-wide communication
 *
 * Provides decoupled communication between modules without direct dependencies.
 */

class EventBusClass {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    /**
     * Subscribe to an event
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once (auto-removes after first emit)
     */
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push(callback);

        return () => {
            const listeners = this.onceListeners.get(event);
            if (listeners) {
                const idx = listeners.indexOf(callback);
                if (idx !== -1) listeners.splice(idx, 1);
            }
        };
    }

    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const idx = listeners.indexOf(callback);
            if (idx !== -1) listeners.splice(idx, 1);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit(event, data) {
        // Regular listeners
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

        // Once listeners (remove after calling)
        const onceListeners = this.onceListeners.get(event);
        if (onceListeners && onceListeners.length > 0) {
            const toCall = [...onceListeners];
            this.onceListeners.set(event, []);
            toCall.forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in once listener for ${event}:`, err);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event (or all events)
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    /**
     * Get list of all registered events
     */
    getEvents() {
        return new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
    }
}

// Singleton instance
export const EventBus = new EventBusClass();

// Event name constants for type safety
export const Events = {
    // Stitch events
    STITCH_ADDED: 'stitch:added',
    STITCH_REMOVED: 'stitch:removed',
    STITCH_SELECTED: 'stitch:selected',
    STITCH_DESELECTED: 'stitch:deselected',
    STITCH_HOVERED: 'stitch:hovered',
    STITCH_UNHOVERED: 'stitch:unhovered',
    STITCH_TYPE_CHANGED: 'stitch:typeChanged',
    STITCH_COLOR_CHANGED: 'stitch:colorChanged',

    // Pattern events
    PATTERN_LOADED: 'pattern:loaded',
    PATTERN_CLEARED: 'pattern:cleared',
    PATTERN_SAVED: 'pattern:saved',
    ROW_ADDED: 'pattern:rowAdded',
    ROW_COMPLETED: 'pattern:rowCompleted',

    // Tool events
    TOOL_CHANGED: 'tool:changed',
    STITCH_TYPE_SELECTED: 'tool:stitchTypeSelected',
    COLOR_SELECTED: 'tool:colorSelected',

    // UI events
    UI_PANEL_OPENED: 'ui:panelOpened',
    UI_PANEL_CLOSED: 'ui:panelClosed',
    UI_MODE_CHANGED: 'ui:modeChanged',

    // Physics events
    PHYSICS_STARTED: 'physics:started',
    PHYSICS_SETTLED: 'physics:settled',
    PHYSICS_STEP: 'physics:step',

    // Rendering events
    RENDER_FRAME: 'render:frame',
    CAMERA_CHANGED: 'render:cameraChanged',

    // History events
    UNDO: 'history:undo',
    REDO: 'history:redo',
    HISTORY_CHANGED: 'history:changed'
};
