const FrameworkDetector = {
    frameworks: {
        react: {
            name: 'React',
            color: '#61dafb',
            textColor: '#000000',
            patterns: ['React', 'useState', 'useEffect', 'jsx', '<React.Fragment>', '<>'],
            scripts: [
                'https://unpkg.com/react@17/umd/react.development.js',
                'https://unpkg.com/react-dom@17/umd/react-dom.development.js',
                'https://unpkg.com/babel-standalone@6/babel.min.js'
            ]
        },
        vue: {
            name: 'Vue.js',
            color: '#42b883',
            textColor: '#ffffff',
            patterns: ['Vue.createApp', 'defineComponent', 'ref,', 'computed,', 'watch,'],
            scripts: [
                'https://unpkg.com/vue@3/dist/vue.global.js'
            ]
        },
        angular: {
            name: 'Angular',
            color: '#dd1b16',
            textColor: '#ffffff',
            patterns: ['@Component', '@Injectable', 'ngOnInit', '@angular'],
            scripts: [
                'https://unpkg.com/@angular/core@12',
                'https://unpkg.com/@angular/platform-browser-dynamic@12'
            ]
        },
        svelte: {
            name: 'Svelte',
            color: '#ff3e00',
            textColor: '#ffffff',
            patterns: ['svelte', 'createStore', '$:', 'bind:'],
            scripts: [
                'https://unpkg.com/svelte@3'
            ]
        },
        vanilla: {
            name: 'JavaScript',
            color: '#f7df1e',
            textColor: '#000000',
            patterns: ['document.', 'window.', 'addEventListener', 'querySelector'],
            scripts: []
        }
    },

    detect(code) {
        for (const [framework, config] of Object.entries(this.frameworks)) {
            if (config.patterns.some(pattern => code.includes(pattern))) {
                return framework;
            }
        }
        return 'vanilla';
    }
};

