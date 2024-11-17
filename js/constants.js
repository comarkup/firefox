// Debug mode flag
export const DEBUG = true;

// Debug steps definition
export const STEPS = {
    INIT: 'initialization',
    DOM_READY: 'dom-ready',
    BUTTONS_INIT: 'buttons-init',
    POPUP_READY: 'popup-ready',
    CODE_RECEIVED: 'code-received',
    CODE_PROCESSING: 'code-processing',
    SCRIPTS_LOAD: 'scripts-loading',
    RENDERING: 'rendering',
    COMPLETION: 'completion'
};

// Framework configuration
export const frameworkConfig = {
    react: {
        name: 'React',
        color: '#61dafb',
        scripts: [
            'https://unpkg.com/react@17.0.2/umd/react.development.js',
            'https://unpkg.com/react-dom@17.0.2/umd/react-dom.development.js',
            'https://unpkg.com/babel-standalone@6.26.0/babel.min.js'
        ]
    },
    angular: {
        name: 'Angular',
        color: '#dd1b16',
        scripts: [
            '/frameworks/zone.min.js',
            '/frameworks/rxjs.umd.js',
            '/frameworks/reflect.js',
            '/frameworks/angular-core.umd.js',
            '/frameworks/angular-common.umd.js',
            '/frameworks/angular-compiler.umd.js',
            '/frameworks/angular-platform-browser.umd.js',
            '/frameworks/angular-platform-browser-dynamic.umd.js'
        ]
    },
    vue: {
        name: 'Vue',
        color: '#42b883',
        scripts: ['https://unpkg.com/vue@3.2.31/dist/vue.global.js']
    },
    svelte: {
        name: 'Svelte',
        color: '#ff3e00',
        scripts: ['https://unpkg.com/svelte@3.47.0/compiler.js']
    },
    vanilla: {
        name: 'JavaScript',
        color: '#f7df1e',
        scripts: []
    }
};
