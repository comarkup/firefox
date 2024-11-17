const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from the server directory
app.use(express.static(__dirname));

// Serve framework files from the parent directory
app.use('/frameworks', express.static(path.join(__dirname, '..', 'frameworks')));

// Framework templates
const TEMPLATES = {
    vue: 'templates/vue.html',
    react: 'templates/react.html',
    angular: 'templates/angular.html',
    vanilla: 'templates/vanilla.html'
};

async function loadTemplate(framework) {
    try {
        const templatePath = path.join(__dirname, TEMPLATES[framework] || TEMPLATES.vanilla);
        return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
        console.error(`Error loading template for ${framework}:`, error);
        throw new Error(`Failed to load template for ${framework}`);
    }
}

function injectCode(template, { content, script, style }) {
    try {
        return template
            .replace('<!-- CONTENT_PLACEHOLDER -->', content || '')
            .replace('// SCRIPT_PLACEHOLDER', script || '')
            .replace('<!-- STYLE_PLACEHOLDER -->', style ? `<style>${style}</style>` : '');
    } catch (error) {
        console.error('Error injecting code:', error);
        throw new Error('Failed to inject code into template');
    }
}

app.post('/render/:framework', async (req, res) => {
    const { framework } = req.params;
    const { content, script, style } = req.body;
    
    console.log(`Rendering ${framework} code:`, { 
        content: content?.substring(0, 100), 
        script: script?.substring(0, 100) 
    });

    let browser;
    try {
        // Load and prepare template
        const template = await loadTemplate(framework.toLowerCase());
        const html = injectCode(template, { content, script, style });

        // Launch browser and render
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set viewport size
        await page.setViewport({
            width: 1024,
            height: 768
        });

        // Capture console logs and errors
        page.on('console', msg => console.log('Page console:', msg.text()));
        page.on('error', err => console.error('Page error:', err));
        page.on('pageerror', err => console.error('Page error:', err));

        // Set longer timeout for resource loading
        await page.setDefaultNavigationTimeout(30000);
        await page.setDefaultTimeout(30000);
        
        // Set content and wait for everything to load
        await page.setContent(html, { 
            waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
            timeout: 30000
        });
        
        // Wait for framework initialization and any animations
        await page.waitForTimeout(3000);
        
        // Take screenshot
        const timestamp = Date.now();
        const screenshotPath = path.join(__dirname, `rendered-${timestamp}.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        
        console.log(`Successfully rendered ${framework} code and saved screenshot`);
        
        res.json({ 
            screenshot: `/rendered-${timestamp}.png`
        });
    } catch (error) {
        console.error(`Error rendering ${framework} code:`, error);
        res.status(500).json({ 
            error: 'Failed to render code',
            details: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Example endpoints
app.get('/', (req, res) => {
    res.send(`
        <h1>Framework Renderer API</h1>
        <p>Available endpoints:</p>
        <ul>
            <li>POST /render/vue - Render Vue.js components</li>
            <li>POST /render/react - Render React components</li>
            <li>POST /render/angular - Render Angular components</li>
            <li>POST /render/vanilla - Render vanilla JavaScript</li>
        </ul>
        <p>Example usage:</p>
        <pre>
curl -X POST http://localhost:3000/render/vanilla \\
-H "Content-Type: application/json" \\
-d '{
    "content": "&lt;div id=\\"counter\\"&gt;&lt;h1&gt;0&lt;/h1&gt;&lt;button onclick=\\"increment()\\"&gt;+&lt;/button&gt;&lt;/div&gt;",
    "script": "let count = 0; function increment() { count++; document.querySelector(\\"h1\\").textContent = count; }",
    "style": "#counter { text-align: center; } button { padding: 10px 20px; }"
}'
        </pre>
    `);
});

// Clean up old screenshots periodically
async function cleanupScreenshots() {
    try {
        const files = await fs.readdir(__dirname);
        const screenshots = files.filter(file => file.startsWith('rendered-') && file.endsWith('.png'));
        
        if (screenshots.length > 10) {
            screenshots.sort((a, b) => {
                const timeA = parseInt(a.split('-')[1]);
                const timeB = parseInt(b.split('-')[1]);
                return timeB - timeA;
            });
            
            const toDelete = screenshots.slice(10);
            for (const file of toDelete) {
                await fs.unlink(path.join(__dirname, file));
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

setInterval(cleanupScreenshots, 5 * 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /render/vue     - Render Vue.js components');
    console.log('  POST /render/react   - Render React components');
    console.log('  POST /render/angular - Render Angular components');
    console.log('  POST /render/vanilla - Render vanilla JavaScript');
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down...');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});
