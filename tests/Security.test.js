import { describe, it, expect } from 'vitest';
import { isDangerousKey, sanitizeObject, deepSanitizeObject } from '../src/utils/Constants.js';
import { validatePatternData } from '../src/utils/PatternSchema.js';
import { Pattern } from '../src/core/Pattern.js';

describe('Security Utilities', () => {
    describe('isDangerousKey', () => {
        it('should detect __proto__ as dangerous', () => {
            expect(isDangerousKey('__proto__')).toBe(true);
        });

        it('should detect constructor as dangerous', () => {
            expect(isDangerousKey('constructor')).toBe(true);
        });

        it('should detect prototype as dangerous', () => {
            expect(isDangerousKey('prototype')).toBe(true);
        });

        it('should allow normal keys', () => {
            expect(isDangerousKey('name')).toBe(false);
            expect(isDangerousKey('id')).toBe(false);
            expect(isDangerousKey('type')).toBe(false);
            expect(isDangerousKey('metadata')).toBe(false);
        });
    });

    describe('sanitizeObject', () => {
        it('should remove __proto__ keys', () => {
            const obj = { name: 'test', '__proto__': { evil: true } };
            const sanitized = sanitizeObject(obj);
            expect(sanitized.name).toBe('test');
            expect(Object.keys(sanitized)).not.toContain('__proto__');
        });

        it('should remove constructor keys', () => {
            const obj = { name: 'test', 'constructor': { evil: true } };
            const sanitized = sanitizeObject(obj);
            expect(sanitized.name).toBe('test');
            expect(Object.keys(sanitized)).not.toContain('constructor');
        });

        it('should remove prototype keys', () => {
            const obj = { name: 'test', 'prototype': { evil: true } };
            const sanitized = sanitizeObject(obj);
            expect(sanitized.name).toBe('test');
            expect(Object.keys(sanitized)).not.toContain('prototype');
        });

        it('should preserve safe keys', () => {
            const obj = { name: 'test', id: '123', value: 42 };
            const sanitized = sanitizeObject(obj);
            expect(sanitized).toEqual(obj);
        });

        it('should return non-objects unchanged', () => {
            expect(sanitizeObject(null)).toBe(null);
            expect(sanitizeObject(undefined)).toBe(undefined);
            expect(sanitizeObject(42)).toBe(42);
            expect(sanitizeObject('string')).toBe('string');
        });

        it('should return arrays unchanged', () => {
            const arr = [1, 2, 3];
            expect(sanitizeObject(arr)).toBe(arr);
        });
    });

    describe('deepSanitizeObject', () => {
        it('should remove dangerous keys at all levels', () => {
            const obj = {
                name: 'test',
                nested: {
                    '__proto__': { evil: true },
                    value: 42
                }
            };
            const sanitized = deepSanitizeObject(obj);
            expect(sanitized.name).toBe('test');
            expect(sanitized.nested.value).toBe(42);
            expect(Object.keys(sanitized.nested)).not.toContain('__proto__');
        });

        it('should handle arrays in nested objects', () => {
            const obj = {
                items: [
                    { name: 'item1', '__proto__': {} },
                    { name: 'item2' }
                ]
            };
            const sanitized = deepSanitizeObject(obj);
            expect(sanitized.items[0].name).toBe('item1');
            expect(Object.keys(sanitized.items[0])).not.toContain('__proto__');
            expect(sanitized.items[1].name).toBe('item2');
        });

        it('should respect max depth', () => {
            const obj = { a: { b: { c: { d: 'deep' } } } };
            const sanitized = deepSanitizeObject(obj, 2);
            // After depth 2, it stops recursing
            expect(sanitized.a.b).toEqual({ c: { d: 'deep' } });
        });
    });
});

describe('PatternSchema Security', () => {
    describe('validatePatternData', () => {
        // Note: Using JSON.parse to simulate real-world file loading behavior
        // In JavaScript object literals, __proto__ gets special treatment as
        // the prototype setter, but JSON.parse preserves it as a regular key

        it('should reject data with __proto__ at root level (via JSON)', () => {
            // Simulate loading from a malicious JSON file
            const jsonString = '{"version": 2, "__proto__": {"polluted": true}, "graph": {"nodes": []}}';
            const data = JSON.parse(jsonString);
            const result = validatePatternData(data);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('__proto__'))).toBe(true);
        });

        it('should reject data with __proto__ in metadata (via JSON)', () => {
            // Simulate loading from a malicious JSON file
            const jsonString = '{"version": 2, "metadata": {"name": "test", "__proto__": {"polluted": true}}, "graph": {"nodes": []}}';
            const data = JSON.parse(jsonString);
            const result = validatePatternData(data);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('__proto__'))).toBe(true);
        });

        it('should reject data with constructor in nested objects', () => {
            // Using Object.defineProperty to add constructor as a regular key
            const data = {
                version: 2,
                metadata: {
                    yarn: {}
                },
                graph: { nodes: [] }
            };
            Object.defineProperty(data.metadata.yarn, 'constructor', {
                value: { polluted: true },
                enumerable: true
            });
            const result = validatePatternData(data);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('constructor'))).toBe(true);
        });

        it('should reject data with dangerous keys in nodes (via JSON)', () => {
            // Simulate loading from a malicious JSON file
            const jsonString = '{"version": 2, "graph": {"nodes": [{"id": "node1", "type": "CHAIN", "__proto__": {"polluted": true}}]}}';
            const data = JSON.parse(jsonString);
            const result = validatePatternData(data);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('__proto__'))).toBe(true);
        });

        it('should accept valid data without dangerous keys', () => {
            const data = {
                version: 2,
                metadata: {
                    name: 'Test Pattern',
                    author: 'Test Author'
                },
                graph: {
                    nodes: [
                        {
                            id: 'node1',
                            type: 'CHAIN',
                            row: 0,
                            column: 0,
                            position: { x: 0, y: 0, z: 0 }
                        }
                    ]
                }
            };
            const result = validatePatternData(data);
            expect(result.valid).toBe(true);
        });
    });
});

describe('Pattern Security', () => {
    describe('fromJSON', () => {
        it('should sanitize metadata when loading pattern', () => {
            // Create a pattern with valid structure
            const data = {
                version: 2,
                metadata: {
                    name: 'Test',
                    author: 'Author'
                },
                mode: 'flat',
                currentRow: 0,
                graph: {
                    nodes: []
                }
            };

            const pattern = Pattern.fromJSON(data);
            expect(pattern.metadata.name).toBe('Test');
            expect(pattern.metadata.author).toBe('Author');
        });

        it('should sanitize turningChainOverrides when loading pattern', () => {
            const data = {
                version: 2,
                turningChainOverrides: {
                    'DOUBLE_CROCHET': true
                },
                graph: {
                    nodes: []
                }
            };

            const pattern = Pattern.fromJSON(data);
            expect(pattern.turningChainOverrides['DOUBLE_CROCHET']).toBe(true);
        });
    });
});
