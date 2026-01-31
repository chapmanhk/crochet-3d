/**
 * Tests for main entry point initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../src/utils/EventBus.js';

const createMockClass = (methods = []) => {
    return class {
        constructor() {
            methods.forEach((name) => {
                this[name] = vi.fn();
            });
        }
    };
};

vi.mock('../src/core/Pattern.js', () => ({
    Pattern: class MockPattern {
        constructor() {
            this.graph = {
                getAllNodes: () => [],
                size: 0
            };
            this.metadata = { name: '', author: '' };
        }
        removeStitch() {}
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
    StitchRenderer: createMockClass(['renderPattern', 'dispose'])
}));

vi.mock('../src/interaction/RaycastManager.js', () => ({
    RaycastManager: createMockClass(['dispose'])
}));

vi.mock('../src/interaction/AttachmentPointManager.js', () => ({
    AttachmentPointManager: createMockClass(['dispose'])
}));

vi.mock('../src/physics/PhysicsEngine.js', () => ({
    PhysicsEngine: class MockPhysicsEngine {
        constructor() {
            this.settle = vi.fn();
            this.dispose = vi.fn();
        }
    }
}));

vi.mock('../src/ui/UIManager.js', () => ({
    UIManager: createMockClass(['dispose'])
}));

vi.mock('../src/ui/PhysicsPanel.js', () => ({
    PhysicsPanel: createMockClass(['dispose'])
}));

vi.mock('../src/ui/Modal.js', () => ({
    showAlert: vi.fn(() => Promise.resolve())
}));

vi.mock('../src/utils/PatternSchema.js', () => ({
    validatePatternData: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
    formatValidationResult: vi.fn(() => '')
}));

describe('main entry', () => {
    beforeEach(() => {
        EventBus.clear();
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
