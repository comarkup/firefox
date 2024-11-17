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
        this.pendingRender = null;
        this.popup = null;
        this.setupMessageListener();
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

        // Add styles for the badge
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
            this.renderCode(block.textContent, analysis.framework);
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

    setupMessageListener() {
        browser.runtime.onMessage.addListener((message) => {
            console.log('[CoMarkup] Received message:', message);

            // Return a promise that resolves immediately
            return Promise.resolve((async () => {
                try {
                    switch (message.type) {
                        case 'POPUP_READY':
                            if (this.pendingRender) {
                                await this.sendCodeToPopup(this.pendingRender.code, this.pendingRender.framework);
                            }
                            return { success: true };

                        case 'RENDER_COMPLETE':
                            this.showNotification('Preview rendered successfully!');
                            this.pendingRender = null;
                            return { success: true };

                        case 'RENDER_ERROR':
                            console.error('[CoMarkup] Render error:', message.error);
                            this.showNotification(message.error, 'error');
                            this.pendingRender = null;
                            return { success: true };

                        case 'POPUP_CLOSED':
                            this.closePopup();
                            return { success: true };

                        default:
                            return { error: 'Unknown message type' };
                    }
                } catch (error) {
                    console.error('[CoMarkup] Error handling message:', error);
                    return { error: error.message };
                }
            })());
        });
    }

    createPopup() {
        if (this.popup) {
            return;
        }

        // Create popup container
        const container = document.createElement('div');
        container.className = 'comarkup-popup-container';
        container.innerHTML = `
            <div class="comarkup-popup-overlay"></div>
            <div class="comarkup-popup">
                <iframe src="${browser.runtime.getURL('popup.html')}" frameborder="0"></iframe>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .comarkup-popup-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .comarkup-popup-container.visible {
                opacity: 1;
            }
            .comarkup-popup-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            .comarkup-popup {
                position: relative;
                width: 90%;
                height: 90%;
                max-width: 1200px;
                max-height: 800px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }
            .comarkup-popup-container.visible .comarkup-popup {
                transform: translateY(0);
            }
            .comarkup-popup iframe {
                width: 100%;
                height: 100%;
                border: none;
            }
        `;
        document.head.appendChild(style);

        // Add click handler to close on overlay click
        container.querySelector('.comarkup-popup-overlay').addEventListener('click', () => {
            this.closePopup();
        });

        document.body.appendChild(container);
        this.popup = container;

        // Trigger animation after a brief delay
        requestAnimationFrame(() => {
            container.classList.add('visible');
        });
    }

    closePopup() {
        if (this.popup) {
            // Trigger closing animation
            this.popup.classList.remove('visible');

            // Remove after animation completes
            setTimeout(() => {
                this.popup.remove();
                this.popup = null;
                this.pendingRender = null;

                // Notify background script
                browser.runtime.sendMessage({ type: 'POPUP_CLOSED' }).catch(error => {
                    console.error('[CoMarkup] Error sending POPUP_CLOSED message:', error);
                });
            }, 300);
        }
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

            // Create and show the popup
            this.createPopup();

            // Request popup initialization from background script
            const response = await browser.runtime.sendMessage({ type: 'OPEN_POPUP' });

            if (response.error) {
                throw new Error(response.error);
            }

        } catch (error) {
            console.error('[CoMarkup] Error:', error);
            this.showNotification(error.message, 'error');
            this.pendingRender = null;
            this.closePopup();
        }
    }

    async sendCodeToPopup(code, framework) {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'RENDER_CODE',
                payload: {
                    code: this.extractCodeFromHTML(code),
                    framework,
                    originalContent: code
                }
            });

            if (response.error) {
                throw new Error(response.error);
            }

        } catch (error) {
            console.error('[CoMarkup] Error sending code to popup:', error);
            this.showNotification('Failed to send code to preview', 'error');
            this.pendingRender = null;
            this.closePopup();
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

// Note: Don't initialize here anymore, it's done after detector.js loads
