class CoMarkupRenderer {
    constructor() {
        this.setupMutationObserver();
        this.processExistingCodeBlocks();
        this.activePopup = null;
        this.popupReadyPromise = null;
        this.pendingCode = null;
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

        // Event listeners dla ikon
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

    handlePopupMessage(event) {
        console.log('[CoMarkup] Received message from popup:', event.data);

        if (event.data.type === 'POPUP_READY') {
            this.sendCodeToPopup();
        }

        if (event.data.type === 'RENDER_COMPLETE') {
            this.pendingCode?.resolve();
            this.pendingCode = null;
        }

        if (event.data.type === 'RENDER_ERROR') {
            console.error('[CoMarkup] Render error:', event.data.error);
            this.pendingCode?.resolve(new Error(event.data.error));
            this.pendingCode = null;
        }
    }

    async renderCode(code, framework) {
        console.log('[CoMarkup] Starting render process', { framework });

        try {
            if (this.activePopup && !this.activePopup.closed) {
                this.activePopup.close();
            }

            const popupUrl = browser.runtime.getURL('popup.html');
            this.activePopup = window.open(popupUrl, 'CoMarkup Preview', 'width=1200,height=800');

            if (!this.activePopup) {
                throw new Error('Failed to open popup - blocked by browser?');
            }

            // Czekaj na załadowanie popupu
            const messageHandler = (event) => {
                if (event.data.type === 'POPUP_READY') {
                    console.log('[CoMarkup] Popup ready, sending code');
                    this.activePopup.postMessage({
                        type: 'RENDER_CODE',
                        payload: {
                            code: this.extractCodeFromHTML(code),
                            framework,
                            originalContent: code
                        }
                    }, '*');
                }
            };

            window.addEventListener('message', messageHandler);

            // Wyślij PING co 100ms przez 5 sekund
            let attempts = 0;
            const pingInterval = setInterval(() => {
                if (attempts >= 50 || !this.activePopup || this.activePopup.closed) {
                    clearInterval(pingInterval);
                    window.removeEventListener('message', messageHandler);
                    return;
                }

                try {
                    this.activePopup.postMessage({ type: 'PING' }, '*');
                    attempts++;
                } catch (e) {
                    console.log('[CoMarkup] Popup not ready yet');
                }
            }, 100);

        } catch (error) {
            console.error('[CoMarkup] Error:', error);
            this.showNotification(error.message, 'error');
        }
    }



    checkPopupReady() {
        if (!this.pendingCode || !this.activePopup || this.activePopup.closed) {
            return;
        }

        const maxRetries = 50; // 5 seconds
        const checkInterval = 100; // 100ms

        const check = () => {
            if (this.pendingCode.retries >= maxRetries) {
                console.error('[CoMarkup] Popup failed to initialize');
                return;
            }

            this.pendingCode.retries++;

            try {
                // Próba wysłania wiadomości testowej
                this.activePopup.postMessage({ type: 'PING' }, '*');
            } catch (e) {
                // Jeśli popup nie jest gotowy, spróbuj ponownie
                setTimeout(check, checkInterval);
            }
        };

        check();
    }

    sendCodeToPopup() {
        if (!this.pendingCode || !this.activePopup || this.activePopup.closed) {
            console.error('[CoMarkup] Cannot send code - popup not ready');
            return;
        }

        const { code, framework } = this.pendingCode;
        console.log('[CoMarkup] Sending code to popup', {
            framework,
            codeLength: code?.length
        });

        this.activePopup.postMessage({
            type: 'RENDER_CODE',
            payload: {
                code: this.extractCodeFromHTML(code),
                framework,
                originalContent: code
            }
        }, '*');
    }

    extractCodeFromHTML(content) {
        if (!content) {
            console.warn('[CoMarkup] No content to extract');
            return '';
        }

        // Log oryginalną zawartość
        console.log('[CoMarkup] Original content:', {
            length: content.length,
            preview: content.substring(0, 100)
        });

        // Usuń znaczniki HTML jeśli istnieją
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

// Inicjalizacja renderera
new CoMarkupRenderer();
