class CoMarkupRenderer {
    constructor() {
        this.setupMutationObserver();
        this.processExistingCodeBlocks();
        this.pendingRender = null;
        this.setupMessageListener();
    }

    setupMessageListener() {
        browser.runtime.onMessage.addListener((message) => {
            console.log('[CoMarkup] Received message:', message);
            
            switch (message.type) {
                case 'POPUP_READY':
                    if (this.pendingRender) {
                        this.sendCodeToPopup(this.pendingRender.code, this.pendingRender.framework);
                    }
                    break;

                case 'RENDER_COMPLETE':
                    this.showNotification('Preview rendered successfully!');
                    this.pendingRender = null;
                    break;

                case 'RENDER_ERROR':
                    console.error('[CoMarkup] Render error:', message.error);
                    this.showNotification(message.error, 'error');
                    this.pendingRender = null;
                    break;

                case 'POPUP_CLOSED':
                    this.pendingRender = null;
                    break;
            }
        });
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.processCodeBlocks(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    processExistingCodeBlocks() {
        this.processCodeBlocks(document.body);
    }

    processCodeBlocks(root) {
        const codeBlocks = root.querySelectorAll('pre code, code[class*="language-"]');
        codeBlocks.forEach(block => {
            if (!block.hasAttribute('data-comarkup-processed')) {
                this.enhanceCodeBlock(block);
            }
        });
    }

    enhanceCodeBlock(block) {
        const code = block.textContent;
        const framework = this.detectFramework(code);

        this.addFrameworkBadge(block, framework);
        block.setAttribute('data-comarkup-processed', 'true');
    }

    detectFramework(code) {
        if (code.includes('React') || code.includes('jsx')) return 'react';
        if (code.includes('Vue') || code.includes('createApp')) return 'vue';
        return 'vanilla';
    }

    addFrameworkBadge(block, framework) {
        const badge = document.createElement('div');
        badge.className = 'comarkup-framework-badge';

        const config = {
            react: {name: 'React', color: '#61dafb'},
            vue: {name: 'Vue', color: '#42b883'},
            vanilla: {name: 'JavaScript', color: '#f7df1e'}
        }[framework];

        badge.innerHTML = `
            <span class="framework-name" style="color: ${config.color}">${config.name}</span>
            <div class="comarkup-actions">
                ${this.createActionIcon('render', config.color)}
                ${this.createActionIcon('copy', config.color)}
            </div>
        `;

        const renderIcon = badge.querySelector('[data-action="render"]');
        const copyIcon = badge.querySelector('[data-action="copy"]');

        renderIcon.addEventListener('click', () => this.renderCode(block.textContent, framework));
        copyIcon.addEventListener('click', () => this.copyToClipboard(block.textContent));

        block.parentElement.appendChild(badge);
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
            // Store the pending render
            this.pendingRender = {
                code,
                framework
            };

            // Request popup opening from background script
            const response = await browser.runtime.sendMessage({ type: 'OPEN_POPUP' });
            
            if (response.error) {
                throw new Error(response.error);
            }

            // The background script will handle opening the popup and sending the INIT_POPUP message
            // When we receive POPUP_READY, we'll send the code (handled in setupMessageListener)
            
        } catch (error) {
            console.error('[CoMarkup] Error:', error);
            this.showNotification(error.message, 'error');
            this.pendingRender = null;
        }
    }

    async sendCodeToPopup(code, framework) {
        try {
            await browser.runtime.sendMessage({
                type: 'RENDER_CODE',
                payload: {
                    code: this.extractCodeFromHTML(code),
                    framework,
                    originalContent: code
                }
            });
        } catch (error) {
            console.error('[CoMarkup] Error sending code to popup:', error);
            this.showNotification('Failed to send code to preview', 'error');
            this.pendingRender = null;
        }
    }

    extractCodeFromHTML(content) {
        if (!content) {
            console.warn('[CoMarkup] No content to extract');
            return '';
        }

        console.log('[CoMarkup] Original content:', {
            length: content.length,
            preview: content.substring(0, 100)
        });

        const codeMatch = content.match(/<code[^>]*>([\s\S]*?)<\/code>/i) ||
            content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);

        if (codeMatch) {
            const cleanCode = codeMatch[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();

            console.log('[CoMarkup] Extracted code:', {
                length: cleanCode.length,
                preview: cleanCode.substring(0, 100)
            });

            return cleanCode;
        }

        console.log('[CoMarkup] Using original content as code');
        return content.trim();
    }
}

// Initialize renderer
new CoMarkupRenderer();
