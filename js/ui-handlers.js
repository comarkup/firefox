import { DebugLogger } from './debug-logger.js';
import { STEPS } from './constants.js';
import { getEditorContent } from './editor.js';

export function setupUI() {
    const copyBtn = document.getElementById('copyBtn');
    const closeBtn = document.getElementById('closeBtn');
    const editor = document.getElementById('editor');
    const root = document.getElementById('root');

    if (copyBtn && closeBtn) {
        copyBtn.addEventListener('click', handleCopy);
        closeBtn.addEventListener('click', handleClose);
        DebugLogger.updateStep(STEPS.BUTTONS_INIT, 'success');
    } else {
        DebugLogger.updateStep(STEPS.BUTTONS_INIT, 'error', 'Buttons not found');
    }

    if (!editor || !root) {
        DebugLogger.updateStep('ui-check', 'error', 'Required elements missing');
        return;
    }

    editor.classList.add('code-editor');
    root.classList.add('preview-container');
}

async function handleCopy() {
    try {
        const currentCode = getEditorContent();
        await navigator.clipboard.writeText(currentCode);
        DebugLogger.updateStep('copy', 'success', 'Code copied to clipboard');
    } catch (err) {
        DebugLogger.updateStep('copy', 'error', err.message);
    }
}

function handleClose() {
    browser.runtime.sendMessage({ type: 'POPUP_CLOSED' });
}

export function showError(error) {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div class="preview-content">
                <div style="color: red; padding: 20px;">
                    Error: ${error.message}
                    ${error.stack ? `<pre style="font-size: 12px; margin-top: 10px;">${error.stack}</pre>` : ''}
                </div>
            </div>
        `;
    }
}

export function clearPreview() {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '<div class="preview-content"></div>';
    }
}

export function initializePreview() {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '<div class="preview-content"></div>';
        return document.querySelector('.preview-content');
    }
    return null;
}
