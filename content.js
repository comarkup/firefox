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
        const framework = FrameworkDetector.detect(code);
        const config = FrameworkDetector.frameworks[framework];

        this.addFrameworkBadge(block, config);
        block.setAttribute('data-comarkup-processed', 'true');
    }

    addFrameworkBadge(block, config) {
        const badge = document.createElement('div');
        badge.className = 'comarkup-framework-badge';

        // Framework name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'framework-name';
        nameSpan.textContent = config.name;
        nameSpan.style.color = config.color;

        // Actions container
        const actions = document.createElement('div');
        actions.className = 'comarkup-actions';

        // Render icon - większe wymiary
        const renderIcon = this.createActionIcon({
            action: 'render',
            tooltip: 'Render Preview',
            svg: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 3l14 9-14 9V3z"/>
            </svg>
        `,
            onClick: () => this.renderCode(block.textContent, config.framework)
        });

        // Publish icon - większe wymiary
        const publishIcon = this.createActionIcon({
            action: 'publish',
            tooltip: 'Publish',
            svg: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2zM10 12h4"/>
                <path d="M12 8v4"/>
            </svg>
        `,
            onClick: () => this.publishCode(block.textContent, config.framework)
        });

        // Copy icon - większe wymiary
        const copyIcon = this.createActionIcon({
            action: 'copy',
            tooltip: 'Copy Code',
            svg: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
        `,
            onClick: () => this.copyToClipboard(block.textContent)
        });

        // Dodaj marginesy i padding dla lepszego wyśrodkowania
        renderIcon.style.padding = '4px';
        publishIcon.style.padding = '4px';
        copyIcon.style.padding = '4px';

        actions.appendChild(renderIcon);
        actions.appendChild(publishIcon);
        actions.appendChild(copyIcon);

        badge.appendChild(nameSpan);
        badge.appendChild(actions);

        block.parentElement.appendChild(badge);
    }

// Zaktualizowana metoda tworzenia pojedynczej ikony
    createActionIcon({ action, tooltip, svg, onClick }) {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        const icon = document.createElement('div');
        icon.className = 'comarkup-action-icon';
        icon.innerHTML = svg;
        icon.addEventListener('click', onClick);

        const tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'comarkup-tooltip';
        tooltipDiv.textContent = tooltip;

        container.appendChild(icon);
        container.appendChild(tooltipDiv);

        return container;
    }

// Metoda do kopiowania kodu
    async copyToClipboard(code) {
        try {
            await navigator.clipboard.writeText(code);
            this.showNotification('Code copied to clipboard!');
        } catch (err) {
            this.showNotification('Failed to copy code', 'error');
        }
    }

// Metoda do pokazywania notyfikacji
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        background: ${type === 'success' ? 'rgba(0, 200, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'};
        color: white;
        font-size: 14px;
        z-index: 10000;
        transition: opacity 0.3s;
    `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }


    checkFrameworkAvailability(framework) {
        const checks = {
            'react': () => typeof React !== 'undefined' && typeof ReactDOM !== 'undefined',
            'vue': () => typeof Vue !== 'undefined',
            'vanilla': () => true
        };

        return checks[framework] ? checks[framework]() : false;
    }

    async renderCode(code, framework) {
        const config = FrameworkDetector.frameworks[framework];

        // Zamiast bezpośrednio używać window.open, użyjemy pliku HTML z web_accessible_resources
        const popupUrl = browser.runtime.getURL('popup.html');
        const popup = window.open(popupUrl, 'CoMarkup Preview', 'width=800,height=600');

        // Czekamy na załadowanie popupu i wysyłamy do niego dane
        popup.addEventListener('load', () => {
            popup.postMessage({
                type: 'RENDER_CODE',
                payload: {
                    code,
                    framework,
                    config
                }
            }, '*');
        });
    }

    getFrameworkWrapper(framework, code) {
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
                    
                    if (frameworkReady) {
                        const rootElement = document.getElementById('root');
                        ReactDOM.render(React.createElement(App), rootElement);
                    }
                `;
            case 'vue':
                return `
                    if (frameworkReady) {
                        const app = Vue.createApp({
                            setup() {
                                return () => {
                                    ${code}
                                }
                            }
                        });
                        app.mount('#root');
                    }
                `;
            case 'vanilla':
                return `
                    (function() {
                        const root = document.getElementById('root');
                        ${code}
                    })();
                `;
            default:
                return code;
        }
    }
}

// Initialize the renderer
new CoMarkupRenderer();
