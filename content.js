function createRenderButton(codeElement) {
    if (codeElement.getAttribute('data-renderer-added')) return;

    const button = document.createElement('button');
    button.textContent = 'Renderuj';
    button.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 1000;
    padding: 5px 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

    button.addEventListener('click', () => {
        const code = codeElement.textContent;
        showPopup(code);
    });

    codeElement.style.position = 'relative';
    codeElement.appendChild(button);
    codeElement.setAttribute('data-renderer-added', 'true');
}

function detectReactCode() {
    const possibleCodeElements = document.querySelectorAll('pre, code');

    possibleCodeElements.forEach(element => {
        const content = element.textContent;
        if (
            content.includes('React') ||
            content.includes('useState') ||
            content.includes('useEffect') ||
            content.includes('class extends React.Component') ||
            content.includes('function') && content.includes('return') && content.includes('jsx')
        ) {
            createRenderButton(element);
        }
    });
}

function showPopup(code) {
    const popup = window.open('', 'React Renderer', 'width=800,height=600');

    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>React Renderer</title>
      <script src="${browser.runtime.getURL('react.development.js')}"></script>
      <script src="${browser.runtime.getURL('react-dom.development.js')}"></script>
      <script src="${browser.runtime.getURL('babel.min.js')}"></script>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        #result { border: 1px solid #ccc; padding: 20px; margin: 20px 0; }
        button { margin: 5px; padding: 8px 16px; }
      </style>
    </head>
    <body>
      <div id="result"></div>
      <button onclick="copyToClipboard()">Kopiuj do schowka</button>
      <button onclick="window.close()">Zamknij</button>
      
      <script type="text/babel">
        try {
          ${code}
          
          // Próba wyrenderowania kodu
          const element = eval(code);
          ReactDOM.render(element, document.getElementById('result'));
        } catch (error) {
          document.getElementById('result').innerHTML = 
            '<p style="color: red;">Błąd renderowania: ' + error.message + '</p>';
        }
      </script>
      
      <script>
        function copyToClipboard() {
          const resultHtml = document.getElementById('result').innerHTML;
          navigator.clipboard.writeText(resultHtml)
            .then(() => alert('Skopiowano do schowka!'))
            .catch(err => alert('Błąd podczas kopiowania: ' + err));
        }
      </script>
    </body>
    </html>
  `);
}

// Uruchom detekcję co 2 sekundy
setInterval(detectReactCode, 2000);

// Pierwsze uruchomienie
detectReactCode();
