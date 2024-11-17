const DEBUG = true;
let currentCode = '';
let popupInitialized = false;

// Konfiguracja frameworków
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



// System debugowania
const DebugLogger = {
    steps: new Map(),
    container: null,
    initialized: false,

    init() {
        if (!DEBUG || this.initialized) return;

        this._initialize();
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
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
                max-height: 400px;
                overflow-y: auto;
            }
            .debug-step {
                margin: 5px 0;
                padding: 3px 6px;
                border-radius: 3px;
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

    log(stepId, description, status = 'pending', data = null) {
        if (!DEBUG) return;

        this.addStep(stepId, description);
        if (status === 'success') {
            this.success(stepId, data);
        } else if (status === 'error') {
            this.error(stepId, data);
        }
    },

    addStep(id, description) {
        if (!DEBUG) return;
        if (!this.initialized) this.init();

        this.steps.set(id, {
            description,
            status: 'pending',
            error: null,
            data: null,
            time: Date.now()
        });
        this.render();
    },

    _getStepDescription(stepId) {
        const descriptions = {
            [this.STEPS.SCRIPT_LOADED]: 'Script Loaded',
            [this.STEPS.DOM_READY]: 'DOM Ready',
            [this.STEPS.BUTTONS_INIT]: 'Buttons Initialized',
            [this.STEPS.EDITOR_INIT]: 'Editor Initialized',
            [this.STEPS.POPUP_INIT]: 'Popup Initialized',
            [this.STEPS.CODE_RECEIVED]: 'Code Received',
            [this.STEPS.FRAMEWORK_LOADED]: 'Framework Loaded',
            [this.STEPS.RENDER_COMPLETE]: 'Render Complete'
        };
        return descriptions[stepId] || stepId;
    },

    updateStep(stepId, status = 'success', data = null) {
        const step = this.steps.get(stepId);
        if (step) {
            step.status = status;
            step.data = data;
            step.time = Date.now();
            this.render();
        }
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






// Funkcja debugLog
function debugLog(message, status = 'pending', data = null) {
    console.log(`[CoMarkup Popup] ${message}`, data);
    // Zamiast addStep używamy updateStep
    const stepId = `step-${Date.now()}`;
    DebugLogger.steps.set(stepId, {
        description: message,
        status: status,
        data: data,
        time: Date.now()
    });
    DebugLogger.render();
}

async function handleCopy() {
    try {
        await navigator.clipboard.writeText(currentCode);
        DebugLogger.updateStep('copy', 'success', 'Code copied to clipboard');
    } catch (err) {
        DebugLogger.updateStep('copy', 'error', err.message);
    }
}

// Funkcje pomocnicze
function debugLog(message, data = null) {
    console.log(`[CoMarkup Popup] ${message}`, data);
    if (DEBUG) {
        DebugLogger.addStep(Date.now(), message);
        if (data) {
            DebugLogger.success(Date.now(), data);
        }
    }
}

function loadScript(src) {
    debugLog(`Loading script: ${src}`);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            debugLog(`Script loaded: ${src}`);
            resolve();
        };
        script.onerror = (err) => {
            debugLog(`Script failed to load: ${src}`, err);
            reject(err);
        };
        document.head.appendChild(script);
    });
}

function formatCode(code) {
    if (!code) return '';
    return code
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n\s+/g, '\n  ');
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

function addLineNumbers(editor) {
    const lines = editor.querySelector('pre').innerText.split('\n');
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';

    lines.forEach((_, index) => {
        const lineNumber = document.createElement('div');
        lineNumber.className = 'line-number';
        lineNumber.textContent = index + 1;
        lineNumbers.appendChild(lineNumber);
    });

    editor.insertBefore(lineNumbers, editor.firstChild);
}

function initializeEditor(code, originalContent) {
    debugLog('Initializing editor', { codeLength: code?.length });
    const editor = document.getElementById('editor');
    if (!editor) {
        throw new Error('Editor element not found');
    }

    currentCode = code;
    const formattedCode = originalContent || formatCode(code);
    editor.innerHTML = `<pre><code>${highlightCode(formattedCode)}</code></pre>`;
    addLineNumbers(editor);
    debugLog('Editor initialized');
}

