/**
 * Tests for StitchNode class (simplified)
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
            const node = new StitchNode(StitchType.SINGLE_CROCHET, {
                row: 2,
                column: 5,
                color: 0xFF0000,
                position: { x: 1, y: 2, z: 3 }
            });

            expect(node.type).toBe(StitchType.SINGLE_CROCHET);
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

        it('should default isTurningChain to false', () => {
            const node = new StitchNode(StitchType.CHAIN);
            expect(node.isTurningChain).toBe(false);
        });

        it('should accept isTurningChain option', () => {
            const node = new StitchNode(StitchType.CHAIN, { isTurningChain: true });
            expect(node.isTurningChain).toBe(true);
        });

        it('should use default color from definition', () => {
            const node = new StitchNode(StitchType.CHAIN);
            expect(node.color).toBe(0x8B4513);
        });

        it('should override color with custom value', () => {
            const node = new StitchNode(StitchType.CHAIN, { color: 0xFF0000 });
            expect(node.color).toBe(0xFF0000);
        });

        it('should initialize mesh as null', () => {
            const node = new StitchNode(StitchType.CHAIN);
            expect(node.mesh).toBeNull();
        });
    });

    describe('property accessors', () => {
        it('should return correct abbreviation', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);

            expect(chain.abbreviation).toBe('ch');
            expect(sc.abbreviation).toBe('sc');
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

            expect(chain.height).toBe(0.5);
            expect(sc.height).toBe(1.0);
        });

        it('should return correct width', () => {
            const chain = new StitchNode(StitchType.CHAIN);
            const sc = new StitchNode(StitchType.SINGLE_CROCHET);

            expect(chain.width).toBe(0.6);
            expect(sc.width).toBe(0.7);
        });

        it('should return effective connections', () => {
            const node = new StitchNode(StitchType.SINGLE_CROCHET);
            const connections = node.effectiveConnections;

            expect(connections.connectionsIn).toBe(1);
            expect(connections.connectionsOut).toBe(1);
        });

        it('should return available connections above', () => {
            const node = new StitchNode(StitchType.CHAIN);
            expect(node.availableConnectionsAbove).toBe(1);

            const upper = new StitchNode(StitchType.SINGLE_CROCHET);
            upper.connectBelow(node);
            expect(node.availableConnectionsAbove).toBe(0);
        });
    });

    describe('connections', () => {
        let nodeA, nodeB, nodeC;

        beforeEach(() => {
            nodeA = new StitchNode(StitchType.CHAIN);
            nodeB = new StitchNode(StitchType.SINGLE_CROCHET);
            nodeC = new StitchNode(StitchType.SINGLE_CROCHET);
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

        describe('connectRight', () => {
            it('should connect two nodes horizontally', () => {
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

        describe('disconnectAll', () => {
            it('should remove all connections', () => {
                nodeA.connectRight(nodeB);
                nodeB.connectRight(nodeC);
                nodeB.connectBelow(nodeA);

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

            it('should update vertical connected nodes', () => {
                nodeB.connectBelow(nodeA);
                nodeB.disconnectAll();

                expect(nodeA.connections.above).not.toContain(nodeB);
            });
        });
    });

    describe('setPosition', () => {
        it('should update position', () => {
            const node = new StitchNode(StitchType.CHAIN);
            node.setPosition(5, 10, 15);

            expect(node.position.x).toBe(5);
            expect(node.position.y).toBe(10);
            expect(node.position.z).toBe(15);
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

        it('should serialize isTurningChain flag', () => {
            const node = new StitchNode(StitchType.CHAIN, { isTurningChain: true });
            const json = node.toJSON();
            expect(json.isTurningChain).toBe(true);
        });

        it('should serialize connections as IDs', () => {
            const nodeA = new StitchNode(StitchType.CHAIN, { id: 'node_a' });
            const nodeB = new StitchNode(StitchType.SINGLE_CROCHET, { id: 'node_b' });
            const nodeC = new StitchNode(StitchType.CHAIN, { id: 'node_c' });

            nodeA.connectRight(nodeB);
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
                type: StitchType.SINGLE_CROCHET,
                row: 3,
                column: 4,
                color: 0x0000FF,
                position: { x: 5, y: 6, z: 7 }
            };

            const node = StitchNode.fromJSON(data);

            expect(node.id).toBe('restored_id');
            expect(node.type).toBe(StitchType.SINGLE_CROCHET);
            expect(node.row).toBe(3);
            expect(node.column).toBe(4);
            expect(node.color).toBe(0x0000FF);
            expect(node.position.x).toBe(5);
            expect(node.position.y).toBe(6);
            expect(node.position.z).toBe(7);
        });

        it('should restore isTurningChain from JSON', () => {
            const data = {
                id: 'tc_1',
                type: StitchType.CHAIN,
                row: 1,
                column: 0,
                color: 0x8B4513,
                position: { x: 0, y: 0, z: 0 },
                isTurningChain: true
            };

            const node = StitchNode.fromJSON(data);
            expect(node.isTurningChain).toBe(true);
        });

        it('should preserve data through serialize/deserialize cycle', () => {
            const original = new StitchNode(StitchType.SINGLE_CROCHET, {
                row: 5,
                column: 10,
                color: 0x123456,
                position: { x: 1.5, y: 2.5, z: 3.5 }
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
