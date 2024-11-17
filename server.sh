#!/bin/bash
pkill -f "node server.js" && cd server && node server.js
sleep 3
curl -X POST http://localhost:3000/render \
-H "Content-Type: application/json" \
-d '{
  "html": "<!DOCTYPE html><html><head><title>Vue Counter</title><script src=\"https://unpkg.com/vue@3/dist/vue.global.js\"></script><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f0f0}.counter-app{text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.count{font-size:3rem;margin:1rem 0;color:#42b883}button{padding:0.5rem 1rem;font-size:1rem;margin:0 0.5rem;background:#42b883;color:white;border:none;border-radius:4px}</style></head><body><div id=\"app\"><div class=\"counter-app\"><h1>Vue Counter</h1><div class=\"count\">{{ count }}</div><div><button @click=\"decrement\">-</button><button @click=\"increment\">+</button></div></div></div><script>const{createApp,ref}=Vue;createApp({setup(){const count=ref(0);const increment=()=>{count.value++};const decrement=()=>{count.value--};return{count,increment,decrement}}}).mount(\"#app\")</script></body></html>"
}' | jq -r .screenshot | xargs -I {} wget http://localhost:3000{} -O vue-render-result.png

curl -X POST http://localhost:3000/render/vue \
-H "Content-Type: application/json" \
-d '{
  "content": "<div class=\"counter\"><h1>{{ count }}</h1><button @click=\"increment\">+</button><button @click=\"decrement\">-</button></div>",
  "script": "createApp({ setup() { const count = ref(0); const increment = () => count.value++; const decrement = () => count.value--; return { count, increment, decrement }; } }).mount(\"#app\")",
  "style": ".counter { text-align: center; padding: 20px; } .counter button { margin: 0 5px; padding: 8px 16px; background: #42b883; color: white; border: none; border-radius: 4px; }"
}' | jq

#!/bin/bash

# Test 1: Python z matplotlib - generowanie wykresu
echo "Test 1: Python plot generation"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "python",
  "code": "
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title(\"Sine Wave\")
",
  "visualization_type": "image",
  "timeout": 30
}' | jq '.' > test1_result.json

# Pobieranie wygenerowanego obrazu
cat test1_result.json | jq -r '.visualization_data.image' | base64 -d > test1_plot.png

# Test 2: JavaScript z Node.js - obliczenia numeryczne
echo "Test 2: JavaScript numerical computation"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "javascript",
  "code": "
const data = Array.from({length: 1000}, (_, i) => i);
const stats = {
  sum: data.reduce((a, b) => a + b, 0),
  average: data.reduce((a, b) => a + b, 0) / data.length,
  max: Math.max(...data)
};
console.log(JSON.stringify(stats, null, 2));
",
  "visualization_type": "text",
  "timeout": 10
}' | jq '.'

# Test 3: SQL Query z wizualizacją wyników
echo "Test 3: SQL query visualization"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "sql",
  "code": "
SELECT
  date_trunc('\''month'\'', order_date) as month,
  COUNT(*) as orders,
  SUM(amount) as total_amount
FROM orders
GROUP BY 1
ORDER BY 1;
",
  "visualization_type": "both",
  "input_data": {
    "db_connection": "postgresql://user:pass@localhost:5432/testdb"
  }
}' | jq '.'

# Test 4: Java z generowaniem diagramu
echo "Test 4: Java with diagram generation"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "java",
  "code": "
import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.File;

public class DiagramGenerator {
    public static void main(String[] args) {
        BufferedImage image = new BufferedImage(400, 400, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = image.createGraphics();

        // Rysowanie prostego diagramu
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, 400, 400);

        g2d.setColor(Color.BLUE);
        g2d.fillRect(50, 50, 100, 300);

        g2d.setColor(Color.RED);
        g2d.fillRect(175, 100, 100, 250);

        g2d.dispose();
        ImageIO.write(image, \"png\", new File(\"diagram.png\"));
    }
}
",
  "visualization_type": "image",
  "timeout": 20
}' | jq '.'

# Test 5: Sprawdzenie dostępnych języków
echo "Test 5: Check supported languages"
curl -X GET http://localhost:8000/supported-languages | jq '.'

# Test 6: Python z danymi wejściowymi i formatowaniem tekstu
echo "Test 6: Python with input data and text formatting"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "python",
  "code": "
import json
import pandas as pd

# Wczytanie danych wejściowych
data = json.loads(input_data)
df = pd.DataFrame(data)

# Analiza danych
summary = df.describe()
correlation = df.corr()

# Formatowanie wyniku
result = f"""
Data Summary:
{summary.to_string()}

Correlation Matrix:
{correlation.to_string()}
"""
print(result)
",
  "input_data": {
    "column1": [1, 2, 3, 4, 5],
    "column2": [2, 4, 6, 8, 10]
  },
  "visualization_type": "text",
  "timeout": 15
}' | jq '.'

# Test 7: Test limitu pamięci
echo "Test 7: Memory limit test"
curl -X POST http://localhost:8000/execute \
-H "Content-Type: application/json" \
-d '{
  "language": "python",
  "code": "
# Próba alokacji dużej ilości pamięci
big_list = [i for i in range(10**8)]
",
  "memory_limit": 100,
  "timeout": 5
}' | jq '.'

# Test 8: Sprawdzenie stanu API
echo "Test 8: Health check"
curl -X GET http://localhost:8000/health | jq '.'

# Pomocnicza funkcja do testowania błędów
test_error_case() {
  echo "Testing error case: $1"
  curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d "$2" | jq '.'
  echo
}

# Test 9: Przypadki błędów
echo "Test 9: Error cases"

# Nieobsługiwany język
test_error_case "Unsupported language" '{
  "language": "brainfuck",
  "code": "++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>."
}'

# Niepoprawny kod
test_error_case "Invalid code syntax" '{
  "language": "python",
  "code": "print(unterminated string"
}'

# Przekroczony timeout
test_error_case "Timeout exceeded" '{
  "language": "python",
  "code": "while True: pass",
  "timeout": 1
}'
