# Algolia DocSearch Configuration

## ¿Qué es DocSearch?

DocSearch es un servicio gratuito de Algolia que indexa tu documentación y proporciona búsqueda instantánea.

---

## Pasos para Configurar

### 1. Solicitar DocSearch

1. Ir a: https://docsearch.algolia.com/apply/
2. Completar el formulario:
   - **Email:** tu-email@ejemplo.com
   - **URL del sitio:** https://wiki.marcelompz.github.io/
   - **Repo GitHub:** https://github.com/marcelompz/wiki
   - **Descripción:** Documentación para OrderFlow, VitaLog y AIEER

3. Esperar aprobación (2-5 días hábiles)

---

### 2. Una vez Aprobado

Recibís un email con:
- **API Key** (Application ID)
- **Search Key** (Search-Only API Key)
- **Index Name** (ej: `marcelompz-wiki`)

---

### 3. Agregar al _config.yml

```yaml
# En _config.yml
algolia:
  application_id: TU_APPLICATION_ID
  search_only_api_key: TU_SEARCH_ONLY_KEY
  index_name: marcelompz-wiki
```

---

### 4. Agregar el Script de Búsqueda

Crear `_includes/search.html`:

```html
<!-- _includes/search.html -->
<div class="search-container">
  <input type="text" id="docsearch" placeholder="Buscar en la documentación..." />
</div>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@docsearch/css@3"
/>
<script
  src="https://cdn.jsdelivr.net/npm/@docsearch/js@3"
></script>
<script>
  docsearch({
    container: '#docsearch',
    appId: '{{ site.algolia.application_id }}',
    indexName: '{{ site.algolia.index_name }}',
    apiKey: '{{ site.algolia.search_only_api_key }}',
  });
</script>
```

---

### 5. Indexar tu Documentación

**Opción A: Algolia Crawler (Recomendado)**

1. Ir a: https://crawler.algolia.com/
2. Crear nuevo crawler
3. URL: https://wiki.marcelompz.github.io/
4. Configurar selectors:
   ```json
   {
     "selectors": {
       "lvl0": "h1",
       "lvl1": "h2",
       "lvl2": "h3",
       "text": "p, li"
     }
   }
   ```
5. Ejecutar crawl

**Opción B: DocSearch Scraper (Local)**

```bash
docker run \
  --env APPLICATION_ID=TU_APP_ID \
  --env API_KEY=TU_ADMIN_KEY \
  --env INDEX_NAME=marcelompz-wiki \
  algolia/docsearch-scraper \
  https://wiki.marcelompz.github.io/
```

---

### 6. Verificar

1. Ir a tu sitio: https://wiki.marcelompz.github.io/
2. Deberías ver la barra de búsqueda
3. Probar buscando "OrderFlow", "PHQ", etc.

---

## Configuración Recomendada

```json
{
  "indexName": "marcelompz-wiki",
  "selectors": {
    "default": {
      "lvl0": "h1",
      "lvl1": "h2",
      "lvl2": "h3",
      "lvl3": "h4",
      "lvl4": "h5",
      "text": "p, li"
    }
  },
  "selectorsExclude": [".no-search", ".sidebar", ".footer"],
  "customSettings": {
    "attributesForFaceting": ["product", "category"]
  }
}
```

---

## Alternativa: Search Simple (Sin Algolia)

Si no querés esperar la aprobación de Algolia:

### Opción 1: Google Custom Search

```html
<!-- Buscar con Google -->
<script async src="https://cse.google.com/cse.js?cx=TU_CX"></script>
<div class="gcse-search"></div>
```

### Opción 2: Pagefind (Static Search)

```bash
# Instalar pagefind
npm install -g pagefind

# Indexar
pagefind --site _site

# Agregar al HTML
<script src="/pagefind/pagefind-ui.js"></script>
```

---

*Documento creado: 2026-06-21*
