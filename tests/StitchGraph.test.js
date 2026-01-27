/**
 * Tests for StitchGraph class
 *
 * Verifies:
 * - Node management (add, remove, get)
 * - Row indexing
 * - Foundation chain creation
 * - Connection management
 * - Pattern validation
 * - Serialization/deserialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StitchGraph } from '../src/core/StitchGraph.js';
import { StitchNode } from '../src/core/StitchNode.js';
import { StitchType } from '../src/core/StitchTypes.js';

describe('StitchGraph', () => {
    let graph;

    beforeEach(() => {
        graph = new StitchGraph();
    });

    describe('constructor', () => {
        it('should create empty graph', () => {
            expect(graph.size).toBe(0);
            expect(graph.getRowCount()).toBe(0);
        });

        it('should initialize event listeners', () => {
            expect(graph.listeners).toBeDefined();
            expect(graph.listeners.nodeAdded).toEqual([]);
            expect(graph.listeners.nodeRemoved).toEqual([]);
            expect(graph.listeners.connectionChanged).toEqual([]);
            expect(graph.listeners.graphCleared).toEqual([]);
        });
    });

    describe('event system', () => {
        it('should register event listeners with on()', () => {
            const callback = vi.fn();
            graph.on('nodeAdded', callback);

            expect(graph.listeners.nodeAdded).toContain(callback);
        });

        it('should remove event listeners with off()', () => {
            const callback = vi.fn();
            graph.on('nodeAdded', callback);
            graph.off('nodeAdded', callback);

            expect(graph.listeners.nodeAdded).not.toContain(callback);
        });

        it('should emit events to listeners', () => {
            const callback = vi.fn();
            graph.on('nodeAdded', callback);

            const node = new StitchNode(StitchType.CHAIN);
            graph.addNode(node);

            expect(callback).toHaveBeenCalledWith({ node });
        });
    });

    describe('addNode', () => {
        it('should add a StitchNode to the graph', () => {
            const node = new StitchNode(StitchType.CHAIN);
            graph.addNode(node);

            expect(graph.size).toBe(1);
            expect(graph.getNode(node.id)).toBe(node);
        });

        it('should throw error for non-StitchNode objects', () => {
            expect(() => graph.addNode({})).toThrow('Must add StitchNode instance');
            expect(() => graph.addNode('string')).toThrow();
            expect(() => graph.addNode(null)).toThrow();
        });

        it('should update row index', () => {
            const node1 = new StitchNode(StitchType.CHAIN, { row: 0 });
            const node2 = new StitchNode(StitchType.CHAIN, { row: 0 });
            const node3 = new StitchNode(StitchType.SINGLE_CROCHET, { row: 1 });

            graph.addNode(node1);
            graph.addNode(node2);
            graph.addNode(node3);

            expect(graph.getRow(0)).toHaveLength(2);
            expect(graph.getRow(1)).toHaveLength(1);
        });

        it('should emit nodeAdded event', () => {
            const callback = vi.fn();
            graph.on('nodeAdded', callback);

            const node = new StitchNode(StitchType.CHAIN);
            graph.addNode(node);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should return the added node', () => {
            const node = new StitchNode(StitchType.CHAIN);
            const result = graph.addNode(node);

            expect(result).toBe(node);
        });
    });

    describe('createNode', () => {
        it('should create and add a new node', () => {
            const node = graph.createNode(StitchType.SINGLE_CROCHET, {
                row: 1,
                column: 2
            });

            expect(node).toBeInstanceOf(StitchNode);
            expect(node.type).toBe(StitchType.SINGLE_CROCHET);
            expect(node.row).toBe(1);
            expect(node.column).toBe(2);
            expect(graph.size).toBe(1);
        });
    });

    describe('removeNode', () => {
        it('should remove node by reference', () => {
            const node = graph.createNode(StitchType.CHAIN);
            graph.removeNode(node);

            expect(graph.size).toBe(0);
            expect(graph.getNode(node.id)).toBeNull();
        });

        it('should remove node by ID', () => {
            const node = graph.createNode(StitchType.CHAIN);
            graph.removeNode(node.id);

            expect(graph.size).toBe(0);
        });

        it('should update row index on removal', () => {
            const node = graph.createNode(StitchType.CHAIN, { row: 0 });
            graph.removeNode(node);

            expect(graph.getRow(0)).toHaveLength(0);
        });

        it('should disconnect node before removal', () => {
            const node1 = graph.createNode(StitchType.CHAIN);
            const node2 = graph.createNode(StitchType.SINGLE_CROCHET);
            node2.connectBelow(node1);

            graph.removeNode(node2);

            expect(node1.connections.above).toHaveLength(0);
        });

        it('should emit nodeRemoved event', () => {
            const callback = vi.fn();
            graph.on('nodeRemoved', callback);

            const node = graph.createNode(StitchType.CHAIN);
            graph.removeNode(node);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should return true on success', () => {
            const node = graph.createNode(StitchType.CHAIN);
            expect(graph.removeNode(node)).toBe(true);
        });

        it('should return false for non-existent node', () => {
            expect(graph.removeNode('nonexistent_id')).toBe(false);
        });

        it('should clean up empty row from index', () => {
            const node = graph.createNode(StitchType.CHAIN, { row: 5 });
            graph.removeNode(node);

            expect(graph.rowIndex.has(5)).toBe(false);
        });
    });

    describe('getNode', () => {
        it('should return node by ID', () => {
            const node = graph.createNode(StitchType.CHAIN);
            expect(graph.getNode(node.id)).toBe(node);
        });

        it('should return null for non-existent ID', () => {
            expect(graph.getNode('nonexistent')).toBeNull();
        });
    });

    describe('getAllNodes', () => {
        it('should return array of all nodes', () => {
            graph.createNode(StitchType.CHAIN);
            graph.createNode(StitchType.CHAIN);
            graph.createNode(StitchType.SINGLE_CROCHET);

            const nodes = graph.getAllNodes();

            expect(Array.isArray(nodes)).toBe(true);
            expect(nodes).toHaveLength(3);
        });

        it('should return empty array for empty graph', () => {
            expect(graph.getAllNodes()).toEqual([]);
        });
    });

    describe('row operations', () => {
        beforeEach(() => {
            // Create a simple pattern: 3 chains in row 0, 2 SC in row 1
            graph.createNode(StitchType.CHAIN, { row: 0, column: 0 });
            graph.createNode(StitchType.CHAIN, { row: 0, column: 1 });
            graph.createNode(StitchType.CHAIN, { row: 0, column: 2 });
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1, column: 0 });
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1, column: 1 });
        });

        describe('getRow', () => {
            it('should return all nodes in a row', () => {
                expect(graph.getRow(0)).toHaveLength(3);
                expect(graph.getRow(1)).toHaveLength(2);
            });

            it('should return empty array for non-existent row', () => {
                expect(graph.getRow(5)).toEqual([]);
            });
        });

        describe('getRowCount', () => {
            it('should return correct row count', () => {
                expect(graph.getRowCount()).toBe(2);
            });

            it('should return 0 for empty graph', () => {
                const emptyGraph = new StitchGraph();
                expect(emptyGraph.getRowCount()).toBe(0);
            });
        });

        describe('getRowSorted', () => {
            it('should return nodes sorted by column', () => {
                // Add nodes out of order
                const newGraph = new StitchGraph();
                newGraph.createNode(StitchType.CHAIN, { row: 0, column: 2 });
                newGraph.createNode(StitchType.CHAIN, { row: 0, column: 0 });
                newGraph.createNode(StitchType.CHAIN, { row: 0, column: 1 });

                const sorted = newGraph.getRowSorted(0);

                expect(sorted[0].column).toBe(0);
                expect(sorted[1].column).toBe(1);
                expect(sorted[2].column).toBe(2);
            });
        });

        describe('getFirstInRow', () => {
            it('should return first stitch in row', () => {
                const first = graph.getFirstInRow(0);
                expect(first.column).toBe(0);
            });

            it('should return null for empty row', () => {
                expect(graph.getFirstInRow(5)).toBeNull();
            });
        });

        describe('getLastInRow', () => {
            it('should return last stitch in row', () => {
                const last = graph.getLastInRow(0);
                expect(last.column).toBe(2);
            });

            it('should return null for empty row', () => {
                expect(graph.getLastInRow(5)).toBeNull();
            });
        });

        describe('getAt', () => {
            it('should return node at specific row and column', () => {
                const node = graph.getAt(0, 1);
                expect(node).toBeDefined();
                expect(node.row).toBe(0);
                expect(node.column).toBe(1);
            });

            it('should return null for non-existent position', () => {
                expect(graph.getAt(0, 10)).toBeNull();
                expect(graph.getAt(10, 0)).toBeNull();
            });
        });
    });

    describe('connections', () => {
        describe('connectVertical', () => {
            it('should connect upper node to lower node', () => {
                const lower = graph.createNode(StitchType.CHAIN, { row: 0 });
                const upper = graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });

                graph.connectVertical(upper, lower);

                expect(upper.connections.below).toContain(lower);
                expect(lower.connections.above).toContain(upper);
            });

            it('should emit connectionChanged event', () => {
                const callback = vi.fn();
                graph.on('connectionChanged', callback);

                const lower = graph.createNode(StitchType.CHAIN, { row: 0 });
                const upper = graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
                graph.connectVertical(upper, lower);

                expect(callback).toHaveBeenCalledWith({
                    type: 'vertical',
                    upper,
                    lower
                });
            });

            it('should return false for null nodes', () => {
                const node = graph.createNode(StitchType.CHAIN);
                expect(graph.connectVertical(null, node)).toBe(false);
                expect(graph.connectVertical(node, null)).toBe(false);
            });
        });

        describe('connectHorizontal', () => {
            it('should connect left node to right node', () => {
                const left = graph.createNode(StitchType.CHAIN, { column: 0 });
                const right = graph.createNode(StitchType.CHAIN, { column: 1 });

                graph.connectHorizontal(left, right);

                expect(left.connections.right).toBe(right);
                expect(right.connections.left).toBe(left);
            });

            it('should emit connectionChanged event', () => {
                const callback = vi.fn();
                graph.on('connectionChanged', callback);

                const left = graph.createNode(StitchType.CHAIN, { column: 0 });
                const right = graph.createNode(StitchType.CHAIN, { column: 1 });
                graph.connectHorizontal(left, right);

                expect(callback).toHaveBeenCalledWith({
                    type: 'horizontal',
                    left,
                    right
                });
            });
        });
    });

    describe('clear', () => {
        it('should remove all nodes', () => {
            graph.createNode(StitchType.CHAIN);
            graph.createNode(StitchType.CHAIN);
            graph.createNode(StitchType.SINGLE_CROCHET);

            graph.clear();

            expect(graph.size).toBe(0);
            expect(graph.getAllNodes()).toEqual([]);
        });

        it('should clear row index', () => {
            graph.createNode(StitchType.CHAIN, { row: 0 });
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });

            graph.clear();

            expect(graph.getRowCount()).toBe(0);
        });

        it('should emit graphCleared event', () => {
            const callback = vi.fn();
            graph.on('graphCleared', callback);

            graph.clear();

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('createFoundationChain', () => {
        it('should create chain of specified length', () => {
            const chain = graph.createFoundationChain(5);

            expect(chain).toHaveLength(5);
            expect(graph.size).toBe(5);
        });

        it('should create all chain type nodes', () => {
            const chain = graph.createFoundationChain(3);

            chain.forEach(node => {
                expect(node.type).toBe(StitchType.CHAIN);
            });
        });

        it('should place all nodes in row 0', () => {
            graph.createFoundationChain(3);

            expect(graph.getRow(0)).toHaveLength(3);
        });

        it('should connect nodes horizontally', () => {
            const chain = graph.createFoundationChain(3);

            expect(chain[0].connections.right).toBe(chain[1]);
            expect(chain[1].connections.left).toBe(chain[0]);
            expect(chain[1].connections.right).toBe(chain[2]);
            expect(chain[2].connections.left).toBe(chain[1]);
        });

        it('should assign sequential columns', () => {
            const chain = graph.createFoundationChain(3);

            expect(chain[0].column).toBe(0);
            expect(chain[1].column).toBe(1);
            expect(chain[2].column).toBe(2);
        });

        it('should position nodes horizontally', () => {
            const chain = graph.createFoundationChain(3);

            expect(chain[0].position.x).toBeLessThan(chain[1].position.x);
            expect(chain[1].position.x).toBeLessThan(chain[2].position.x);
        });

        it('should respect start position', () => {
            const chain = graph.createFoundationChain(2, { x: 10, y: 5, z: 2 });

            expect(chain[0].position.x).toBe(10);
            expect(chain[0].position.y).toBe(5);
            expect(chain[0].position.z).toBe(2);
        });
    });

    describe('addStitchToRow', () => {
        beforeEach(() => {
            graph.createFoundationChain(5);
        });

        it('should add stitch to specified row', () => {
            const stitch = graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);

            expect(stitch.row).toBe(1);
            expect(graph.getRow(1)).toContain(stitch);
        });

        it('should connect to specified node below', () => {
            const chainNode = graph.getAt(0, 0);
            const stitch = graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1, chainNode);

            expect(stitch.connections.below).toContain(chainNode);
            expect(chainNode.connections.above).toContain(stitch);
        });

        it('should connect to previous stitch in row', () => {
            const stitch1 = graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);
            const stitch2 = graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);

            expect(stitch1.connections.right).toBe(stitch2);
            expect(stitch2.connections.left).toBe(stitch1);
        });

        it('should assign correct column number', () => {
            graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);
            graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);
            const stitch3 = graph.addStitchToRow(StitchType.SINGLE_CROCHET, 1);

            expect(stitch3.column).toBe(2);
        });
    });

    describe('validate', () => {
        it('should return valid for proper pattern', () => {
            const chain = graph.createFoundationChain(3);

            // Add a row of SC
            chain.forEach(ch => {
                const sc = graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
                graph.connectVertical(sc, ch);
            });

            const result = graph.validate();
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should warn about disconnected stitches', () => {
            graph.createFoundationChain(3);
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 }); // Disconnected

            const result = graph.validate();
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', () => {
            graph.createFoundationChain(3);
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
            graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });

            const stats = graph.getStats();

            expect(stats.totalStitches).toBe(5);
            expect(stats.rowCount).toBe(2);
            expect(stats.stitchesByType[StitchType.CHAIN]).toBe(3);
            expect(stats.stitchesByType[StitchType.SINGLE_CROCHET]).toBe(2);
            expect(stats.stitchesPerRow).toEqual([3, 2]);
        });
    });

    describe('serialization', () => {
        it('should serialize to JSON', () => {
            const chain = graph.createFoundationChain(3);
            const sc = graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
            graph.connectVertical(sc, chain[1]);

            const json = graph.toJSON();

            expect(json.version).toBe(1);
            expect(json.nodes).toHaveLength(4);
            expect(json.metadata).toBeDefined();
            expect(json.metadata.stats.totalStitches).toBe(4);
        });

        it('should deserialize from JSON', () => {
            // Create pattern
            const chain = graph.createFoundationChain(3);
            const sc = graph.createNode(StitchType.SINGLE_CROCHET, { row: 1 });
            graph.connectVertical(sc, chain[1]);
            graph.connectHorizontal(chain[0], chain[1]);

            const json = graph.toJSON();
            const restored = StitchGraph.fromJSON(json);

            expect(restored.size).toBe(4);
            expect(restored.getRowCount()).toBe(2);
            expect(restored.getRow(0)).toHaveLength(3);
            expect(restored.getRow(1)).toHaveLength(1);
        });

        it('should restore connections', () => {
            const chain = graph.createFoundationChain(2);
            const json = graph.toJSON();
            const restored = StitchGraph.fromJSON(json);

            const restoredChain = restored.getRowSorted(0);
            expect(restoredChain[0].connections.right).toBe(restoredChain[1]);
            expect(restoredChain[1].connections.left).toBe(restoredChain[0]);
        });

        it('should throw error for invalid data', () => {
            expect(() => StitchGraph.fromJSON(null)).toThrow('Invalid graph data');
            expect(() => StitchGraph.fromJSON({})).toThrow('Invalid graph data');
        });

        it('should preserve data through serialize/deserialize cycle', () => {
            graph.createFoundationChain(5);
            for (let i = 0; i < 3; i++) {
                graph.createNode(StitchType.SINGLE_CROCHET, { row: 1, column: i });
            }

            const json = graph.toJSON();
            const restored = StitchGraph.fromJSON(json);

            expect(restored.size).toBe(graph.size);
            expect(restored.getRowCount()).toBe(graph.getRowCount());

            for (let i = 0; i < graph.getRowCount(); i++) {
                expect(restored.getRow(i).length).toBe(graph.getRow(i).length);
            }
        });
    });
});
