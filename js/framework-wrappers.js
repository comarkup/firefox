import { frameworkConfig } from './constants.js';
import { DebugLogger } from './debug-logger.js';

export function getFrameworkWrapper(framework, code) {
    const config = frameworkConfig[framework] || frameworkConfig.vanilla;

    switch (framework) {
        case 'react':
            return createReactWrapper(code);
        case 'vue':
            return createVueWrapper(code);
        case 'angular':
            return createAngularWrapper(code);
        case 'vanilla':
            return createVanillaWrapper(code);
        default:
            return code;
    }
}

function createReactWrapper(code) {
    // Ensure code is wrapped in a root component if it's not already
    const processedCode = code.trim();
    const isComponent = processedCode.startsWith('function') || processedCode.startsWith('class');
    
    if (isComponent) {
        return `
            try {
                ${processedCode}
                ReactDOM.render(
                    React.createElement(${processedCode.split(' ')[1].split('(')[0]}),
                    document.querySelector('.preview-content')
                );
            } catch (error) {
                console.error('[React Error]:', error);
                const container = document.querySelector('.preview-content');
                container.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
            }
        `;
    } else {
        return `
            try {
                const App = () => {
                    return (${processedCode});
                };
                ReactDOM.render(
                    React.createElement(App),
                    document.querySelector('.preview-content')
                );
            } catch (error) {
                console.error('[React Error]:', error);
                const container = document.querySelector('.preview-content');
                container.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
            }
        `;
    }
}

function createAngularWrapper(code) {
    // Extract component metadata and class definition
    const componentMatch = code.match(/@Component\(\{([\s\S]*?)\}\)\s*export\s*class\s*(\w+)([\s\S]*)/);
    if (!componentMatch) {
        throw new Error('Invalid Angular component format');
    }

    const [_, metadata, className, classBody] = componentMatch;

    // Clean up the metadata
    const cleanMetadata = metadata
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // Ensure property names are quoted
        .replace(/`/g, "'")  // Replace template literals with single quotes
        .replace(/\${/g, "' + ")  // Handle string interpolation
        .replace(/}/g, " + '")  // Handle string interpolation
        .trim();

    return `
        try {
            // Define the component
            const ${className} = Component({${cleanMetadata}})(
                class {
                    constructor() {
                        ${classBody.replace('export class CounterComponent', '')}
                    }
                }
            );

            // Create the module
            const AppModule = NgModule({
                imports: [BrowserModule],
                declarations: [${className}],
                bootstrap: [${className}]
            })(class {});

            // Bootstrap the application
            platformBrowserDynamic()
                .bootstrapModule(AppModule)
                .catch(err => {
                    console.error('[Angular Error]:', err);
                    const container = document.querySelector('.preview-content');
                    container.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + err.message + '</div>';
                });
        } catch (error) {
            console.error('[Angular Error]:', error);
            const container = document.querySelector('.preview-content');
            container.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
        }
    `;
}

function createVueWrapper(code) {
    // Sanitize code for injection into JavaScript
    const sanitizedCode = code
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, ' ')
        .trim();

    return `
        (function() {
            const container = document.querySelector('.preview-content');
            if (!container) {
                console.error('Preview container not found');
                return;
            }

            try {
                // Create a div to hold the sanitized code
                const codeContainer = document.createElement('div');
                codeContainer.innerHTML = '${sanitizedCode}';
                container.appendChild(codeContainer);

                // Create Vue app
                const app = Vue.createApp({
                    data() {
                        return {
                            error: null
                        };
                    },
                    mounted() {
                        console.log('[Vue] Component mounted');
                    },
                    errorCaptured(err) {
                        this.error = err.message;
                        return false;
                    }
                });

                // Mount to the code container
                app.mount(codeContainer);
                console.log('[Vue] App mounted successfully');

            } catch (error) {
                console.error('[Vue Error]:', error);
                container.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
            }
        })();
    `;
}

function createVanillaWrapper(code) {
    return `
        (function() {
            const container = document.querySelector('.preview-content');
            ${code}
        })();
    `;
}

export async function loadFrameworkScripts(framework) {
    const config = frameworkConfig[framework] || frameworkConfig.vanilla;
    const scripts = config.scripts || [];

    for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
            try {
                await loadScript(src);
                console.log(`[Framework] Successfully loaded ${src}`);
            } catch (error) {
                console.error(`[Framework] Failed to load ${src}:`, error);
                throw error;
            }
        }
    }

    // For Angular, we need to ensure global objects are available
    if (framework === 'angular') {
        window.Component = ng.core.Component;
        window.NgModule = ng.core.NgModule;
        window.BrowserModule = ng.platformBrowser.BrowserModule;
        window.platformBrowserDynamic = ng.platformBrowserDynamic.platformBrowserDynamic;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
            console.log(`[Framework] Script loaded: ${src}`);
            resolve();
        };
        
        script.onerror = (error) => {
            console.error(`[Framework] Script load error for ${src}:`, error);
            reject(new Error(`Failed to load script: ${src}`));
        };
        
        document.head.appendChild(script);
    });
}
