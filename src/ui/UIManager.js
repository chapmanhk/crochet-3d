import { StitchType, StitchDefinitions, getStitchByKeyboard } from '../core/StitchTypes.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
import { YarnMaterial } from '../rendering/YarnMaterial.js';
import { PatternConstants } from '../utils/Constants.js';
import { showInstructions, showConfirm } from './Modal.js';

/**
 * UIManager - Manages all HTML/CSS UI elements
 *
 * Handles:
 * - Stitch palette panel
 * - Pattern info panel
 * - Toolbar
 * - Keyboard shortcuts
 */

export class UIManager {
    constructor(pattern) {
        this.pattern = pattern;

        // UI container
        this.container = null;

        // UI panels
        this.stitchPalette = null;
        this.infoPanel = null;
        this.toolbar = null;

        // Current selected stitch type
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // Event subscriptions for cleanup
        this.eventSubs = new EventSubscriptions();

        // Bind methods
        this.onKeyDown = this.onKeyDown.bind(this);

        this.init();
    }

    /**
     * Initialize UI
     */
    init() {
        this.createStyles();
        this.createContainer();
        this.createStitchPalette();
        this.createToolbar();
        this.createInfoPanel();
        this.setupEventListeners();
    }

    /**
     * Create CSS styles
     */
    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .crochet-ui {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                user-select: none;
            }

            .crochet-panel {
                position: fixed;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
                padding: 12px;
                z-index: 100;
            }

