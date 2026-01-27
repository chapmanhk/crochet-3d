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
     */
    init() {
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
        this.uiManager = new UIManager(this.pattern);

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
     */
    calculatePatternBounds() {
        const nodes = this.pattern.graph.getAllNodes();

        if (nodes.length === 0) {
            return { centerX: 0, centerY: 0, width: 0, height: 0 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
        });

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

                this.pattern = Pattern.fromJSON(data);

                // Re-setup UI with new pattern
                this.uiManager.dispose();
                this.uiManager = new UIManager(this.pattern);

                // Re-render
                this.stitchRenderer.renderPattern(this.pattern);

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
    }
}

// Start the application
const app = new CrochetApp();

// Expose to window for debugging
window.crochetApp = app;
