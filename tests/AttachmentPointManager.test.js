/**
 * Tests for AttachmentPointManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AttachmentPointManager } from '../src/interaction/AttachmentPointManager.js';
import { EventBus, Events } from '../src/utils/EventBus.js';
import { StitchType } from '../src/core/StitchTypes.js';

describe('AttachmentPointManager', () => {
    let sceneManager;
    let pattern;
    let manager;
    let row0;

    beforeEach(() => {
        EventBus.clear();
        row0 = [
            { position: { x: 0, y: 0, z: 0 }, height: 1, column: 0, connections: {} },
            { position: { x: 1, y: 0, z: 0 }, height: 1, column: 1, connections: {} }
        ];

        pattern = {
            currentRow: 0,
            workingDirection: 'right',
            currentWorkIntoSpace: false,
            currentSkipCount: 0,
            currentModifiers: [],
            currentLoopSelection: 'both',
            graph: {
                getRowSorted: (row) => (row === 0 ? row0 : []),
                getRow: (row) => (row === 0 ? row0 : [])
            },
            getAttachmentPoints: vi.fn(() => [
                { stitch: row0[0], type: 'above', available: true, suggested: true }
            ]),
            getChainSpaces: vi.fn(() => []),
            startNewRow: vi.fn()
        };

        sceneManager = {
            scene: { add: vi.fn(), remove: vi.fn() },
            domElement: document.createElement('canvas'),
            camera: {},
            isHoveringAttachmentPoint: false
        };

        manager = new AttachmentPointManager(sceneManager, pattern);
    });

    afterEach(() => {
        manager.dispose();
        document.body.innerHTML = '';
    });

    it('creates point meshes for available attachment points', () => {
        manager.updateAttachmentPoints();

        expect(manager.pointMeshes).toHaveLength(1);
        expect(manager.pointMeshes[0].userData.isAttachmentPoint).toBe(true);
        expect(manager.pointMeshes[0].userData.attachmentPoint.stitch).toBe(row0[0]);
    });

    it('adds a new row indicator when no available points', () => {
        pattern.getAttachmentPoints.mockReturnValue([]);

        manager.updateAttachmentPoints();

        expect(manager.pointMeshes).toHaveLength(1);
        expect(manager.pointMeshes[0].userData.isNewRowIndicator).toBe(true);
    });

    it('handles click on new row indicator', () => {
        const mesh = {
            userData: { isNewRowIndicator: true, isAttachmentPoint: true }
        };
        manager.hoveredPoint = mesh;
        const updateSpy = vi.spyOn(manager, 'updateAttachmentPoints');

        manager.onClick();

        expect(pattern.startNewRow).toHaveBeenCalledWith({ stitchType: manager.previewStitchType });
        expect(updateSpy).toHaveBeenCalled();
    });

    it('updates preview stitch type when stitch type selected', () => {
        const updateSpy = vi.spyOn(manager, 'updateAttachmentPoints');

        EventBus.emit(Events.STITCH_TYPE_SELECTED, { type: StitchType.DOUBLE_CROCHET });

        expect(manager.previewStitchType).toBe(StitchType.DOUBLE_CROCHET);
        expect(updateSpy).toHaveBeenCalled();
    });

    it('defaults suggested chain space when working into space', () => {
        pattern.currentWorkIntoSpace = true;
        pattern.getChainSpaces.mockReturnValue([
            { stitch: row0[0], type: 'chain-space', available: true }
        ]);

        manager.updateAttachmentPoints();

        expect(pattern.getChainSpaces).toHaveBeenCalled();
        expect(manager.pointMeshes).toHaveLength(1);
        expect(manager.pointMeshes[0].userData.attachmentPoint.suggested).toBe(true);
    });
});
