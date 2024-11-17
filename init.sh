#!/bin/bash

# Kolory do komunikatów
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Funkcja do wyświetlania komunikatów
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Nazwa katalogu pluginu
PLUGIN_NAME="firefox-react-renderer"
CURRENT_DIR=$(pwd)
PLUGIN_DIR="$CURRENT_DIR/$PLUGIN_NAME"

# Sprawdź czy curl jest zainstalowany
if ! command -v curl &> /dev/null; then
    error "curl is not installed. Please install it first."
fi

# Utwórz strukturę katalogów
log "Tworzenie struktury katalogów..."
mkdir -p "$PLUGIN_DIR" || error "Nie można utworzyć katalogu pluginu"
cd "$PLUGIN_DIR" || error "Nie można przejść do katalogu pluginu"

# Utwórz manifest.json
log "Tworzenie manifest.json..."
cat > manifest.json << EOL
{
  "manifest_version": 2,
  "name": "React Code Renderer",
  "version": "1.0",
  "description": "Renders React code snippets from websites",
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "<all_urls>"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "web_accessible_resources": [
    "popup.html",
    "popup.js",
    "react.development.js",
    "react-dom.development.js",
    "babel.min.js"
  ]
}
EOL

# Utwórz content.js
log "Tworzenie content.js..."
cat > content.js << 'EOL'
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

setInterval(detectReactCode, 2000);
detectReactCode();
EOL

# Pobierz wymagane biblioteki
log "Pobieranie bibliotek..."
curl -s -o react.development.js https://unpkg.com/react@17/umd/react.development.js || error "Nie można pobrać React"
curl -s -o react-dom.development.js https://unpkg.com/react-dom@17/umd/react-dom.development.js || error "Nie można pobrać ReactDOM"
curl -s -o babel.min.js https://unpkg.com/babel-standalone@6/babel.min.js || error "Nie można pobrać Babel"

# Stwórz plik README.md
log "Tworzenie README.md..."
cat > README.md << EOL
# React Code Renderer Firefox Plugin

Plugin do renderowania fragmentów kodu React znalezionych na stronach internetowych.

## Instalacja

1. Otwórz Firefox i przejdź do about:debugging
2. Kliknij "This Firefox"
3. Kliknij "Load Temporary Add-on"
4. Wybierz plik manifest.json z tego katalogu

## Użycie

1. Odwiedź stronę zawierającą kod React
2. Plugin automatycznie wykryje fragmenty kodu i doda przycisk "Renderuj"
3. Kliknij przycisk aby zobaczyć wyrenderowany komponent
4. Możesz skopiować wyrenderowany kod do schowka

## Rozwój

Aby wprowadzić zmiany:
1. Zmodyfikuj pliki źródłowe
2. Przeładuj plugin w about:debugging

EOL

# Utwórz plik ZIP
log "Tworzenie archiwum ZIP..."
zip -r "../$PLUGIN_NAME.zip" . > /dev/null || error "Nie można utworzyć archiwum ZIP"

log "Plugin został pomyślnie utworzony!"
echo -e "${BLUE}Aby zainstalować plugin:${NC}"
echo "1. Otwórz Firefox i przejdź do about:debugging"
echo "2. Kliknij 'This Firefox'"
echo "3. Kliknij 'Load Temporary Add-on'"
echo "4. Wybierz plik manifest.json z katalogu: $PLUGIN_DIR"

# Sprawdź system operacyjny i otwórz Firefox jeśli to możliwe
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log "Otwieranie Firefox..."
    firefox "about:debugging" &
elif [[ "$OSTYPE" == "darwin"* ]]; then
    log "Otwieranie Firefox..."
    open -a Firefox "about:debugging"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    log "Na Windows, uruchom Firefox ręcznie i przejdź do about:debugging"
fi
EOL
