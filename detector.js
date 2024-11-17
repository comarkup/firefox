// detector.js
const FrameworkDetector = {
    // Framework configuration
    frameworks: {
        react: {
            name: 'React',
            color: '#61dafb',
            textColor: '#000000',
            patterns: [
                'React.createElement',
                'jsx',
                'useState',
                'useEffect',
                'createContext',
                '<React.',
                'ReactDOM',
                '=>',
                'props',
                'className='
            ],
            scripts: [
                'https://unpkg.com/react@17.0.2/umd/react.development.js',
                'https://unpkg.com/react-dom@17.0.2/umd/react-dom.development.js',
                'https://unpkg.com/babel-standalone@6.26.0/babel.min.js'
            ],
            fileExtensions: ['.jsx', '.tsx'],
            weight: {
                'React.': 10,
                'useState': 8,
                'useEffect': 8,
                'jsx': 9,
                '=>': 2,
                'props': 3,
                'className=': 4
            }
        },

        angular: {
            name: 'Angular',
            color: '#dd1b16',
            textColor: '#ffffff',
            patterns: [
                '@Component',
                '@Injectable',
                'ngOnInit',
                'ngOnDestroy',
                '[(ngModel)]',
                '*ngFor',
                '*ngIf',
                '@Input()',
                '@Output()',
                'EventEmitter',
                'constructor(',
                'template:',
                'selector:',
                'export class'
            ],
            scripts: [
                'https://unpkg.com/@angular/core@12.2.16/bundles/core.umd.js',
                'https://unpkg.com/@angular/common@12.2.16/bundles/common.umd.js',
                'https://unpkg.com/@angular/platform-browser-dynamic@12.2.16/bundles/platform-browser-dynamic.umd.js'
            ],
            fileExtensions: ['.ts', '.component.ts'],
            weight: {
                '@Component': 10,
                '@Injectable': 9,
                'ngOnInit': 8,
                '*ng': 7,
                '@Input()': 6,
                'template:': 8,
                'selector:': 8,
                'export class': 5
            }
        },

        vue: {
            name: 'Vue.js',
            color: '#42b883',
            textColor: '#ffffff',
            patterns: [
                'Vue.createApp',
                'defineComponent',
                'ref,',
                'computed,',
                'watch,',
                'v-if',
                'v-for',
                'v-model',
                'v-on',
                'v-bind',
                'setup()',
                'mounted()',
                'methods:',
                'data()'
            ],
            scripts: [
                'https://unpkg.com/vue@3.2.31/dist/vue.global.js'
            ],
            fileExtensions: ['.vue'],
            weight: {
                'Vue.': 10,
                'defineComponent': 8,
                'v-': 7,
                'setup()': 6,
                'ref,': 5
            }
        },

        svelte: {
            name: 'Svelte',
            color: '#ff3e00',
            textColor: '#ffffff',
            patterns: [
                '<script>',
                'export let',
                '$:',
                'on:click',
                'bind:',
                'each',
                'as',
                'in',
                'svelte',
                '{#if}',
                '{#each}',
                '{/if}',
                '{/each}'
            ],
            scripts: [
                'https://unpkg.com/svelte@3'
            ],
            fileExtensions: ['.svelte'],
            weight: {
                'svelte': 10,
                '{#': 8,
                'export let': 7,
                '$:': 6,
                'bind:': 5
            }
        },

        vanilla: {
            name: 'JavaScript',
            color: '#f7df1e',
            textColor: '#000000',
            patterns: [
                'document.',
                'window.',
                'addEventListener',
                'querySelector',
                'getElementById',
                'createElement',
                'function',
                'const',
                'let',
                'var'
            ],
            scripts: [],
            fileExtensions: ['.js'],
            weight: {
                'document.': 3,
                'window.': 3,
                'addEventListener': 2,
                'querySelector': 2
            }
        }
    },

    // Detection methods
    detect(code) {
        if (!code) return 'vanilla';

        // Special case for Angular - check for @Component decorator
        if (code.includes('@Component') && code.includes('export class')) {
            return 'angular';
        }

        const scores = this.calculateFrameworkScores(code);
        const [detectedFramework] = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)[0];

        return detectedFramework;
    },

    calculateFrameworkScores(code) {
        const scores = {};
        const normalizedCode = this.normalizeCode(code);

        for (const [framework, config] of Object.entries(this.frameworks)) {
            scores[framework] = this.calculateFrameworkScore(normalizedCode, config);
        }

        return scores;
    },

    calculateFrameworkScore(code, config) {
        let score = 0;

        // Check each pattern
        for (const pattern of config.patterns) {
            if (code.includes(pattern)) {
                score += config.weight[pattern] || 1;
            }
        }

        // Extra points for file extension
        if (config.fileExtensions.some(ext => code.includes(ext))) {
            score += 5;
        }

        return score;
    },

    normalizeCode(code) {
        return code
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Helper methods
    getFrameworkConfig(framework) {
        return this.frameworks[framework] || this.frameworks.vanilla;
    },

    isFrameworkAvailable(framework) {
        return true; // We'll load scripts dynamically
    },

    getRequiredScripts(framework) {
        const config = this.getFrameworkConfig(framework);
        return config.scripts || [];
    },

    // Code analysis
    analyzeCode(code) {
        const framework = this.detect(code);
        const config = this.getFrameworkConfig(framework);

        return {
            framework,
            name: config.name,
            color: config.color,
            textColor: config.textColor,
            scripts: config.scripts,
            patterns: this.detectPatterns(code, config.patterns)
        };
    },

    detectPatterns(code, patterns) {
        return patterns.filter(pattern => code.includes(pattern));
    }
};

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrameworkDetector;
}
