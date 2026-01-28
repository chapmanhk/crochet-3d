/**
 * Tests for StitchTypes module
 *
 * Verifies:
 * - All stitch types are properly defined
 * - Stitch definitions have required properties
 * - Utility functions work correctly
 * - New modifiers and physics properties work
 */

import { describe, it, expect } from 'vitest';
import {
    StitchType,
    StitchModifier,
    StitchDefinitions,
    getStitchDefinition,
    getAllStitchTypes,
    getActiveStitchTypes,
    getStitchByKeyboard,
    canConnect,
    getStitchHeight,
    getStitchWidth,
    getTurningChainLength,
    doesTurningChainCount,
    getStitchPhysics,
    getModifiedConnections,
    getStitchDisplayName,
    isBasicStitch,
    createsSpace,
    getStitchCategories
} from '../src/core/StitchTypes.js';

describe('StitchType', () => {
    it('should define all expected stitch types', () => {
        // Basic stitches
        expect(StitchType.CHAIN).toBe('chain');
        expect(StitchType.SLIP_STITCH).toBe('slip_stitch');
        expect(StitchType.SINGLE_CROCHET).toBe('single_crochet');
        expect(StitchType.HALF_DOUBLE_CROCHET).toBe('half_double_crochet');
        expect(StitchType.DOUBLE_CROCHET).toBe('double_crochet');
        expect(StitchType.TRIPLE_CROCHET).toBe('triple_crochet');

        // Legacy types (deprecated but still present)
        expect(StitchType.INCREASE).toBe('increase');
        expect(StitchType.DECREASE).toBe('decrease');

        // Starting stitches
        expect(StitchType.MAGIC_RING).toBe('magic_ring');

        // Post stitches
        expect(StitchType.FRONT_POST_DOUBLE_CROCHET).toBe('front_post_double_crochet');
        expect(StitchType.BACK_POST_DOUBLE_CROCHET).toBe('back_post_double_crochet');

        // Texture stitches
        expect(StitchType.BOBBLE).toBe('bobble');
        expect(StitchType.POPCORN).toBe('popcorn');
        expect(StitchType.PUFF).toBe('puff');

        // Decorative stitches
        expect(StitchType.SHELL).toBe('shell');
        expect(StitchType.V_STITCH).toBe('v_stitch');
        expect(StitchType.SPIKE).toBe('spike');
        expect(StitchType.PICOT).toBe('picot');
    });

    it('should have 23 stitch types defined', () => {
        const types = Object.keys(StitchType);
        expect(types).toHaveLength(23);
    });
});

describe('StitchModifier', () => {
    it('should define loop selection modifiers', () => {
        expect(StitchModifier.FRONT_LOOP_ONLY).toBe('flo');
        expect(StitchModifier.BACK_LOOP_ONLY).toBe('blo');
        expect(StitchModifier.BOTH_LOOPS).toBe('bl');
    });

    it('should define increase/decrease modifiers', () => {
        expect(StitchModifier.INCREASE).toBe('inc');
        expect(StitchModifier.INCREASE_3).toBe('inc3');
        expect(StitchModifier.DECREASE).toBe('dec');
        expect(StitchModifier.DECREASE_3).toBe('dec3');
    });

    it('should define chain space modifiers', () => {
        expect(StitchModifier.CHAIN_SPACE).toBe('ch_sp');
    });
});

