/**
 * Constants - Centralized configuration values
 */

export const SceneConstants = {
    // Camera settings
    CAMERA_FOV: 60,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,

    // Default camera position
    DEFAULT_CAMERA_POSITION: { x: 0, y: 5, z: 8 },
    DEFAULT_CAMERA_TARGET: { x: 0, y: 1, z: 0 },

    // Orbit controls
    MIN_DISTANCE: 0.5,
    MAX_DISTANCE: 200,
    MAX_POLAR_ANGLE_RATIO: 0.95,
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
