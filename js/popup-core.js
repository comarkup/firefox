import { DebugLogger } from './debug-logger.js';
import { STEPS } from './constants.js';
import { getFrameworkWrapper, loadFrameworkScripts } from './framework-wrappers.js';
import { createEditableEditor, setEditorContent } from './editor.js';
import { setupUI, showError, clearPreview, initializePreview } from './ui-handlers.js';

let currentFramework = null;
let popupInitialized = false;
let parentTabId = null;

export async function processCode({ code, framework, originalContent }) {
    try {
        console.log('[Popup] Processing code for framework:', framework);
        console.log('[Popup] Raw code:', code);
        
        DebugLogger.updateStep(STEPS.CODE_PROCESSING, 'pending');
        currentFramework = framework;
        setEditorContent(code);

        if (!popupInitialized) {
            createEditableEditor();
            popupInitialized = true;
        }

        // Load framework scripts
        DebugLogger.updateStep(STEPS.SCRIPTS_LOAD, 'pending', {
            framework,
            scriptsCount: framework === 'vanilla' ? 0 : 1
        });

        try {
            await loadFrameworkScripts(framework);
            DebugLogger.updateStep(STEPS.SCRIPTS_LOAD, 'success');
        } catch (error) {
            console.error('[Popup] Script load error:', error);
            DebugLogger.updateStep(STEPS.SCRIPTS_LOAD, 'error', error.message);
            throw error;
        }

        console.log('[Popup] Preparing to render code');
        DebugLogger.updateStep(STEPS.RENDERING, 'pending');

        // Prepare the preview container
        if (framework === 'angular') {
            // For Angular, extract the selector from the component decorator
            const selectorMatch = code.match(/selector:\s*['"]([^'"]+)['"]/);
            if (selectorMatch) {
                const selector = selectorMatch[1];
                const container = document.querySelector('.preview-content');
                if (container) {
                    container.innerHTML = `<${selector}></${selector}>`;
                }
            }
        } else {
            clearPreview();
        }

        // Get the wrapped code
        const wrappedCode = getFrameworkWrapper(framework, code);
        console.log('[Popup] Wrapped code:', wrappedCode);

        // Handle different frameworks
        if (framework === 'react') {
            console.log('[Popup] Transforming React code with Babel');
            const transformed = Babel.transform(wrappedCode, { presets: ['react'] }).code;
            eval(transformed);
        } else if (framework === 'angular') {
            // For Angular, we need to ensure all dependencies are properly initialized
            try {
                // Create a new script element to ensure proper execution context
                const scriptElement = document.createElement('script');
                scriptElement.textContent = wrappedCode;
                document.head.appendChild(scriptElement);
                document.head.removeChild(scriptElement);
            } catch (error) {
                console.error('[Angular Error]:', error);
                throw error;
            }
        } else {
            eval(wrappedCode);
        }

        console.log('[Popup] Code rendered successfully');
        DebugLogger.updateStep(STEPS.RENDERING, 'success');
        DebugLogger.updateStep(STEPS.COMPLETION, 'success');

        // Notify of successful render
        browser.runtime.sendMessage({ type: 'RENDER_COMPLETE' });
    } catch (error) {
        console.error('[Popup] Processing error:', error);
        console.error('[Popup] Error stack:', error.stack);
        
        DebugLogger.updateStep(STEPS.COMPLETION, 'error', {
            message: error.message,
            stack: error.stack,
            phase: error.phase || 'unknown'
        });

        showError(error);

        // Notify of render error
        browser.runtime.sendMessage({
            type: 'RENDER_ERROR',
            error: error.message
        });
    }
}

// Message handling
browser.runtime.onMessage.addListener((message) => {
    console.log('[Popup Frame] Received message:', message);

    return Promise.resolve((async () => {
        try {
            switch (message.type) {
                case 'INIT_POPUP':
                    parentTabId = message.tabId;
                    popupInitialized = false;
                    DebugLogger.updateStep('popup-initialized', 'success', { parentTabId });
                    await browser.runtime.sendMessage({ type: 'POPUP_READY' });
                    return { success: true };

                case 'RENDER_CODE':
                    console.log('[Popup Frame] Received code to render');
                    const { code, framework, originalContent } = message.payload;

                    DebugLogger.updateStep(STEPS.CODE_RECEIVED, 'success', {
                        framework,
                        codeLength: code?.length || 0
                    });

                    try {
                        await processCode({ code, framework, originalContent });
                        console.log('[Popup Frame] Code processed successfully');
                        return { success: true };
                    } catch (error) {
                        console.error('[Popup Frame] Process error:', error);
                        return { error: error.message };
                    }

                default:
                    return { error: 'Unknown message type' };
            }
        } catch (error) {
            console.error('[Popup Frame] Error handling message:', error);
            return { error: error.message };
        }
    })());
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Popup Frame] DOM loaded');
    DebugLogger.init();
    DebugLogger.updateStep(STEPS.INIT, 'success');
    DebugLogger.updateStep(STEPS.DOM_READY, 'success');

    setupUI();

    // Notify background script that popup frame is loaded
    browser.runtime.sendMessage({ type: 'POPUP_LOADED' })
        .catch(error => {
            console.error('[Popup Frame] Error sending POPUP_LOADED message:', error);
            DebugLogger.updateStep(STEPS.POPUP_READY, 'error', error.message);
        });
});
