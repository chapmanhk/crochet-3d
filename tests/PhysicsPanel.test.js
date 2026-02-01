/**
 * Tests for PhysicsPanel UI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsPanel } from '../src/ui/PhysicsPanel.js';
import { EventBus, Events } from '../src/utils/EventBus.js';

class MockPhysicsEngine {
    constructor() {
        this.params = {
            gravity: { y: -0.5 }
        };
        this.isSettling = false;
        this.settleFrames = 0;
        this.maxSettleFrames = 100;
        this.settle = vi.fn();
        this.stop = vi.fn();
        this.resetPositions = vi.fn();
        this.setParams = vi.fn((params) => {
            Object.assign(this.params, params);
        });
    }
}

describe('PhysicsPanel', () => {
    let physicsEngine;
    let panel;

    beforeEach(() => {
        EventBus.clear();
        document.body.innerHTML = '';
        physicsEngine = new MockPhysicsEngine();
        panel = new PhysicsPanel(physicsEngine);
    });

    afterEach(() => {
        panel.dispose();
        document.body.innerHTML = '';
    });

    it('creates panel and toggles expanded state', () => {
        const panelEl = panel.panel;
        expect(panelEl).not.toBeNull();
        expect(panelEl.classList.contains('expanded')).toBe(true);

        const header = panelEl.querySelector('.physics-header');
        header.click();
        expect(panelEl.classList.contains('expanded')).toBe(false);
    });

    it('calls settle on settle button click', () => {
        const settleBtn = panel.panel.querySelector('#btn-settle');
        settleBtn.click();
        expect(physicsEngine.settle).toHaveBeenCalledTimes(1);
    });

    it('calls reset and updates status on reset click', () => {
        const resetBtn = panel.panel.querySelector('#btn-reset');
        resetBtn.click();

        expect(physicsEngine.stop).toHaveBeenCalledTimes(1);
        expect(physicsEngine.resetPositions).toHaveBeenCalledTimes(1);
        expect(panel.panel.querySelector('#physics-status').textContent).toBe('Reset complete');
    });

    it('updates parameters from toggles', () => {
        const gravityToggle = panel.panel.querySelector('#chk-gravity');
        gravityToggle.checked = false;
        gravityToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ enableGravity: false });

        const groundToggle = panel.panel.querySelector('#chk-ground');
        groundToggle.checked = false;
        groundToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ enableGround: false });

        const shearToggle = panel.panel.querySelector('#chk-shear');
        shearToggle.checked = false;
        shearToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ enableShear: false });

        const bendToggle = panel.panel.querySelector('#chk-bend');
        bendToggle.checked = false;
        bendToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ enableBend: false });
    });

    it('updates parameters from sliders', () => {
        const stiffnessSlider = panel.panel.querySelector('#slider-stiffness');
        stiffnessSlider.value = '0.6';
        stiffnessSlider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(panel.panel.querySelector('#val-stiffness').textContent).toBe('0.6');
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ stiffness: 0.6 });

        const dampingSlider = panel.panel.querySelector('#slider-damping');
        dampingSlider.value = '0.95';
        dampingSlider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(panel.panel.querySelector('#val-damping').textContent).toBe('0.95');
        expect(physicsEngine.setParams).toHaveBeenCalledWith({ damping: 0.95 });
    });

    it('updates gravity value from slider', () => {
        const gravitySlider = panel.panel.querySelector('#slider-gravity');
        gravitySlider.value = '1.2';
        gravitySlider.dispatchEvent(new Event('input', { bubbles: true }));

        expect(panel.panel.querySelector('#val-gravity').textContent).toBe('1.2');
        expect(physicsEngine.params.gravity.y).toBe(-1.2);
    });

    it('reacts to physics events', () => {
        const settleBtn = panel.panel.querySelector('#btn-settle');

        EventBus.emit(Events.PHYSICS_STARTED);
        expect(panel.panel.querySelector('#physics-status').textContent).toBe('Simulating...');
        expect(settleBtn.disabled).toBe(true);

        physicsEngine.isSettling = true;
        physicsEngine.settleFrames = 5;
        physicsEngine.maxSettleFrames = 10;
        EventBus.emit(Events.PHYSICS_STEP, { totalMovement: 0, bodyCount: 3, constraintCount: 4 });

        expect(panel.panel.querySelector('#physics-stats').textContent).toBe('Bodies: 3 | Constraints: 4');
        expect(panel.panel.querySelector('#physics-status').textContent).toBe('Settling... 50%');

        EventBus.emit(Events.PHYSICS_SETTLED);
        expect(panel.panel.querySelector('#physics-status').textContent).toBe('Settled');
        expect(settleBtn.disabled).toBe(false);
    });

    describe('WCAG Contrast Compliance', () => {
        it('should use accessible contrast for slider value displays', () => {
            // Get the style element added by PhysicsPanel
            const styles = Array.from(document.querySelectorAll('style'));
            const physicsStyle = styles.find(s => s.textContent.includes('.physics-panel'));
            expect(physicsStyle).not.toBeNull();

            const styleContent = physicsStyle.textContent;

            // Verify .slider-group span uses #757575 instead of #999
            expect(styleContent).toContain('.slider-group span');
            expect(styleContent).toContain('color: #757575');

            // Should not contain the old low-contrast color
            const spanStyleMatch = styleContent.match(/\.slider-group span\s*\{[^}]*color:\s*#999/);
            expect(spanStyleMatch).toBeNull();
        });

        it('should use accessible contrast for physics stats', () => {
            const styles = Array.from(document.querySelectorAll('style'));
            const physicsStyle = styles.find(s => s.textContent.includes('.physics-panel'));
            expect(physicsStyle).not.toBeNull();

            const styleContent = physicsStyle.textContent;

            // Verify .physics-stats uses #757575 instead of #999
            expect(styleContent).toContain('.physics-stats');
            expect(styleContent).toContain('color: #757575');

            // Should not contain the old low-contrast color
            const statsStyleMatch = styleContent.match(/\.physics-stats\s*\{[^}]*color:\s*#999/);
            expect(statsStyleMatch).toBeNull();
        });
    });
});
