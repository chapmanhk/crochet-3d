/**
 * Tests for AttachmentPointManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AttachmentPointManager } from '../src/interaction/AttachmentPointManager.js';
import { EventBus, Events } from '../src/utils/EventBus.js';
import { StitchType } from '../src/core/StitchTypes.js';
import { StitchValidator } from '../src/core/StitchValidator.js';
import { AttachmentConstants } from '../src/utils/Constants.js';
import { showAlert } from '../src/ui/Modal.js';

vi.mock('../src/ui/Modal.js', () => ({
    showAlert: vi.fn(() => Promise.resolve())
}));

describe('AttachmentPointManager', () => {
    let sceneManager;
    let pattern;
    let manager;
    let row0;

    beforeEach(() => {
        EventBus.clear();
        showAlert.mockClear();
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
            startNewRow: vi.fn(),
            addStitch: vi.fn()
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

    it('handles click on new row indicator', async () => {
        const mesh = {
            userData: { isNewRowIndicator: true, isAttachmentPoint: true }
        };
        manager.hoveredPoint = mesh;
        const updateSpy = vi.spyOn(manager, 'updateAttachmentPoints');

        await manager.onClick();

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

    it('restores suggested scale after hover ends', () => {
        manager.updateAttachmentPoints();
        const mesh = manager.pointMeshes[0];
        manager.hoveredPoint = mesh;
        mesh.scale.setScalar(AttachmentConstants.HOVER_SCALE);

        sceneManager.domElement.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 100,
            height: 100
        });

        manager.onMouseMove({ clientX: 0, clientY: 0 });

        expect(mesh.scale.x).toBeCloseTo(AttachmentConstants.GHOST_SCALE * 1.2);
        expect(manager.hoveredPoint).toBe(null);
    });

    it('blocks invalid stitch placements and shows modal', async () => {
        const validationSpy = vi.spyOn(StitchValidator, 'canPlaceStitch').mockReturnValue({
            valid: false,
            warnings: [],
            errors: ['Invalid stitch'],
            suggestions: []
        });

        manager.updateAttachmentPoints();
        manager.hoveredPoint = manager.pointMeshes[0];

        await manager.onClick({});

        expect(validationSpy).toHaveBeenCalled();
        expect(showAlert).toHaveBeenCalledWith('Invalid stitch', 'Cannot Place Stitch');
        expect(pattern.addStitch).not.toHaveBeenCalled();
        validationSpy.mockRestore();
    });
});
