import { StitchType, StitchDefinitions, getStitchByKeyboard, StitchModifier } from '../core/StitchTypes.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
import { YarnMaterial } from '../rendering/YarnMaterial.js';
import { PatternConstants, AttachmentConstants } from '../utils/Constants.js';
import { showInstructions, showConfirm, showPrompt, showAlert, showModal } from './Modal.js';
import { StitchValidator } from '../core/StitchValidator.js';
import { createBasicCircle, createBasicSquare, createGrannySquare, createTriangle } from '../core/PatternTemplates.js';
import { getCrownShapingGuide } from '../core/ShapingGuide.js';

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
        this.templatesPanel = null;

        // Current selected stitch type
        this.selectedStitchType = StitchType.SINGLE_CROCHET;

        // View mode state
        this.currentViewMode = 'perspective';
        this.isSchematicMode = false;
        this.validViewModes = ['perspective', 'top', 'front', 'side', 'schematic'];

        // Row navigation state
        this.highlightedRow = 0;

        // Selection tracking
        this.selectedNodes = new Set();

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
        this.createTemplatesPanel();
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
        const toHex = (color) => '#' + color.toString(16).padStart(6, '0');
        const markerColors = {
            start: toHex(AttachmentConstants.CHAIN_START_COLOR),
            end: toHex(AttachmentConstants.CHAIN_END_COLOR),
            working: toHex(AttachmentConstants.WORKING_POSITION_COLOR),
            newRow: toHex(AttachmentConstants.NEW_ROW_COLOR)
        };
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

            /* Stitch options */
            .stitch-options {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px dashed #eee;
                font-size: 12px;
                color: #555;
            }

            .stitch-options-title {
                font-weight: 600;
                margin-bottom: 6px;
                color: #333;
            }

            .stitch-options-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin: 4px 0;
            }

            .stitch-options-row label {
                white-space: nowrap;
            }

            .stitch-options-row select,
            .stitch-options-row input[type="number"] {
                flex: 1;
                padding: 4px 6px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
            }

            .stitch-options-toggle {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 6px;
                cursor: pointer;
            }

            /* Working direction + marker legend */
            .marker-legend {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px dashed #eee;
                font-size: 12px;
                color: #555;
            }

            .marker-legend-title {
                font-weight: 600;
                margin-bottom: 6px;
                color: #333;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 4px 0;
            }

            .legend-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
            }

            .legend-dot.start { background: ${markerColors.start}; }
            .legend-dot.end { background: ${markerColors.end}; }
            .legend-dot.working { background: ${markerColors.working}; }
            .legend-dot.new-row { background: ${markerColors.newRow}; }

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
                bottom: 70px;
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

            /* Templates Panel */
            .templates-panel {
                left: 16px;
                bottom: 140px;
                width: 180px;
                max-height: calc(100vh - 220px);
                overflow-y: auto;
            }

            .template-btn {
                width: 100%;
                padding: 6px 10px;
                margin-bottom: 6px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                text-align: left;
                transition: all 0.15s ease;
            }

            .template-btn:hover {
                background: #f0f0f0;
            }

            /* Selection actions */
            .selection-actions {
                margin-top: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .info-action-btn {
                width: 100%;
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.15s ease;
            }

            .info-action-btn:hover {
                background: #f0f0f0;
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

        // Add button for each non-deprecated stitch type
        Object.entries(StitchDefinitions).forEach(([type, def]) => {
            if (def.deprecated) return;

            const btn = document.createElement('button');
            btn.className = 'stitch-btn';
            btn.dataset.type = type;
            btn.title = def.description;

            if (type === this.selectedStitchType) {
                btn.classList.add('selected');
            }

            const keyLabel = def.keyboard ? def.keyboard.toUpperCase() : '-';
            btn.innerHTML = `
                <span class="abbr">${def.abbreviation}</span>
                <span class="key">${keyLabel}</span>
            `;

            btn.addEventListener('click', () => this.selectStitchType(type));
            grid.appendChild(btn);
        });

        this.container.appendChild(this.stitchPalette);
    }

    /**
     * Create templates panel
     */
    createTemplatesPanel() {
        this.templatesPanel = document.createElement('div');
        this.templatesPanel.className = 'crochet-panel templates-panel';
        this.templatesPanel.innerHTML = `
            <h3>Templates</h3>
            <button class="template-btn" data-template="granny">Granny Square</button>
            <button class="template-btn" data-template="circle">Basic Circle</button>
            <button class="template-btn" data-template="square">Basic Square</button>
            <button class="template-btn" data-template="triangle">Triangle</button>
        `;

        this.templatesPanel.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.dataset.template;
                this.handleTemplateSelection(template);
            });
        });

        this.container.appendChild(this.templatesPanel);
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
            <button class="toolbar-btn primary" id="btn-start-pattern" title="Start a new pattern">Start Pattern</button>
            <button class="toolbar-btn" id="btn-new-row" title="Start new row">New Row</button>
            <button class="toolbar-btn" id="btn-add-stitch" title="Add stitch to pattern">Add Stitch</button>
            <button class="toolbar-btn" id="btn-clear" title="Clear pattern">Clear</button>
        `;

        // Wire up buttons
        this.toolbar.querySelector('#btn-undo').addEventListener('click', () => {
            this.pattern.undo();
        });

        this.toolbar.querySelector('#btn-redo').addEventListener('click', () => {
            this.pattern.redo();
        });

        this.toolbar.querySelector('#btn-start-pattern').addEventListener('click', () => {
            this.handleStartPattern();
        });

        this.toolbar.querySelector('#btn-new-row').addEventListener('click', () => {
            this.handleStartNewRow();
        });

        this.toolbar.querySelector('#btn-add-stitch').addEventListener('click', () => {
            this.addStitchAtNextPosition();
        });

        this.toolbar.querySelector('#btn-clear').addEventListener('click', async () => {
            const confirmed = await showConfirm('Clear the entire pattern?', 'Clear Pattern');
            if (confirmed) {
                if (typeof this.pattern.clearPattern === 'function') {
                    this.pattern.clearPattern();
                } else {
                    this.pattern.graph.clear();
                    this.pattern.currentRow = 0;
                }
                this.updateInfoPanel();
                this.updateRowNavigation();
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
            <div class="info-row">
                <span class="info-label">Row Stitches:</span>
                <span class="info-value" id="info-row-stitches">0</span>
            </div>
            <div class="info-row">
                <span class="info-label">Working:</span>
                <span class="info-value" id="info-working-direction">-</span>
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
                <div class="selection-actions">
                    <button class="info-action-btn" id="btn-apply-selection-color">Apply color to selection</button>
                </div>
            </div>
            <div class="stitch-options">
                <div class="stitch-options-title">Stitch Options</div>
                <div class="stitch-options-row">
                    <label for="select-loop">Loops:</label>
                    <select id="select-loop">
                        <option value="both">Both</option>
                        <option value="front">Front</option>
                        <option value="back">Back</option>
                    </select>
                </div>
                <div class="stitch-options-row">
                    <label for="select-modifier">Modifier:</label>
                    <select id="select-modifier">
                        <option value="none">None</option>
                        <option value="inc">Increase (2 in 1)</option>
                        <option value="inc3">Increase (3 in 1)</option>
                        <option value="dec">Decrease (2 tog)</option>
                        <option value="dec3">Decrease (3 tog)</option>
                    </select>
                </div>
                <div class="stitch-options-row">
                    <label for="input-skip-count">Skip:</label>
                    <input type="number" id="input-skip-count" min="0" value="0">
                </div>
                <label class="stitch-options-toggle">
                    <input type="checkbox" id="toggle-work-space">
                    Work into space
                </label>
            </div>
            <div class="color-picker-row">
                <label>Yarn color:</label>
                <input type="color" id="color-picker" value="#8B4513">
            </div>
            <div class="color-palette" id="color-palette"></div>
            <div class="marker-legend">
                <div class="marker-legend-title">Markers</div>
                <div class="legend-item"><span class="legend-dot start"></span>Chain start</div>
                <div class="legend-item"><span class="legend-dot end"></span>Chain end</div>
                <div class="legend-item"><span class="legend-dot working"></span>Next stitch</div>
                <div class="legend-item"><span class="legend-dot new-row"></span>Turn / new row</div>
            </div>
            <button class="toolbar-btn instructions-btn" id="btn-instructions">
                View Instructions
            </button>
            <button class="toolbar-btn instructions-btn" id="btn-crown-guide">
                Crown Shaping Guide
            </button>
        `;

        // Color picker
        this.infoPanel.querySelector('#color-picker').addEventListener('change', (e) => {
            const color = parseInt(e.target.value.replace('#', ''), 16);
            this.selectColor(color);
        });

        const applySelectionColorBtn = this.infoPanel.querySelector('#btn-apply-selection-color');
        if (applySelectionColorBtn) {
            applySelectionColorBtn.addEventListener('click', () => {
                this.applyColorToSelection();
            });
        }

        // Stitch options
        const loopSelect = this.infoPanel.querySelector('#select-loop');
        const modifierSelect = this.infoPanel.querySelector('#select-modifier');
        const skipInput = this.infoPanel.querySelector('#input-skip-count');
        const workSpaceToggle = this.infoPanel.querySelector('#toggle-work-space');

        if (loopSelect) {
            loopSelect.value = this.pattern.currentLoopSelection || 'both';
            loopSelect.addEventListener('change', () => {
                this.pattern.currentLoopSelection = loopSelect.value;
                EventBus.emit(Events.ATTACHMENT_OPTIONS_CHANGED, { type: 'loop', value: loopSelect.value });
            });
        }

        if (modifierSelect) {
            modifierSelect.value = 'none';
            modifierSelect.addEventListener('change', () => {
                const modifierMap = {
                    none: [],
                    inc: [StitchModifier.INCREASE],
                    inc3: [StitchModifier.INCREASE_3],
                    dec: [StitchModifier.DECREASE],
                    dec3: [StitchModifier.DECREASE_3]
                };
                this.pattern.currentModifiers = modifierMap[modifierSelect.value] || [];
                EventBus.emit(Events.ATTACHMENT_OPTIONS_CHANGED, { type: 'modifier', value: modifierSelect.value });
            });
        }

        if (skipInput) {
            skipInput.value = String(this.pattern.currentSkipCount || 0);
            skipInput.addEventListener('change', () => {
                const parsed = parseInt(skipInput.value, 10);
                const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                skipInput.value = String(safeValue);
                this.pattern.currentSkipCount = safeValue;
                EventBus.emit(Events.ATTACHMENT_OPTIONS_CHANGED, { type: 'skip', value: safeValue });
            });
        }

        if (workSpaceToggle) {
            workSpaceToggle.checked = Boolean(this.pattern.currentWorkIntoSpace);
            workSpaceToggle.addEventListener('change', () => {
                this.pattern.currentWorkIntoSpace = workSpaceToggle.checked;
                EventBus.emit(Events.ATTACHMENT_OPTIONS_CHANGED, { type: 'space', value: workSpaceToggle.checked });
            });
        }

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

        const crownGuideBtn = this.infoPanel.querySelector('#btn-crown-guide');
        if (crownGuideBtn) {
            crownGuideBtn.addEventListener('click', () => {
                this.showCrownShapingGuide();
            });
        }

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
            { id: 'schematic', label: 'Layout', shortcut: '5' }
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
                <span id="row-label">Row</span>
                <span id="current-row-display">${this.pattern.currentRow + 1}</span>
                <span id="row-of-label">of</span>
                <span id="total-rows-display">${stats.rowCount || 1}</span>
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

        // Check if foundation chain exists
        const hasFoundation = typeof this.pattern.hasFoundationChain === 'function'
            ? this.pattern.hasFoundationChain()
            : false;

        // Validate input: with foundation, 0 is valid (goes to foundation); otherwise must be >= 1
        const minRow = hasFoundation ? 0 : 1;
        if (isNaN(rowNum) || rowNum < minRow) {
            input.classList.add('error');
            return;
        }

        // Convert display row to internal row index
        // With foundation: display N -> internal N (foundation is 0)
        // Without foundation: display N -> internal N-1
        const rowIndex = hasFoundation ? rowNum : rowNum - 1;
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
            this.selectedNodes.clear();
            this.updateSelectionInfo();
        });
        this.eventSubs.on(Events.PATTERN_CLEARED, () => {
            this.updateInfoPanel();
            this.updateRowNavigation();
            this.selectedNodes.clear();
            this.updateSelectionInfo();
        });
        this.eventSubs.on(Events.ROW_ADDED, () => {
            this.updateInfoPanel();
            this.updateRowNavigation();
        });
        this.eventSubs.on(Events.ROW_NAVIGATED, () => {
            this.updateInfoPanel();
        });

        this.eventSubs.on(Events.HISTORY_CHANGED, () => this.updateUndoRedoButtons());
        this.eventSubs.on(Events.STITCH_SELECTED, ({ node }) => {
            if (node) {
                this.selectedNodes.add(node);
            }
            this.updateSelectionInfo();
        });
        this.eventSubs.on(Events.STITCH_DESELECTED, ({ node }) => {
            if (node) {
                this.selectedNodes.delete(node);
            } else {
                this.selectedNodes.clear();
            }
            this.updateSelectionInfo();
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    onKeyDown(event) {
        // Ignore if typing in an input or a modal is open
        if (document.querySelector('.modal-overlay')) {
            return;
        }

        const target = event.target;
        const tagName = target?.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
            return;
        }
        if (target?.isContentEditable) {
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
            this.handleStartNewRow();
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
     * Apply current color to selected stitches
     */
    applyColorToSelection() {
        if (this.selectedNodes.size === 0) {
            return;
        }

        const color = this.pattern.currentColor;
        const nodes = Array.from(this.selectedNodes);
        nodes.forEach(node => {
            node.color = color;
        });
        EventBus.emit(Events.STITCH_COLOR_CHANGED, { nodes, color });
    }

    /**
     * Reset stitch option controls after starting a new pattern
     */
    resetStitchOptions({ skipCount = 0 } = {}) {
        this.pattern.currentSkipCount = skipCount;
        this.pattern.currentModifiers = [];
        this.pattern.currentWorkIntoSpace = false;
        this.pattern.currentLoopSelection = 'both';

        const loopSelect = this.infoPanel?.querySelector('#select-loop');
        if (loopSelect) {
            loopSelect.value = 'both';
        }
        const modifierSelect = this.infoPanel?.querySelector('#select-modifier');
        if (modifierSelect) {
            modifierSelect.value = 'none';
        }
        const skipInput = this.infoPanel?.querySelector('#input-skip-count');
        if (skipInput) {
            skipInput.value = String(skipCount);
        }
        const workSpaceToggle = this.infoPanel?.querySelector('#toggle-work-space');
        if (workSpaceToggle) {
            workSpaceToggle.checked = false;
        }
    }

    /**
     * Prompt for a numeric input with bounds
     */
    async promptForNumber({ title, message, defaultValue, min, max }) {
        const result = await showPrompt(message, String(defaultValue), title);
        if (result === null) {
            return null;
        }

        const parsed = parseInt(result, 10);
        if (!Number.isFinite(parsed)) {
            await showAlert('Please enter a valid number.', title);
            return null;
        }

        const clamped = Math.max(min, Math.min(max, parsed));
        if (clamped !== parsed) {
            await showAlert(`Value adjusted to ${clamped} (allowed ${min}-${max}).`, `${title} Adjusted`);
        }

        return clamped;
    }

    /**
     * Confirm clearing an existing pattern
     */
    async confirmClearPattern(title) {
        if (!this.pattern.graph || this.pattern.graph.size === 0) {
            return true;
        }
        return showConfirm(
            'Starting a new pattern will clear the current one. Continue?',
            title || 'Start New Pattern'
        );
    }

    /**
     * Start a new pattern with the chosen method
     */
    async handleStartPattern() {
        const confirmed = await this.confirmClearPattern('Start Pattern');
        if (!confirmed) {
            return;
        }

        await this.showStartPatternModal();
    }

    /**
     * Show start pattern modal and handle choice
     */
    async showStartPatternModal() {
        const choice = await showModal({
            title: 'Start Pattern',
            content: 'Choose a starting method:',
            buttons: [
                { text: 'Foundation Chain', primary: true },
                { text: 'Foundation SC' },
                { text: 'Foundation DC' },
                { text: 'Magic Ring' },
                { text: 'Cancel' }
            ]
        });

        if (!choice || choice === 'Cancel') {
            return;
        }

        if (choice === 'Foundation Chain') {
            const length = await this.promptForNumber({
                title: 'Foundation Chain',
                message: `Enter foundation chain length (${PatternConstants.MIN_CHAIN_LENGTH}-${PatternConstants.MAX_CHAIN_LENGTH}):`,
                defaultValue: PatternConstants.DEFAULT_CHAIN_LENGTH,
                min: PatternConstants.MIN_CHAIN_LENGTH,
                max: PatternConstants.MAX_CHAIN_LENGTH
            });
            if (!length) return;

            this.pattern.startWithChain(length);
            // Auto-set skip to 1 for first stitch (typical crochet: 2nd chain from hook)
            this.resetStitchOptions({ skipCount: 1 });
            return;
        }

        if (choice === 'Foundation SC') {
            const length = await this.promptForNumber({
                title: 'Foundation Single Crochet',
                message: `Enter number of foundation stitches (${PatternConstants.MIN_CHAIN_LENGTH}-${PatternConstants.MAX_CHAIN_LENGTH}):`,
                defaultValue: PatternConstants.DEFAULT_CHAIN_LENGTH,
                min: PatternConstants.MIN_CHAIN_LENGTH,
                max: PatternConstants.MAX_CHAIN_LENGTH
            });
            if (!length) return;

            this.pattern.startWithFoundationSC(length);
            this.resetStitchOptions();
            return;
        }

        if (choice === 'Foundation DC') {
            const length = await this.promptForNumber({
                title: 'Foundation Double Crochet',
                message: `Enter number of foundation stitches (${PatternConstants.MIN_CHAIN_LENGTH}-${PatternConstants.MAX_CHAIN_LENGTH}):`,
                defaultValue: PatternConstants.DEFAULT_CHAIN_LENGTH,
                min: PatternConstants.MIN_CHAIN_LENGTH,
                max: PatternConstants.MAX_CHAIN_LENGTH
            });
            if (!length) return;

            this.pattern.startWithFoundationDC(length);
            this.resetStitchOptions();
            return;
        }

        if (choice === 'Magic Ring') {
            const stitches = await this.promptForNumber({
                title: 'Magic Ring',
                message: 'Enter number of stitches in the ring (1-50):',
                defaultValue: PatternConstants.MAGIC_RING_INITIAL_STITCHES,
                min: 1,
                max: 50
            });
            if (!stitches) return;

            const modeChoice = await showModal({
                title: 'Magic Ring Mode',
                content: 'Choose how rounds are joined:',
                buttons: [
                    { text: 'Joined Rounds', primary: true },
                    { text: 'Spiral Rounds' },
                    { text: 'Cancel' }
                ]
            });
            if (!modeChoice || modeChoice === 'Cancel') {
                return;
            }
            const roundMode = modeChoice === 'Spiral Rounds' ? 'spiral' : 'joined';

            this.pattern.startWithMagicRing(stitches, StitchType.SINGLE_CROCHET, roundMode);
            this.resetStitchOptions();
        }
    }

    /**
     * Handle template selection from the templates panel
     */
    async handleTemplateSelection(templateId) {
        if (!templateId) return;

        const confirmed = await this.confirmClearPattern('Load Template');
        if (!confirmed) {
            return;
        }

        let templatePattern = null;
        const color = this.pattern.currentColor;

        if (templateId === 'granny') {
            const rounds = await this.promptForNumber({
                title: 'Granny Square',
                message: 'Enter number of rounds (1-50):',
                defaultValue: 4,
                min: 1,
                max: 50
            });
            if (!rounds) return;
            templatePattern = createGrannySquare({ rounds, color });
        } else if (templateId === 'circle') {
            const rounds = await this.promptForNumber({
                title: 'Basic Circle',
                message: 'Enter number of rounds (1-100):',
                defaultValue: 5,
                min: 1,
                max: 100
            });
            if (!rounds) return;
            templatePattern = createBasicCircle({ rounds, color });
        } else if (templateId === 'square') {
            const size = await this.promptForNumber({
                title: 'Basic Square',
                message: 'Enter square width in stitches (2-200):',
                defaultValue: 10,
                min: 2,
                max: 200
            });
            if (!size) return;
            templatePattern = createBasicSquare({ size, color });
        } else if (templateId === 'triangle') {
            const baseWidth = await this.promptForNumber({
                title: 'Triangle',
                message: 'Enter base width in stitches (3-200):',
                defaultValue: 10,
                min: 3,
                max: 200
            });
            if (!baseWidth) return;

            const directionChoice = await showModal({
                title: 'Triangle Direction',
                content: 'Choose triangle direction:',
                buttons: [
                    { text: 'Top-Down', primary: true },
                    { text: 'Bottom-Up' },
                    { text: 'Cancel' }
                ]
            });
            if (!directionChoice || directionChoice === 'Cancel') return;
            const direction = directionChoice === 'Bottom-Up' ? 'bottom-up' : 'top-down';

            templatePattern = createTriangle({ baseWidth, direction, color });
        }

        if (templatePattern) {
            this.applyTemplatePattern(templatePattern);
        }
    }

    /**
     * Apply a template pattern to the current pattern instance
     */
    applyTemplatePattern(templatePattern) {
        if (!templatePattern) return;

        this.pattern.mode = templatePattern.mode;
        this.pattern.workingDirection = templatePattern.workingDirection;
        this.pattern.autoTurningChain = templatePattern.autoTurningChain;
        this.pattern.turningChainOverrides = { ...templatePattern.turningChainOverrides };
        this.pattern.currentColor = templatePattern.currentColor;
        this.pattern.metadata = JSON.parse(JSON.stringify(templatePattern.metadata));

        this.pattern.loadState(templatePattern.graph.toJSON());
        this.pattern.history = [];
        this.pattern.historyIndex = -1;
        this.pattern.saveHistoryState(`Apply ${templatePattern.metadata?.name || 'template'}`);

        this.resetStitchOptions();
    }

    /**
     * Count working stitches in a row (excluding turning chains and magic ring)
     */
    getRowStitchCount(rowIndex) {
        if (!this.pattern.graph || rowIndex < 0) {
            return 0;
        }
        const row = this.pattern.graph.getRow(rowIndex) || [];
        return row.filter(stitch => {
            if (stitch.type === StitchType.MAGIC_RING) {
                return false;
            }
            if (stitch.isTurningChain && !stitch.turningChainCountsAsStitch) {
                return false;
            }
            return true;
        }).length;
    }

    /**
     * Get current/previous row stitch counts
     */
    getRowStitchCounts() {
        const currentRow = this.pattern.currentRow;
        const currentCount = this.getRowStitchCount(currentRow);
        const hasPrevious = currentRow > 0;
        const previousCount = hasPrevious ? this.getRowStitchCount(currentRow - 1) : 0;

        return {
            currentCount,
            previousCount,
            hasPrevious
        };
    }

    /**
     * Get display label for a row index
     */
    getDisplayRowLabel(rowIndex, hasFoundation) {
        if (hasFoundation && rowIndex === 0) {
            return 'Foundation Row';
        }
        return hasFoundation ? rowIndex : rowIndex + 1;
    }

    /**
     * Warn if row stitch count differs from previous row
     */
    async confirmRowCountMismatch() {
        const currentRow = this.pattern.currentRow;
        if (currentRow <= 0) {
            return true;
        }

        const hasFoundation = typeof this.pattern.hasFoundationChain === 'function'
            ? this.pattern.hasFoundationChain()
            : false;
        if (hasFoundation && currentRow === 1) {
            return true;
        }

        const currentCount = this.getRowStitchCount(currentRow);
        const previousCount = this.getRowStitchCount(currentRow - 1);

        if (currentCount === 0 || previousCount === 0 || currentCount === previousCount) {
            return true;
        }

        const currentLabel = this.getDisplayRowLabel(currentRow, hasFoundation);
        const prevLabel = this.getDisplayRowLabel(currentRow - 1, hasFoundation);
        const message = `${currentLabel} has ${currentCount} stitches, but ${prevLabel} has ${previousCount}. ` +
            'This may indicate an unintended increase/decrease. Start a new row anyway?';

        return showConfirm(message, 'Row Count Warning');
    }

    /**
     * Show crown shaping guide based on current row stitch count
     */
    async showCrownShapingGuide() {
        const currentCount = this.getRowStitchCount(this.pattern.currentRow);
        if (currentCount === 0) {
            await showAlert('Add some stitches before using the crown shaping guide.', 'Crown Shaping Guide');
            return;
        }

        const stitchAbbr = StitchDefinitions[this.selectedStitchType]?.abbreviation || 'sc';
        const guide = getCrownShapingGuide(currentCount, { stitchAbbr });
        if (!guide.rounds || guide.rounds.length === 0) {
            await showAlert('Crown shaping is already complete for this stitch count.', 'Crown Shaping Guide');
            return;
        }

        const lines = guide.rounds.map(round =>
            `Round ${round.round}: ${round.instruction}`
        );
        const content = `Crown shaping (decrease ${guide.decreasesPerRound} each round)\n` +
            `Start with ${guide.startStitches} sts\n\n` +
            `${lines.join('\n')}\n\n` +
            `Finish: ${guide.finish}`;

        await showModal({
            title: 'Crown Shaping Guide',
            content,
            monospace: true,
            buttons: [{ text: 'Close', primary: true }]
        });
    }

    /**
     * Add stitch at next available position
     * With error handling for robustness
     */
    async addStitchAtNextPosition() {
        try {
            const useChainSpaces = Boolean(this.pattern.currentWorkIntoSpace);
            let attachPoints = useChainSpaces
                ? this.pattern.getChainSpaces()
                : this.pattern.getAttachmentPoints();
            let availablePoints = attachPoints.filter(p => p.available !== false);

            // Fallback: if "work into space" is enabled but no chain spaces exist,
            // use normal attachment points instead
            if (useChainSpaces && availablePoints.length === 0) {
                attachPoints = this.pattern.getAttachmentPoints();
                availablePoints = attachPoints.filter(p => p.available !== false);
                if (availablePoints.length > 0) {
                    console.warn('No chain spaces found - using normal attachment points');
                }
            }

            if (!availablePoints || availablePoints.length === 0) {
                // No pattern started - create foundation chain
                if (!this.pattern.graph || this.pattern.graph.size === 0) {
                    await this.showStartPatternModal();
                } else {
                    // Start new row (consistent with clicking the new row ghost)
                    await this.handleStartNewRow();
                }
                return;
            }

            // Find suggested attachment point or use first available
            const attachPoint = availablePoints.find(p => p.suggested) || availablePoints[0];

            if (attachPoint && attachPoint.stitch) {
                const useSpace = attachPoint.type === 'chain-space' || this.pattern.currentWorkIntoSpace;
                const skipCount = useSpace ? 0 : (this.pattern.currentSkipCount || 0);
                const stitchOptions = {
                    modifiers: this.pattern.currentModifiers,
                    skipCount,
                    loopSelection: this.pattern.currentLoopSelection,
                    workIntoSpace: useSpace
                };

                // Validate stitch placement before adding
                const validation = StitchValidator.canPlaceStitch(
                    this.selectedStitchType,
                    attachPoint,
                    this.pattern,
                    stitchOptions
                );

                if (!validation.valid) {
                    await showAlert(validation.errors.join('\n'), 'Cannot Place Stitch');
                    return;
                }

                if (validation.warnings.length > 0) {
                    console.warn('Stitch placement warnings:', validation.warnings);
                }

                this.pattern.addStitch(this.selectedStitchType, attachPoint.stitch, stitchOptions);

                // Reset auto-skip after first stitch on row 1 (foundation chain guidance)
                if (this.pattern.currentSkipCount > 0 && this.pattern.hasFoundationChain?.()) {
                    const row1Stitches = this.pattern.graph.getRow(1)?.filter(s => !s.isTurningChain) || [];
                    if (row1Stitches.length === 1) {
                        this.pattern.currentSkipCount = 0;
                        this.updateSkipInput(0);
                    }
                }
            }
        } catch (err) {
            console.error('Error adding stitch:', err);
        }
    }

    /**
     * Start a new row, warning if the current row is incomplete
     */
    async handleStartNewRow() {
        const attachPoints = this.pattern.getAttachmentPoints();
        const hasOpenAttachments = attachPoints?.some(p => p.available);

        if (hasOpenAttachments) {
            const confirmed = await showConfirm(
                'This row still has unworked stitches. Start a new row anyway?',
                'Row Incomplete'
            );
            if (!confirmed) {
                return;
            }
        }

        const proceed = await this.confirmRowCountMismatch();
        if (!proceed) {
            return;
        }

        this.pattern.startNewRow({ stitchType: this.selectedStitchType });
        this.updateInfoPanel();
    }

    /**
     * Compute display-friendly row info for UI.
     */
    getRowDisplayInfo() {
        const stats = this.pattern.graph.getStats();
        const hasFoundation = typeof this.pattern.hasFoundationChain === 'function'
            ? this.pattern.hasFoundationChain()
            : false;
        const hasPattern = stats.totalStitches > 0;
        const currentRow = this.pattern.currentRow;
        const totalRows = stats.rowCount || 1;
        const displayRowCount = hasFoundation
            ? Math.max(1, stats.rowCount - 1)
            : stats.rowCount;
        const displayTotalRows = hasFoundation
            ? Math.max(1, totalRows - 1)
            : totalRows;
        const displayCurrentRowNumber = hasFoundation ? currentRow : currentRow + 1;
        const isFoundationRow = hasFoundation && currentRow === 0;
        const currentRowLabel = !hasPattern
            ? '-'
            : (isFoundationRow ? 'Foundation Row' : displayCurrentRowNumber);

        return {
            stats,
            hasFoundation,
            hasPattern,
            currentRow,
            isFoundationRow,
            displayRowCount,
            displayTotalRows,
            displayCurrentRowNumber,
            currentRowLabel,
            totalRows
        };
    }

    /**
     * Update info panel with current pattern stats
     */
    updateInfoPanel() {
        const rowInfo = this.getRowDisplayInfo();
        const { stats, hasFoundation, hasPattern } = rowInfo;

        this.infoPanel.querySelector('#info-total').textContent = stats.totalStitches;
        this.infoPanel.querySelector('#info-rows').textContent = rowInfo.displayRowCount;
        this.infoPanel.querySelector('#info-current-row').textContent = rowInfo.currentRowLabel;

        const rowStitchesEl = this.infoPanel.querySelector('#info-row-stitches');
        if (rowStitchesEl) {
            if (!hasPattern) {
                rowStitchesEl.textContent = '-';
            } else {
                const counts = this.getRowStitchCounts();
                rowStitchesEl.textContent = counts.hasPrevious
                    ? `${counts.currentCount} (prev ${counts.previousCount})`
                    : String(counts.currentCount);
            }
        }

        const workingEl = this.infoPanel.querySelector('#info-working-direction');
        if (workingEl) {
            if (!hasPattern) {
                workingEl.textContent = '-';
            } else {
                const isLeft = this.pattern.workingDirection === 'left';
                const directionLabel = isLeft ? '← left' : 'right →';
                const isFoundation = this.pattern.currentRow === 0;
                const hint = isFoundation ? ' (start at last chain made)' : '';
                workingEl.textContent = `${directionLabel}${hint}`;
            }
        }
    }

    /**
     * Update skip input field in stitch options panel
     */
    updateSkipInput(value) {
        const skipInput = this.infoPanel?.querySelector('#input-skip-count');
        if (skipInput) {
            skipInput.value = String(value);
        }
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
        this.selectedNodes.clear();
        if (node) {
            this.selectedNodes.add(node);
        }
        this.updateSelectionInfo();
    }

    /**
     * Hide selection info
     */
    hideSelectionInfo() {
        this.selectedNodes.clear();
        this.updateSelectionInfo();
    }

    /**
     * Update selection info display for current selection set
     */
    updateSelectionInfo() {
        const selectionInfo = this.infoPanel.querySelector('#selection-info');
        if (!selectionInfo) return;

        if (this.selectedNodes.size === 0) {
            selectionInfo.classList.add('hidden');
            return;
        }

        selectionInfo.classList.remove('hidden');
        const selectedTypeEl = this.infoPanel.querySelector('#info-selected-type');
        const selectedPosEl = this.infoPanel.querySelector('#info-selected-pos');

        if (this.selectedNodes.size === 1) {
            const node = Array.from(this.selectedNodes)[0];
            if (selectedTypeEl) selectedTypeEl.textContent = node.name;
            if (selectedPosEl) {
                selectedPosEl.textContent = `Row ${node.row + 1}, Col ${node.column + 1}`;
            }
        } else {
            if (selectedTypeEl) selectedTypeEl.textContent = `Multiple (${this.selectedNodes.size})`;
            if (selectedPosEl) selectedPosEl.textContent = '-';
        }
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

        const rowInfo = this.getRowDisplayInfo();
        const currentRow = rowInfo.currentRow;

        // Update displays
        const rowLabel = this.rowNavigation.querySelector('#row-label');
        const currentDisplay = this.rowNavigation.querySelector('#current-row-display');
        const rowOfLabel = this.rowNavigation.querySelector('#row-of-label');
        const totalDisplay = this.rowNavigation.querySelector('#total-rows-display');
        const goToInput = this.rowNavigation.querySelector('#input-go-to-row');
        const isFoundationRow = rowInfo.isFoundationRow;

        if (rowLabel) {
            rowLabel.textContent = isFoundationRow ? 'Foundation Row' : 'Row';
        }
        if (currentDisplay) {
            currentDisplay.textContent = isFoundationRow ? '' : rowInfo.displayCurrentRowNumber;
            currentDisplay.style.display = isFoundationRow ? 'none' : '';
        }
        if (rowOfLabel) {
            rowOfLabel.textContent = isFoundationRow ? '' : 'of';
            rowOfLabel.style.display = isFoundationRow ? 'none' : '';
        }
        if (totalDisplay) {
            totalDisplay.textContent = isFoundationRow ? '' : rowInfo.displayTotalRows;
            totalDisplay.style.display = isFoundationRow ? 'none' : '';
        }
        if (goToInput) {
            goToInput.min = rowInfo.hasFoundation ? '0' : '1';
        }

        // Update button states
        const prevBtn = this.rowNavigation.querySelector('#btn-prev-row');
        const nextBtn = this.rowNavigation.querySelector('#btn-next-row');

        if (prevBtn) {
            prevBtn.disabled = currentRow <= 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentRow >= rowInfo.totalRows - 1;
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
