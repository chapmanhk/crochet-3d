/**
 * Tests for RaycastManager interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RaycastManager } from '../src/interaction/RaycastManager.js';
import { EventBus, Events } from '../src/utils/EventBus.js';

describe('RaycastManager', () => {
    let sceneManager;
    let stitchRenderer;
    let manager;

    const createSceneManager = () => {
        const canvas = document.createElement('canvas');
        canvas.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 100,
            height: 100
        });
        return {
            domElement: canvas,
            camera: {},
            isHoveringAttachmentPoint: false
        };
    };

    const createNode = (id) => ({
        id,
        setHighlighted: vi.fn(),
        setSelected: vi.fn()
    });

    beforeEach(() => {
        EventBus.clear();
        sceneManager = createSceneManager();
        stitchRenderer = {
            getAllMeshes: vi.fn(() => []),
            updateSelectionVisual: vi.fn()
        };
        manager = new RaycastManager(sceneManager, stitchRenderer);
    });

    afterEach(() => {
        manager.dispose();
        document.body.innerHTML = '';
    });

    it('highlights node on hover and emits event', () => {
        const node = createNode('node-1');
        const mesh = { userData: { node } };
        manager.raycast = vi.fn(() => [{ object: mesh }]);
        const hovered = vi.fn();
        EventBus.on(Events.STITCH_HOVERED, hovered);

        manager.onMouseMove({ clientX: 10, clientY: 10 });

        expect(node.setHighlighted).toHaveBeenCalledWith(true);
        expect(stitchRenderer.updateSelectionVisual).toHaveBeenCalledWith(node);
        expect(hovered).toHaveBeenCalledWith({ node });
        expect(sceneManager.domElement.style.cursor).toBe('pointer');
    });

    it('clears hover when moving off a node', () => {
        const node = createNode('node-1');
        const mesh = { userData: { node } };
        manager.raycast = vi.fn(() => [{ object: mesh }]);
        manager.onMouseMove({ clientX: 10, clientY: 10 });

        const unhovered = vi.fn();
        EventBus.on(Events.STITCH_UNHOVERED, unhovered);
        manager.raycast = vi.fn(() => []);
        manager.onMouseMove({ clientX: 20, clientY: 20 });

        expect(node.setHighlighted).toHaveBeenCalledWith(false);
        expect(unhovered).toHaveBeenCalledWith({ node });
        expect(sceneManager.domElement.style.cursor).toBe('default');
    });

    it('clears hover when attachment points are active', () => {
        const node = createNode('node-1');
        manager.hoveredNode = node;
        sceneManager.isHoveringAttachmentPoint = true;
        const unhovered = vi.fn();
        EventBus.on(Events.STITCH_UNHOVERED, unhovered);

        manager.onMouseMove({ clientX: 10, clientY: 10 });

        expect(node.setHighlighted).toHaveBeenCalledWith(false);
        expect(manager.hoveredNode).toBeNull();
        expect(unhovered).toHaveBeenCalledWith({ node });
    });

    it('selects node on click and emits event', () => {
        const node = createNode('node-1');
        const mesh = { userData: { node } };
        manager.raycast = vi.fn(() => [{ object: mesh }]);
        const selected = vi.fn();
        EventBus.on(Events.STITCH_SELECTED, selected);

        manager.onClick({
            clientX: 10,
            clientY: 10,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        });

        expect(node.setSelected).toHaveBeenCalledWith(true);
        expect(stitchRenderer.updateSelectionVisual).toHaveBeenCalledWith(node);
        expect(manager.getSelection()).toHaveLength(1);
        expect(selected).toHaveBeenCalledWith({ node, isMultiple: false });
    });

    it('toggles selection with shift-click', () => {
        const node = createNode('node-1');
        const mesh = { userData: { node } };
        manager.raycast = vi.fn(() => [{ object: mesh }]);

        manager.onClick({
            clientX: 10,
            clientY: 10,
            shiftKey: true,
            ctrlKey: false,
            metaKey: false
        });

        expect(manager.getSelection()).toHaveLength(1);

        manager.onClick({
            clientX: 10,
            clientY: 10,
            shiftKey: true,
            ctrlKey: false,
            metaKey: false
        });

        expect(node.setSelected).toHaveBeenCalledWith(false);
        expect(manager.getSelection()).toHaveLength(0);
    });

    it('emits selection delete on Delete key', () => {
        const nodeA = createNode('node-1');
        const nodeB = createNode('node-2');
        manager.selectedNodes.add(nodeA);
        manager.selectedNodes.add(nodeB);
        const deleteSpy = vi.fn();
        EventBus.on('selection:delete', deleteSpy);

        manager.onKeyDown({ key: 'Delete' });

        expect(deleteSpy).toHaveBeenCalledTimes(1);
        const payload = deleteSpy.mock.calls[0][0];
        expect(payload.nodes).toHaveLength(2);
        expect(payload.nodes).toEqual(expect.arrayContaining([nodeA, nodeB]));
    });
});
