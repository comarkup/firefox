import { DebugLogger } from './debug-logger.js';
import { processCode } from './popup-core.js';

let currentCode = '';

export function createEditableEditor() {
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
    addEditorStyles();

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

function addEditorStyles() {
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
        /* Syntax highlighting */
        .token.keyword { color: #569cd6; }
        .token.string { color: #ce9178; }
        .token.function { color: #dcdcaa; }
        .token.number { color: #b5cea8; }
        .token.operator { color: #d4d4d4; }
        .token.comment { color: #6a9955; }
    `;
    document.head.appendChild(style);
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

export function setEditorContent(code) {
    currentCode = code;
    const editor = document.getElementById('editor');
    if (editor) {
        const textarea = editor.querySelector('.code-editor-textarea');
        const codeElement = editor.querySelector('code');
        const lineNumbers = editor.querySelector('.line-numbers');
        
        if (textarea) textarea.value = code;
        if (codeElement) codeElement.innerHTML = highlightCode(code);
        if (lineNumbers) updateLineNumbers(lineNumbers, code);
    }
}

export function getEditorContent() {
    return currentCode;
}