function getFrameworkWrapper(framework, code) {
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

function checkFrameworkAvailability(framework) {
    const checks = {
        'react': () => typeof React !== 'undefined' && typeof ReactDOM !== 'undefined',
        'vue': () => typeof Vue !== 'undefined',
        'vanilla': () => true
    };
    return checks[framework] ? checks[framework]() : false;
}


// Inicjalizacja
// Nasłuchiwanie na załadowanie DOM
// Aktualizujemy inicjalizację przycisków
document.addEventListener('DOMContentLoaded', () => {
    // Inicjalizacja debuggera
    DebugLogger.init();
    debugLog('Popup script loaded');
    debugLog('DOMContentLoaded event fired', 'success');

    // Inicjalizacja przycisków
    const copyBtn = document.getElementById('copyBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (copyBtn && closeBtn) {
        // Dodajemy obsługę kopiowania
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(currentCode);
                debugLog('Code copied to clipboard', 'success');
            } catch (err) {
                debugLog('Failed to copy code', 'error', err.message);
            }
        });

        // Obsługa zamykania
        closeBtn.addEventListener('click', () => window.close());

        DebugLogger.updateStep(DebugLogger.STEPS.BUTTONS_INIT, 'success');
    } else {
        DebugLogger.updateStep(DebugLogger.STEPS.BUTTONS_INIT, 'error', 'Buttons not found');
    }

    // Inicjalizacja edytora
    const editor = document.getElementById('editor');
    if (editor) {
        DebugLogger.updateStep(DebugLogger.STEPS.EDITOR_INIT, 'success');
    } else {
        debugLog('Missing required DOM elements', 'error');
    }

    // Powiadom content script o gotowości
    if (window.opener) {
        window.opener.postMessage({ type: 'POPUP_READY' }, '*');
        debugLog('Sent POPUP_READY message', 'success');
    } else {
        debugLog('No opener window found', 'error');
    }

    popupInitialized = true;
    debugLog('Popup initialized', 'success');
});

// Obsługa wiadomości
// Nasłuchiwanie na wiadomości
window.addEventListener('message', async (event) => {
    debugLog('Received message', 'info', event.data);

    if (event.data.type === 'RENDER_CODE') {
        const { code, framework, originalContent } = event.data.payload;
        DebugLogger.updateStep(DebugLogger.STEPS.CODE_RECEIVED, 'success', {
            framework,
            codeLength: code?.length
        });

        try {
            // Inicjalizacja edytora
            const editor = document.getElementById('editor');
            if (!editor) {
                throw new Error('Editor element not found');
            }

            // Aktualizacja edytora
            currentCode = code;
            editor.innerHTML = `<pre><code>${highlightCode(originalContent || code)}</code></pre>`;
            addLineNumbers(editor);
            DebugLogger.updateStep('editor-update', 'success', 'Code loaded into editor');

            // Ładowanie frameworka
            const config = frameworkConfig[framework];
            if (!config) {
                throw new Error(`Unknown framework: ${framework}`);
            }

            // Ładowanie skryptów
            for (const src of config.scripts) {
                await loadScript(src);
                debugLog(`Loaded script: ${src}`, 'success');
            }
            DebugLogger.updateStep(DebugLogger.STEPS.FRAMEWORK_LOADED, 'success');

            // Renderowanie
            const root = document.getElementById('root');
            root.innerHTML = '<div class="preview-content"></div>';

            const wrappedCode = getFrameworkWrapper(framework, code);
            if (framework === 'react') {
                const transformed = Babel.transform(wrappedCode, {
                    presets: ['react']
                }).code;
                eval(transformed);
            } else {
                eval(wrappedCode);
            }

            DebugLogger.updateStep(DebugLogger.STEPS.RENDER_COMPLETE, 'success');
        } catch (error) {
            debugLog('Rendering failed', 'error', error.message);
            document.getElementById('root').innerHTML =
                `<div class="error">Error: ${error.message}</div>`;
        }
    }
});


// Inicjalizacja przy starcie skryptu
DebugLogger.init();


// Powiadomienie o załadowaniu skryptu
debugLog('Popup script loaded');
