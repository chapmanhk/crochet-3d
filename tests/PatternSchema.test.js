/**
 * Tests for PatternSchema validation
 *
 * Verifies:
 * - Version validation
 * - Metadata validation
 * - Graph structure validation
 * - Node validation
 * - Error and warning generation
 * - Edge cases and limits
 */

import { describe, it, expect } from 'vitest';
import {
    validatePatternData,
    formatValidationResult
} from '../src/utils/PatternSchema.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { SchemaConstants } from '../src/utils/Constants.js';

describe('validatePatternData', () => {
    describe('basic validation', () => {
        it('should reject null data', () => {
            const result = validatePatternData(null);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Pattern data must be an object');
        });

        it('should reject non-object data', () => {
            expect(validatePatternData('string').valid).toBe(false);
            expect(validatePatternData(123).valid).toBe(false);
            expect(validatePatternData([]).valid).toBe(false);
        });

        it('should accept minimal valid data', () => {
            const result = validatePatternData({});

            // Should be valid but with warnings
            expect(result.valid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('version validation', () => {
        it('should accept supported version', () => {
            const result = validatePatternData({ version: 1 });

            expect(result.valid).toBe(true);
            expect(result.errors.filter(e => e.includes('version'))).toHaveLength(0);
        });

        it('should reject unsupported version', () => {
            const result = validatePatternData({ version: 999 });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Unsupported pattern version'))).toBe(true);
        });

        it('should reject non-numeric version', () => {
            const result = validatePatternData({ version: '1' });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Version must be a number'))).toBe(true);
        });

        it('should warn about missing version', () => {
            const result = validatePatternData({});

            expect(result.warnings.some(w => w.includes('No version specified'))).toBe(true);
        });
    });

    describe('mode validation', () => {
        it('should accept valid mode "flat"', () => {
            const result = validatePatternData({ mode: 'flat' });

            expect(result.errors.filter(e => e.includes('mode'))).toHaveLength(0);
        });

        it('should accept valid mode "round"', () => {
            const result = validatePatternData({ mode: 'round' });

            expect(result.errors.filter(e => e.includes('mode'))).toHaveLength(0);
        });

        it('should accept valid mode "round-joined"', () => {
            const result = validatePatternData({ mode: 'round-joined' });

            expect(result.errors.filter(e => e.includes('mode'))).toHaveLength(0);
        });

        it('should accept valid mode "round-spiral"', () => {
            const result = validatePatternData({ mode: 'round-spiral' });

            expect(result.errors.filter(e => e.includes('mode'))).toHaveLength(0);
        });

        it('should reject invalid mode', () => {
            const result = validatePatternData({ mode: 'invalid' });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Invalid mode'))).toBe(true);
        });

        it('should reject non-string mode', () => {
            const result = validatePatternData({ mode: 123 });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Mode must be a string'))).toBe(true);
        });

        it('should warn when legacy "round" mode is used', () => {
            const result = validatePatternData({ mode: 'round' });

            expect(result.warnings.some(w => w.includes('Legacy mode "round"'))).toBe(true);
        });
    });

    describe('currentRow validation', () => {
        it('should accept valid currentRow', () => {
            const result = validatePatternData({ currentRow: 5 });

            expect(result.errors.filter(e => e.includes('currentRow'))).toHaveLength(0);
        });

        it('should reject non-integer currentRow', () => {
            const result = validatePatternData({ currentRow: 5.5 });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('currentRow must be an integer'))).toBe(true);
        });

        it('should reject negative currentRow', () => {
            const result = validatePatternData({ currentRow: -1 });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('currentRow cannot be negative'))).toBe(true);
        });
    });

    describe('currentColor validation', () => {
        it('should accept valid hex color', () => {
            const result = validatePatternData({ currentColor: 0xFF0000 });

            expect(result.errors.filter(e => e.includes('currentColor'))).toHaveLength(0);
        });

        it('should reject non-numeric color', () => {
            const result = validatePatternData({ currentColor: '#FF0000' });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('currentColor must be a number'))).toBe(true);
        });

        it('should reject out of range color', () => {
            const result = validatePatternData({ currentColor: 0x1FFFFFF });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('valid hex color'))).toBe(true);
        });

        it('should reject negative color', () => {
            const result = validatePatternData({ currentColor: -1 });

            expect(result.valid).toBe(false);
        });
    });

    describe('metadata validation', () => {
        it('should accept valid metadata', () => {
            const result = validatePatternData({
                metadata: {
                    name: 'Test Pattern',
                    author: 'Test Author',
                    notes: 'Some notes',
                    createdAt: Date.now(),
                    modifiedAt: Date.now()
                }
            });

            expect(result.errors.filter(e => e.includes('Metadata'))).toHaveLength(0);
        });

        it('should reject non-object metadata', () => {
            const result = validatePatternData({ metadata: 'invalid' });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Metadata must be an object'))).toBe(true);
        });

        it('should reject non-string name', () => {
            const result = validatePatternData({
                metadata: { name: 123 }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Metadata name must be a string'))).toBe(true);
        });

        it('should reject name exceeding max length', () => {
            const result = validatePatternData({
                metadata: { name: 'x'.repeat(SchemaConstants.MAX_METADATA_NAME_LENGTH + 1) }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('exceeds maximum length'))).toBe(true);
        });

        it('should reject non-string author', () => {
            const result = validatePatternData({
                metadata: { author: 123 }
            });

            expect(result.valid).toBe(false);
        });

        it('should warn about long notes', () => {
            const result = validatePatternData({
                metadata: { notes: 'x'.repeat(SchemaConstants.MAX_METADATA_NOTES_LENGTH + 1) }
            });

            expect(result.warnings.some(w => w.includes('notes exceed'))).toBe(true);
        });

        it('should warn about non-numeric timestamps', () => {
            const result = validatePatternData({
                metadata: { createdAt: '2024-01-01' }
            });

            expect(result.warnings.some(w => w.includes('createdAt should be a timestamp'))).toBe(true);
        });
    });

    describe('graph validation', () => {
        it('should accept valid graph', () => {
            const result = validatePatternData({
                graph: {
                    nodes: []
                }
            });

            expect(result.errors.filter(e => e.includes('Graph'))).toHaveLength(0);
        });

        it('should reject non-object graph', () => {
            const result = validatePatternData({ graph: 'invalid' });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Graph must be an object'))).toBe(true);
        });

        it('should reject non-array nodes', () => {
            const result = validatePatternData({
                graph: { nodes: 'invalid' }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Graph nodes must be an array'))).toBe(true);
        });

        it('should warn about missing graph', () => {
            const result = validatePatternData({});

            expect(result.warnings.some(w => w.includes('No graph data'))).toBe(true);
        });
    });

    describe('node validation', () => {
        const createValidNode = (overrides = {}) => ({
            id: 'node_1',
            type: StitchType.CHAIN,
            row: 0,
            column: 0,
            position: { x: 0, y: 0, z: 0 },
            connections: {
                above: [],
                below: [],
                left: null,
                right: null
            },
            color: 0x8B4513,
            ...overrides
        });

        it('should accept valid node', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode()] }
            });

            expect(result.valid).toBe(true);
        });

        it('should reject node missing id', () => {
            const node = createValidNode();
            delete node.id;

            const result = validatePatternData({
                graph: { nodes: [node] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("missing required 'id'"))).toBe(true);
        });

        it('should reject node with non-string id', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ id: 123 })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid id type'))).toBe(true);
        });

        it('should reject duplicate node ids', () => {
            const result = validatePatternData({
                graph: {
                    nodes: [
                        createValidNode({ id: 'same_id' }),
                        createValidNode({ id: 'same_id' })
                    ]
                }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Duplicate node id'))).toBe(true);
        });

        it('should reject node missing type', () => {
            const node = createValidNode();
            delete node.type;

            const result = validatePatternData({
                graph: { nodes: [node] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("missing required 'type'"))).toBe(true);
        });

        it('should warn about unknown stitch type', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ type: 'unknown_stitch' })] }
            });

            expect(result.warnings.some(w => w.includes('unknown stitch type'))).toBe(true);
        });

        it('should reject invalid row type', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ row: 'zero' })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid row'))).toBe(true);
        });

        it('should reject negative row', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ row: -1 })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('negative row'))).toBe(true);
        });

        it('should reject invalid column type', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ column: 1.5 })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid column'))).toBe(true);
        });

        it('should warn about negative column values', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ column: -1 })] }
            });

            expect(result.valid).toBe(true);
            expect(result.warnings.some(w => w.includes('negative column'))).toBe(true);
        });

        it('should reject invalid position', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ position: 'invalid' })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid position'))).toBe(true);
        });

        it('should reject invalid position coordinates', () => {
            const result = validatePatternData({
                graph: {
                    nodes: [createValidNode({ position: { x: 'zero', y: 0, z: 0 } })]
                }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('position.x'))).toBe(true);
        });

        it('should reject invalid connections structure', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ connections: 'invalid' })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid connections'))).toBe(true);
        });

        it('should reject invalid connections.above type', () => {
            const result = validatePatternData({
                graph: {
                    nodes: [createValidNode({
                        connections: { above: 'invalid', below: [], left: null, right: null }
                    })]
                }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('connections.above'))).toBe(true);
        });

        it('should reject invalid left/right connection type', () => {
            const result = validatePatternData({
                graph: {
                    nodes: [createValidNode({
                        connections: { above: [], below: [], left: 123, right: null }
                    })]
                }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('connections.left'))).toBe(true);
        });

        it('should reject invalid color type', () => {
            const result = validatePatternData({
                graph: { nodes: [createValidNode({ color: '#FF0000' })] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid color'))).toBe(true);
        });

        it('should reject non-object node', () => {
            const result = validatePatternData({
                graph: { nodes: ['not an object'] }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('must be an object'))).toBe(true);
        });
    });

    describe('pattern size limits', () => {
        it('should reject patterns exceeding max size', () => {
            const nodes = [];
            for (let i = 0; i < SchemaConstants.MAX_PATTERN_SIZE + 1; i++) {
                nodes.push({
                    id: `node_${i}`,
                    type: StitchType.CHAIN,
                    row: 0,
                    column: i
                });
            }

            const result = validatePatternData({
                graph: { nodes }
            });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('exceeds maximum size'))).toBe(true);
        });
    });

    describe('valid complete pattern', () => {
        it('should validate a complete realistic pattern', () => {
            const pattern = {
                version: 1,
                metadata: {
                    name: 'Test Scarf',
                    author: 'Test Crocheter',
                    notes: 'A simple scarf pattern',
                    createdAt: Date.now(),
                    modifiedAt: Date.now()
                },
                mode: 'flat',
                currentRow: 1,
                currentColor: 0x8B4513,
                graph: {
                    nodes: [
                        {
                            id: 'ch_0',
                            type: StitchType.CHAIN,
                            row: 0,
                            column: 0,
                            position: { x: 0, y: 0, z: 0 },
                            connections: { above: ['sc_0'], below: [], left: null, right: 'ch_1' },
                            color: 0x8B4513
                        },
                        {
                            id: 'ch_1',
                            type: StitchType.CHAIN,
                            row: 0,
                            column: 1,
                            position: { x: 0.6, y: 0, z: 0 },
                            connections: { above: [], below: [], left: 'ch_0', right: null },
                            color: 0x8B4513
                        },
                        {
                            id: 'sc_0',
                            type: StitchType.SINGLE_CROCHET,
                            row: 1,
                            column: 0,
                            position: { x: 0, y: 1, z: 0 },
                            connections: { above: [], below: ['ch_0'], left: null, right: null },
                            color: 0x8B4513
                        }
                    ]
                }
            };

            const result = validatePatternData(pattern);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});

describe('formatValidationResult', () => {
    it('should format errors', () => {
        const result = {
            valid: false,
            errors: ['Error 1', 'Error 2'],
            warnings: []
        };

        const formatted = formatValidationResult(result);

        expect(formatted).toContain('Errors:');
        expect(formatted).toContain('Error 1');
        expect(formatted).toContain('Error 2');
    });

    it('should format warnings', () => {
        const result = {
            valid: true,
            errors: [],
            warnings: ['Warning 1', 'Warning 2']
        };

        const formatted = formatValidationResult(result);

        expect(formatted).toContain('Warnings:');
        expect(formatted).toContain('Warning 1');
        expect(formatted).toContain('Warning 2');
    });

    it('should format both errors and warnings', () => {
        const result = {
            valid: false,
            errors: ['Error 1'],
            warnings: ['Warning 1']
        };

        const formatted = formatValidationResult(result);

        expect(formatted).toContain('Errors:');
        expect(formatted).toContain('Error 1');
        expect(formatted).toContain('Warnings:');
        expect(formatted).toContain('Warning 1');
    });

    it('should return empty string for no issues', () => {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        const formatted = formatValidationResult(result);

        expect(formatted).toBe('');
    });
});
