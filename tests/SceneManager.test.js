/**
 * Tests for SceneManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SceneManager } from '../src/rendering/SceneManager.js';
import { SceneConstants } from '../src/utils/Constants.js';

describe('SceneManager', () => {
    let container;
    let sceneManager;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        sceneManager = new SceneManager(container);
    });

    afterEach(() => {
        sceneManager.dispose();
        document.body.innerHTML = '';
    });

    it('creates renderer and attaches canvas to container', () => {
        expect(sceneManager.renderer).toBeDefined();
        expect(container.contains(sceneManager.renderer.domElement)).toBe(true);
    });

    it('creates scene groups for stitches, helpers, and UI', () => {
        expect(sceneManager.stitchGroup).toBeDefined();
        expect(sceneManager.helperGroup).toBeDefined();
        expect(sceneManager.uiGroup).toBeDefined();

        expect(sceneManager.stitchGroup.name).toBe('stitches');
        expect(sceneManager.helperGroup.name).toBe('helpers');
        expect(sceneManager.uiGroup.name).toBe('ui');
    });

    it('sets view modes and updates camera', () => {
        const result = sceneManager.setViewMode('top');
        expect(result).toBe(true);
        expect(sceneManager.camera.position.x).toBe(SceneConstants.VIEW_TOP_POSITION.x);
        expect(sceneManager.controls.target.x).toBe(SceneConstants.VIEW_TOP_TARGET.x);

        sceneManager.setViewMode('front');
        expect(sceneManager.camera.position.z).toBe(SceneConstants.VIEW_FRONT_POSITION.z);

        sceneManager.setViewMode('side');
        expect(sceneManager.camera.position.x).toBe(SceneConstants.VIEW_SIDE_POSITION.x);
    });

    it('falls back to perspective on invalid mode', () => {
        const result = sceneManager.setViewMode('invalid');
        expect(result).toBe(true);
    });

    it('updates on resize with valid dimensions', () => {
        const setSizeSpy = sceneManager.renderer.setSize;
        const updateProjectionSpy = sceneManager.camera.updateProjectionMatrix;

        Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

        sceneManager.onWindowResize();

        expect(updateProjectionSpy).toHaveBeenCalled();
        expect(setSizeSpy).toHaveBeenCalledWith(800, 600);
    });

    it('avoids resize when dimensions are invalid', () => {
        const setSizeSpy = sceneManager.renderer.setSize;

        Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 0, configurable: true });

        sceneManager.onWindowResize();

        expect(setSizeSpy).not.toHaveBeenCalled();
    });

    it('registers and removes update callbacks', () => {
        const callback = vi.fn();
        const unsubscribe = sceneManager.onUpdate(callback);
        expect(sceneManager.updateCallbacks).toContain(callback);

        unsubscribe();
        expect(sceneManager.updateCallbacks).not.toContain(callback);
    });

    it('starts and stops animation loop', () => {
        const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
        const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

        sceneManager.start();
        expect(sceneManager.isRunning).toBe(true);
        expect(rafSpy).toHaveBeenCalled();

        sceneManager.stop();
        expect(sceneManager.isRunning).toBe(false);
        expect(cancelSpy).toHaveBeenCalled();

        rafSpy.mockRestore();
        cancelSpy.mockRestore();
    });
});
