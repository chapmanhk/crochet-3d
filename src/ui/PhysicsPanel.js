import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';

/**
 * PhysicsPanel - UI controls for physics simulation
 */

export class PhysicsPanel {
    constructor(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.panel = null;
        this.isExpanded = false;

        // Event subscriptions for cleanup
        this.eventSubs = new EventSubscriptions();

        this.createPanel();
        this.setupEventListeners();
    }

    /**
     * Create the physics control panel
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'physics-panel';
        this.panel.innerHTML = `
            <div class="physics-header">
                <span>Physics</span>
                <button class="physics-toggle" id="physics-toggle">▼</button>
            </div>
            <div class="physics-content" id="physics-content">
                <div class="physics-buttons">
                    <button class="physics-btn primary" id="btn-settle">
                        Settle
                    </button>
                    <button class="physics-btn" id="btn-reset">
                        Reset
                    </button>
                </div>

                <div class="physics-status" id="physics-status">
                    Ready
                </div>

                <div class="physics-controls">
                    <label>
                        <input type="checkbox" id="chk-gravity" checked>
                        Gravity
                    </label>

                    <label>
                        <input type="checkbox" id="chk-ground" checked>
                        Ground Collision
                    </label>

                    <label>
                        <input type="checkbox" id="chk-shear" checked>
                        Shear Constraints
                    </label>

                    <label>
                        <input type="checkbox" id="chk-bend" checked>
                        Bend Constraints
                    </label>

                    <div class="slider-group">
                        <label>Stiffness</label>
                        <input type="range" id="slider-stiffness"
                               min="0.1" max="1" step="0.1" value="0.8">
                        <span id="val-stiffness">0.8</span>
                    </div>

                    <div class="slider-group">
                        <label>Gravity</label>
                        <input type="range" id="slider-gravity"
                               min="0" max="2" step="0.1" value="0.5">
                        <span id="val-gravity">0.5</span>
                    </div>

                    <div class="slider-group">
                        <label>Damping</label>
                        <input type="range" id="slider-damping"
                               min="0.9" max="0.99" step="0.01" value="0.97">
                        <span id="val-damping">0.97</span>
                    </div>
                </div>

                <div class="physics-stats" id="physics-stats">
                    Bodies: 0 | Constraints: 0
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .physics-panel {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                z-index: 1000;
                min-width: 200px;
            }

            .physics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f5f5f5;
                border-radius: 8px 8px 0 0;
                cursor: pointer;
                font-weight: 600;
            }

            .physics-toggle {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                color: #666;
                transition: transform 0.2s;
            }

            .physics-panel.expanded .physics-toggle {
                transform: rotate(180deg);
            }

            .physics-content {
                display: none;
                padding: 12px;
            }

            .physics-panel.expanded .physics-content {
                display: block;
            }

            .physics-buttons {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }

            .physics-btn {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.15s;
            }

            .physics-btn:hover {
                background: #f5f5f5;
            }

            .physics-btn.primary {
                background: #4CAF50;
                color: white;
                border-color: #4CAF50;
            }

            .physics-btn.primary:hover {
                background: #45a049;
            }

            .physics-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .physics-status {
                text-align: center;
                padding: 8px;
                background: #f9f9f9;
                border-radius: 4px;
                margin-bottom: 12px;
                color: #666;
            }

            .physics-status.running {
                background: #e3f2fd;
                color: #1976d2;
            }

            .physics-status.settling {
                background: #fff3e0;
                color: #f57c00;
            }

            .physics-controls {
                margin-bottom: 12px;
            }

            .physics-controls label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                cursor: pointer;
            }

            .slider-group {
                margin: 12px 0;
            }

            .slider-group label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                color: #666;
            }

            .slider-group input[type="range"] {
                width: calc(100% - 40px);
                margin-right: 8px;
            }

            .slider-group span {
                font-size: 12px;
                color: #999;
            }

            .physics-stats {
                font-size: 11px;
                color: #999;
                text-align: center;
                padding-top: 8px;
                border-top: 1px solid #eee;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.panel);

        // Setup interactions
        this.setupInteractions();
    }

    /**
     * Setup panel interactions
     */
    setupInteractions() {
        // Toggle panel
        const header = this.panel.querySelector('.physics-header');
        header.addEventListener('click', () => this.toggle());

        // Settle button
        this.panel.querySelector('#btn-settle').addEventListener('click', () => {
            this.physicsEngine.settle();
        });

        // Reset button
        this.panel.querySelector('#btn-reset').addEventListener('click', () => {
            this.physicsEngine.stop();
            this.physicsEngine.resetPositions();
            this.updateStatus('Reset complete');
        });

        // Gravity checkbox
        this.panel.querySelector('#chk-gravity').addEventListener('change', (e) => {
            this.physicsEngine.setParams({ enableGravity: e.target.checked });
        });

        // Ground checkbox
        this.panel.querySelector('#chk-ground').addEventListener('change', (e) => {
            this.physicsEngine.setParams({ enableGround: e.target.checked });
        });

        // Shear checkbox
        this.panel.querySelector('#chk-shear').addEventListener('change', (e) => {
            this.physicsEngine.setParams({ enableShear: e.target.checked });
        });

        // Bend checkbox
        this.panel.querySelector('#chk-bend').addEventListener('change', (e) => {
            this.physicsEngine.setParams({ enableBend: e.target.checked });
        });

        // Stiffness slider
        const stiffnessSlider = this.panel.querySelector('#slider-stiffness');
        stiffnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.panel.querySelector('#val-stiffness').textContent = value.toFixed(1);
            this.physicsEngine.setParams({ stiffness: value });
        });

        // Gravity slider
        const gravitySlider = this.panel.querySelector('#slider-gravity');
        gravitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.panel.querySelector('#val-gravity').textContent = value.toFixed(1);
            this.physicsEngine.params.gravity.y = -value;
        });

        // Damping slider
        const dampingSlider = this.panel.querySelector('#slider-damping');
        dampingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.panel.querySelector('#val-damping').textContent = value.toFixed(2);
            this.physicsEngine.setParams({ damping: value });
        });

        // Start expanded
        this.toggle();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventSubs.on(Events.PHYSICS_STARTED, () => {
            this.updateStatus('Simulating...', 'running');
            this.panel.querySelector('#btn-settle').disabled = true;
        });

        this.eventSubs.on(Events.PHYSICS_SETTLED, () => {
            this.updateStatus('Settled', '');
            this.panel.querySelector('#btn-settle').disabled = false;
        });

        this.eventSubs.on(Events.PHYSICS_STEP, ({ totalMovement, bodyCount, constraintCount }) => {
            this.panel.querySelector('#physics-stats').textContent =
                `Bodies: ${bodyCount} | Constraints: ${constraintCount}`;

            if (this.physicsEngine.isSettling) {
                const progress = Math.round(this.physicsEngine.settleFrames / this.physicsEngine.maxSettleFrames * 100);
                this.updateStatus(`Settling... ${progress}%`, 'settling');
            }
        });
    }

    /**
     * Toggle panel expanded state
     */
    toggle() {
        this.isExpanded = !this.isExpanded;
        this.panel.classList.toggle('expanded', this.isExpanded);
    }

    /**
     * Update status display
     */
    updateStatus(text, className = '') {
        const status = this.panel.querySelector('#physics-status');
        status.textContent = text;
        status.className = 'physics-status ' + className;
    }

    /**
     * Dispose
     */
    dispose() {
        // Clean up all event subscriptions
        this.eventSubs.dispose();

        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
    }
}
