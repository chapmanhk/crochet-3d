/**
 * Tests for main entry point initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../src/utils/EventBus.js';

vi.mock('../src/core/Pattern.js', () => ({
    Pattern: class MockPattern {
        constructor() {
            this.graph = {
                getAllNodes: () => [],
                size: 0
            };
            this.graphListeners = {};
            this.setupGraphListeners = vi.fn();
        }
        dispose() {}
    }
}));

vi.mock('../src/rendering/SceneManager.js', () => ({
    SceneManager: class MockSceneManager {
        constructor() {
            this.controls = { target: { x: 0, y: 0, z: 0 }, update: vi.fn() };
            this.isUserInteracting = false;
            this.lastControlInteraction = 0;
            this.onUpdate = vi.fn(() => () => {});
            this.start = vi.fn();
            this.dispose = vi.fn();
        }
        lookAt() {}
    }
}));

vi.mock('../src/rendering/StitchRenderer.js', () => ({
    StitchRenderer: class MockStitchRenderer {
        constructor() {
            this.renderPattern = vi.fn();
            this.dispose = vi.fn();
        }
    }
}));

vi.mock('../src/ui/UIManager.js', () => ({
    UIManager: class MockUIManager {
        constructor() {
            this.dispose = vi.fn();
        }
    }
}));

describe('main entry', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        delete window.crochetApp;
        vi.resetModules();
    });

    it('initializes the app and exposes it on window', async () => {
        await import('../src/main.js');

        expect(window.crochetApp).toBeDefined();
        expect(window.crochetApp.sceneManager.start).toHaveBeenCalled();
    });
});
