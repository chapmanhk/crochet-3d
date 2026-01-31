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
        expect(renderer.getMesh(node)).toBe(mesh);
        expect(node.mesh).toBe(mesh);
        expect(mesh.userData.node).toBe(node);
        expect(sceneManager.addStitchMesh).toHaveBeenCalledWith(mesh);
    });

    it('updates selection visuals without errors', () => {
        const node = new StitchNode(StitchType.SINGLE_CROCHET);
        renderer.createMeshForNode(node);

        node.setSelected(true);
        renderer.updateSelectionVisual(node);
        const mesh = renderer.getMesh(node);
        expect(mesh.material).toBeDefined();

        node.setSelected(false);
        node.setHighlighted(true);
        renderer.updateSelectionVisual(node);
        expect(mesh.material).toBeDefined();
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
        renderer.updateConnectionMeshes();

        const mesh = Array.from(renderer.connectionMeshes.values())[0];
        expect(mesh.position.x).toBe(1);
        expect(mesh.position.y).toBe(0);
        expect(mesh.position.z).toBe(0);
        expect(mesh.scale.y).toBe(2);
    });
});