describe('StitchDefinitions', () => {
    it('should have a definition for each stitch type', () => {
        Object.values(StitchType).forEach(type => {
            expect(StitchDefinitions[type]).toBeDefined();
        });
    });

    it('should have required properties for each definition', () => {
        const requiredProps = [
            'name',
            'abbreviation',
            'height',
            'width',
            'connectionsIn',
            'connectionsOut',
            'description',
            'color',
            'geometry'
        ];

        Object.values(StitchDefinitions).forEach(def => {
            requiredProps.forEach(prop => {
                expect(def).toHaveProperty(prop);
            });
        });
    });

    it('should have physics properties for each definition', () => {
        Object.values(StitchDefinitions).forEach(def => {
            expect(def).toHaveProperty('physics');
            expect(def.physics).toHaveProperty('stiffness');
            expect(def.physics).toHaveProperty('density');
            expect(def.physics).toHaveProperty('bendResistance');
        });
    });

    it('should have valid height values (positive numbers)', () => {
        Object.values(StitchDefinitions).forEach(def => {
            expect(def.height).toBeGreaterThan(0);
            expect(typeof def.height).toBe('number');
        });
    });

    it('should have valid width values (positive numbers)', () => {
        Object.values(StitchDefinitions).forEach(def => {
            expect(def.width).toBeGreaterThan(0);
            expect(typeof def.width).toBe('number');
        });
    });

    it('should have valid connection counts (non-negative integers)', () => {
        Object.values(StitchDefinitions).forEach(def => {
            expect(def.connectionsIn).toBeGreaterThanOrEqual(0);
            expect(def.connectionsOut).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(def.connectionsIn)).toBe(true);
            expect(Number.isInteger(def.connectionsOut)).toBe(true);
        });
    });

    it('should have unique keyboard shortcuts (for stitches that have them)', () => {
        const shortcuts = Object.values(StitchDefinitions)
            .filter(def => def.keyboard)
            .map(def => def.keyboard);
        const uniqueShortcuts = new Set(shortcuts);
        expect(uniqueShortcuts.size).toBe(shortcuts.length);
    });

    it('should have unique abbreviations', () => {
        const abbreviations = Object.values(StitchDefinitions).map(def => def.abbreviation);
        const uniqueAbbreviations = new Set(abbreviations);
        expect(uniqueAbbreviations.size).toBe(abbreviations.length);
    });

    describe('specific stitch properties', () => {
        it('should have increase output 2 connections', () => {
            const increase = StitchDefinitions[StitchType.INCREASE];
            expect(increase.connectionsOut).toBe(2);
        });

        it('should have decrease input 2 connections', () => {
            const decrease = StitchDefinitions[StitchType.DECREASE];
            expect(decrease.connectionsIn).toBe(2);
        });

        it('should have magic ring output 12 connections (flexible ring)', () => {
            const magicRing = StitchDefinitions[StitchType.MAGIC_RING];
            expect(magicRing.connectionsOut).toBe(12);
            expect(magicRing.connectionsIn).toBe(0);
        });

        it('should have shell stitch output 5 connections', () => {
            const shell = StitchDefinitions[StitchType.SHELL];
            expect(shell.connectionsOut).toBe(5);
        });

        it('should have increasing heights for taller stitches', () => {
            const chain = StitchDefinitions[StitchType.CHAIN];
            const sc = StitchDefinitions[StitchType.SINGLE_CROCHET];
            const hdc = StitchDefinitions[StitchType.HALF_DOUBLE_CROCHET];
            const dc = StitchDefinitions[StitchType.DOUBLE_CROCHET];
            const tr = StitchDefinitions[StitchType.TRIPLE_CROCHET];

            expect(chain.height).toBeLessThan(sc.height);
            expect(sc.height).toBeLessThan(hdc.height);
            expect(hdc.height).toBeLessThan(dc.height);
            expect(dc.height).toBeLessThan(tr.height);
        });

        it('should mark deprecated types correctly', () => {
            const increase = StitchDefinitions[StitchType.INCREASE];
            const decrease = StitchDefinitions[StitchType.DECREASE];

            expect(increase.deprecated).toBe(true);
            expect(decrease.deprecated).toBe(true);
            expect(increase.replacementHint).toBeDefined();
        });
    });
});

describe('getStitchDefinition', () => {
    it('should return definition for valid stitch type', () => {
        const def = getStitchDefinition(StitchType.SINGLE_CROCHET);
        expect(def).toBeDefined();
        expect(def.name).toBe('Single Crochet');
        expect(def.abbreviation).toBe('sc');
    });

    it('should return null for invalid stitch type', () => {
        const def = getStitchDefinition('invalid_type');
        expect(def).toBeNull();
    });

    it('should return null for undefined', () => {
        const def = getStitchDefinition(undefined);
        expect(def).toBeNull();
    });
});

