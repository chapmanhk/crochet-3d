import { UIConstants } from '../utils/Constants.js';

/**
 * Modal - A simple modal dialog component
 *
 * Replaces browser alert() and confirm() with styled modals.
 */

let styleInjected = false;

function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: ${UIConstants.MODAL_Z_INDEX};
            opacity: 0;
            transition: opacity ${UIConstants.TRANSITION_DURATION}ms ease;
        }

        .modal-overlay.visible {
            opacity: 1;
        }

        .modal-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            transform: scale(0.95);
            transition: transform ${UIConstants.TRANSITION_DURATION}ms ease;
        }

        .modal-overlay.visible .modal-container {
            transform: scale(1);
        }

        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
            font-weight: 600;
            font-size: 16px;
            color: #333;
        }

        .modal-body {
            padding: 20px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.5;
            color: #555;
            white-space: pre-wrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .modal-body.monospace {
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 13px;
            background: #f9f9f9;
            border-radius: 4px;
        }

        .modal-footer {
            padding: 12px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        .modal-btn {
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            font-size: 14px;
            transition: all ${UIConstants.TRANSITION_DURATION}ms ease;
        }

        .modal-btn:hover {
            background: #f5f5f5;
        }

        .modal-btn.primary {
            background: ${UIConstants.PRIMARY_COLOR};
            color: white;
            border-color: ${UIConstants.PRIMARY_DARK};
        }

        .modal-btn.primary:hover {
            background: ${UIConstants.PRIMARY_DARK};
        }

        .modal-btn.danger {
            background: ${UIConstants.ERROR_COLOR};
            color: white;
            border-color: #d32f2f;
        }

        .modal-btn.danger:hover {
            background: #d32f2f;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show a modal dialog
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content
 * @param {boolean} options.monospace - Use monospace font for content
 * @param {Array} options.buttons - Array of button configs: { text, primary, danger, onClick }
 * @returns {Promise} - Resolves when modal is closed, with the button that was clicked
 */
export function showModal(options) {
    injectStyles();

    const {
        title = 'Notice',
        content = '',
        monospace = false,
        buttons = [{ text: 'OK', primary: true }]
    } = options;

    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'modal-header');

        // Create container
        const container = document.createElement('div');
        container.className = 'modal-container';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.id = 'modal-header';
        header.textContent = title;
        container.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body' + (monospace ? ' monospace' : '');
        body.textContent = content;
        container.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        let keydownHandler = null;

        const closeModal = (result) => {
            // Always remove the keydown handler when closing
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler);
            }
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, UIConstants.TRANSITION_DURATION);
        };

        buttons.forEach((btnConfig, index) => {
            const btn = document.createElement('button');
            btn.className = 'modal-btn';
            if (btnConfig.primary) btn.classList.add('primary');
            if (btnConfig.danger) btn.classList.add('danger');
            btn.textContent = btnConfig.text;
            btn.setAttribute('aria-label', btnConfig.text);
            if (index === 0) {
                btn.setAttribute('data-autofocus', 'true');
            }
            btn.addEventListener('click', () => {
                if (btnConfig.onClick) btnConfig.onClick();
                closeModal(btnConfig.text);
            });
            footer.appendChild(btn);
        });

        container.appendChild(footer);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Close on overlay click (outside modal)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(null);
            }
        });

        // Close on Escape key
        keydownHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(null);
            }
        };
        document.addEventListener('keydown', keydownHandler);
    });
}

/**
 * Show an alert-style modal (replacement for window.alert)
 * @param {string} message - The message to display
 * @param {string} title - Optional title (default: 'Notice')
 * @returns {Promise} - Resolves when OK is clicked
 */
export function showAlert(message, title = 'Notice') {
    return showModal({
        title,
        content: message,
        buttons: [{ text: 'OK', primary: true }]
    });
}

/**
 * Show a confirm-style modal (replacement for window.confirm)
 * @param {string} message - The message to display
 * @param {string} title - Optional title (default: 'Confirm')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(message, title = 'Confirm') {
    return showModal({
        title,
        content: message,
        buttons: [
            { text: 'Cancel' },
            { text: 'OK', primary: true }
        ]
    }).then(result => result === 'OK');
}

/**
 * Show a pattern instructions modal with monospace formatting
 * @param {string} instructions - The pattern instructions
 * @returns {Promise} - Resolves when closed
 */
export function showInstructions(instructions) {
    return showModal({
        title: 'Pattern Instructions',
        content: instructions,
        monospace: true,
        buttons: [{ text: 'Close', primary: true }]
    });
}

/**
 * Show a prompt-style modal with input field (replacement for window.prompt)
 * @param {string} message - The message to display
 * @param {string} defaultValue - Default value for input
 * @param {string} title - Optional title (default: 'Input')
 * @returns {Promise<string|null>} - Resolves to input value if confirmed, null if cancelled
 */
export function showPrompt(message, defaultValue = '', title = 'Input') {
    injectStyles();

    // Inject additional styles for input if not already done
    if (!document.querySelector('#modal-input-styles')) {
        const inputStyle = document.createElement('style');
        inputStyle.id = 'modal-input-styles';
        inputStyle.textContent = `
            .modal-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                margin-top: 12px;
                box-sizing: border-box;
            }
            .modal-input:focus {
                outline: none;
                border-color: ${UIConstants.PRIMARY_COLOR};
                box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
            }
        `;
        document.head.appendChild(inputStyle);
    }

    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'prompt-header');

        // Create container
        const container = document.createElement('div');
        container.className = 'modal-container';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.id = 'prompt-header';
        header.textContent = title;
        container.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        const label = document.createElement('label');
        label.htmlFor = 'prompt-input';
        label.textContent = message;
        body.appendChild(label);

        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'prompt-input';
        input.className = 'modal-input';
        input.value = defaultValue;
        input.setAttribute('aria-label', message);
        body.appendChild(input);

        container.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        let keydownHandler = null;

        const closeModal = (result) => {
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler);
            }
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, UIConstants.TRANSITION_DURATION);
        };

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.setAttribute('aria-label', 'Cancel');
        cancelBtn.addEventListener('click', () => closeModal(null));
        footer.appendChild(cancelBtn);

        // OK button
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn primary';
        okBtn.textContent = 'OK';
        okBtn.setAttribute('aria-label', 'OK');
        okBtn.addEventListener('click', () => closeModal(input.value));
        footer.appendChild(okBtn);

        container.appendChild(footer);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            input.focus();
            input.select();
        });

        // Close on overlay click (outside modal)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(null);
            }
        });

        // Handle keyboard events
        keydownHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(null);
            } else if (e.key === 'Enter') {
                closeModal(input.value);
            }
        };
        document.addEventListener('keydown', keydownHandler);
    });
}
