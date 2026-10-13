# Plan de Arquitectura e Implementación: Motor Local de Inspección Tecnológica (Playwright + Wappalyzer Core + Ollama)

## 1. Visión General del Proyecto
Construir una herramienta autónoma de ejecución 100% local para análisis e identificación de stacks tecnológicos web (*technographics*), combinando:
- **Playwright Headless:** Renderizado completo del DOM y ejecución de JavaScript para evaluar objetos y variables globales en memoria (`window.*`).
- **Wappalyzer Signatures Engine:** Motor de reglas en Python para evaluar cabeceras HTTP, metaetiquetas, rutas de scripts, cookies y firmas de memoria.
- **Ollama (LLM Local):** Capa de inferencia y síntesis para interpretar tecnologías no catalogadas, deducir arquitecturas globales, detectar posibles vulnerabilidades conocidas y generar resúmenes ejecutivos.

---

## 2. Arquitectura del Sistema

```
[ URL Target ]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Data Collector (Playwright + Chromium Headless)          │
│    - Captura Response Headers & Cookies                    │
│    - Extrae DOM: <meta>, <script src>, HTML snapshot        │
│    - Evalúa Runtime JS: Inspección de window.* y globales   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Signatures Rule Engine (Wappalyzer Core JSON Parser)     │
│    - Match de regex sobre Headers, DOM, Scripts             │
│    - Extracción de versiones (;version:\\1)                 │
│    - Resolución de árbol de implicaciones (implies)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Local AI Inference Layer (Ollama / Qwen2.5 o Llama 3)    │
│    - Análisis de señales residuales no mapeadas             │
│    - Deducción de infraestructura backend (Reverse Proxy)   │
│    - Generación de informe técnico estructurado en JSON/MD  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Requisitos de Infraestructura y Dependencias

### Entorno del Sistema
- Python 3.11+
- Navegador Chromium gestionado vía Playwright (`playwright install chromium`)
- Ollama instalado y corriendo localmente (`ollama serve`)

### Modelos Recomendados para Ollama
- `qwen2.5-coder:7b` o `llama3.1:8b` (balance óptimo entre velocidad de inferencia estructurada y bajo consumo de VRAM/RAM).

### Dependencias Python (`requirements.txt`)
```text
playwright>=1.40.0
httpx>=0.27.0
beautifulsoup4>=4.12.0
ollama>=0.3.0
pydantic>=2.7.0
rich>=13.7.0
```

---

## 4. Fases de Desarrollo

### Fase 1: Ingesta y Estructuración de Firmas Wappalyzer
- Clonar o sincronizar el esquema JSON oficial de Wappalyzer (`technologies/*.json`).
- Normalizar las reglas en un índice local optimizado (diccionario o SQLite en memoria):
  - Indexar por canal de detección: `headers`, `meta`, `scripts`, `cookies`, `js`.

### Fase 2: Colector de Datos con Playwright (Inspector de `window`)
- Implementar script de navegación asíncrona.
- Inyectar sondeo seguro de memoria (`page.evaluate`) para detectar objetos globales:
  - Frameworks: `window.React`, `window.Vue`, `window.angular`, `window.__NEXT_DATA__`, `window.__NUXT__`.
  - Herramientas: `window.dataLayer`, `window.fbq`, `window.Shopify`.

### Fase 3: Motor de Correlación y Reglas Regex
- Evaluación de expresiones regulares sobre headers, scripts y meta tags.
- Soporte para extracción dinámica de versión (`\\;version:\\1`).
- Resolución del grafo de dependencias e inferencias (`implies`).

### Fase 4: Integración con Ollama (Análisis Semántico Local)
- Formatear el payload técnico resultante (tecnologías confirmadas + cabeceras crudas).
- Enviar consulta local a Ollama para:
  1. Deducir arquitectura de backend no expuesta en el frontend.
  2. Identificar cabeceras con fuga de información (`Server`, `X-Powered-By`).
  3. Redactar el resumen ejecutivo de la infraestructura.

---

## 5. Código Base del Prototipo (`scanner.py`)

```python
import asyncio
import json
import re
from typing import Any, Dict, List
import ollama
from playwright.async_api import async_playwright

# Firmas base siguiendo el estándar Wappalyzer
SIGNATURES: Dict[str, Dict[str, Any]] = {
    "Next.js": {
        "scripts": r"/_next/static/",
        "meta": {"generator": r"Next\.js(?: ([0-9.]+))?\\;version:\\1"},
        "js": ["__NEXT_DATA__"]
    },
    "React": {
        "js": ["React", "__REACT_DEVTOOLS_GLOBAL_HOOK__"]
    },
    "Vue.js": {
        "js": ["Vue", "__VUE__"]
    },
    "Shopify": {
        "headers": {"x-shopid": r".*"},
        "scripts": r"cdn\.shopify\.com",
        "js": ["Shopify"]
    },
    "Google Tag Manager": {
        "scripts": r"googletagmanager\.com/gtm\.js",
        "js": ["google_tag_manager", "dataLayer"]
    },
    "Cloudflare": {
        "headers": {"server": r"^cloudflare$", "cf-ray": r".*"}
    }
}

async def collect_page_data(url: str) -> Dict[str, Any]:
    collected_headers = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        page = await context.new_page()

        def handle_response(response):
            if response.url.rstrip("/") == url.rstrip("/"):
                collected_headers.update({k.lower(): v for k, v in response.headers.items()})

        page.on("response", handle_response)
        await page.goto(url, wait_until="networkidle", timeout=25000)

        # Scripts y Meta tags
        scripts = await page.eval_on_selector_all("script", "elems => elems.map(e => e.src).filter(Boolean)")
        meta_tags = await page.eval_on_selector_all(
            "meta", 
            "elems => elems.map(e => ({ name: e.getAttribute('name') || e.getAttribute('property'), content: e.getAttribute('content') }))"
        )
        meta_dict = {m["name"].lower(): m["content"] for m in meta_tags if m["name"] and m["content"]}

        # Sondeo de variables globales en memoria (window.*)
        js_probes = ["React", "__REACT_DEVTOOLS_GLOBAL_HOOK__", "__NEXT_DATA__", "Vue", "__VUE__", "Shopify", "google_tag_manager", "dataLayer"]
        js_eval_script = f"""() => {{
            const results = {{}};
            const probes = {json.dumps(js_probes)};
            probes.forEach(p => {{
                results[p] = (typeof window[p] !== 'undefined');
            }});
            return results;
        }}"""
        js_detected = await page.evaluate(js_eval_script)

        await browser.close()

        return {
            "url": url,
            "headers": collected_headers,
            "scripts": scripts,
            "meta": meta_dict,
            "js_globals": js_detected
        }

def match_signatures(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    matches = []
    for tech, rules in SIGNATURES.items():
        found = False
        evidence = []

        if "headers" in rules:
            for h_key, h_pat in rules["headers"].items():
                val = data["headers"].get(h_key.lower())
                if val and re.search(h_pat, val, re.IGNORECASE):
                    found = True
                    evidence.append(f"Header '{h_key}' coincidente")

        if "scripts" in rules:
            pat = rules["scripts"]
            for s in data["scripts"]:
                if re.search(pat, s, re.IGNORECASE):
                    found = True
                    evidence.append(f"Script coincidente: {s}")
                    break

        if "js" in rules:
            for var_name in rules["js"]:
                if data["js_globals"].get(var_name) is True:
                    found = True
                    evidence.append(f"Variable global window.{var_name} activa")

        if found:
            matches.append({"technology": tech, "evidence": evidence})

    return matches

def query_ollama_synthesis(target_url: str, detected_tech: List[Dict[str, Any]], raw_headers: Dict[str, str]) -> str:
    prompt = f"""
Eres un arquitecto de software y analista de ciberseguridad.
Analiza los siguientes hallazgos técnicos extraídos de: {target_url}

Tecnologías confirmadas:
{json.dumps(detected_tech, indent=2)}

Encabezados HTTP capturados:
{json.dumps(raw_headers, indent=2)}

Por favor:
1. Deduce la arquitectura global (CDN, frontend framework, rendering strategy, hosting probable).
2. Identifica posibles riesgos de divulgación de información en las cabeceras.
3. Devuelve un resumen ejecutivo estructurado y conciso.
"""
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.2}
    )
    return response["message"]["content"]

async def main():
    target = "https://nextjs.org"
    print(f"[*] Inspeccionando {target}...")
    page_data = await collect_page_data(target)
    
    print("[*] Ejecutando motor de firmas...")
    detected = match_signatures(page_data)
    print(f"[+] Tecnologías detectadas ({len(detected)}): {[d['technology'] for d in detected]}")
    
    print("[*] Solicitando análisis a Ollama...")
    ai_summary = query_ollama_synthesis(target, detected, page_data["headers"])
    print("\n=== INFORME DE ARQUITECTURA (OLLAMA LOCAL) ===\n")
    print(ai_summary)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 6. Siguientes Pasos de Extensión
1. **Carga dinámica de firmas:** Integrar la descarga automática de los JSONs del repositorio de Wappalyzer.
2. **Pipeline de persistencia:** Guardar resultados en SQLite local con historial de cambios por dominio.
3. **Interfaz CLI interactiva:** Usar `rich` o `typer` para ejecutar inspecciones rápidas desde la terminal con formato enriquecido.