describe('getAllStitchTypes', () => {
    it('should return array of all stitch types', () => {
        const types = getAllStitchTypes();
        expect(Array.isArray(types)).toBe(true);
        expect(types).toHaveLength(23);
    });

    it('should include all defined stitch types', () => {
        const types = getAllStitchTypes();
        Object.values(StitchType).forEach(type => {
            expect(types).toContain(type);
        });
    });
});

describe('getActiveStitchTypes', () => {
    it('should return non-deprecated stitch types', () => {
        const types = getActiveStitchTypes();
        expect(Array.isArray(types)).toBe(true);

        // Should not include deprecated types
        expect(types).not.toContain(StitchType.INCREASE);
        expect(types).not.toContain(StitchType.DECREASE);

        // Should include basic types
        expect(types).toContain(StitchType.SINGLE_CROCHET);
        expect(types).toContain(StitchType.DOUBLE_CROCHET);
    });
});

describe('getStitchByKeyboard', () => {
    it('should return stitch type for valid keyboard shortcut', () => {
        expect(getStitchByKeyboard('c')).toBe(StitchType.CHAIN);
        expect(getStitchByKeyboard('s')).toBe(StitchType.SINGLE_CROCHET);
        expect(getStitchByKeyboard('d')).toBe(StitchType.DOUBLE_CROCHET);
        expect(getStitchByKeyboard('h')).toBe(StitchType.HALF_DOUBLE_CROCHET);
        expect(getStitchByKeyboard('t')).toBe(StitchType.TRIPLE_CROCHET);
        expect(getStitchByKeyboard('i')).toBe(StitchType.INCREASE);
        expect(getStitchByKeyboard('x')).toBe(StitchType.DECREASE);
        expect(getStitchByKeyboard('m')).toBe(StitchType.MAGIC_RING);
        expect(getStitchByKeyboard('l')).toBe(StitchType.SLIP_STITCH);
    });

    it('should return new stitch types for their shortcuts', () => {
        expect(getStitchByKeyboard('f')).toBe(StitchType.FRONT_POST_DOUBLE_CROCHET);
        expect(getStitchByKeyboard('b')).toBe(StitchType.BACK_POST_DOUBLE_CROCHET);
        expect(getStitchByKeyboard('o')).toBe(StitchType.BOBBLE);
        expect(getStitchByKeyboard('p')).toBe(StitchType.PUFF);
        expect(getStitchByKeyboard('e')).toBe(StitchType.SHELL);
        expect(getStitchByKeyboard('v')).toBe(StitchType.V_STITCH);
        expect(getStitchByKeyboard('k')).toBe(StitchType.SPIKE);
    });

    it('should be case-insensitive', () => {
        expect(getStitchByKeyboard('C')).toBe(StitchType.CHAIN);
        expect(getStitchByKeyboard('S')).toBe(StitchType.SINGLE_CROCHET);
        expect(getStitchByKeyboard('D')).toBe(StitchType.DOUBLE_CROCHET);
    });

    it('should return null for invalid keyboard shortcut', () => {
        expect(getStitchByKeyboard('z')).toBeNull();
        expect(getStitchByKeyboard('1')).toBeNull();
        expect(getStitchByKeyboard('')).toBeNull();
    });
});

