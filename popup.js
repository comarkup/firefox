let frameworkReady = false;

// Helper do ładowania skryptów
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Inicjalizacja przycisków
document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
        const html = document.getElementById('root').innerHTML;
        await navigator.clipboard.writeText(html);
        alert('Copied to clipboard!');
    } catch (err) {
        alert('Error copying: ' + err);
    }
});

document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
});

// Nasłuchiwanie na wiadomości od content script
window.addEventListener('message', async function(event) {
    if (event.data.type === 'RENDER_CODE') {
        const { code, framework, config } = event.data.payload;

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

            // Przygotowanie kodu do wykonania
            const codeWrapper = getFrameworkWrapper(framework, code);

            // Wykonanie kodu
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
                ReactDOM.render(React.createElement(App), document.getElementById('root'));
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
                app.mount('#root');
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
