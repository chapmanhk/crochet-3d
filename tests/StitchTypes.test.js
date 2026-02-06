/**
 * Tests for StitchTypes module (simplified)
 *
 * Verifies:
 * - StitchType enum contains only CHAIN and SINGLE_CROCHET
 * - StitchDefinitions have required properties
 * - getStitchDefinition utility works correctly
 */

import { describe, it, expect } from 'vitest';
import {
    StitchType,
    StitchDefinitions,
    getStitchDefinition
} from '../src/core/StitchTypes.js';

describe('StitchType', () => {
    it('should define CHAIN and SINGLE_CROCHET types', () => {
        expect(StitchType.CHAIN).toBe('chain');
        expect(StitchType.SINGLE_CROCHET).toBe('single_crochet');
    });

    it('should have exactly 2 stitch types', () => {
        const types = Object.keys(StitchType);
        expect(types).toHaveLength(2);
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
            'color',
            'geometry'
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

    it('should have unique abbreviations', () => {
        const abbreviations = Object.values(StitchDefinitions).map(def => def.abbreviation);
        const uniqueAbbreviations = new Set(abbreviations);
        expect(uniqueAbbreviations.size).toBe(abbreviations.length);
    });

    describe('specific stitch properties', () => {
        it('should have correct chain properties', () => {
            const chain = StitchDefinitions[StitchType.CHAIN];
            expect(chain.name).toBe('Chain');
            expect(chain.abbreviation).toBe('ch');
            expect(chain.height).toBe(0.5);
            expect(chain.width).toBe(0.6);
            expect(chain.connectionsIn).toBe(1);
            expect(chain.connectionsOut).toBe(1);
            expect(chain.geometry.type).toBe('torus');
        });

        it('should have correct single crochet properties', () => {
            const sc = StitchDefinitions[StitchType.SINGLE_CROCHET];
            expect(sc.name).toBe('Single Crochet');
            expect(sc.abbreviation).toBe('sc');
            expect(sc.height).toBe(1.0);
            expect(sc.width).toBe(0.7);
            expect(sc.connectionsIn).toBe(1);
            expect(sc.connectionsOut).toBe(1);
            expect(sc.geometry.type).toBe('custom');
            expect(sc.geometry.shape).toBe('single_crochet');
        });

        it('should have chain shorter than single crochet', () => {
            const chain = StitchDefinitions[StitchType.CHAIN];
            const sc = StitchDefinitions[StitchType.SINGLE_CROCHET];
            expect(chain.height).toBeLessThan(sc.height);
        });
    });
});

describe('getStitchDefinition', () => {
    it('should return definition for CHAIN', () => {
        const def = getStitchDefinition(StitchType.CHAIN);
        expect(def).toBeDefined();
        expect(def.name).toBe('Chain');
        expect(def.abbreviation).toBe('ch');
    });

    it('should return definition for SINGLE_CROCHET', () => {
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