describe('canConnect', () => {
    it('should return true for valid connections', () => {
        expect(canConnect(StitchType.CHAIN, StitchType.SINGLE_CROCHET)).toBe(true);
        expect(canConnect(StitchType.SINGLE_CROCHET, StitchType.DOUBLE_CROCHET)).toBe(true);
        expect(canConnect(StitchType.MAGIC_RING, StitchType.SINGLE_CROCHET)).toBe(true);
    });

    it('should return false for invalid stitch types', () => {
        expect(canConnect('invalid', StitchType.CHAIN)).toBe(false);
        expect(canConnect(StitchType.CHAIN, 'invalid')).toBe(false);
    });

    it('should handle special cases', () => {
        // Magic ring has 0 connections in - can't connect from something to it
        expect(canConnect(StitchType.CHAIN, StitchType.MAGIC_RING)).toBe(false);
    });
});

describe('getStitchHeight', () => {
    it('should return correct height for valid stitch type', () => {
        expect(getStitchHeight(StitchType.CHAIN)).toBe(0.5);
        expect(getStitchHeight(StitchType.SINGLE_CROCHET)).toBe(1.0);
        expect(getStitchHeight(StitchType.DOUBLE_CROCHET)).toBe(2.0);
        expect(getStitchHeight(StitchType.TRIPLE_CROCHET)).toBe(3.0);
    });

    it('should return default height for invalid stitch type', () => {
        expect(getStitchHeight('invalid')).toBe(1.0);
    });
});

describe('getStitchWidth', () => {
    it('should return correct width for valid stitch type', () => {
        expect(getStitchWidth(StitchType.CHAIN)).toBe(0.6);
        expect(getStitchWidth(StitchType.SINGLE_CROCHET)).toBe(0.7);
    });

    it('should return default width for invalid stitch type', () => {
        expect(getStitchWidth('invalid')).toBe(0.7);
    });
});

describe('getTurningChainLength', () => {
    it('should return correct turning chain length for each stitch type', () => {
        // getTurningChainLength returns default of 1 for types not in the map
        expect(getTurningChainLength(StitchType.SINGLE_CROCHET)).toBe(1);
        expect(getTurningChainLength(StitchType.HALF_DOUBLE_CROCHET)).toBe(2);
        expect(getTurningChainLength(StitchType.DOUBLE_CROCHET)).toBe(3);
        expect(getTurningChainLength(StitchType.TRIPLE_CROCHET)).toBe(4);
    });

    it('should return 0 for slip stitch', () => {
        expect(getTurningChainLength(StitchType.SLIP_STITCH)).toBe(0);
    });
});

describe('doesTurningChainCount', () => {
    it('should return correct value for each stitch type', () => {
        expect(doesTurningChainCount(StitchType.SINGLE_CROCHET)).toBe(false);
        expect(doesTurningChainCount(StitchType.HALF_DOUBLE_CROCHET)).toBe(true);
        expect(doesTurningChainCount(StitchType.DOUBLE_CROCHET)).toBe(true);
        expect(doesTurningChainCount(StitchType.TRIPLE_CROCHET)).toBe(true);
    });
});

describe('getStitchPhysics', () => {
    it('should return physics properties for valid stitch type', () => {
        const physics = getStitchPhysics(StitchType.SINGLE_CROCHET);
        expect(physics.stiffness).toBeDefined();
        expect(physics.density).toBeDefined();
        expect(physics.bendResistance).toBeDefined();
    });

    it('should return default physics for invalid stitch type', () => {
        const physics = getStitchPhysics('invalid');
        expect(physics.stiffness).toBe(0.8);
        expect(physics.density).toBe(1.0);
        expect(physics.bendResistance).toBe(0.5);
    });

    it('should have different physics for different stitch types', () => {
        const scPhysics = getStitchPhysics(StitchType.SINGLE_CROCHET);
        const dcPhysics = getStitchPhysics(StitchType.DOUBLE_CROCHET);

        // SC is denser and stiffer than DC
        expect(scPhysics.density).toBeGreaterThan(dcPhysics.density);
        expect(scPhysics.stiffness).toBeGreaterThan(dcPhysics.stiffness);
    });
});

