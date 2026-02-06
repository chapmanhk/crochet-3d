/**
 * Crochet 3D Pattern Designer - Simplified
 *
 * Just chains and single crochet, one after the other.
 */

import { Pattern } from './core/Pattern.js';
import { SceneManager } from './rendering/SceneManager.js';
import { StitchRenderer } from './rendering/StitchRenderer.js';
import { UIManager } from './ui/UIManager.js';
import { EventBus, Events } from './utils/EventBus.js';
import { SceneConstants } from './utils/Constants.js';

class CrochetApp {
    constructor() {
        this.pattern = null;
        this.sceneManager = null;
        this.stitchRenderer = null;
        this.uiManager = null;

        this.cameraFollowTarget = null;
        this.cameraFollowActive = false;

        this.init();
    }

    init() {
        try {
            this.pattern = new Pattern();
            this.sceneManager = new SceneManager(document.body);
            this.stitchRenderer = new StitchRenderer(this.sceneManager);
            this.uiManager = new UIManager(this.pattern);

            this.setupEventHandlers();
            this.setupCameraFollow();
            this.sceneManager.start();

            console.log('Crochet 3D ready! Press C for chain, S to add SC, N for new row.');
        } catch (err) {
            console.error('Failed to initialize:', err);
            const msg = document.createElement('p');
            msg.style.cssText = 'padding: 40px; text-align: center; font-family: sans-serif;';
            msg.textContent = `Failed to start: ${err.message}`;
            document.body.innerHTML = '';
            document.body.appendChild(msg);
        }
    }

    setupEventHandlers() {
        EventBus.on(Events.STITCH_ADDED, () => this.updateCameraTarget());
        EventBus.on(Events.ROW_ADDED, () => this.updateCameraTarget());
        EventBus.on(Events.PATTERN_LOADED, () => this.updateCameraTarget());
    }

    setupCameraFollow() {
        const currentTarget = this.sceneManager.controls.target;
        this.cameraFollowTarget = {
            x: currentTarget.x,
            y: currentTarget.y,
            z: currentTarget.z
        };
        this.cameraFollowActive = true;
        this.sceneManager.onUpdate(() => this.applyCameraFollow());
    }

    updateCameraTarget() {
        const bounds = this.calculatePatternBounds();
        if (bounds.height > 0 || bounds.width > 0) {
            const targetX = bounds.centerX;
            const targetY = bounds.centerY + SceneConstants.CAMERA_FOLLOW_Y_OFFSET;

            if (!this.cameraFollowTarget) {
                this.cameraFollowTarget = { x: targetX, y: targetY, z: 0 };
                this.cameraFollowActive = true;
                return;
            }

            this.cameraFollowTarget.x = targetX;
            this.cameraFollowTarget.y = targetY;
            this.cameraFollowTarget.z = 0;
            this.cameraFollowActive = true;
        }
    }

    applyCameraFollow() {
        if (!this.cameraFollowActive || !this.cameraFollowTarget) return;

        const now = performance.now();
        if (this.sceneManager.isUserInteracting &&
            now - this.sceneManager.lastControlInteraction < SceneConstants.CAMERA_FOLLOW_IDLE_DELAY_MS) {
            return;
        }

        const currentTarget = this.sceneManager.controls.target;
        const dx = this.cameraFollowTarget.x - currentTarget.x;
        const dy = this.cameraFollowTarget.y - currentTarget.y;
        const dz = this.cameraFollowTarget.z - currentTarget.z;

        const minDelta = SceneConstants.CAMERA_FOLLOW_MIN_DELTA;
        if (dx * dx + dy * dy + dz * dz < minDelta * minDelta) return;

        const lerpFactor = SceneConstants.CAMERA_FOLLOW_LERP;
        currentTarget.x += dx * lerpFactor;
        currentTarget.y += dy * lerpFactor;
        currentTarget.z += dz * lerpFactor;

        this.sceneManager.controls.update();
    }

    calculatePatternBounds() {
        const defaultBounds = { centerX: 0, centerY: 0, width: 0, height: 0 };
        if (!this.pattern?.graph) return defaultBounds;

        const nodes = this.pattern.graph.getAllNodes();
        if (!nodes || nodes.length === 0) return defaultBounds;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            if (node?.position) {
                const x = Number.isFinite(node.position.x) ? node.position.x : 0;
                const y = Number.isFinite(node.position.y) ? node.position.y : 0;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX) ||
            !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            return defaultBounds;
        }

        return {
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    dispose() {
        this.uiManager.dispose();
        this.stitchRenderer.dispose();
        this.sceneManager.dispose();
        if (this.pattern) this.pattern.dispose();
    }
}

let app;
try {
    app = new CrochetApp();
} catch (err) {
    console.error('Critical error:', err);
}

window.crochetApp = app;
