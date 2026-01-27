/**
 * Tests for StitchNode class
 *
 * Verifies:
 * - Node creation and initialization
 * - Connection management (below, above, left, right)
 * - Property accessors
 * - Position updates
 * - Serialization/deserialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StitchNode } from '../src/core/StitchNode.js';
import { StitchType } from '../src/core/StitchTypes.js';

describe('StitchNode', () => {
    describe('constructor', () => {
        it('should create a node with default options', () => {
            const node = new StitchNode(StitchType.SINGLE_CROCHET);

            expect(node.type).toBe(StitchType.SINGLE_CROCHET);
            expect(node.id).toBeDefined();
            expect(node.id).toMatch(/^stitch_/);
            expect(node.row).toBe(0);
            expect(node.column).toBe(0);
            expect(node.position.x).toBe(0);
            expect(node.position.y).toBe(0);
            expect(node.position.z).toBe(0);
        });

        it('should create a node with custom options', () => {
            const node = new StitchNode(StitchType.DOUBLE_CROCHET, {
                row: 2,
                column: 5,
                color: 0xFF0000,
                position: { x: 1, y: 2, z: 3 }
            });

            expect(node.type).toBe(StitchType.DOUBLE_CROCHET);
            expect(node.row).toBe(2);
            expect(node.column).toBe(5);
            expect(node.color).toBe(0xFF0000);
            expect(node.position.x).toBe(1);
            expect(node.position.y).toBe(2);
            expect(node.position.z).toBe(3);
        });

        it('should generate unique IDs for each node', () => {
            const node1 = new StitchNode(StitchType.CHAIN);
            const node2 = new StitchNode(StitchType.CHAIN);
            const node3 = new StitchNode(StitchType.CHAIN);

            expect(node1.id).not.toBe(node2.id);
            expect(node2.id).not.toBe(node3.id);
            expect(node1.id).not.toBe(node3.id);
        });

        it('should accept custom ID', () => {
            const node = new StitchNode(StitchType.CHAIN, { id: 'custom_id_123' });
            expect(node.id).toBe('custom_id_123');
        });

        it('should initialize empty connections', () => {
            const node = new StitchNode(StitchType.CHAIN);

            expect(node.connections.below).toEqual([]);
            expect(node.connections.above).toEqual([]);
            expect(node.connections.left).toBeNull();
            expect(node.connections.right).toBeNull();
        });

        it('should initialize with default selection state', () => {
            const node = new StitchNode(StitchType.CHAIN);

            expect(node.isSelected).toBe(false);
            expect(node.isHighlighted).toBe(false);
        });

        it('should store creation timestamp', () => {
            const before = Date.now();
            const node = new StitchNode(StitchType.CHAIN);
            const after = Date.now();

            expect(node.createdAt).toBeGreaterThanOrEqual(before);
            expect(node.createdAt).toBeLessThanOrEqual(after);
        });
    });

    describe('property accessors', () => {
        it('should return correct abbreviation', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);
            const dc = new StitchNode(StitchType.DOUBLE_CROCHET);

            expect(chain.abbreviation).toBe('ch');
            expect(sc.abbreviation).toBe('sc');
            expect(dc.abbreviation).toBe('dc');
        });

        it('should return correct name', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);

            expect(chain.name).toBe('Chain');
            expect(sc.name).toBe('Single Crochet');
        });

        it('should return correct height', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);
            const dc = new StitchNode(StitchType.DOUBLE_CROCHET);

            expect(chain.height).toBe(0.5);
            expect(sc.height).toBe(1.0);
            expect(dc.height).toBe(2.0);
        });

        it('should return correct width', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);

            expect(chain.width).toBe(0.6);
            expect(sc.width).toBe(0.7);
        });
    });

    describe('connections', () => {
        let nodeA, nodeB, nodeC;

        beforeEach(() => {
            nodeA = new StitchNode(StitchType.CHAIN);
            nodeB = new StitchNode(StitchType.SINGLE_CROCHET);
            nodeC = new StitchNode(StitchType.DOUBLE_CROCHET);
        });

        describe('connectBelow', () => {
            it('should connect two nodes vertically', () => {
                nodeB.connectBelow(nodeA);

                expect(nodeB.connections.below).toContain(nodeA);
                expect(nodeA.connections.above).toContain(nodeB);
            });

            it('should not duplicate connections', () => {
                nodeB.connectBelow(nodeA);
                nodeB.connectBelow(nodeA);

                expect(nodeB.connections.below).toHaveLength(1);
                expect(nodeA.connections.above).toHaveLength(1);
            });

            it('should return true on success', () => {
                expect(nodeB.connectBelow(nodeA)).toBe(true);
            });

            it('should return false for null', () => {
                expect(nodeB.connectBelow(null)).toBe(false);
            });

            it('should support multiple connections below', () => {
                nodeC.connectBelow(nodeA);
                nodeC.connectBelow(nodeB);

                expect(nodeC.connections.below).toHaveLength(2);
                expect(nodeC.connections.below).toContain(nodeA);
                expect(nodeC.connections.below).toContain(nodeB);
            });
        });

        describe('connectAbove', () => {
            it('should connect two nodes vertically (inverse)', () => {
                nodeA.connectAbove(nodeB);

                expect(nodeA.connections.above).toContain(nodeB);
                expect(nodeB.connections.below).toContain(nodeA);
            });

            it('should return true on success', () => {
                expect(nodeA.connectAbove(nodeB)).toBe(true);
            });

            it('should return false for null', () => {
                expect(nodeA.connectAbove(null)).toBe(false);
            });
        });

        describe('connectLeft', () => {
            it('should connect two nodes horizontally', () => {
                nodeB.connectLeft(nodeA);

                expect(nodeB.connections.left).toBe(nodeA);
                expect(nodeA.connections.right).toBe(nodeB);
            });

            it('should return true on success', () => {
                expect(nodeB.connectLeft(nodeA)).toBe(true);
            });

            it('should return false for null', () => {
                expect(nodeB.connectLeft(null)).toBe(false);
            });
        });

        describe('connectRight', () => {
            it('should connect two nodes horizontally (inverse)', () => {
                nodeA.connectRight(nodeB);

                expect(nodeA.connections.right).toBe(nodeB);
                expect(nodeB.connections.left).toBe(nodeA);
            });

            it('should return true on success', () => {
                expect(nodeA.connectRight(nodeB)).toBe(true);
            });

            it('should return false for null', () => {
                expect(nodeA.connectRight(null)).toBe(false);
            });
        });

        describe('disconnect', () => {
            it('should disconnect vertical connections', () => {
                nodeB.connectBelow(nodeA);
                nodeB.disconnect(nodeA);

                expect(nodeB.connections.below).not.toContain(nodeA);
                expect(nodeA.connections.above).not.toContain(nodeB);
            });

            it('should disconnect horizontal connections', () => {
                nodeA.connectRight(nodeB);
                nodeA.disconnect(nodeB);

                expect(nodeA.connections.right).toBeNull();
                expect(nodeB.connections.left).toBeNull();
            });

            it('should handle disconnecting non-connected nodes', () => {
                expect(() => nodeA.disconnect(nodeB)).not.toThrow();
            });

            it('should handle null input', () => {
                expect(() => nodeA.disconnect(null)).not.toThrow();
            });
        });

        describe('disconnectAll', () => {
            it('should remove all connections', () => {
                nodeA.connectRight(nodeB);
                nodeB.connectRight(nodeC);
                nodeB.connectBelow(nodeA);
                nodeC.connectBelow(nodeA);

                nodeB.disconnectAll();

                expect(nodeB.connections.below).toEqual([]);
                expect(nodeB.connections.above).toEqual([]);
                expect(nodeB.connections.left).toBeNull();
                expect(nodeB.connections.right).toBeNull();
            });

            it('should update connected nodes', () => {
                nodeA.connectRight(nodeB);
                nodeB.connectRight(nodeC);

                nodeB.disconnectAll();

                expect(nodeA.connections.right).toBeNull();
                expect(nodeC.connections.left).toBeNull();
            });
        });

        describe('getAllConnections', () => {
            it('should return all connected nodes', () => {
                nodeA.connectRight(nodeB);
                nodeB.connectRight(nodeC);
                nodeB.connectBelow(nodeA);

                const connections = nodeB.getAllConnections();

                expect(connections).toContain(nodeA);
                expect(connections).toContain(nodeC);
                expect(connections).toHaveLength(3); // below, left, right
            });

            it('should return empty array for unconnected node', () => {
                expect(nodeA.getAllConnections()).toEqual([]);
            });
        });

        describe('isConnectedTo', () => {
            it('should return true for connected nodes', () => {
                nodeA.connectRight(nodeB);

                expect(nodeA.isConnectedTo(nodeB)).toBe(true);
                expect(nodeB.isConnectedTo(nodeA)).toBe(true);
            });

            it('should return false for unconnected nodes', () => {
                expect(nodeA.isConnectedTo(nodeB)).toBe(false);
            });
        });
    });

    describe('position and state', () => {
        it('should update position with setPosition', () => {
            const node = new StitchNode(StitchType.CHAIN);
            node.setPosition(5, 10, 15);

            expect(node.position.x).toBe(5);
            expect(node.position.y).toBe(10);
            expect(node.position.z).toBe(15);
        });

        it('should set selection state', () => {
            const node = new StitchNode(StitchType.CHAIN);

            node.setSelected(true);
            expect(node.isSelected).toBe(true);

            node.setSelected(false);
            expect(node.isSelected).toBe(false);
        });

        it('should set highlight state', () => {
            const node = new StitchNode(StitchType.CHAIN);

            node.setHighlighted(true);
            expect(node.isHighlighted).toBe(true);

            node.setHighlighted(false);
            expect(node.isHighlighted).toBe(false);
        });
    });

    describe('type and color changes', () => {
        it('should change stitch type', () => {
            const node = new StitchNode(StitchType.CHAIN);
            node.changeType(StitchType.SINGLE_CROCHET);

            expect(node.type).toBe(StitchType.SINGLE_CROCHET);
            expect(node.definition).toBeDefined();
            expect(node.name).toBe('Single Crochet');
        });

        it('should change yarn color', () => {
            const node = new StitchNode(StitchType.CHAIN);
            node.changeColor(0x00FF00);

            expect(node.color).toBe(0x00FF00);
        });
    });

    describe('serialization', () => {
        it('should serialize to JSON', () => {
            const node = new StitchNode(StitchType.SINGLE_CROCHET, {
                id: 'test_id',
                row: 1,
                column: 2,
                color: 0xFF0000,
                position: { x: 1, y: 2, z: 3 }
            });

            const json = node.toJSON();

            expect(json.id).toBe('test_id');
            expect(json.type).toBe(StitchType.SINGLE_CROCHET);
            expect(json.row).toBe(1);
            expect(json.column).toBe(2);
            expect(json.color).toBe(0xFF0000);
            expect(json.position).toEqual({ x: 1, y: 2, z: 3 });
        });

        it('should serialize connections as IDs', () => {
            const nodeA = new StitchNode(StitchType.CHAIN, { id: 'node_a' });
            const nodeB = new StitchNode(StitchType.SINGLE_CROCHET, { id: 'node_b' });
            const nodeC = new StitchNode(StitchType.DOUBLE_CROCHET, { id: 'node_c' });

            nodeB.connectLeft(nodeA);
            nodeB.connectRight(nodeC);
            nodeB.connectBelow(nodeA);

            const json = nodeB.toJSON();

            expect(json.connections.left).toBe('node_a');
            expect(json.connections.right).toBe('node_c');
            expect(json.connections.below).toContain('node_a');
        });

        it('should deserialize from JSON', () => {
            const data = {
                id: 'restored_id',
                type: StitchType.DOUBLE_CROCHET,
                row: 3,
                column: 4,
                color: 0x0000FF,
                position: { x: 5, y: 6, z: 7 },
                metadata: { custom: 'data' }
            };

            const node = StitchNode.fromJSON(data);

            expect(node.id).toBe('restored_id');
            expect(node.type).toBe(StitchType.DOUBLE_CROCHET);
            expect(node.row).toBe(3);
            expect(node.column).toBe(4);
            expect(node.color).toBe(0x0000FF);
            expect(node.position.x).toBe(5);
            expect(node.position.y).toBe(6);
            expect(node.position.z).toBe(7);
            expect(node.metadata.custom).toBe('data');
        });

        it('should preserve data through serialize/deserialize cycle', () => {
            const original = new StitchNode(StitchType.HALF_DOUBLE_CROCHET, {
                row: 5,
                column: 10,
                color: 0x123456,
                position: { x: 1.5, y: 2.5, z: 3.5 },
                metadata: { note: 'test' }
            });

            const json = original.toJSON();
            const restored = StitchNode.fromJSON(json);

            expect(restored.type).toBe(original.type);
            expect(restored.row).toBe(original.row);
            expect(restored.column).toBe(original.column);
            expect(restored.color).toBe(original.color);
            expect(restored.position.x).toBe(original.position.x);
            expect(restored.position.y).toBe(original.position.y);
            expect(restored.position.z).toBe(original.position.z);
        });
    });
});
