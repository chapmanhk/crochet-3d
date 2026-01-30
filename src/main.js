/**
 * Crochet 3D Pattern Designer
 *
 * Main application entry point
 * Initializes all modules and starts the application
 */

import { Pattern } from './core/Pattern.js';
import { SceneManager } from './rendering/SceneManager.js';
import { StitchRenderer } from './rendering/StitchRenderer.js';
import { RaycastManager } from './interaction/RaycastManager.js';
import { AttachmentPointManager } from './interaction/AttachmentPointManager.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { UIManager } from './ui/UIManager.js';
import { PhysicsPanel } from './ui/PhysicsPanel.js';
import { EventBus, Events } from './utils/EventBus.js';
import { showAlert } from './ui/Modal.js';
import { validatePatternData, formatValidationResult } from './utils/PatternSchema.js';

/**
 * Global error handler to catch unhandled errors
 * Prevents application crashes and logs errors for debugging
 */
function setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        console.error('Uncaught error:', event.error || event.message);
        // Prevent the error from bubbling up
        event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Prevent the rejection from throwing
        event.preventDefault();
    });

    // Handle WebGL context loss gracefully
    window.addEventListener('webglcontextlost', (event) => {
        console.error('WebGL context lost. The 3D view may need to be refreshed.');
        event.preventDefault();
    });

    // Handle WebGL context restoration
    window.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored.');
    });
}