            .crochet-panel h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                font-weight: 600;
                color: #333;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
            }

            /* Stitch Palette */
            .stitch-palette {
                left: 16px;
                top: 16px;
                width: 180px;
            }

            .stitch-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
            }

            .stitch-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 8px 4px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: #fff;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .stitch-btn:hover {
                border-color: #888;
                background: #f5f5f5;
            }

            .stitch-btn.selected {
                border-color: #2196F3;
                background: #e3f2fd;
            }

            .stitch-btn .abbr {
                font-weight: 600;
                font-size: 13px;
                color: #333;
            }

            .stitch-btn .key {
                font-size: 10px;
                color: #888;
                margin-top: 2px;
            }

            /* Toolbar */
            .crochet-toolbar {
                top: 16px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 8px;
                padding: 8px 12px;
            }

            .toolbar-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.15s ease;
            }

            .toolbar-btn:hover {
                background: #f0f0f0;
            }

            .toolbar-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .toolbar-btn.primary {
                background: #2196F3;
                color: white;
                border-color: #1976D2;
            }

            .toolbar-btn.primary:hover {
                background: #1976D2;
            }

            /* Info Panel */
            .info-panel {
                right: 16px;
                top: 16px;
                width: 200px;
            }

            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px solid #f0f0f0;
            }

            .info-row:last-child {
                border-bottom: none;
            }

            .info-label {
                color: #666;
            }

            .info-value {
                font-weight: 500;
                color: #333;
            }

            /* Selection info */
            .selection-info {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #eee;
            }

            .selection-info.hidden {
                display: none;
            }

            /* Color picker */
            .color-picker-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #eee;
            }

            .color-picker-row input[type="color"] {
                width: 40px;
                height: 30px;
                border: none;
                cursor: pointer;
            }

            /* Color palette */
            .color-palette {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 8px;
            }

            .color-swatch {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 2px solid transparent;
                cursor: pointer;
                transition: transform 0.1s;
            }

            .color-swatch:hover {
                transform: scale(1.15);
            }

            .color-swatch.selected {
                border-color: #333;
            }

            /* Instructions panel */
            .instructions-btn {
                margin-top: 12px;
                width: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create main UI container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'crochet-ui';
        document.body.appendChild(this.container);
    }

    /**
     * Create stitch palette panel
     */
    createStitchPalette() {
        this.stitchPalette = document.createElement('div');
        this.stitchPalette.className = 'crochet-panel stitch-palette';
        this.stitchPalette.innerHTML = `
            <h3>Stitches</h3>
            <div class="stitch-grid"></div>
        `;

        const grid = this.stitchPalette.querySelector('.stitch-grid');

        // Add button for each stitch type
        Object.entries(StitchDefinitions).forEach(([type, def]) => {
            const btn = document.createElement('button');
            btn.className = 'stitch-btn';
            btn.dataset.type = type;
            btn.title = def.description;

            if (type === this.selectedStitchType) {
                btn.classList.add('selected');
            }

            btn.innerHTML = `
                <span class="abbr">${def.abbreviation}</span>
                <span class="key">${def.keyboard.toUpperCase()}</span>
            `;

            btn.addEventListener('click', () => this.selectStitchType(type));
            grid.appendChild(btn);
        });

        this.container.appendChild(this.stitchPalette);
    }

    /**
     * Create toolbar
     */
    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'crochet-panel crochet-toolbar';
        this.toolbar.innerHTML = `
            <button class="toolbar-btn" id="btn-undo" title="Undo (Ctrl+Z)">Undo</button>
            <button class="toolbar-btn" id="btn-redo" title="Redo (Ctrl+Y)">Redo</button>
            <button class="toolbar-btn" id="btn-new-row" title="Start new row">New Row</button>
            <button class="toolbar-btn primary" id="btn-add-stitch" title="Add stitch to pattern">Add Stitch</button>
            <button class="toolbar-btn" id="btn-clear" title="Clear pattern">Clear</button>
        `;

        // Wire up buttons
        this.toolbar.querySelector('#btn-undo').addEventListener('click', () => {
            this.pattern.undo();
        });

        this.toolbar.querySelector('#btn-redo').addEventListener('click', () => {
            this.pattern.redo();
        });

        this.toolbar.querySelector('#btn-new-row').addEventListener('click', () => {
            this.pattern.startNewRow();
            this.updateInfoPanel();
        });

        this.toolbar.querySelector('#btn-add-stitch').addEventListener('click', () => {
            this.addStitchAtNextPosition();
        });

        this.toolbar.querySelector('#btn-clear').addEventListener('click', async () => {
            const confirmed = await showConfirm('Clear the entire pattern?', 'Clear Pattern');
            if (confirmed) {
                this.pattern.graph.clear();
                this.pattern.currentRow = 0;
                this.updateInfoPanel();
            }
        });

        this.container.appendChild(this.toolbar);

        // Update undo/redo button states
        this.updateUndoRedoButtons();
    }

    /**
     * Create info panel
     */
    createInfoPanel() {
        this.infoPanel = document.createElement('div');
        this.infoPanel.className = 'crochet-panel info-panel';
        this.infoPanel.innerHTML = `
            <h3>Pattern Info</h3>
            <div class="info-row">
                <span class="info-label">Stitches:</span>
                <span class="info-value" id="info-total">0</span>
            </div>
            <div class="info-row">
                <span class="info-label">Rows:</span>
                <span class="info-value" id="info-rows">0</span>
            </div>
            <div class="info-row">
                <span class="info-label">Current Row:</span>
                <span class="info-value" id="info-current-row">1</span>
            </div>
            <div class="selection-info hidden" id="selection-info">
                <div class="info-row">
                    <span class="info-label">Selected:</span>
                    <span class="info-value" id="info-selected-type">-</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Position:</span>
                    <span class="info-value" id="info-selected-pos">-</span>
                </div>
            </div>
            <div class="color-picker-row">
                <label>Yarn color:</label>
                <input type="color" id="color-picker" value="#8B4513">
            </div>
            <div class="color-palette" id="color-palette"></div>
            <button class="toolbar-btn instructions-btn" id="btn-instructions">
                View Instructions
            </button>
        `;

        // Color picker
        this.infoPanel.querySelector('#color-picker').addEventListener('change', (e) => {
            const color = parseInt(e.target.value.replace('#', ''), 16);
            this.selectColor(color);
        });

        // Create color palette swatches
        const palette = this.infoPanel.querySelector('#color-palette');
        const presetColors = YarnMaterial.getPresetColors();

        presetColors.forEach(({ name, color }) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = '#' + color.toString(16).padStart(6, '0');
            swatch.title = name;
            swatch.dataset.color = color;

            if (color === this.pattern.currentColor) {
                swatch.classList.add('selected');
            }

            swatch.addEventListener('click', () => this.selectColor(color));
            palette.appendChild(swatch);
        });

        // Instructions button
        this.infoPanel.querySelector('#btn-instructions').addEventListener('click', () => {
            const instructions = this.pattern.generateInstructions();
            showInstructions(instructions);
        });

        this.container.appendChild(this.infoPanel);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('keydown', this.onKeyDown);

        // Listen for pattern events using EventSubscriptions for automatic cleanup
        this.eventSubs.on(Events.STITCH_ADDED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.STITCH_REMOVED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.PATTERN_LOADED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.PATTERN_CLEARED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.ROW_ADDED, () => this.updateInfoPanel());

        this.eventSubs.on(Events.HISTORY_CHANGED, () => this.updateUndoRedoButtons());

        this.eventSubs.on(Events.STITCH_SELECTED, ({ node }) => this.showSelectionInfo(node));
        this.eventSubs.on(Events.STITCH_DESELECTED, () => this.hideSelectionInfo());
    }

    /**
     * Handle keyboard shortcuts
     */
    onKeyDown(event) {
        // Ignore if typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Stitch type shortcuts
        const stitchType = getStitchByKeyboard(event.key);
        if (stitchType) {
            this.selectStitchType(stitchType);
            return;
        }

        // Undo/Redo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                this.pattern.redo();
            } else {
                this.pattern.undo();
            }
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            this.pattern.redo();
        }

        // Enter to add stitch
        if (event.key === 'Enter') {
            this.addStitchAtNextPosition();
        }

        // N for new row
        if (event.key === 'n' || event.key === 'N') {
            this.pattern.startNewRow();
            this.updateInfoPanel();
        }
    }

    /**
     * Select a stitch type
     */
    selectStitchType(type) {
        this.selectedStitchType = type;
        this.pattern.selectedStitchType = type;

        // Update visual
        const buttons = this.stitchPalette.querySelectorAll('.stitch-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.type === type);
        });

        EventBus.emit(Events.STITCH_TYPE_SELECTED, { type });
    }

    /**
     * Select a yarn color
     */
    selectColor(color) {
        this.pattern.currentColor = color;

        // Update color picker
        const colorPicker = this.infoPanel.querySelector('#color-picker');
        colorPicker.value = '#' + color.toString(16).padStart(6, '0');

        // Update swatch selection
        const swatches = this.infoPanel.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.classList.toggle('selected', parseInt(swatch.dataset.color) === color);
        });

        EventBus.emit(Events.COLOR_SELECTED, { color });
    }

    /**
     * Add stitch at next available position
     */
    addStitchAtNextPosition() {
        const attachPoints = this.pattern.getAttachmentPoints();

        if (attachPoints.length === 0) {
            // No pattern started - create foundation chain
            if (this.pattern.graph.size === 0) {
                const chainLength = prompt(
                    `Enter foundation chain length (${PatternConstants.MIN_CHAIN_LENGTH}-${PatternConstants.MAX_CHAIN_LENGTH}):`,
                    String(PatternConstants.DEFAULT_CHAIN_LENGTH)
                );
                if (chainLength && !isNaN(chainLength)) {
                    // Validate bounds to prevent performance issues
                    const length = Math.max(
                        PatternConstants.MIN_CHAIN_LENGTH,
                        Math.min(PatternConstants.MAX_CHAIN_LENGTH, parseInt(chainLength, 10))
                    );
                    this.pattern.startWithChain(length);
                }
            } else {
                // Start new row
                this.pattern.startNewRow();
                this.addStitchAtNextPosition();
            }
            return;
        }

        // Find suggested attachment point or use first available
        const attachPoint = attachPoints.find(p => p.suggested) || attachPoints[0];

        this.pattern.addStitch(this.selectedStitchType, attachPoint.stitch);
    }

    /**
     * Update info panel with current pattern stats
     */
    updateInfoPanel() {
        const stats = this.pattern.graph.getStats();

        this.infoPanel.querySelector('#info-total').textContent = stats.totalStitches;
        this.infoPanel.querySelector('#info-rows').textContent = stats.rowCount;
        this.infoPanel.querySelector('#info-current-row').textContent = this.pattern.currentRow + 1;
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const undoBtn = this.toolbar.querySelector('#btn-undo');
        const redoBtn = this.toolbar.querySelector('#btn-redo');

        undoBtn.disabled = !this.pattern.canUndo();
        redoBtn.disabled = !this.pattern.canRedo();
    }

    /**
     * Show selection info
     */
    showSelectionInfo(node) {
        const selectionInfo = this.infoPanel.querySelector('#selection-info');
        selectionInfo.classList.remove('hidden');

        this.infoPanel.querySelector('#info-selected-type').textContent = node.name;
        this.infoPanel.querySelector('#info-selected-pos').textContent =
            `Row ${node.row + 1}, Col ${node.column + 1}`;
    }

    /**
     * Hide selection info
     */
    hideSelectionInfo() {
        const selectionInfo = this.infoPanel.querySelector('#selection-info');
        selectionInfo.classList.add('hidden');
    }

    /**
     * Dispose UI
     */
    dispose() {
        window.removeEventListener('keydown', this.onKeyDown);

        // Clean up all event subscriptions
        this.eventSubs.dispose();

        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}
