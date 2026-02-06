/**
 * StitchTypes.js - Simplified crochet stitch type definitions
 *
 * Only chain and single crochet - the essentials.
 */

export const StitchType = {
    CHAIN: 'chain',
    SINGLE_CROCHET: 'single_crochet'
};

export const StitchDefinitions = {
    [StitchType.CHAIN]: {
        name: 'Chain',
        abbreviation: 'ch',
        height: 0.5,
        width: 0.6,
        connectionsIn: 1,
        connectionsOut: 1,
        color: 0x8B4513,
        geometry: {
            type: 'torus',
            radius: 0.25,
            tube: 0.08,
            radialSegments: 12,
            tubularSegments: 24,
            rotationX: Math.PI / 2
        }
    },

    [StitchType.SINGLE_CROCHET]: {
        name: 'Single Crochet',
        abbreviation: 'sc',
        height: 1.0,
        width: 0.7,
        connectionsIn: 1,
        connectionsOut: 1,
        color: 0x8B4513,
        geometry: {
            type: 'custom',
            shape: 'single_crochet',
            baseRadius: 0.2,
            height: 0.5,
            segments: 16
        }
    }
};

export function getStitchDefinition(type) {
    return StitchDefinitions[type] || null;
}