describe('getModifiedConnections', () => {
    it('should return unmodified connections for no modifier', () => {
        const result = getModifiedConnections(StitchType.SINGLE_CROCHET, null);
        expect(result.connectionsIn).toBe(1);
        expect(result.connectionsOut).toBe(1);
    });

    it('should increase connectionsOut for INCREASE modifier', () => {
        const result = getModifiedConnections(StitchType.SINGLE_CROCHET, StitchModifier.INCREASE);
        expect(result.connectionsIn).toBe(1);
        expect(result.connectionsOut).toBe(2);
    });

    it('should increase connectionsOut for INCREASE_3 modifier', () => {
        const result = getModifiedConnections(StitchType.SINGLE_CROCHET, StitchModifier.INCREASE_3);
        expect(result.connectionsOut).toBe(3);
    });

    it('should increase connectionsIn for DECREASE modifier', () => {
        const result = getModifiedConnections(StitchType.SINGLE_CROCHET, StitchModifier.DECREASE);
        expect(result.connectionsIn).toBe(2);
        expect(result.connectionsOut).toBe(1);
    });
});

describe('getStitchDisplayName', () => {
    it('should return abbreviation for stitch without modifiers', () => {
        expect(getStitchDisplayName(StitchType.SINGLE_CROCHET)).toBe('sc');
        expect(getStitchDisplayName(StitchType.DOUBLE_CROCHET)).toBe('dc');
    });

    it('should format increase correctly', () => {
        const result = getStitchDisplayName(StitchType.SINGLE_CROCHET, [StitchModifier.INCREASE]);
        expect(result).toBe('2 sc in st');
    });

    it('should format decrease correctly', () => {
        const result = getStitchDisplayName(StitchType.SINGLE_CROCHET, [StitchModifier.DECREASE]);
        expect(result).toBe('sc2tog');
    });

    it('should format FLO correctly', () => {
        const result = getStitchDisplayName(StitchType.SINGLE_CROCHET, [StitchModifier.FRONT_LOOP_ONLY]);
        expect(result).toBe('sc in FLO');
    });

    it('should format chain space correctly', () => {
        const result = getStitchDisplayName(StitchType.DOUBLE_CROCHET, [StitchModifier.CHAIN_SPACE]);
        expect(result).toBe('dc in ch-sp');
    });
});

describe('isBasicStitch', () => {
    it('should return true for basic stitches', () => {
        expect(isBasicStitch(StitchType.SINGLE_CROCHET)).toBe(true);
        expect(isBasicStitch(StitchType.HALF_DOUBLE_CROCHET)).toBe(true);
        expect(isBasicStitch(StitchType.DOUBLE_CROCHET)).toBe(true);
        expect(isBasicStitch(StitchType.TRIPLE_CROCHET)).toBe(true);
    });

    it('should return false for non-basic stitches', () => {
        expect(isBasicStitch(StitchType.CHAIN)).toBe(false);
        expect(isBasicStitch(StitchType.BOBBLE)).toBe(false);
        expect(isBasicStitch(StitchType.MAGIC_RING)).toBe(false);
    });
});

describe('createsSpace', () => {
    it('should return true for stitches that create spaces', () => {
        expect(createsSpace(StitchType.CHAIN)).toBe(true);
        expect(createsSpace(StitchType.V_STITCH)).toBe(true);
    });

    it('should return false for stitches that do not create spaces', () => {
        expect(createsSpace(StitchType.SINGLE_CROCHET)).toBe(false);
        expect(createsSpace(StitchType.DOUBLE_CROCHET)).toBe(false);
    });
});

describe('getStitchCategories', () => {
    it('should return categorized stitch types', () => {
        const categories = getStitchCategories();

        expect(categories.foundation).toContain(StitchType.CHAIN);
        expect(categories.basic).toContain(StitchType.SINGLE_CROCHET);
        expect(categories.post).toContain(StitchType.FRONT_POST_DOUBLE_CROCHET);
        expect(categories.texture).toContain(StitchType.BOBBLE);
        expect(categories.decorative).toContain(StitchType.SHELL);
        expect(categories.starting).toContain(StitchType.MAGIC_RING);
    });
});
