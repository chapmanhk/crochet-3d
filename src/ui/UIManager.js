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
    constructor(pattern, sceneManager = null) {
        this.pattern = pattern;
        this.sceneManager = sceneManager;

        // UI container
        this.container = null;

        // UI panels
        this.stitchPalette = null;
        this.infoPanel = null;
        this.toolbar = null;
        this.viewModeSelector = null;
        this.rowNavigation = null;

        // Current selected stitch type
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // View mode state
        this.currentViewMode = 'perspective';
        this.isSchematicMode = false;
        this.validViewModes = ['perspective', 'top', 'front', 'side', 'schematic'];

        // Row navigation state
        this.highlightedRow = 0;

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
        this.createViewModeSelector();
        this.createRowNavigation();
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

            /* View Mode Selector */
            .view-mode-selector {
                left: 16px;
                bottom: 16px;
                display: flex;
                gap: 4px;
                padding: 8px;
            }

            .view-mode-btn {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.15s ease;
            }

            .view-mode-btn:hover {
                background: #f0f0f0;
            }

            .view-mode-btn.selected {
                background: #2196F3;
                color: white;
                border-color: #1976D2;
            }

            .view-mode-btn .shortcut {
                font-size: 10px;
                color: #888;
                margin-left: 4px;
            }

            .view-mode-btn.selected .shortcut {
                color: rgba(255, 255, 255, 0.7);
            }

            /* Row Navigation */
            .row-navigation {
                right: 16px;
                bottom: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 160px;
            }

            .row-nav-display {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4px;
                font-size: 14px;
            }

            .row-nav-display #current-row-display {
                font-weight: 600;
                font-size: 16px;
            }

            .row-nav-buttons {
                display: flex;
                gap: 4px;
            }

            .row-nav-btn {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.15s ease;
            }

            .row-nav-btn:hover:not(:disabled) {
                background: #f0f0f0;
            }

            .row-nav-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .row-goto-row {
                display: flex;
                gap: 4px;
            }

            .row-goto-row input {
                flex: 1;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
                width: 60px;
            }

            .row-goto-row input.error {
                border-color: #f44336;
                background: #ffebee;
            }

            .row-goto-row button {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
            }

            .row-goto-row button:hover {
                background: #f0f0f0;
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

        // Add button for each stitch type that has a keyboard shortcut
        Object.entries(StitchDefinitions).forEach(([type, def]) => {
            // Only show stitches with keyboard shortcuts in the palette
            if (!def.keyboard) return;

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
     * Create view mode selector panel
     */
    createViewModeSelector() {
        this.viewModeSelector = document.createElement('div');
        this.viewModeSelector.className = 'crochet-panel view-mode-selector';

        const viewModes = [
            { id: 'perspective', label: '3D', shortcut: '1' },
            { id: 'top', label: 'Top', shortcut: '2' },
            { id: 'front', label: 'Front', shortcut: '3' },
            { id: 'side', label: 'Side', shortcut: '4' },
            { id: 'schematic', label: 'Schematic', shortcut: '5' }
        ];

        viewModes.forEach(mode => {
            const btn = document.createElement('button');
            btn.className = 'view-mode-btn';
            btn.dataset.viewMode = mode.id;
            btn.innerHTML = `${mode.label}<span class="shortcut">${mode.shortcut}</span>`;

            if (mode.id === this.currentViewMode) {
                btn.classList.add('selected');
            }

            btn.addEventListener('click', () => this.setViewMode(mode.id));
            this.viewModeSelector.appendChild(btn);
        });

        this.container.appendChild(this.viewModeSelector);
    }

    /**
     * Create row navigation panel
     */
    createRowNavigation() {
        this.rowNavigation = document.createElement('div');
        this.rowNavigation.className = 'crochet-panel row-navigation';

        const stats = this.pattern.graph.getStats();

        this.rowNavigation.innerHTML = `
            <div class="row-nav-display">
                Row <span id="current-row-display">${this.pattern.currentRow + 1}</span>
                of <span id="total-rows-display">${stats.rowCount || 1}</span>
            </div>
            <div class="row-nav-buttons">
                <button class="row-nav-btn" id="btn-prev-row" title="Previous row (PageUp)">← Prev</button>
                <button class="row-nav-btn" id="btn-next-row" title="Next row (PageDown)">Next →</button>
            </div>
            <div class="row-goto-row">
                <input type="number" id="input-go-to-row" placeholder="Row #" min="1">
                <button id="btn-go-to-row">Go</button>
            </div>
        `;

        // Wire up prev/next buttons
        this.rowNavigation.querySelector('#btn-prev-row').addEventListener('click', () => {
            this.goToRow(this.pattern.currentRow - 1);
        });

        this.rowNavigation.querySelector('#btn-next-row').addEventListener('click', () => {
            this.goToRow(this.pattern.currentRow + 1);
        });

        // Wire up go-to-row input
        const goToInput = this.rowNavigation.querySelector('#input-go-to-row');
        const goToBtn = this.rowNavigation.querySelector('#btn-go-to-row');

        goToBtn.addEventListener('click', () => {
            this.handleGoToRow(goToInput);
        });

        goToInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleGoToRow(goToInput);
            }
        });

        this.container.appendChild(this.rowNavigation);
        this.updateRowNavigation();
    }

    /**
     * Handle go-to-row input
     */
    handleGoToRow(input) {
        const rowNum = parseInt(input.value, 10);

        // Clear any previous error state
        input.classList.remove('error');

        // Validate: must be positive and within range
        if (isNaN(rowNum) || rowNum < 1) {
            input.classList.add('error');
            return;
        }

        // Convert from 1-indexed display to 0-indexed internal
        const rowIndex = rowNum - 1;
        const success = this.goToRow(rowIndex);

        if (success) {
            input.value = '';
        } else {
            input.classList.add('error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('keydown', this.onKeyDown);

        // Listen for pattern events using EventSubscriptions for automatic cleanup
        this.eventSubs.on(Events.STITCH_ADDED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.STITCH_REMOVED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.PATTERN_LOADED, () => {
            this.updateInfoPanel();
            this.updateRowNavigation();
        });
        this.eventSubs.on(Events.PATTERN_CLEARED, () => {
            this.updateInfoPanel();
            this.updateRowNavigation();
        });
        this.eventSubs.on(Events.ROW_ADDED, () => {
            this.updateInfoPanel();
            this.updateRowNavigation();
        });

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

        // View mode shortcuts (1-5)
        const viewModeKeys = {
            '1': 'perspective',
            '2': 'top',
            '3': 'front',
            '4': 'side',
            '5': 'schematic'
        };
        if (viewModeKeys[event.key]) {
            this.setViewMode(viewModeKeys[event.key]);
            return;
        }

        // Row navigation shortcuts
        if (event.key === 'PageUp') {
            event.preventDefault();
            this.goToRow(this.pattern.currentRow - 1);
            return;
        }
        if (event.key === 'PageDown') {
            event.preventDefault();
            this.goToRow(this.pattern.currentRow + 1);
            return;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            this.goToRow(0);
            return;
        }
        if (event.key === 'End') {
            event.preventDefault();
            const stats = this.pattern.graph.getStats();
            this.goToRow(stats.rowCount - 1);
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
     * Set view mode
     * @param {string} mode - View mode: 'perspective', 'top', 'front', 'side', 'schematic'
     * @returns {boolean} - Whether the mode was successfully set
     */
    setViewMode(mode) {
        if (!this.validViewModes.includes(mode)) {
            return false;
        }

        const previousMode = this.currentViewMode;
        this.currentViewMode = mode;

        // Handle schematic mode toggle
        const wasSchematic = this.isSchematicMode;
        this.isSchematicMode = mode === 'schematic';

        // Update scene manager for 3D view modes
        if (this.sceneManager) {
            if (mode === 'schematic') {
                // Schematic uses top-down view as base
                this.sceneManager.setViewMode('top');
            } else {
                this.sceneManager.setViewMode(mode);
            }
        }

        // Update button UI
        const buttons = this.viewModeSelector.querySelectorAll('.view-mode-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.viewMode === mode);
        });

        // Emit view mode changed event
        EventBus.emit(Events.VIEW_MODE_CHANGED, { mode, previousMode });

        // Emit schematic mode changed event if toggled
        if (wasSchematic !== this.isSchematicMode) {
            EventBus.emit(Events.SCHEMATIC_MODE_CHANGED, { enabled: this.isSchematicMode });
        }

        return true;
    }

    /**
     * Navigate to a specific row
     * @param {number} rowIndex - 0-indexed row number
     * @returns {boolean} - Whether navigation was successful
     */
    goToRow(rowIndex) {
        const stats = this.pattern.graph.getStats();
        const maxRow = Math.max(0, stats.rowCount - 1);

        // Validate row index
        if (rowIndex < 0 || rowIndex > maxRow) {
            return false;
        }

        const previousRow = this.pattern.currentRow;

        // Update pattern's current row
        if (this.pattern.goToRow) {
            this.pattern.goToRow(rowIndex);
        } else {
            this.pattern.currentRow = rowIndex;
        }

        // Update highlighted row
        this.highlightedRow = rowIndex;

        // Update UI
        this.updateRowNavigation();

        // Emit events
        EventBus.emit(Events.ROW_NAVIGATED, { row: rowIndex, previousRow });
        EventBus.emit(Events.ROW_HIGHLIGHT_CHANGED, { row: rowIndex });

        return true;
    }

    /**
     * Highlight a specific row in the 3D view
     * @param {number} rowIndex - 0-indexed row number
     */
    highlightRow(rowIndex) {
        this.highlightedRow = rowIndex;
        EventBus.emit(Events.ROW_HIGHLIGHT_CHANGED, { row: rowIndex });
    }

    /**
     * Update row navigation UI
     */
    updateRowNavigation() {
        if (!this.rowNavigation) return;

        const stats = this.pattern.graph.getStats();
        const currentRow = this.pattern.currentRow;
        const totalRows = stats.rowCount || 1;

        // Update displays
        const currentDisplay = this.rowNavigation.querySelector('#current-row-display');
        const totalDisplay = this.rowNavigation.querySelector('#total-rows-display');

        if (currentDisplay) {
            currentDisplay.textContent = currentRow + 1;
        }
        if (totalDisplay) {
            totalDisplay.textContent = totalRows;
        }

        // Update button states
        const prevBtn = this.rowNavigation.querySelector('#btn-prev-row');
        const nextBtn = this.rowNavigation.querySelector('#btn-next-row');

        if (prevBtn) {
            prevBtn.disabled = currentRow <= 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentRow >= totalRows - 1;
        }
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
