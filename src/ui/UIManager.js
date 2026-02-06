import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';

/**
 * UIManager - Minimal UI for adding single crochet stitches
 *
 * Provides:
 * - "New Chain" button to start a foundation chain
 * - "Add SC" button to add a single crochet
 * - "New Row" button to start a new row
 * - Info panel showing stitch count
 */

export class UIManager {
    constructor(pattern) {
        this.pattern = pattern;
        this.container = null;
        this.infoPanel = null;
        this.eventSubs = new EventSubscriptions();
        this.onKeyDown = this.onKeyDown.bind(this);

        this.init();
    }

    init() {
        this.createStyles();
        this.createContainer();
        this.createToolbar();
        this.createInfoPanel();
        this.setupEventListeners();
    }

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

            .toolbar-btn.primary {
                background: #2196F3;
                color: white;
                border-color: #1976D2;
            }

            .toolbar-btn.primary:hover {
                background: #1976D2;
            }

            .info-panel {
                right: 16px;
                top: 16px;
                min-width: 160px;
            }

            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 13px;
            }

            .info-label {
                color: #666;
            }

            .info-value {
                font-weight: 600;
                color: #333;
            }

            .keyboard-hint {
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid #eee;
                font-size: 11px;
                color: #999;
            }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'crochet-ui';
        document.body.appendChild(this.container);
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'crochet-panel crochet-toolbar';

        const chainBtn = document.createElement('button');
        chainBtn.className = 'toolbar-btn';
        chainBtn.textContent = 'New Chain (C)';
        chainBtn.addEventListener('click', () => {
            this.pattern.startWithChain(10);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'toolbar-btn primary';
        addBtn.textContent = 'Add SC (S)';
        addBtn.addEventListener('click', () => {
            this.addNextStitch();
        });

        const rowBtn = document.createElement('button');
        rowBtn.className = 'toolbar-btn';
        rowBtn.textContent = 'New Row (N)';
        rowBtn.addEventListener('click', () => {
            this.pattern.startNewRow();
        });

        toolbar.appendChild(chainBtn);
        toolbar.appendChild(addBtn);
        toolbar.appendChild(rowBtn);
        this.container.appendChild(toolbar);
    }

    createInfoPanel() {
        this.infoPanel = document.createElement('div');
        this.infoPanel.className = 'crochet-panel info-panel';
        this.updateInfoPanel();
        this.container.appendChild(this.infoPanel);
    }

    updateInfoPanel() {
        if (!this.infoPanel) return;
        const stats = this.pattern.graph.getStats();

        this.infoPanel.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = 'Pattern Info';
        this.infoPanel.appendChild(title);

        const rows = [
            ['Stitches', stats.totalStitches],
            ['Rows', stats.rowCount],
            ['Current Row', this.pattern.currentRow],
            ['Direction', this.pattern.workingDirection === 'right' ? '\u2192' : '\u2190']
        ];

        rows.forEach(([label, value]) => {
            const row = document.createElement('div');
            row.className = 'info-row';

            const labelEl = document.createElement('span');
            labelEl.className = 'info-label';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.className = 'info-value';
            valueEl.textContent = value;

            row.appendChild(labelEl);
            row.appendChild(valueEl);
            this.infoPanel.appendChild(row);
        });

        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.textContent = 'Keys: C=chain, S=add SC, N=new row';
        this.infoPanel.appendChild(hint);
    }

    addNextStitch() {
        const points = this.pattern.getAttachmentPoints();
        if (points.length === 0) return;

        const suggested = points.find(p => p.suggested) || points[0];
        this.pattern.addStitch(suggested.stitch);
    }

    setupEventListeners() {
        this.eventSubs.on(Events.STITCH_ADDED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.STITCH_REMOVED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.PATTERN_LOADED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.PATTERN_CLEARED, () => this.updateInfoPanel());
        this.eventSubs.on(Events.ROW_ADDED, () => this.updateInfoPanel());

        document.addEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(e) {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'c':
                this.pattern.startWithChain(10);
                break;
            case 's':
                this.addNextStitch();
                break;
            case 'n':
                this.pattern.startNewRow();
                break;
        }
    }

    dispose() {
        this.eventSubs.dispose();
        document.removeEventListener('keydown', this.onKeyDown);
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}