class CrochetApp {
    constructor() {
        // Core modules
        this.pattern = null;
        this.sceneManager = null;
        this.stitchRenderer = null;
        this.raycastManager = null;
        this.attachmentManager = null;
        this.physicsEngine = null;
        this.uiManager = null;
        this.physicsPanel = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     * Wrapped in try-catch for graceful error handling
     */
    init() {
        try {
            console.log('Initializing Crochet 3D Pattern Designer...');

            // Create pattern manager
            this.pattern = new Pattern();

            // Create 3D scene
            this.sceneManager = new SceneManager(document.body);

            // Create stitch renderer
            this.stitchRenderer = new StitchRenderer(this.sceneManager);

            // Create interaction manager
            this.raycastManager = new RaycastManager(this.sceneManager, this.stitchRenderer);

            // Create attachment point manager for click-to-add functionality
            this.attachmentManager = new AttachmentPointManager(this.sceneManager, this.pattern);

            // Create physics engine for fabric simulation
            this.physicsEngine = new PhysicsEngine(this.pattern, this.sceneManager);

            // Create UI
            this.uiManager = new UIManager(this.pattern, this.sceneManager);

            // Create physics control panel
            this.physicsPanel = new PhysicsPanel(this.physicsEngine);

            // Setup application-level event handlers
            this.setupEventHandlers();

            // Start with a demo pattern
            this.createDemoPattern();

            // Start rendering
            this.sceneManager.start();

            console.log('Crochet 3D Pattern Designer ready!');
            console.log('Keyboard shortcuts:');
            console.log('  C - Chain stitch');
            console.log('  S - Single crochet');
            console.log('  D - Double crochet');
            console.log('  H - Half double crochet');
            console.log('  T - Triple crochet');
            console.log('  I - Increase');
            console.log('  X - Decrease');
            console.log('  N - New row');
            console.log('  Enter - Add stitch');
            console.log('  Ctrl+Z - Undo');
            console.log('  Ctrl+Y - Redo');
            console.log('  P - Toggle physics panel');
            console.log('');
            console.log('Physics: Use the panel in bottom-left to simulate fabric drape');
        } catch (err) {
            console.error('Failed to initialize application:', err);
            // Show user-friendly error message
            // Use textContent to prevent XSS from error messages
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = 'padding: 40px; text-align: center; font-family: sans-serif;';

            const heading = document.createElement('h1');
            heading.style.color = '#d32f2f';
            heading.textContent = 'Initialization Error';

            const message1 = document.createElement('p');
            message1.textContent = 'Sorry, the application failed to start.';

            const message2 = document.createElement('p');
            message2.style.color = '#666';
            message2.textContent = `Error: ${err.message}`;

            const message3 = document.createElement('p');
            message3.textContent = 'Please try refreshing the page. If the problem persists, check that your browser supports WebGL.';

            errorContainer.appendChild(heading);
            errorContainer.appendChild(message1);
            errorContainer.appendChild(message2);
            errorContainer.appendChild(message3);

            document.body.innerHTML = '';
            document.body.appendChild(errorContainer);
        }
    }

    /**
     * Setup application event handlers
     */
    setupEventHandlers() {
        // Handle stitch deletion
        EventBus.on('selection:delete', ({ nodes }) => {
            nodes.forEach(node => {
                this.pattern.removeStitch(node);
            });
        });

        // Update attachment points when pattern loads
        EventBus.on(Events.PATTERN_LOADED, () => {
            // Initial attachment points update is handled by AttachmentPointManager
        });

        // Auto-follow camera when stitches are added
        EventBus.on(Events.STITCH_ADDED, () => {
            this.updateCameraTarget();
        });

        // Auto-follow camera when rows are added
        EventBus.on(Events.ROW_ADDED, () => {
            this.updateCameraTarget();
        });
    }

    /**
     * Update camera target to follow the pattern as it grows
     * Smoothly adjusts the camera to keep the work area visible
     */
    updateCameraTarget() {
        const bounds = this.calculatePatternBounds();

        // Only update if we have valid bounds
        if (bounds.height > 0 || bounds.width > 0) {
            // Keep the camera target centered on the pattern
            // Add a small offset to look slightly above center for better view of work area
            const targetY = bounds.centerY + 0.5;

            // Smoothly adjust camera target (don't jump suddenly)
            const currentTarget = this.sceneManager.controls.target;
            const lerpFactor = 0.3; // Smooth transition

            currentTarget.x += (bounds.centerX - currentTarget.x) * lerpFactor;
            currentTarget.y += (targetY - currentTarget.y) * lerpFactor;

            this.sceneManager.controls.update();
        }
    }

    /**
     * Create a demo pattern to start with
     */
    createDemoPattern() {
        // Start with a foundation chain of 10
        this.pattern.startWithChain(10);

        // Center the camera on the pattern
        const bounds = this.calculatePatternBounds();
        this.sceneManager.lookAt(bounds.centerX, bounds.centerY, 0);
    }

    /**
     * Calculate the bounding box of the current pattern
     * With safety checks for empty or invalid patterns
     * @returns {Object} Bounding box with centerX, centerY, width, height
     */
    calculatePatternBounds() {
        const defaultBounds = { centerX: 0, centerY: 0, width: 0, height: 0 };

        if (!this.pattern?.graph) {
            return defaultBounds;
        }

        const nodes = this.pattern.graph.getAllNodes();

        if (!nodes || nodes.length === 0) {
            return defaultBounds;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            // Safety check for valid position
            if (node?.position) {
                const x = Number.isFinite(node.position.x) ? node.position.x : 0;
                const y = Number.isFinite(node.position.y) ? node.position.y : 0;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        });

        // Check for valid bounds
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

    /**
     * Save pattern to file
     */
    savePattern() {
        const data = this.pattern.toJSON();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.pattern.metadata.name || 'pattern'}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Load pattern from file
     */
    loadPattern(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate the pattern data before loading
                const validation = validatePatternData(data);
                if (!validation.valid) {
                    const errorMsg = 'Invalid pattern file:\n\n' + formatValidationResult(validation);
                    console.error('Pattern validation failed:', validation.errors);
                    await showAlert(errorMsg, 'Validation Error');
                    return;
                }

                // Show warnings if any
                if (validation.warnings.length > 0) {
                    console.warn('Pattern loaded with warnings:', validation.warnings);
                }

                // Create new pattern from JSON
                const newPattern = Pattern.fromJSON(data);

                // Dispose old managers that hold pattern references
                this.physicsPanel.dispose();
                this.physicsEngine.dispose();
                this.uiManager.dispose();
                this.attachmentManager.dispose();

                // Dispose old pattern to clean up its graph listeners
                if (this.pattern && typeof this.pattern.dispose === 'function') {
                    this.pattern.dispose();
                }

                // Update pattern reference
                this.pattern = newPattern;

                // Recreate managers with new pattern
                this.attachmentManager = new AttachmentPointManager(this.sceneManager, this.pattern);
                this.physicsEngine = new PhysicsEngine(this.pattern, this.sceneManager);
                this.uiManager = new UIManager(this.pattern, this.sceneManager);
                this.physicsPanel = new PhysicsPanel(this.physicsEngine);

                // Re-render
                this.stitchRenderer.renderPattern(this.pattern);

                // Emit pattern loaded event
                EventBus.emit(Events.PATTERN_LOADED, { pattern: this.pattern });

                console.log('Pattern loaded successfully');
            } catch (err) {
                console.error('Failed to load pattern:', err);
                showAlert('Failed to load pattern file. Please check the file format.', 'Load Error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.physicsPanel.dispose();
        this.physicsEngine.dispose();
        this.uiManager.dispose();
        this.attachmentManager.dispose();
        this.raycastManager.dispose();
        this.stitchRenderer.dispose();
        this.sceneManager.dispose();

        // Dispose pattern to clean up graph listeners
        if (this.pattern && typeof this.pattern.dispose === 'function') {
            this.pattern.dispose();
        }
    }
}

// Setup global error handlers before starting the app
setupGlobalErrorHandlers();

// Start the application
let app;
try {
    app = new CrochetApp();
} catch (err) {
    console.error('Critical error creating application:', err);
}

// Expose to window for debugging
window.crochetApp = app;
