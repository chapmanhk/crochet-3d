/**
 * Constants - Centralized configuration values for the crochet pattern designer
 *
 * Groups magic numbers and configuration values for:
 * - Physics simulation
 * - Pattern construction
 * - Camera and rendering
 * - UI behavior
 */

// =============================================================================
// PATTERN CONSTRUCTION
// =============================================================================

export const PatternConstants = {
    // History
    MAX_HISTORY_SIZE: 50,

    // Magic ring defaults
    MAGIC_RING_INITIAL_STITCHES: 6,
    MAGIC_RING_RADIUS: 1.0,
    MAGIC_RING_INITIAL_Y: 0.5,

    // Round mode positioning
    ROUND_RADIUS_GROWTH: 0.8,

    // Default stitch dimensions (fallback if definition not found)
    DEFAULT_STITCH_WIDTH: 0.8,
    DEFAULT_STITCH_HEIGHT: 0.5,

    // Chain length bounds for input validation
    MIN_CHAIN_LENGTH: 1,
    MAX_CHAIN_LENGTH: 500,
    DEFAULT_CHAIN_LENGTH: 10
};

// =============================================================================
// PHYSICS SIMULATION
// =============================================================================

export const PhysicsConstants = {
    // Gravity
    DEFAULT_GRAVITY_Y: -0.5,

    // Simulation parameters
    DEFAULT_DAMPING: 0.97,
    DEFAULT_STIFFNESS: 0.8,
    CONSTRAINT_ITERATIONS: 3,
    REST_LENGTH_SCALE: 1.0,

    // Ground plane
    DEFAULT_GROUND_Y: -0.5,

    // Settling behavior
    SETTLE_THRESHOLD: 0.001,
    MAX_SETTLE_FRAMES: 300,

    // Fixed timestep (60 FPS)
    FIXED_TIMESTEP: 1 / 60,

    // Default body mass
    DEFAULT_BODY_MASS: 1.0,

    // Stiffness multipliers by constraint type
    HORIZONTAL_STIFFNESS_MULTIPLIER: 1.0,
    VERTICAL_STIFFNESS_MULTIPLIER: 0.8,
    SHEAR_STIFFNESS_MULTIPLIER: 0.7,
    BEND_STIFFNESS_MULTIPLIER: 0.4,

    // Advanced constraint defaults
    DEFAULT_ENABLE_SHEAR: true,
    DEFAULT_ENABLE_BEND: true,

    // Correction factor for constraint solving
    CONSTRAINT_CORRECTION_FACTOR: 0.5,

    // Pinned body multiplier
    PINNED_CORRECTION_MULTIPLIER: 2
};

// =============================================================================
// CAMERA AND SCENE
// =============================================================================

export const SceneConstants = {
    // Camera settings
    CAMERA_FOV: 60,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,

    // Default camera position
    DEFAULT_CAMERA_POSITION: { x: 0, y: 5, z: 8 },
    DEFAULT_CAMERA_TARGET: { x: 0, y: 1, z: 0 },

    // View mode positions
    VIEW_TOP_POSITION: { x: 0, y: 15, z: 0.1 },
    VIEW_TOP_TARGET: { x: 0, y: 0, z: 0 },
    VIEW_FRONT_POSITION: { x: 0, y: 2, z: 10 },
    VIEW_FRONT_TARGET: { x: 0, y: 2, z: 0 },
    VIEW_SIDE_POSITION: { x: 10, y: 2, z: 0 },
    VIEW_SIDE_TARGET: { x: 0, y: 2, z: 0 },

    // Orbit controls
    MIN_DISTANCE: 2,
    MAX_DISTANCE: 50,
    MAX_POLAR_ANGLE_RATIO: 0.9, // Multiplied by Math.PI
    DAMPING_FACTOR: 0.05,

    // Camera follow behavior
    CAMERA_FOLLOW_LERP: 0.08,
    CAMERA_FOLLOW_MIN_DELTA: 0.02,
    CAMERA_FOLLOW_IDLE_DELAY_MS: 250,
    CAMERA_FOLLOW_Y_OFFSET: 0.5,

    // Shadow map
    SHADOW_MAP_SIZE: 2048,
    SHADOW_CAMERA_NEAR: 0.5,
    SHADOW_CAMERA_FAR: 50,
    SHADOW_CAMERA_SIZE: 10,

    // Grid helper
    GRID_SIZE: 20,
    GRID_DIVISIONS: 20,

    // Pixel ratio limit
    MAX_PIXEL_RATIO: 2,

    // Lighting intensities
    MAIN_LIGHT_INTENSITY: 1.5,
    FILL_LIGHT_INTENSITY: 0.5,
    AMBIENT_LIGHT_INTENSITY: 0.8,
    HEMISPHERE_LIGHT_INTENSITY: 0.6,

    // Tone mapping
    TONE_MAPPING_EXPOSURE: 1.0,

    // Background color
    BACKGROUND_COLOR: 0xf5f5f5,

    // Grid colors
    GRID_CENTER_COLOR: 0xcccccc,
    GRID_LINE_COLOR: 0xe0e0e0
};

