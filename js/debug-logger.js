import { DEBUG, STEPS } from './constants.js';

export const DebugLogger = {
    steps: new Map(),
    container: null,
    initialized: false,

    init() {
        if (!DEBUG || this.initialized) return;
        this._initialize();
        Object.values(STEPS).forEach(step => {
            this.steps.set(step, {
                description: step,
                status: 'pending',
                data: null,
                time: Date.now()
            });
        });
        this.render();
        return true;
    },

    _initialize() {
        if (this.initialized) return;

        this.container = document.createElement('div');
        this.container.className = 'debug-panel';
        this.container.innerHTML = `
            <h3>Debug Checklist</h3>
            <div class="debug-steps"></div>
        `;
        document.body.appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            .debug-panel {
                position: fixed;
                top: 50px;
                right: 10px;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 15px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
                max-height: 400px;
                overflow-y: auto;
            }
            .debug-step {
                margin: 5px 0;
                padding: 5px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .debug-step.success { background: rgba(0,255,0,0.2); }
            .debug-step.error { background: rgba(255,0,0,0.2); }
            .debug-step.pending { background: rgba(255,255,0,0.2); }
            .debug-data {
                color: #aaa;
                margin-top: 3px;
                word-break: break-all;
                font-size: 10px;
            }
        `;
        document.head.appendChild(style);
        this.initialized = true;
    },

    updateStep(stepId, status = 'pending', data = null) {
        if (!DEBUG) return;
        if (!this.initialized) this.init();

        const step = this.steps.get(stepId) || {
            description: stepId,
            status: 'pending',
            data: null,
            time: Date.now()
        };

        step.status = status;
        step.data = data;
        step.time = Date.now();

        this.steps.set(stepId, step);
        this.render();
    },

    render() {
        if (!DEBUG || !this.container) return;

        const stepsContainer = this.container.querySelector('.debug-steps');
        if (!stepsContainer) return;

        const stepsHtml = Array.from(this.steps.entries())
            .map(([id, step]) => `
                <div class="debug-step ${step.status}">
                    <span>${step.description}</span>
                    <span>[${step.status}]</span>
                    ${step.data ? `<div class="debug-data">${JSON.stringify(step.data)}</div>` : ''}
                </div>
            `).join('');

        stepsContainer.innerHTML = stepsHtml;
    }
};
