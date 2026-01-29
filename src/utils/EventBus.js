/**
 * EventBus - Central event system for application-wide communication
 *
 * Provides decoupled communication between modules without direct dependencies.
 */

class EventBusClass {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.maxListeners = 20;  // Warning threshold per event
        this.warningShown = new Set();  // Track which events have shown warnings
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function - IMPORTANT: call this to prevent memory leaks
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listeners = this.listeners.get(event);
        listeners.push(callback);

        // Warn about potential memory leak
        if (listeners.length > this.maxListeners && !this.warningShown.has(event)) {
            console.warn(
                `EventBus: More than ${this.maxListeners} listeners for event "${event}". ` +
                `This may indicate a memory leak. Use EventSubscriptions or call the ` +
                `unsubscribe function returned by on() when components are disposed.`
            );
            this.warningShown.add(event);
        }

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

    /**
     * Get listener count for an event (for debugging)
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const regular = this.listeners.get(event)?.length || 0;
        const once = this.onceListeners.get(event)?.length || 0;
        return regular + once;
    }

    /**
     * Get all listener counts (for debugging memory leaks)
     * @returns {Object} Map of event names to listener counts
     */
    getAllListenerCounts() {
        const counts = {};
        for (const event of this.getEvents()) {
            counts[event] = this.listenerCount(event);
        }
        return counts;
    }

    /**
     * Set the maximum listener threshold for warnings
     * @param {number} max - Maximum listeners before warning
     */
    setMaxListeners(max) {
        this.maxListeners = max;
    }
}

// Singleton instance
export const EventBus = new EventBusClass();

/**
 * EventSubscriptions - Helper class for managing event listener cleanup
 *
 * Collects unsubscribe functions and provides a single dispose() call
 * to clean up all subscriptions. Useful for components that need to
 * subscribe to multiple events.
 *
 * Usage:
 *   const subs = new EventSubscriptions();
 *   subs.add(EventBus.on(Events.STITCH_ADDED, handler1));
 *   subs.add(EventBus.on(Events.STITCH_REMOVED, handler2));
 *
 *   // Later, in dispose():
 *   subs.dispose();
 */
export class EventSubscriptions {
    constructor() {
        this.unsubscribers = [];
    }

    /**
     * Add an unsubscribe function to the collection
     * @param {Function} unsubscribe - The function returned by EventBus.on()
     * @returns {Function} - The same unsubscribe function (for chaining)
     */
    add(unsubscribe) {
        if (typeof unsubscribe === 'function') {
            this.unsubscribers.push(unsubscribe);
        }
        return unsubscribe;
    }

    /**
     * Subscribe to an event and track the subscription
     * Convenience method that combines EventBus.on() and add()
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        return this.add(EventBus.on(event, callback));
    }

    /**
     * Subscribe to an event once and track the subscription
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} - Unsubscribe function
     */
    once(event, callback) {
        return this.add(EventBus.once(event, callback));
    }

    /**
     * Dispose of all subscriptions
     * Calls all collected unsubscribe functions
     */
    dispose() {
        this.unsubscribers.forEach(unsub => {
            try {
                unsub();
            } catch (err) {
                console.error('Error during event unsubscription:', err);
            }
        });
        this.unsubscribers = [];
    }

    /**
     * Get the number of active subscriptions
     * @returns {number}
     */
    get count() {
        return this.unsubscribers.length;
    }
}

/**
 * Create a bound set of event subscriptions for a component
 * Returns an object with on/once/dispose methods
 * @returns {EventSubscriptions}
 */
export function createEventSubscriptions() {
    return new EventSubscriptions();
}

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

    // View mode events
    VIEW_MODE_CHANGED: 'view:modeChanged',
    SCHEMATIC_MODE_CHANGED: 'view:schematicModeChanged',

    // Row navigation events
    ROW_NAVIGATED: 'row:navigated',
    ROW_HIGHLIGHT_CHANGED: 'row:highlightChanged',

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
    HISTORY_CHANGED: 'history:changed',

    // Export events
    EXPORT_STARTED: 'export:started',
    EXPORT_COMPLETED: 'export:completed',
    EXPORT_ERROR: 'export:error'
};
