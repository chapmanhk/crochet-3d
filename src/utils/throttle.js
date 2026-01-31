/**
 * Throttle utility - Limits how often a function can be invoked
 * 
 * Creates a throttled version of the provided function that will:
 * - Execute immediately on the first call
 * - Ignore subsequent calls within the wait period
 * - Execute once more on the trailing edge with the latest arguments
 * 
 * @param {Function} func - The function to throttle
 * @param {number} wait - The wait time in milliseconds (default: 50ms)
 * @returns {Function} The throttled function
 */
export function throttle(func, wait = 50) {
    let timeoutId = null;
    let lastCallTime = 0;
    let lastArgs = null;
    let lastContext = null;

    const throttled = function(...args) {
        const now = Date.now();
        lastArgs = args;
        lastContext = this;

        const timeSinceLastCall = now - lastCallTime;

        // If enough time has passed, execute immediately
        if (timeSinceLastCall >= wait) {
            lastCallTime = now;
            func.apply(lastContext, lastArgs);
            
            // Clear any pending trailing call
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        } else if (!timeoutId) {
            // Schedule a trailing call
            timeoutId = setTimeout(() => {
                lastCallTime = Date.now();
                func.apply(lastContext, lastArgs);
                timeoutId = null;
            }, wait - timeSinceLastCall);
        }
    };

    return throttled;
}
