// First, load the detector script
(function loadDetector() {
    console.log('[CoMarkup] Loading detector script');
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('detector.js');
    script.onload = () => {
        console.log('[CoMarkup] Detector script loaded, initializing renderer');
        new CoMarkupRenderer();
    };
    (document.head || document.documentElement).appendChild(script);
})();

class CoMarkupRenderer {
    constructor() {
        console.log('[CoMarkup] Initializing CoMarkupRenderer');
        // Wait for FrameworkDetector to be available
        if (typeof FrameworkDetector === 'undefined') {
            console.log('[CoMarkup] Waiting for FrameworkDetector to be available');
            setTimeout(() => this.initialize(), 100);
            return;
        }
        this.initialize();
    }

    initialize() {
        console.log('[CoMarkup] Starting initialization');
        this.setupMutationObserver();
        this.processExistingCodeBlocks();
        console.log('[CoMarkup] Initialization complete');
    }

    setupMutationObserver() {
        console.log('[CoMarkup] Setting up mutation observer');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        console.log('[CoMarkup] New element added to DOM:', node);
                        this.processCodeBlocks(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('[CoMarkup] Mutation observer setup complete');
    }

    processExistingCodeBlocks() {
        console.log('[CoMarkup] Processing existing code blocks');
        const blocks = document.querySelectorAll('pre code, code[class*="language-"]');
        console.log('[CoMarkup] Found', blocks.length, 'existing code blocks');
        this.processCodeBlocks(document.body);
    }

    enhanceCodeBlock(block) {
        console.log('[CoMarkup] Enhancing code block:', block);
        console.log('[CoMarkup] Code content length:', block.textContent.length);

        const code = block.textContent;
        const analysis = FrameworkDetector.analyzeCode(code);
        console.log('[CoMarkup] Framework analysis:', analysis);

        try {
            this.addFrameworkBadge(block, analysis);
            block.setAttribute('data-comarkup-processed', 'true');
            console.log('[CoMarkup] Successfully enhanced code block');
        } catch (error) {
            console.error('[CoMarkup] Error enhancing code block:', error);
        }
    }

    addFrameworkBadge(block, analysis) {
        console.log('[CoMarkup] Adding framework badge for:', analysis.framework);

        const badge = document.createElement('div');
        badge.className = 'comarkup-framework-badge';

        // Add styles for the badge and preview
        const style = document.createElement('style');
        style.textContent = `
            .comarkup-framework-badge {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                align-items: center;
                padding: 3px;
                border: 1px solid white;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 0 0 0 8px;
                z-index: 100;
            }
            .framework-name {
                margin-right: 8px;
                font-size: 14px;
                font-weight: 500;
            }
            .comarkup-actions {
                display: flex;
                gap: 8px;
            }
            .comarkup-action-icon {
                position: relative;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .comarkup-action-icon:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .comarkup-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                font-size: 12px;
                border-radius: 4px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
                margin-bottom: 4px;
            }
            .comarkup-action-icon:hover .comarkup-tooltip {
                opacity: 1;
            }
            pre {
                position: relative;
            }
            .comarkup-preview {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                height: 90%;
                max-width: 1200px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 999999;
                overflow: hidden;
            }
            .comarkup-preview-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999998;
            }
            .comarkup-preview img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .comarkup-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 4px;
                color: white;
                font-size: 14px;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
                z-index: 999999;
            }
            .comarkup-notification.success {
                background: #4CAF50;
            }
            .comarkup-notification.error {
                background: #f44336;
            }
            .comarkup-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
        console.log('[CoMarkup] Added badge styles');

        badge.innerHTML = `
            <span class="framework-name" style="color: ${analysis.color}">${analysis.name}</span>
            <div class="comarkup-actions">
                ${this.createActionIcon('render', analysis.color)}
                ${this.createActionIcon('copy', analysis.color)}
            </div>
        `;

        const renderIcon = badge.querySelector('[data-action="render"]');
        const copyIcon = badge.querySelector('[data-action="copy"]');

        console.log('[CoMarkup] Setting up badge event listeners');
        renderIcon.addEventListener('click', () => {
            console.log('[CoMarkup] Render icon clicked');
            this.renderCode(block.textContent, analysis.framework.toLowerCase());
        });
        copyIcon.addEventListener('click', () => {
            console.log('[CoMarkup] Copy icon clicked');
            this.copyToClipboard(block.textContent);
        });

        // Ensure block's parent has position relative
        const parent = block.parentElement;
        if (parent) {
            console.log('[CoMarkup] Setting up parent container');
            const currentPosition = window.getComputedStyle(parent).position;
            if (currentPosition === 'static') {
                parent.style.position = 'relative';
            }
        }

        parent.appendChild(badge);
        console.log('[CoMarkup] Badge successfully added to DOM');
    }

    createActionIcon(action, color) {
        const icons = {
            render: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" 
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 3l14 9-14 9V3z"/>
                </svg>
            `,
            copy: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            `
        };

        return `
            <div class="comarkup-action-icon" data-action="${action}">
                ${icons[action]}
                <div class="comarkup-tooltip">${action === 'render' ? 'Preview' : 'Copy'}</div>
            </div>
        `;
    }

    processCodeBlocks(root) {
        console.log('[CoMarkup] Processing code blocks in:', root);
        const codeBlocks = root.querySelectorAll('pre code, code[class*="language-"]');
        console.log('[CoMarkup] Found', codeBlocks.length, 'code blocks to process');

        codeBlocks.forEach((block, index) => {
            console.log(`[CoMarkup] Processing block ${index + 1}/${codeBlocks.length}`);
            if (!block.hasAttribute('data-comarkup-processed')) {
                console.log('[CoMarkup] Block not processed yet, enhancing...');
                this.enhanceCodeBlock(block);
            } else {
                console.log('[CoMarkup] Block already processed, skipping');
            }
        });
    }

    async copyToClipboard(code) {
        try {
            await navigator.clipboard.writeText(code);
            this.showNotification('Code copied to clipboard!');
        } catch (err) {
            this.showNotification('Failed to copy code', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `comarkup-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    async renderCode(code, framework) {
        console.log('[CoMarkup] Starting render process', { framework });

        try {
            // Map framework names to server endpoints
            const frameworkMap = {
                'vanilla': 'vanilla',
                'vanilla js': 'vanilla',
                'javascript': 'vanilla',
                'vue': 'vue',
                'vue.js': 'vue',
                'react': 'react',
                'angular': 'angular'
            };

            const endpoint = frameworkMap[framework.toLowerCase()] || 'vanilla';
            
            const response = await fetch(`http://localhost:3000/render/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: code,
                    style: '', // Add any extracted styles here if needed
                    content: '' // Add any extracted HTML content here if needed
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Failed to render code');
            }

            const data = await response.json();

            // Create preview overlay and container
            const overlay = document.createElement('div');
            overlay.className = 'comarkup-preview-overlay';
            document.body.appendChild(overlay);

            const preview = document.createElement('div');
            preview.className = 'comarkup-preview';
            preview.innerHTML = `<img src="http://localhost:3000${data.screenshot}" alt="Rendered preview">`;
            document.body.appendChild(preview);

            // Close preview when clicking overlay
            overlay.addEventListener('click', () => {
                overlay.remove();
                preview.remove();
            });

            this.showNotification('Code rendered successfully!');
        } catch (error) {
            console.error('[CoMarkup] Error:', error);
            this.showNotification(error.message, 'error');
        }
    }
}
