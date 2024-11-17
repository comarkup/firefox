// popup.js
let frameworkReady = false;
let currentCode = '';
let editorInstance = null;

function initializeEditor(code, originalContent) {
    const editor = document.getElementById('editor');
    currentCode = code;

    // Zachowaj oryginalne wcięcia i formatowanie
    const formattedCode = originalContent || formatCode(code);

    // Pokaż kod w edytorze
    editor.innerHTML = `<pre><code>${highlightCode(formattedCode)}</code></pre>`;

    // Dodaj numerację linii
    addLineNumbers(editor);
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

// Dodaj style do CSS
const additionalStyles = `
.code-editor {
    position: relative;
    padding-left: 3.5em;
    background: #1e1e1e;
}

.line-numbers {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3em;
    background: #252525;
    border-right: 1px solid #333;
    user-select: none;
}

.line-number {
    color: #666;
    text-align: right;
    padding: 0 0.5em;
    font-size: 14px;
    line-height: 1.5;
}

pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    tab-size: 4;
}

code {
    font-family: 'Courier New', monospace;
    line-height: 1.5;
}
`;

// Nasłuchiwanie na wiadomości od content script
window.addEventListener('message', async function(event) {
    if (event.data.type === 'RENDER_CODE') {
        const { code, framework, config, originalContent } = event.data.payload;

        // Inicjalizuj edytor z otrzymanym kodem
        initializeEditor(code, originalContent);

        try {
            // Ładowanie skryptów frameworka
            for (const src of config.scripts) {
                await loadScript(src);
            }

            // Sprawdzenie dostępności frameworka
            const checks = {
                'react': () => typeof React !== 'undefined' && typeof ReactDOM !== 'undefined',
                'vue': () => typeof Vue !== 'undefined',
                'vanilla': () => true
            };

            if (!checks[framework]()) {
                throw new Error('Framework not loaded properly');
            }

            // Wykonanie kodu
            const codeWrapper = getFrameworkWrapper(framework, code);
            if (framework === 'react') {
                const transformed = Babel.transform(codeWrapper, {
                    presets: ['react']
                }).code;
                eval(transformed);
            } else {
                eval(codeWrapper);
            }

            frameworkReady = true;

        } catch (error) {
            document.getElementById('root').innerHTML =
                `<div class="error">Error: ${error.message}</div>`;
        }
    }
});

// Dodaj style do dokumentu
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
