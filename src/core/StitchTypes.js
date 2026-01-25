/**
 * StitchTypes.js - Verified crochet stitch type definitions
 *
 * Each stitch type includes:
 * - Abbreviation used in patterns
 * - Relative height (in stitch units)
 * - Relative width (in stitch units)
 * - Connection info (how many stitches it connects to below/creates above)
 * - Geometry parameters for 3D rendering
 * - Description for UI
 */

export const StitchType = {
    CHAIN: 'chain',
    SLIP_STITCH: 'slip_stitch',
    SINGLE_CROCHET: 'single_crochet',
    HALF_DOUBLE_CROCHET: 'half_double_crochet',
    DOUBLE_CROCHET: 'double_crochet',
    TRIPLE_CROCHET: 'triple_crochet',
    INCREASE: 'increase',
    DECREASE: 'decrease',
    MAGIC_RING: 'magic_ring'
};

export const StitchDefinitions = {
    [StitchType.CHAIN]: {
        name: 'Chain',
        abbreviation: 'ch',
        height: 0.5,
        width: 0.6,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Basic foundation stitch - a simple loop',
        color: 0x8B4513,
        geometry: {
            type: 'torus',
            radius: 0.25,
            tube: 0.08,
            radialSegments: 12,
            tubularSegments: 24,
            rotationX: Math.PI / 2
        },
        keyboard: 'c'
    },

    [StitchType.SLIP_STITCH]: {
        name: 'Slip Stitch',
        abbreviation: 'sl st',
        height: 0.3,
        width: 0.5,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Very short stitch, used for joining or moving yarn',
        color: 0x8B4513,
        geometry: {
            type: 'torus',
            radius: 0.15,
            tube: 0.06,
            radialSegments: 10,
            tubularSegments: 20,
            rotationX: Math.PI / 2
        },
        keyboard: 'l'
    },

    [StitchType.SINGLE_CROCHET]: {
        name: 'Single Crochet',
        abbreviation: 'sc',
        height: 1.0,
        width: 0.7,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Basic working stitch - short and tight',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'single_crochet',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        keyboard: 's'
    },

    [StitchType.HALF_DOUBLE_CROCHET]: {
        name: 'Half Double Crochet',
        abbreviation: 'hdc',
        height: 1.5,
        width: 0.75,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Medium height stitch with yarn over',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'half_double',
            baseRadius: 0.22,
            height: 0.75,
            segments: 16
        },
        keyboard: 'h'
    },

    [StitchType.DOUBLE_CROCHET]: {
        name: 'Double Crochet',
        abbreviation: 'dc',
        height: 2.0,
        width: 0.8,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Tall stitch with one yarn over - very common',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'double_crochet',
            baseRadius: 0.25,
            height: 1.0,
            segments: 16
        },
        keyboard: 'd'
    },

    [StitchType.TRIPLE_CROCHET]: {
        name: 'Triple Crochet',
        abbreviation: 'tr',
        height: 3.0,
        width: 0.85,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Very tall stitch with two yarn overs',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'triple_crochet',
            baseRadius: 0.25,
            height: 1.5,
            segments: 16
        },
        keyboard: 't'
    },

    [StitchType.INCREASE]: {
        name: 'Increase',
        abbreviation: 'inc',
        height: 1.0,
        width: 1.4,
        connectionsIn: 1,
        connectionsOut: 2,
        description: 'Two stitches worked into one - makes fabric wider',
        color: 0x228B22,
        geometry: {
            type: 'custom',
            shape: 'increase',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        keyboard: 'i'
    },

    [StitchType.DECREASE]: {
        name: 'Decrease',
        abbreviation: 'dec',
        height: 1.0,
        width: 0.5,
        connectionsIn: 2,
        connectionsOut: 1,
        description: 'Two stitches joined into one - makes fabric narrower',
        color: 0xDC143C,
        geometry: {
            type: 'custom',
            shape: 'decrease',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        keyboard: 'x'
    },

    [StitchType.MAGIC_RING]: {
        name: 'Magic Ring',
        abbreviation: 'mr',
        height: 0.5,
        width: 1.5,
        connectionsIn: 0,
        connectionsOut: 6,
        description: 'Adjustable starting ring for working in the round',
        color: 0x4169E1,
        geometry: {
            type: 'torus',
            radius: 0.5,
            tube: 0.1,
            radialSegments: 16,
            tubularSegments: 32,
            rotationX: 0
        },
        keyboard: 'm'
    }
};

/**
 * Get stitch definition by type
 */
export function getStitchDefinition(type) {
    return StitchDefinitions[type] || null;
}

/**
 * Get all stitch types as array
 */
export function getAllStitchTypes() {
    return Object.values(StitchType);
}

/**
 * Get stitch type by keyboard shortcut
 */
export function getStitchByKeyboard(key) {
    for (const [type, def] of Object.entries(StitchDefinitions)) {
        if (def.keyboard === key.toLowerCase()) {
            return type;
        }
    }
    return null;
}

/**
 * Check if a stitch type can connect to another
 */
export function canConnect(fromType, toType) {
    const fromDef = getStitchDefinition(fromType);
    const toDef = getStitchDefinition(toType);

    if (!fromDef || !toDef) return false;

    return fromDef.connectionsOut > 0 && toDef.connectionsIn > 0;
}

/**
 * Get the effective height for positioning
 */
export function getStitchHeight(type) {
    const def = getStitchDefinition(type);
    return def ? def.height : 1.0;
}

/**
 * Get the effective width for positioning
 */
export function getStitchWidth(type) {
    const def = getStitchDefinition(type);
    return def ? def.width : 0.7;
}
