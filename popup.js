const DEBUG = true;
let currentCode = '';
let popupInitialized = false;
let parentTabId = null;
let currentFramework = null;

// Debug steps definition
const STEPS = {
    INIT: 'initialization',
    DOM_READY: 'dom-ready',
    BUTTONS_INIT: 'buttons-init',
    POPUP_READY: 'popup-ready',
    CODE_RECEIVED: 'code-received',
    CODE_PROCESSING: 'code-processing',
    SCRIPTS_LOAD: 'scripts-loading',
    RENDERING: 'rendering',
    COMPLETION: 'completion'
};

// Framework configuration
const frameworkConfig = {
    react: {
        name: 'React',
        color: '#61dafb',
        scripts: [
            'https://unpkg.com/react@17/umd/react.development.js',
            'https://unpkg.com/react-dom@17/umd/react.development.js',
            'https://unpkg.com/babel-standalone@6/babel.min.js'
        ]
    },
    vue: {
        name: 'Vue',
        color: '#42b883',
        scripts: ['https://unpkg.com/vue@3/dist/vue.global.js']
    },
    vanilla: {
        name: 'JavaScript',
        color: '#f7df1e',
        scripts: []
    }
};

// Debug logger system
const DebugLogger = {
    steps: new Map(),
    container: null,
    initialized: false,

    init() {
        if (!DEBUG || this.initialized) return;
        this._initialize();
        Object.values(STEPS).forEach(step => {
            this.steps.set(step, {
                description: step,
                status: 'pending',
                data: null,
                time: Date.now()
            });
        });
        this.render();
        return true;
    },

    _initialize() {
        if (this.initialized) return;

        this.container = document.createElement('div');
        this.container.className = 'debug-panel';
        this.container.innerHTML = `
            <h3>Debug Checklist</h3>
            <div class="debug-steps"></div>
        `;
        document.body.appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            .debug-panel {
                position: fixed;
                top: 50px;
                right: 10px;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 15px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
                max-height: 400px;
                overflow-y: auto;
            }
            .debug-step {
                margin: 5px 0;
                padding: 5px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .debug-step.success { background: rgba(0,255,0,0.2); }
            .debug-step.error { background: rgba(255,0,0,0.2); }
            .debug-step.pending { background: rgba(255,255,0,0.2); }
            .debug-data {
                color: #aaa;
                margin-top: 3px;
                word-break: break-all;
                font-size: 10px;
            }
        `;
        document.head.appendChild(style);
        this.initialized = true;
    },

    updateStep(stepId, status = 'pending', data = null) {
        if (!DEBUG) return;
        if (!this.initialized) this.init();

        const step = this.steps.get(stepId) || {
            description: stepId,
            status: 'pending',
            data: null,
            time: Date.now()
        };

        step.status = status;
        step.data = data;
        step.time = Date.now();

        this.steps.set(stepId, step);
        this.render();
    },

    render() {
        if (!DEBUG || !this.container) return;

        const stepsContainer = this.container.querySelector('.debug-steps');
        if (!stepsContainer) return;

        const stepsHtml = Array.from(this.steps.entries())
            .map(([id, step]) => `
                <div class="debug-step ${step.status}">
                    <span>${step.description}</span>
                    <span>[${step.status}]</span>
                    ${step.data ? `<div class="debug-data">${JSON.stringify(step.data)}</div>` : ''}
                </div>
            `).join('');

        stepsContainer.innerHTML = stepsHtml;
    }
};

async function handleCopy() {
    try {
        await navigator.clipboard.writeText(currentCode);
        DebugLogger.updateStep('copy', 'success', 'Code copied to clipboard');
    } catch (err) {
        DebugLogger.updateStep('copy', 'error', err.message);
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            DebugLogger.updateStep(`script-load-${src}`, 'success');
            resolve();
        };
        script.onerror = (error) => {
            DebugLogger.updateStep(`script-load-${src}`, 'error', error.message);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

function createEditableEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Create editable textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'code-editor-textarea';
    textarea.spellcheck = false;
    textarea.value = currentCode;

    // Create pre element for syntax highlighting
    const pre = document.createElement('pre');
    pre.className = 'code-editor-highlighting';
    const code = document.createElement('code');
    pre.appendChild(code);

    // Add line numbers
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';

    // Add all elements to editor
    editor.appendChild(lineNumbers);
    editor.appendChild(pre);
    editor.appendChild(textarea);

    // Add styles for the editable setup
    const style = document.createElement('style');
    style.textContent = `
        .code-editor {
            position: relative;
            height: 100%;
            overflow: auto;
            background: #1e1e1e;
            font-family: 'Fira Code', 'Consolas', monospace;
        }
        .code-editor-textarea {
            position: absolute;
            top: 0;
            left: 40px;
            width: calc(100% - 40px);
            height: 100%;
            padding: 15px;
            border: none;
            background: transparent;
            color: #d4d4d4;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            outline: none;
            white-space: pre;
            overflow: auto;
            tab-size: 4;
        }
        .code-editor-highlighting {
            position: absolute;
            top: 0;
            left: 40px;
            width: calc(100% - 40px);
            height: 100%;
            padding: 15px;
            pointer-events: none;
            white-space: pre;
            font-size: 14px;
            line-height: 1.5;
        }
        .line-numbers {
            position: absolute;
            left: 0;
            top: 0;
            width: 40px;
            height: 100%;
            padding: 15px 0;
            background: #1e1e1e;
            border-right: 1px solid #404040;
            color: #858585;
            font-size: 14px;
            line-height: 1.5;
            text-align: right;
            user-select: none;
        }
        .line-number {
            padding-right: 8px;
        }
    `;
    document.head.appendChild(style);

    // Handle textarea input
    let updateTimeout;
    textarea.addEventListener('input', () => {
        currentCode = textarea.value;

        // Update syntax highlighting
        code.innerHTML = highlightCode(currentCode);

        // Update line numbers
        updateLineNumbers(lineNumbers, currentCode);

        // Debounce preview update
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            const analysis = FrameworkDetector.analyzeCode(currentCode);
            processCode({
                code: currentCode,
                framework: analysis.framework
            });
        }, 500);
    });

    // Initial render
    code.innerHTML = highlightCode(currentCode);
    updateLineNumbers(lineNumbers, currentCode);
}

function updateLineNumbers(lineNumbers, code) {
    const lines = code.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) =>
        `<div class="line-number">${i + 1}</div>`
    ).join('');
}

function highlightCode(code) {
    return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\b(const|let|var|function|return|if|else|try|catch|class|extends|import|export|default)\b/g,
            '<span class="token keyword">$1</span>')
        .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="token string">$1</span>')
        .replace(/\b(\w+)\(/g, '<span class="token function">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="token number">$1</span>')
        .replace(/([+\-*/%=<>!&|])/g, '<span class="token operator">$1</span>')
        .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
}

function getFrameworkWrapper(framework, code) {
    const config = FrameworkDetector.getFrameworkConfig(framework);

    switch (framework) {
        case 'react':
            return `
                const App = () => {
                    try {
                        ${code}
                    } catch (error) {
                        return React.createElement('div', 
                            { style: { color: 'red' } },
                            'Error: ' + error.message
                        );
                    }
                };
                ReactDOM.render(React.createElement(App), document.querySelector('.preview-content'));
            `;
        case 'vue':
            return `
                const app = Vue.createApp({
                    setup() {
                        return () => {
                            ${code}
                        }
                    }
                });
                app.mount('.preview-content');
            `;
        case 'vanilla':
            return `
                (function() {
                    const container = document.querySelector('.preview-content');
                    ${code}
                })();
            `;
        default:
            return code;
    }
}

function setupUI() {
    const copyBtn = document.getElementById('copyBtn');
    const closeBtn = document.getElementById('closeBtn');
    const editor = document.getElementById('editor');
    const root = document.getElementById('root');

    if (copyBtn && closeBtn) {
        copyBtn.addEventListener('click', handleCopy);
        closeBtn.addEventListener('click', () => {
            browser.runtime.sendMessage({ type: 'POPUP_CLOSED' });
        });
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

async function processCode({ code, framework, originalContent }) {
    try {
        console.log('[Popup] Processing code for framework:', framework);
        DebugLogger.updateStep(STEPS.CODE_PROCESSING, 'pending');
        currentFramework = framework;
        currentCode = code;

        if (!popupInitialized) {
            createEditableEditor();
            popupInitialized = true;
        }

        const config = FrameworkDetector.getFrameworkConfig(framework);
        console.log('[Popup] Using framework config:', config);
        DebugLogger.updateStep(STEPS.SCRIPTS_LOAD, 'pending', {
            framework,
            scriptsCount: config.scripts.length
        });

        // Load framework scripts if not already loaded
        for (const src of config.scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                try {
                    console.log('[Popup] Loading script:', src);
                    await loadScript(src);
                    DebugLogger.updateStep(`script-${src}`, 'success');
                } catch (error) {
                    console.error('[Popup] Script load error:', error);
                    DebugLogger.updateStep(`script-${src}`, 'error', error.message);
                    throw error;
                }
            }
        }
        DebugLogger.updateStep(STEPS.SCRIPTS_LOAD, 'success');

        console.log('[Popup] Preparing to render code');
        DebugLogger.updateStep(STEPS.RENDERING, 'pending');
        const root = document.getElementById('root');
        root.innerHTML = '<div class="preview-content"></div>';

        const wrappedCode = getFrameworkWrapper(framework, code);
        console.log('[Popup] Wrapped code ready for execution');

        if (framework === 'react') {
            console.log('[Popup] Transforming React code with Babel');
            const transformed = Babel.transform(wrappedCode, { presets: ['react'] }).code;
            eval(transformed);
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
        DebugLogger.updateStep(STEPS.COMPLETION, 'error', {
            message: error.message,
            phase: error.phase || 'unknown'
        });

        // Show error in preview
        const root = document.getElementById('root');
        root.innerHTML = `
            <div class="preview-content">
                <div style="color: red; padding: 20px;">
                    Error: ${error.message}
                </div>
            </div>
        `;

        // Notify of render error
        browser.runtime.sendMessage({
            type: 'RENDER_ERROR',
            error: error.message
        });
    }
}

// Initialize message handling
browser.runtime.onMessage.addListener((message) => {
    console.log('[Popup Frame] Received message:', message);

    // Return a promise that resolves immediately
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