// =============================================================================
// ATTACHMENT POINTS / GHOST STITCHES
// =============================================================================

export const AttachmentConstants = {
    // Ghost stitch appearance
    GHOST_COLOR: 0x4CAF50,
    GHOST_OPACITY: 0.4,
    GHOST_EMISSIVE_INTENSITY: 0.2,
    GHOST_SCALE: 0.9,

    // Hover state
    HOVER_COLOR: 0x8BC34A,
    HOVER_OPACITY: 0.7,
    HOVER_EMISSIVE_INTENSITY: 0.4,
    HOVER_SCALE: 1.0,

    // Chain space indicators
    CHAIN_SPACE_COLOR: 0x9C27B0,
    CHAIN_SPACE_OPACITY: 0.45,
    CHAIN_SPACE_HOVER_COLOR: 0xBA68C8,

    // New row indicator appearance (purple/orange to distinguish from regular ghosts)
    NEW_ROW_COLOR: 0xFF9800,
    NEW_ROW_OPACITY: 0.5,
    NEW_ROW_EMISSIVE_INTENSITY: 0.3,
    NEW_ROW_HOVER_COLOR: 0xFFB74D,

    // Chain start marker (green - indicates beginning of foundation)
    CHAIN_START_COLOR: 0x00BFA5,
    CHAIN_START_SCALE: 0.4,

    // Chain end marker (blue - indicates where to start working)
    CHAIN_END_COLOR: 0x2196F3,
    CHAIN_END_SCALE: 0.4,

    // Working position marker (yellow - indicates current suggested position)
    WORKING_POSITION_COLOR: 0xFFEB3B,
    WORKING_POSITION_SCALE: 0.35,
    WORKING_POSITION_PULSE_SCALE: 0.45,

    // Default sphere radius for unknown geometries
    DEFAULT_SPHERE_RADIUS: 0.2,
    DEFAULT_SPHERE_SEGMENTS: 16
};

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UIConstants = {
    // Z-index layers
    PANEL_Z_INDEX: 100,
    MODAL_Z_INDEX: 1000,

    // Animation durations (ms)
    TRANSITION_DURATION: 150,

    // Default colors
    PRIMARY_COLOR: '#2196F3',
    PRIMARY_DARK: '#1976D2',
    SUCCESS_COLOR: '#4CAF50',
    ERROR_COLOR: '#f44336',
    WARNING_COLOR: '#ff9800'
};

// =============================================================================
// JSON SCHEMA VALIDATION
// =============================================================================

export const SchemaConstants = {
    // Current pattern file version
    CURRENT_VERSION: 2,
    SUPPORTED_VERSIONS: [1, 2],

    // Limits for validation
    MAX_PATTERN_SIZE: 10000, // Maximum number of stitches
    MAX_METADATA_NAME_LENGTH: 200,
    MAX_METADATA_NOTES_LENGTH: 5000
};

// =============================================================================
// SECURITY UTILITIES
// =============================================================================

/**
 * Dangerous keys that could lead to prototype pollution
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Check if a key is potentially dangerous for prototype pollution
 * @param {string} key - The key to check
 * @returns {boolean} - True if the key is dangerous
 */
export function isDangerousKey(key) {
    return DANGEROUS_KEYS.includes(key);
}

/**
 * Sanitize an object by removing dangerous keys that could lead to prototype pollution
 * This creates a shallow copy with dangerous keys removed
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - A sanitized shallow copy of the object
 */
export function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        if (!isDangerousKey(key)) {
            sanitized[key] = obj[key];
        }
    }
    return sanitized;
}

/**
 * Deep sanitize an object by recursively removing dangerous keys
 * @param {*} obj - The value to sanitize
 * @param {number} maxDepth - Maximum recursion depth (default: 10)
 * @returns {*} - A sanitized deep copy of the object
 */
export function deepSanitizeObject(obj, maxDepth = 10) {
    if (maxDepth <= 0) {
        return obj; // Stop recursion at max depth
    }

    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepSanitizeObject(item, maxDepth - 1));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        if (!isDangerousKey(key)) {
            sanitized[key] = deepSanitizeObject(obj[key], maxDepth - 1);
        }
    }
    return sanitized;
}
