/**
 * StitchTypes.js - Comprehensive crochet stitch type definitions
 *
 * Each stitch type includes:
 * - Abbreviation used in patterns
 * - Relative height (in stitch units)
 * - Relative width (in stitch units)
 * - Connection info (how many stitches it connects to below/creates above)
 * - Geometry parameters for 3D rendering
 * - Physics properties for realistic fabric simulation
 * - Description for UI
 */

// =============================================================================
// STITCH TYPES - Base stitch identifiers
// =============================================================================

export const StitchType = {
    // Foundation stitches
    CHAIN: 'chain',
    SLIP_STITCH: 'slip_stitch',

    // Basic stitches
    SINGLE_CROCHET: 'single_crochet',
    HALF_DOUBLE_CROCHET: 'half_double_crochet',
    DOUBLE_CROCHET: 'double_crochet',
    TRIPLE_CROCHET: 'triple_crochet',

    // Post stitches
    FRONT_POST_DOUBLE_CROCHET: 'front_post_double_crochet',
    BACK_POST_DOUBLE_CROCHET: 'back_post_double_crochet',
    FRONT_POST_TRIPLE_CROCHET: 'front_post_triple_crochet',
    BACK_POST_TRIPLE_CROCHET: 'back_post_triple_crochet',

    // Texture stitches
    BOBBLE: 'bobble',
    POPCORN: 'popcorn',
    PUFF: 'puff',
    CLUSTER: 'cluster',

    // Decorative stitches
    PICOT: 'picot',
    SHELL: 'shell',
    V_STITCH: 'v_stitch',
    SPIKE: 'spike',

    // Foundation stitches (chain + stitch in one)
    FOUNDATION_SINGLE_CROCHET: 'foundation_single_crochet',
    FOUNDATION_DOUBLE_CROCHET: 'foundation_double_crochet',

    // Starting stitches
    MAGIC_RING: 'magic_ring',

    // Legacy types - kept for backwards compatibility but deprecated
    // Use stitch modifiers instead (see StitchModifiers below)
    INCREASE: 'increase',
    DECREASE: 'decrease'
};

// =============================================================================
// STITCH MODIFIERS - Applied to base stitches
// =============================================================================

export const StitchModifier = {
    // Loop selection
    FRONT_LOOP_ONLY: 'flo',
    BACK_LOOP_ONLY: 'blo',
    BOTH_LOOPS: 'bl',  // default

    // Working into spaces
    CHAIN_SPACE: 'ch_sp',
    STITCH_SPACE: 'st_sp',

    // Multiple stitches
    INCREASE: 'inc',      // 2 stitches in 1
    INCREASE_3: 'inc3',   // 3 stitches in 1 (for shells)
    DECREASE: 'dec',      // 2 stitches together
    DECREASE_3: 'dec3',   // 3 stitches together

    // Turning chains
    TURNING_CHAIN: 'tch',
    COUNTS_AS_STITCH: 'cas'  // Turning chain counts as first stitch
};

// =============================================================================
// TURNING CHAIN REQUIREMENTS
// =============================================================================

export const TurningChainHeight = {
    [StitchType.SLIP_STITCH]: 0,
    [StitchType.SINGLE_CROCHET]: 1,
    [StitchType.HALF_DOUBLE_CROCHET]: 2,
    [StitchType.DOUBLE_CROCHET]: 3,
    [StitchType.TRIPLE_CROCHET]: 4,
    [StitchType.FRONT_POST_DOUBLE_CROCHET]: 3,
    [StitchType.BACK_POST_DOUBLE_CROCHET]: 3,
    [StitchType.FRONT_POST_TRIPLE_CROCHET]: 4,
    [StitchType.BACK_POST_TRIPLE_CROCHET]: 4
};

// Whether the turning chain typically counts as the first stitch
// Note: HDC is debatable - many modern patterns treat ch-2 as NOT counting
// This can be overridden per-pattern via Pattern.turningChainCountsAsStitch
export const TurningChainCountsAsStitch = {
    [StitchType.SLIP_STITCH]: false,
    [StitchType.SINGLE_CROCHET]: false,  // Usually doesn't count
    [StitchType.HALF_DOUBLE_CROCHET]: false,  // Modern convention: ch-2 often doesn't count
    [StitchType.DOUBLE_CROCHET]: true,   // ch-3 usually counts as first dc
    [StitchType.TRIPLE_CROCHET]: true    // ch-4 usually counts as first tr
};

