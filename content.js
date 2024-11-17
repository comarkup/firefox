class CoMarkupRenderer {
    constructor() {
        this.setupMutationObserver();
        this.processExistingCodeBlocks();
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

    renderCode(code, framework) {
        console.log('[CoMarkup] Starting render process', {framework});

        const popupUrl = browser.runtime.getURL('popup.html');
        console.log('[CoMarkup] Popup URL:', popupUrl);

        // Otwórz popup i zachowaj referencję
        const popup = window.open(popupUrl, 'CoMarkup Preview', 'width=1200,height=800');

        // Sprawdź czy popup został utworzony
        if (!popup) {
            console.error('[CoMarkup] Failed to open popup - blocked by browser?');
            return;
        }

        // Przygotuj dane przed wysłaniem
        const cleanCode = this.extractCodeFromHTML(code);
        const messageData = {
            type: 'RENDER_CODE',
            payload: {
                code: cleanCode,
                framework,
                originalContent: code
            }
        };

        console.log('[CoMarkup] Prepared message data:', messageData);

        // Dodaj timer do sprawdzenia czy popup jest gotowy
        const maxAttempts = 50; // 5 sekund
        let attempts = 0;

        const checkPopupReady = setInterval(() => {
            attempts++;

            try {
                if (popup.document.readyState === 'complete') {
                    clearInterval(checkPopupReady);
                    console.log('[CoMarkup] Popup ready, sending message');
                    popup.postMessage(messageData, '*');
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkPopupReady);
                    console.error('[CoMarkup] Popup failed to load after 5 seconds');
                }
            } catch (e) {
                console.error('[CoMarkup] Error checking popup state:', e);
                clearInterval(checkPopupReady);
            }
        }, 100);

        // Dodaj nasłuchiwanie na potwierdzenie od popupa
        window.addEventListener('message', function (event) {
            if (event.data.type === 'POPUP_READY') {
                console.log('[CoMarkup] Received ready confirmation from popup');
            }
            if (event.data.type === 'CODE_RECEIVED') {
                console.log('[CoMarkup] Popup confirmed code reception');
            }
        });
    }

    extractCodeFromHTML(content) {
        // Usuń znaczniki HTML jeśli istnieją
        const codeMatch = content.match(/<code[^>]*>([\s\S]*?)<\/code>/i) ||
            content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);

        if (codeMatch) {
            return codeMatch[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }

        return content;
    }
}

// Inicjalizacja renderera
new CoMarkupRenderer();
