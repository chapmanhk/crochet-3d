/**
 * Tests for StitchTypes module
 *
 * Verifies:
 * - All stitch types are properly defined
 * - Stitch definitions have required properties
 * - Utility functions work correctly
 */

import { describe, it, expect } from 'vitest';
import {
    StitchType,
    StitchDefinitions,
    getStitchDefinition,
    getAllStitchTypes,
    getStitchByKeyboard,
    canConnect,
    getStitchHeight,
    getStitchWidth
} from '../src/core/StitchTypes.js';

describe('StitchType', () => {
    it('should define all expected stitch types', () => {
        expect(StitchType.CHAIN).toBe('chain');
        expect(StitchType.SLIP_STITCH).toBe('slip_stitch');
        expect(StitchType.SINGLE_CROCHET).toBe('single_crochet');
        expect(StitchType.HALF_DOUBLE_CROCHET).toBe('half_double_crochet');
        expect(StitchType.DOUBLE_CROCHET).toBe('double_crochet');
        expect(StitchType.TRIPLE_CROCHET).toBe('triple_crochet');
        expect(StitchType.INCREASE).toBe('increase');
        expect(StitchType.DECREASE).toBe('decrease');
        expect(StitchType.MAGIC_RING).toBe('magic_ring');
    });

    it('should have 9 stitch types defined', () => {
        const types = Object.keys(StitchType);
        expect(types).toHaveLength(9);
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
            'geometry',
            'keyboard'
        ];

        Object.values(StitchDefinitions).forEach(def => {
            requiredProps.forEach(prop => {
                expect(def).toHaveProperty(prop);
            });
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

    it('should have unique keyboard shortcuts', () => {
        const shortcuts = Object.values(StitchDefinitions).map(def => def.keyboard);
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

        it('should have magic ring output 6 connections', () => {
            const magicRing = StitchDefinitions[StitchType.MAGIC_RING];
            expect(magicRing.connectionsOut).toBe(6);
            expect(magicRing.connectionsIn).toBe(0);
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
        expect(types).toHaveLength(9);
    });

    it('should include all defined stitch types', () => {
        const types = getAllStitchTypes();
        Object.values(StitchType).forEach(type => {
            expect(types).toContain(type);
        });
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