// =============================================================================
// STITCH DEFINITIONS
// =============================================================================

export const StitchDefinitions = {
    // -------------------------------------------------------------------------
    // Foundation Stitches
    // -------------------------------------------------------------------------
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
        physics: {
            stiffness: 0.9,
            density: 0.8,
            bendResistance: 0.3
        },
        keyboard: 'c',
        canBeWorkedInto: true,
        createsSpace: true  // Chain spaces can be worked into
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
        physics: {
            stiffness: 0.95,
            density: 0.9,
            bendResistance: 0.4
        },
        keyboard: 'l',
        canBeWorkedInto: true,
        isJoiningStitch: true
    },

    // -------------------------------------------------------------------------
    // Basic Working Stitches
    // -------------------------------------------------------------------------
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
        physics: {
            stiffness: 0.85,
            density: 1.0,
            bendResistance: 0.5
        },
        keyboard: 's',
        canBeWorkedInto: true,
        turningChain: 1,
        turningChainCounts: false
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
        physics: {
            stiffness: 0.75,
            density: 0.85,
            bendResistance: 0.4
        },
        keyboard: 'h',
        canBeWorkedInto: true,
        turningChain: 2,
        turningChainCounts: false  // Modern convention: ch-2 often doesn't count
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
        physics: {
            stiffness: 0.65,
            density: 0.7,
            bendResistance: 0.3
        },
        keyboard: 'd',
        canBeWorkedInto: true,
        turningChain: 3,
        turningChainCounts: true
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
        physics: {
            stiffness: 0.55,
            density: 0.6,
            bendResistance: 0.25
        },
        keyboard: 't',
        canBeWorkedInto: true,
        turningChain: 4,
        turningChainCounts: true
    },

    // -------------------------------------------------------------------------
    // Post Stitches
    // -------------------------------------------------------------------------
    [StitchType.FRONT_POST_DOUBLE_CROCHET]: {
        name: 'Front Post Double Crochet',
        abbreviation: 'FPdc',
        height: 2.0,
        width: 0.8,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Double crochet worked around the front of the post below',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'front_post_dc',
            baseRadius: 0.25,
            height: 1.0,
            segments: 16,
            postOffset: 0.15  // Pushed forward
        },
        physics: {
            stiffness: 0.7,
            density: 0.75,
            bendResistance: 0.35
        },
        keyboard: 'f',
        canBeWorkedInto: true,
        isPostStitch: true,
        postDirection: 'front',
        turningChain: 3,
        turningChainCounts: true
    },

    [StitchType.BACK_POST_DOUBLE_CROCHET]: {
        name: 'Back Post Double Crochet',
        abbreviation: 'BPdc',
        height: 2.0,
        width: 0.8,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Double crochet worked around the back of the post below',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'back_post_dc',
            baseRadius: 0.25,
            height: 1.0,
            segments: 16,
            postOffset: -0.15  // Pushed backward
        },
        physics: {
            stiffness: 0.7,
            density: 0.75,
            bendResistance: 0.35
        },
        keyboard: 'b',
        canBeWorkedInto: true,
        isPostStitch: true,
        postDirection: 'back',
        turningChain: 3,
        turningChainCounts: true
    },

    [StitchType.FRONT_POST_TRIPLE_CROCHET]: {
        name: 'Front Post Triple Crochet',
        abbreviation: 'FPtr',
        height: 3.0,
        width: 0.85,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Triple crochet worked around the front of the post below',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'front_post_tr',
            baseRadius: 0.25,
            height: 1.5,
            segments: 16,
            postOffset: 0.15
        },
        physics: {
            stiffness: 0.6,
            density: 0.65,
            bendResistance: 0.3
        },
        keyboard: 'r',
        canBeWorkedInto: true,
        isPostStitch: true,
        postDirection: 'front',
        turningChain: 4,
        turningChainCounts: true
    },

    [StitchType.BACK_POST_TRIPLE_CROCHET]: {
        name: 'Back Post Triple Crochet',
        abbreviation: 'BPtr',
        height: 3.0,
        width: 0.85,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Triple crochet worked around the back of the post below',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'back_post_tr',
            baseRadius: 0.25,
            height: 1.5,
            segments: 16,
            postOffset: -0.15
        },
        physics: {
            stiffness: 0.6,
            density: 0.65,
            bendResistance: 0.3
        },
        keyboard: 'a',
        canBeWorkedInto: true,
        isPostStitch: true,
        postDirection: 'back',
        turningChain: 4,
        turningChainCounts: true
    },

    // -------------------------------------------------------------------------
    // Texture Stitches
    // -------------------------------------------------------------------------
    [StitchType.BOBBLE]: {
        name: 'Bobble',
        abbreviation: 'bob',
        height: 1.2,
        width: 1.0,
        connectionsIn: 1,
        connectionsOut: 1,
        description: '3-5 dc worked in same stitch, joined at top - creates 3D bump',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'bobble',
            baseRadius: 0.4,
            height: 0.6,
            segments: 16,
            bulge: 0.3  // How much it pops out
        },
        physics: {
            stiffness: 0.8,
            density: 1.2,
            bendResistance: 0.6
        },
        keyboard: 'o',
        canBeWorkedInto: true,
        isTextureStitch: true,
        componentStitches: 5,  // Default, can be overridden per-stitch
        componentType: StitchType.DOUBLE_CROCHET,
        // Configurable: common bobble sizes are 3, 4, or 5 DCs
        minComponentStitches: 3,
        maxComponentStitches: 7,
        configurableComponents: true
    },

    [StitchType.POPCORN]: {
        name: 'Popcorn',
        abbreviation: 'pc',
        height: 1.3,
        width: 1.1,
        connectionsIn: 1,
        connectionsOut: 1,
        description: '4-5 dc in same stitch, remove hook, insert in first dc, pull through - very prominent bump',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'popcorn',
            baseRadius: 0.45,
            height: 0.65,
            segments: 16,
            bulge: 0.4
        },
        physics: {
            stiffness: 0.75,
            density: 1.3,
            bendResistance: 0.65
        },
        keyboard: 'q',
        canBeWorkedInto: true,
        isTextureStitch: true,
        componentStitches: 5,  // Default, can be overridden per-stitch
        componentType: StitchType.DOUBLE_CROCHET,
        // Configurable: common popcorn sizes are 4 or 5 DCs
        minComponentStitches: 3,
        maxComponentStitches: 7,
        configurableComponents: true
    },

    [StitchType.PUFF]: {
        name: 'Puff Stitch',
        abbreviation: 'puff',
        height: 1.0,
        width: 0.9,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Multiple yarn overs and pulls through same stitch, joined at top - soft, rounded bump',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'puff',
            baseRadius: 0.35,
            height: 0.5,
            segments: 16,
            bulge: 0.25
        },
        physics: {
            stiffness: 0.7,
            density: 1.1,
            bendResistance: 0.5
        },
        keyboard: 'p',
        canBeWorkedInto: true,
        isTextureStitch: true
    },

    [StitchType.CLUSTER]: {
        name: 'DC3tog',
        abbreviation: 'dc3tog',
        height: 1.8,
        width: 0.6,
        connectionsIn: 3,  // Works into 3 consecutive stitches
        connectionsOut: 1,
        description: '3 double crochets worked across consecutive stitches, joined at top - a decrease stitch',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'cluster',
            baseRadius: 0.3,
            height: 0.9,
            segments: 16
        },
        physics: {
            stiffness: 0.75,
            density: 0.9,
            bendResistance: 0.45
        },
        keyboard: 'j',
        canBeWorkedInto: true,
        isTextureStitch: false,  // This is a decrease, not a texture stitch
        isDecreaseType: true,
        componentStitches: 3,
        componentType: StitchType.DOUBLE_CROCHET,
        // Note: This is dc3tog (decrease across 3 stitches), not a traditional "cluster"
        // which would be multiple dc into the SAME stitch (similar to a bobble).
        alternateNames: ['dc3tog', '3-dc decrease']
    },

    // -------------------------------------------------------------------------
    // Decorative Stitches
    // -------------------------------------------------------------------------
    [StitchType.PICOT]: {
        name: 'Picot',
        abbreviation: 'picot',
        height: 0.8,
        width: 0.5,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Chain 2-5, slip stitch in first chain - creates decorative loop',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'picot',
            baseRadius: 0.2,
            loopHeight: 0.4,
            segments: 12
        },
        physics: {
            stiffness: 0.85,
            density: 0.7,
            bendResistance: 0.3
        },
        keyboard: 'g',
        canBeWorkedInto: false,  // Typically decorative, not worked into
        isDecorativeStitch: true,
        chainCount: 3,  // Default chain count, can be overridden per-stitch
        minChainCount: 2,
        maxChainCount: 5,
        configurableChainCount: true
    },

    [StitchType.SHELL]: {
        name: 'Shell',
        abbreviation: 'shell',
        height: 2.0,
        width: 2.0,
        connectionsIn: 1,
        connectionsOut: 5,  // Creates 5 connection points (one per DC in shell)
        description: '5 dc in same stitch - fan-shaped decorative stitch',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'shell',
            baseRadius: 0.25,
            height: 1.0,
            fanAngle: Math.PI / 3,  // How wide the fan spreads
            segments: 16
        },
        physics: {
            stiffness: 0.6,
            density: 0.65,
            bendResistance: 0.3
        },
        keyboard: 'e',
        canBeWorkedInto: true,
        isShellStitch: true,
        isCompoundStitch: true,  // This stitch represents multiple components
        componentStitches: 5,
        componentType: StitchType.DOUBLE_CROCHET,
        // When working into a shell, you can work into:
        // - The center DC (most common)
        // - Any of the 5 individual DCs
        // - The entire shell as one (working between shells)
        componentPositions: ['first', 'second', 'center', 'fourth', 'fifth'],
        defaultWorkIntoPosition: 'center'
    },

    [StitchType.V_STITCH]: {
        name: 'V-Stitch',
        abbreviation: 'v-st',
        height: 2.0,
        width: 1.5,
        connectionsIn: 1,
        connectionsOut: 3,  // Left DC, chain space, right DC
        description: '(dc, ch 1, dc) in same stitch - creates V shape with chain space',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'v_stitch',
            baseRadius: 0.25,
            height: 1.0,
            vAngle: Math.PI / 6,
            segments: 16
        },
        physics: {
            stiffness: 0.6,
            density: 0.6,
            bendResistance: 0.25
        },
        keyboard: 'v',
        canBeWorkedInto: true,
        createsSpace: true,
        isCompoundStitch: true,  // This stitch represents multiple components
        componentStitches: 2,
        componentType: StitchType.DOUBLE_CROCHET,
        chainsBetween: 1,
        // V-stitch components: left DC, center chain space, right DC
        componentPositions: ['left', 'space', 'right'],
        defaultWorkIntoPosition: 'space'  // Most patterns work into the ch-1 space
    },

    [StitchType.SPIKE]: {
        name: 'Spike Stitch',
        abbreviation: 'spike',
        // Base height - actual height varies by rowsBelow
        // Height formula: 1.0 (sc height) + rowsBelow * 0.8 (additional reach)
        height: 1.0,
        baseHeight: 1.0,  // SC height at top
        heightPerRow: 0.8,  // Additional height per row reached below
        width: 0.7,
        connectionsIn: 1,
        connectionsOut: 1,
        description: 'Single crochet worked into row(s) below - creates long vertical stitch',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'spike',
            baseRadius: 0.2,
            height: 1.0,  // Adjusted dynamically based on rowsBelow
            segments: 16
        },
        physics: {
            stiffness: 0.8,
            density: 0.9,
            bendResistance: 0.5
        },
        keyboard: 'k',
        canBeWorkedInto: true,
        isSpikeStitch: true,
        rowsBelow: 1  // Default: 1 row below. Can be modified per-stitch
    },

    // -------------------------------------------------------------------------
    // Foundation Stitches (Chainless)
    // -------------------------------------------------------------------------
    [StitchType.FOUNDATION_SINGLE_CROCHET]: {
        name: 'Foundation Single Crochet',
        abbreviation: 'fsc',
        height: 1.0,
        width: 0.7,
        connectionsIn: 0,  // Self-supporting
        connectionsOut: 1,
        description: 'Creates chain and single crochet in one motion - stretchy foundation',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'foundation_sc',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        physics: {
            stiffness: 0.8,
            density: 0.95,
            bendResistance: 0.45
        },
        keyboard: 'w',
        canBeWorkedInto: true,
        isFoundationStitch: true,
        baseStitchType: StitchType.SINGLE_CROCHET
    },

    [StitchType.FOUNDATION_DOUBLE_CROCHET]: {
        name: 'Foundation Double Crochet',
        abbreviation: 'fdc',
        height: 2.0,
        width: 0.8,
        connectionsIn: 0,  // Self-supporting
        connectionsOut: 1,
        description: 'Creates chain and double crochet in one motion - stretchy foundation',
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'foundation_dc',
            baseRadius: 0.25,
            height: 1.0,
            segments: 16
        },
        physics: {
            stiffness: 0.6,
            density: 0.65,
            bendResistance: 0.3
        },
        keyboard: 'y',
        canBeWorkedInto: true,
        isFoundationStitch: true,
        baseStitchType: StitchType.DOUBLE_CROCHET
    },

    // -------------------------------------------------------------------------
    // Starting Stitches
    // -------------------------------------------------------------------------
    [StitchType.MAGIC_RING]: {
        name: 'Magic Ring',
        abbreviation: 'mr',
        height: 0.5,
        width: 1.5,
        connectionsIn: 0,
        connectionsOut: 12,  // Can accommodate many stitches (increased from 6)
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
        physics: {
            stiffness: 0.9,
            density: 0.8,
            bendResistance: 0.4
        },
        keyboard: 'm',
        canBeWorkedInto: true,
        isStartingStitch: true,
        adjustable: true  // Ring can be pulled tight
    },

    // -------------------------------------------------------------------------
    // Legacy Types (Deprecated - use modifiers instead)
    // -------------------------------------------------------------------------
    [StitchType.INCREASE]: {
        name: 'Increase (Deprecated)',
        abbreviation: 'inc',
        height: 1.0,
        width: 1.4,
        connectionsIn: 1,
        connectionsOut: 2,
        description: 'DEPRECATED: Use any stitch with StitchModifier.INCREASE instead',
        color: 0x228B22,
        geometry: {
            type: 'custom',
            shape: 'increase',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        physics: {
            stiffness: 0.85,
            density: 1.0,
            bendResistance: 0.5
        },
        keyboard: 'i',
        deprecated: true,
        replacementHint: 'Use sc with StitchModifier.INCREASE'
    },

    [StitchType.DECREASE]: {
        name: 'Decrease (Deprecated)',
        abbreviation: 'dec',
        height: 1.0,
        width: 0.5,
        connectionsIn: 2,
        connectionsOut: 1,
        description: 'DEPRECATED: Use any stitch with StitchModifier.DECREASE instead',
        color: 0xDC143C,
        geometry: {
            type: 'custom',
            shape: 'decrease',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        },
        physics: {
            stiffness: 0.85,
            density: 1.0,
            bendResistance: 0.5
        },
        keyboard: 'x',
        deprecated: true,
        replacementHint: 'Use sc with StitchModifier.DECREASE (sc2tog)'
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
 * Get all non-deprecated stitch types
 */
export function getActiveStitchTypes() {
    return Object.values(StitchType).filter(type => {
        const def = StitchDefinitions[type];
        return def && !def.deprecated;
    });
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
 * For spike stitches, optionally provide rowsBelow to get accurate height
 */
export function getStitchHeight(type, options = {}) {
    const def = getStitchDefinition(type);
    if (!def) return 1.0;

    // For spike stitches, calculate height based on rowsBelow
    if (def.isSpikeStitch && options.rowsBelow !== undefined) {
        const baseHeight = def.baseHeight || 1.0;
        const heightPerRow = def.heightPerRow || 0.8;
        return baseHeight + options.rowsBelow * heightPerRow;
    }

    return def.height;
}

/**
 * Get the effective width for positioning
 */
export function getStitchWidth(type) {
    const def = getStitchDefinition(type);
    return def ? def.width : 0.7;
}

/**
 * Get required turning chain length for a stitch type
 */
export function getTurningChainLength(type) {
    const height = TurningChainHeight[type];
    return height !== undefined ? height : 1;
}

/**
 * Check if turning chain counts as first stitch for a type
 */
export function doesTurningChainCount(type) {
    return TurningChainCountsAsStitch[type] || false;
}

/**
 * Get the recommended skip count for working into a foundation chain
 * This tells you how many chains to skip before working the first stitch.
 * For example: SC skips 1 (work in 2nd chain from hook),
 *              DC skips 3 (work in 4th chain from hook)
 * @param {string} type - Stitch type that will be worked into the chain
 * @returns {number} Number of chains to skip
 */
export function getFoundationChainSkipCount(type) {
    const def = getStitchDefinition(type);
    if (!def) return 1;

    // For basic stitches, skip count equals turning chain height
    // SC: 1, HDC: 2, DC: 3, TR: 4
    const turningChain = def.turningChain;
    if (turningChain !== undefined) {
        return turningChain;
    }

    // Fallback based on TurningChainHeight lookup
    const height = TurningChainHeight[type];
    if (height !== undefined) {
        return height;
    }

    // Default to 1 for unknown types
    return 1;
}

/**
 * Get physics properties for a stitch type
 */
export function getStitchPhysics(type) {
    const def = getStitchDefinition(type);
    return def?.physics || {
        stiffness: 0.8,
        density: 1.0,
        bendResistance: 0.5
    };
}

/**
 * Apply modifier to get adjusted connections
 * @param {string} type - Base stitch type
 * @param {string} modifier - Modifier to apply
 * @returns {object} Adjusted connectionsIn and connectionsOut
 */
export function getModifiedConnections(type, modifier) {
    const def = getStitchDefinition(type);
    if (!def) return { connectionsIn: 1, connectionsOut: 1 };

    let { connectionsIn, connectionsOut } = def;

    switch (modifier) {
        case StitchModifier.INCREASE:
            connectionsOut = 2;
            break;
        case StitchModifier.INCREASE_3:
            connectionsOut = 3;
            break;
        case StitchModifier.DECREASE:
            connectionsIn = 2;
            break;
        case StitchModifier.DECREASE_3:
            connectionsIn = 3;
            break;
    }

    return { connectionsIn, connectionsOut };
}

/**
 * Get the display name for a stitch with modifiers
 * @param {string} type - Base stitch type
 * @param {string[]} modifiers - Array of modifiers
 * @returns {string} Display name (e.g., "2 sc in st" or "sc2tog")
 */
export function getStitchDisplayName(type, modifiers = []) {
    const def = getStitchDefinition(type);
    if (!def) return 'Unknown';

    let name = def.abbreviation;

    if (modifiers.includes(StitchModifier.FRONT_LOOP_ONLY)) {
        name += ' in FLO';
    } else if (modifiers.includes(StitchModifier.BACK_LOOP_ONLY)) {
        name += ' in BLO';
    }

    if (modifiers.includes(StitchModifier.INCREASE)) {
        name = `2 ${name} in st`;
    } else if (modifiers.includes(StitchModifier.INCREASE_3)) {
        name = `3 ${name} in st`;
    } else if (modifiers.includes(StitchModifier.DECREASE)) {
        name = `${def.abbreviation}2tog`;
    } else if (modifiers.includes(StitchModifier.DECREASE_3)) {
        name = `${def.abbreviation}3tog`;
    }

    if (modifiers.includes(StitchModifier.CHAIN_SPACE)) {
        name += ' in ch-sp';
    }

    return name;
}

/**
 * Check if a stitch type is a basic working stitch
 */
export function isBasicStitch(type) {
    return [
        StitchType.SINGLE_CROCHET,
        StitchType.HALF_DOUBLE_CROCHET,
        StitchType.DOUBLE_CROCHET,
        StitchType.TRIPLE_CROCHET
    ].includes(type);
}

/**
 * Check if a stitch type creates a space that can be worked into
 */
export function createsSpace(type) {
    const def = getStitchDefinition(type);
    return def?.createsSpace || false;
}

/**
 * Get all stitch types organized by category
 */
export function getStitchCategories() {
    return {
        foundation: [StitchType.CHAIN, StitchType.SLIP_STITCH],
        basic: [
            StitchType.SINGLE_CROCHET,
            StitchType.HALF_DOUBLE_CROCHET,
            StitchType.DOUBLE_CROCHET,
            StitchType.TRIPLE_CROCHET
        ],
        post: [
            StitchType.FRONT_POST_DOUBLE_CROCHET,
            StitchType.BACK_POST_DOUBLE_CROCHET,
            StitchType.FRONT_POST_TRIPLE_CROCHET,
            StitchType.BACK_POST_TRIPLE_CROCHET
        ],
        texture: [
            StitchType.BOBBLE,
            StitchType.POPCORN,
            StitchType.PUFF
        ],
        decreases: [
            StitchType.CLUSTER  // dc3tog - works across 3 consecutive stitches
        ],
        decorative: [
            StitchType.PICOT,
            StitchType.SHELL,
            StitchType.V_STITCH,
            StitchType.SPIKE
        ],
        chainless: [
            StitchType.FOUNDATION_SINGLE_CROCHET,
            StitchType.FOUNDATION_DOUBLE_CROCHET
        ],
        starting: [StitchType.MAGIC_RING]
    };
}
