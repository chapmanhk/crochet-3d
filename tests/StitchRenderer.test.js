/**
 * Tests for StitchRenderer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StitchRenderer } from '../src/rendering/StitchRenderer.js';
import { StitchNode } from '../src/core/StitchNode.js';
import { StitchType } from '../src/core/StitchTypes.js';

describe('StitchRenderer', () => {
    let sceneManager;
    let renderer;

    beforeEach(() => {
        sceneManager = {
            addStitchMesh: vi.fn(),
            removeStitchMesh: vi.fn()
        };
        renderer = new StitchRenderer(sceneManager);
    });

    afterEach(() => {
        renderer.dispose();
    });

    it('creates mesh for a node and stores references', () => {
        const node = new StitchNode(StitchType.SINGLE_CROCHET, {
            position: { x: 1, y: 2, z: 3 },
            color: 0xff0000
        });

        const mesh = renderer.createMeshForNode(node);

        expect(mesh).toBeDefined();
        expect(renderer.meshMap.get(node.id)).toBe(mesh);
        expect(node.mesh).toBe(mesh);
        expect(mesh.userData.node).toBe(node);
        expect(sceneManager.addStitchMesh).toHaveBeenCalledWith(mesh);
    });

    it('returns existing mesh if already created', () => {
        const node = new StitchNode(StitchType.SINGLE_CROCHET);
        const mesh1 = renderer.createMeshForNode(node);
        const mesh2 = renderer.createMeshForNode(node);

        expect(mesh1).toBe(mesh2);
    });

    it('rebuilds connection meshes for linked nodes', () => {
        const nodeA = new StitchNode(StitchType.CHAIN, { position: { x: 0, y: 0, z: 0 } });
        const nodeB = new StitchNode(StitchType.CHAIN, { position: { x: 1, y: 0, z: 0 } });
        nodeA.connectRight(nodeB);

        const nodeC = new StitchNode(StitchType.SINGLE_CROCHET, { position: { x: 0, y: 1, z: 0 } });
        nodeC.connectBelow(nodeA);

        renderer.pattern = {
            graph: {
                getAllNodes: () => [nodeA, nodeB, nodeC]
            }
        };

        renderer.rebuildConnectionMeshes();

        expect(renderer.connectionMeshes.size).toBe(2);
        expect(sceneManager.addStitchMesh).toHaveBeenCalledTimes(2);
    });

    it('updates connection mesh positions', () => {
        const nodeA = new StitchNode(StitchType.CHAIN, { position: { x: 0, y: 0, z: 0 } });
        const nodeB = new StitchNode(StitchType.CHAIN, { position: { x: 2, y: 0, z: 0 } });
        nodeA.connectRight(nodeB);

        renderer.pattern = {
            graph: {
                getAllNodes: () => [nodeA, nodeB]
            }
        };

        renderer.rebuildConnectionMeshes();

        const mesh = Array.from(renderer.connectionMeshes.values())[0];
        expect(mesh.position.x).toBe(1);
        expect(mesh.position.y).toBe(0);
        expect(mesh.position.z).toBe(0);
        expect(mesh.scale.y).toBe(2);
    });

    it('clears all meshes', () => {
        const node = new StitchNode(StitchType.CHAIN);
        renderer.createMeshForNode(node);

        renderer.clearAllMeshes();

        expect(renderer.meshMap.size).toBe(0);
        expect(sceneManager.removeStitchMesh).toHaveBeenCalled();
    });

    it('removes mesh for specific node', () => {
        const node = new StitchNode(StitchType.CHAIN);
        renderer.createMeshForNode(node);

        renderer.removeMeshForNode(node);

        expect(renderer.meshMap.has(node.id)).toBe(false);
        expect(sceneManager.removeStitchMesh).toHaveBeenCalled();
    });

    it('renders all nodes from a pattern', () => {
        const nodeA = new StitchNode(StitchType.CHAIN);
        const nodeB = new StitchNode(StitchType.SINGLE_CROCHET);

        const mockPattern = {
            graph: {
                getAllNodes: () => [nodeA, nodeB]
            }
        };

        renderer.renderPattern(mockPattern);

        expect(renderer.meshMap.size).toBe(2);
    });

    it('disposes all resources', () => {
        const node = new StitchNode(StitchType.CHAIN);
        renderer.createMeshForNode(node);

        renderer.dispose();

        expect(renderer.meshMap.size).toBe(0);
        expect(renderer.geometryCache.size).toBe(0);
    });
});
