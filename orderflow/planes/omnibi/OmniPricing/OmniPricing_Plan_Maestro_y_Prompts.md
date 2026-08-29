# **Plan Maestro de Arquitectura y Guía de Prompts de Desarrollo: OmniPricing**

## **1\. Visión General y Principios de Arquitectura**

**OmniPricing** es un motor *standalone* de inteligencia de mercado y fijación dinámica de precios diseñado como un módulo de valor agregado (*add-on*) para **OmniBI**, orquestable mediante **OmniFlow** y ejecutable de forma totalmente autónoma en entornos locales, contenedores Docker o clústeres PySpark / Polars.

┌────────────────────────────────────────────────────────────────────────┐

│                   ARQUITECTURA MODULAR STANDALONE                      │

└────────────────────────────────────────────────────────────────────────┘

  \[ Fuentes Competidores \] ──\> \[ Scrapers Modulares (Fase 2\) \]

                                            │

  \[ Catálogo ERP / Cliente \] ───────────────┼──\> \[ Product Matching & Clean (Fase 3\) \]

                                            │

                                            ▼

                               \[ Engine PySpark / Polars (Fase 4\) \]

                               (Pisos de margen, Undercut, Matching)

                                            │

                                            ▼

           ┌────────────────────────────────┴────────────────────────────────┐

           │                                                                 │

           ▼                                                                 ▼

\[ OmniBI Data Warehouse (Fase 1/6) \]                          \[ Orquestación OmniFlow (Fase 5\) \]

\- Dashboard Inteligencia Competitiva                           \- DAGs de ejecución automática

\- Simulador de Margen / Elasticidad                            \- Sync a ERP / Odoo / Google Drive

\- Alertas de Oportunidad & Quiebre                             \- CLI Standalone (--dry-run)

---

### ***Principios Rectores Inviolables***

1. **Inviolabilidad de las Normas y Contratos de Datos:**

   - **Validación Estricta:** Ningún dato sin esquema validado (Pydantic v2 / SQL constraints) puede ingresar al pipeline.  
   - **Piso de Seguridad de Margen Infranqueable:** La regla de costo más margen mínimo ($P\_{\\text{sugerido}} \\ge \\text{Costo} \\times (1 \+ \\text{Margen}\_{\\text{mínimo}})$) prevalece sobre cualquier estrategia de mercado (*undercut* o *matching*).  
   - **Trazabilidad y Auditoría:** Cada precio calculado debe conservar la fuente de extracción, timestamp, nivel de confianza del match y variación porcentual (*price delta*).  
   - **Bandera Dry-Run:** Posibilidad de ejecutar auditorías completas sin modificar los precios en el ERP/e-commerce productivo.  
2. **Independencia Operativa (*Standalone First*):**

   - **Cero Acoplamiento Duro:** El código de scraping, normalización, matching y cálculo no depende de OmniFlow para funcionar.  
   - **Interfaz CLI Universal:** Se invoca como un comando estándar (`omnipricing run --client-id=... --rubro-id=...`).  
   - **OmniFlow como Orquestador Externo:** OmniFlow gestiona calendarización, colas de ejecución, reintentos y alertas, consumiendo el CLI o la imagen Docker como caja negra.

---

## **2\. Estructura del Proyecto (Paquete Python)**

omnipricing/

├── config/

│   ├── settings.py                 \# Variables de entorno, constantes y configs

│   └── logging\_config.py           \# Logger estructurado JSON

├── core/

│   ├── \_\_init\_\_.py

│   ├── models.py                   \# Modelos Pydantic v2 (CatalogItem, CompetitorQuote, PricingRule, PricingRecommendation)

│   └── validators.py               \# Validadores EAN-13, divisas y márgenes

├── engines/

│   ├── scrapers/

│   │   ├── \_\_init\_\_.py

│   │   ├── base.py                 \# Clase abstracta BaseScraper

│   │   ├── static\_parser.py        \# httpx \+ selectolax (HTML/JSON rápido)

│   │   ├── dynamic\_parser.py       \# Playwright headless (SPAs, lazy load, JS)

│   │   └── factory.py              \# ScraperFactory desacoplada

│   ├── normalizer.py               \# Limpieza léxica, unidades de medida y marcas

│   └── matcher.py                  \# Matching híbrido: Determinista (EAN) \+ Fuzzy (RapidFuzz)

├── jobs/

│   ├── \_\_init\_\_.py

│   ├── pricing\_pipeline.py         \# Pipeline distribuido en PySpark

│   ├── polars\_pipeline.py          \# Alternativa ultra-ligera en Polars para nodos pequeños

│   └── strategy\_factory.py         \# Lógica de estrategias (UNDERCUT, MATCH, MARGIN\_TARGET, PERCENTILE)

├── integrations/

│   ├── \_\_init\_\_.py

│   ├── gdrive\_manager.py           \# Conector Google Drive API (Service Account)

│   ├── erp\_exporter.py             \# Exportador/Sync hacia Odoo (XML-RPC/JSON-RPC) y PostgreSQL

│   └── omniflow\_task.py            \# Wrapper / Entrypoint para DAGs de OmniFlow

├── sql/

│   ├── schema.sql                  \# DDL de tablas dimensionales y de hechos

│   └── omnibi\_views.sql            \# Vistas analíticas y capa semántica para OmniBI

├── tests/

│   ├── test\_models.py

│   ├── test\_matcher.py

│   ├── test\_pricing\_rules.py

│   └── test\_scrapers.py

├── Dockerfile                      \# Imagen multi-stage Python 3.11 \+ Chromium \+ JRE

├── requirements.txt                \# Dependencias base

└── main.py                         \# CLI Dispatcher standalone

---

## **3\. Fases de Desarrollo y Prompts Especializados**

---

### ***FASE 1: Capa de Datos, Contratos y Data Mart para OmniBI***

#### **Especificación Técnica**

- **Modelos Pydantic v2:**  
  - `CatalogItem`: Datos maestros del cliente (SKU, EAN-13, costo, precio actual, margen mínimo, margen objetivo, stock).  
  - `CompetitorQuote`: Datos extraídos (competitor\_id, URL/SKU, precio extraído, moneda, stock, timestamp).  
  - `PricingRule`: Estrategia de pricing por rubro/cliente.  
  - `PricingRecommendation`: Salida procesada con precio sugerido, delta %, estado de competitividad (`CHEAPER`, `MATCHED`, `EXPENSIVE`, `NO_COMPETITOR`) y margen esperado.  
- **Data Mart SQL:**  
  - `dim_clientes_productos`  
  - `dim_competidores_fuentes`  
  - `fact_cotizaciones_competencia` (particionada por fecha)  
  - `fact_recomendaciones_pricing` (particionada por fecha de ejecución)

#### **Prompt de Desarrollo — Fase 1**

Actúa como Arquitecto de Datos y Desarrollador Senior en Python.

Desarrolla la capa completa de modelos de datos, contratos y esquemas DDL para el paquete "OmniPricing" (integrado con OmniBI y OmniFlow).

Requisitos obligatorios:

1\. Inviolabilidad de contratos: Escribe omnipricing/core/models.py utilizando Pydantic v2 con validación estricta (StrictStr, Field con restricciones numéricas, validadores @field\_validator para código EAN-13 y divisas ISO 4217).

2\. Define los siguientes modelos:

   \- CatalogItem: client\_id, sku, barcode\_ean (opcional, validado), product\_name, category\_rubro, cost\_price (\>0), current\_sale\_price (\>0), min\_margin\_pct (0.0 a 1.0), target\_margin\_pct (0.0 a 1.0), stock\_qty.

   \- CompetitorQuote: competitor\_id, competitor\_name, rubro\_id, sku\_or\_url, product\_name, barcode\_ean, extracted\_price (\>0), currency, in\_stock, scraped\_at.

   \- PricingStrategyEnum: \['UNDERCUT\_1PCT', 'UNDERCUT\_2PCT', 'MATCH\_LOWEST', 'PERCENTILE\_25', 'PERCENTILE\_AVG', 'TARGET\_MARGIN'\].

   \- PricingRule: rule\_id, client\_id, category\_rubro, strategy\_type, max\_discount\_pct, floor\_protection\_active (bool).

   \- PricingRecommendation: client\_id, sku, product\_name, cost\_price, current\_price, min\_comp\_price, avg\_comp\_price, comp\_count, floor\_price, suggested\_price, expected\_margin\_pct, price\_delta\_pct, competitiveness\_status, confidence\_score, calculated\_at.

3\. En omnipricing/sql/schema.sql, escribe el script DDL compatible con PostgreSQL / DuckDB / ClickHouse con claves primarias, foráneas, índices optimizados por (client\_id, sku) y particionamiento mensual en tablas de hechos.

Entrega código Python y SQL completo, tipado, modular y documentado.

---

### ***FASE 2: Motor de Extracción Web Modular (Scraper Factory)***

#### **Especificación Técnica**

- **BaseScraper:** Clase abstracta (`abc.ABC`) con métodos asíncronos (`fetch_catalog`, `parse_item`, `health_check`).  
- **StaticScraper:** `httpx.AsyncClient` con HTTP/2 \+ `selectolax.parser.HTMLParser` para alto rendimiento en catálogos estáticos y endpoints JSON.  
- **DynamicScraper:** `playwright.async_api` con renderizado de JavaScript, manejo de scrolls para carga perezosa y bloqueador de recursos pesados (imágenes/fuentes para ahorrar ancho de banda).  
- **Resiliencia:** Reintentos con `tenacity`, rotación de User-Agents y control de tasa (*rate limiting* con semáforos asíncronos).

#### **Prompt de Desarrollo — Fase 2**

Actúa como Ingeniero Senior de Scraping y Automatización Asíncrona en Python.

Implementa el motor de extracción modular de competidores para "OmniPricing".

Requisitos obligatorios:

1\. omnipricing/engines/scrapers/base.py:

   \- Interfaz abstracta BaseScraper con métodos async: fetch\_catalog(url: str, params: dict) \-\> list\[CompetitorQuote\], parse\_item(raw: Any) \-\> CompetitorQuote, health\_check() \-\> bool.

2\. omnipricing/engines/scrapers/static\_parser.py:

   \- Implementación basada en httpx.AsyncClient y selectolax. HTMLParser con selectores CSS parametrizables. Soporte para paginación automática y lectura de endpoints JSON REST.

3\. omnipricing/engines/scrapers/dynamic\_parser.py:

   \- Implementación basada en Playwright (async). Debe incluir soporte para emulación de navegadores reales (Chromium), espera explícita de selectores, scroll infinito (lazy load) y aborto de peticiones de imágenes/medios para optimizar velocidad.

4\. omnipricing/engines/scrapers/factory.py:

   \- ScraperFactory que reciba la configuración de competidores (URL, tipo\_parser, selectores\_map, headers) e instancie el scraper adecuado.

5\. Middlewares de Resiliencia:

   \- Rotación de User-Agents y Headers estándar de navegación.

   \- Reintentos exponenciales automáticos con tenacity en códigos 429, 502, 503, 504\.

   \- Control de concurrencia mediante asyncio.Semaphore por dominio para evitar sobrecargas.

Provee el código asíncrono completo listo para producción.

---

### ***FASE 3: Motor de Product Matching y Normalización de Entidades***

#### **Especificación Técnica**

- **Normalizer:** Limpieza de stopwords comerciales ("oferta", "combo", "descuento"), unificación de unidades de medida (g/kg, ml/l, unidades/pack) y extracción de marcas/modelos.  
- **DeterministicMatcher:** Coincidencia exacta por código EAN/UPC o SKU de fabricante (Score: 1.0).  
- **FuzzyMatcher:** Coincidencia ponderada usando `RapidFuzz` (`token_set_ratio` 60% \+ marca 20% \+ categoría 20%). Umbrales configurables: `>= 0.85` (Aprobado), `0.70 - 0.84` (Requiere Revisión), `< 0.70` (Descartado).  
- **CurrencyNormalizer:** Conversión de divisas hacia la moneda base del cliente.

#### **Prompt de Desarrollo — Fase 3**

Actúa como Ingeniero de Datos y Machine Learning.

Implementa el motor de homologación y resolución de entidades ("Product Matcher") para "OmniPricing".

Requisitos obligatorios:

1\. omnipricing/engines/normalizer.py:

   \- Normalización de cadenas de texto: minúsculas, eliminación de acentos/caracteres especiales, eliminación de stopwords comerciales.

   \- Normalización de unidades de medida mediante regex (ej: '1.000 g' \-\> '1kg', '750 c.c.' \-\> '750ml', 'pack 6 un' \-\> '6u').

   \- Extractor de marca y modelo.

2\. omnipricing/engines/matcher.py:

   \- Pipeline de matching en dos fases:

     \* Fase 1 (Determinista): Si ambos registros tienen barcode\_ean válido y coincidente \-\> Match directo (score \= 1.0, match\_type \= 'EAN\_EXACT').

     \* Fase 2 (Fuzzy): Si no hay EAN, calcular similitud ponderada con RapidFuzz (fuzz.token\_set\_ratio y fuzz.partial\_ratio) combinando título (60%), marca (20%) y categoría (20%).

   \- Clasificación por umbral de confianza: ACCEPTED (\>=0.85), REVIEW\_NEEDED (0.70 \- 0.84), REJECTED (\<0.70).

3\. Conversor de divisas financiero con soporte para tasas de cambio y homogeneización de precios netos e IVA.

4\. Incluye tests unitarios con pytest que evalúen casos complejos de nombres abreviados, marcas con variaciones ortográficas y diferentes presentaciones de empaque.

---

### ***FASE 4: Pipeline Distribuido de Cálculo de Precios en PySpark / Polars***

#### **Especificación Técnica**

- **PySpark Job (`pricing_pipeline.py`):** Agregación de cotizaciones por SKU (`min_price`, `avg_price`, `median_price`, `comp_count`), cruce con catálogo propio mediante `broadcast join` y aplicación vectorial de reglas.  
- **Polars Pipeline (`polars_pipeline.py`):** Motor de cálculo alternativo ultrarrápido y de bajo consumo de memoria para ejecuciones locales o servidores livianos.  
- **Inviolabilidad de Margen:** `suggested_price = max(cost_price * (1 + min_margin_pct), raw_strategy_price)`.  
- **Estrategias Soportadas:** Undercut (1% o 2%), Matching al competidor más bajo, Percentil de mercado y Margen objetivo.

#### **Prompt de Desarrollo — Fase 4**

Actúa como Ingeniero de Datos Senior especialista en PySpark y Polars.

Desarrolla el pipeline central de fijación dinámica de precios para "OmniPricing".

Requisitos obligatorios:

1\. omnipricing/jobs/pricing\_pipeline.py (PySpark):

   \- Ingesta de DataFrames Spark: df\_catalog y df\_competitor\_quotes.

   \- Filtrar solo competidores activos con stock (in\_stock \== True) y match validado (confidence\_score \>= 0.85).

   \- Agregaciones por SKU: min(competitor\_price), avg(competitor\_price), count(competitor\_id).

   \- Cruce con el catálogo propio del cliente.

   \- Cálculo del Piso de Seguridad (floor\_price): cost\_price \* (1 \+ min\_margin\_pct).

   \- Factoría de estrategias:

     \* UNDERCUT\_1PCT: min\_comp\_price \* 0.99

     \* MATCH\_LOWEST: min\_comp\_price

     \* PERCENTILE\_AVG: avg\_comp\_price

     \* TARGET\_MARGIN: cost\_price \* (1 \+ target\_margin\_pct)

   \- Aplicación estricta de la regla de oro: suggested\_price \= greatest(floor\_price, strategy\_calculated\_price).

   \- Cálculo de métricas analíticas: expected\_margin\_pct, price\_delta\_pct, competitiveness\_status ('CHEAPER', 'MATCHED', 'EXPENSIVE', 'NO\_COMPETITOR').

   \- Exportación particionada en formato Parquet y resumen consolidado.

2\. omnipricing/jobs/polars\_pipeline.py:

   \- Implementa la versión idéntica en Polars (LazyFrame) para procesamiento rápido en entornos standalone sin cluster JVM.

Entrega código optimizado, sin UDFs lentas en Python, utilizando expresiones vectoriales nativas.

---

### ***FASE 5: Empaquetado Standalone, CLI, Conectores y Orquestación OmniFlow***

#### **Especificación Técnica**

- **CLI (`main.py`):** Comandos con `argparse` o `click`: `omnipricing run --client-id=... --rubro-id=... [--strategy-override=...] [--dry-run] [--sync-erp] [--export-drive]`.  
- **Conectores:**  
  - `GDriveManager`: Descarga y subida de archivos vía Service Account de Google Cloud.  
  - `ERPExporter`: Sincronización de precios a Odoo (JSON-RPC/XML-RPC) y actualización directa en PostgreSQL.  
- **Contenedorización:** `Dockerfile` multi-stage con Python 3.11-slim, dependencias de Playwright Chromium y JRE ligero para Spark.  
- **Wrapper OmniFlow (`omniflow_task.py`):** Entrypoint limpio para invocar el contenedor o script desde el motor de flujos OmniFlow.

#### **Prompt de Desarrollo — Fase 5**

Actúa como Ingeniero DevOps & Backend Senior.

Desarrolla el empaquetado standalone, CLI dispatcher, adaptadores externos y el conector de tareas para OmniFlow de "OmniPricing".

Requisitos obligatorios:

1\. omnipricing/main.py:

   \- CLI construido con Click o argparse con comandos:

     \`omnipricing run \--client-id=\<ID\> \--rubro-id=\<RUBRO\> \[--strategy-override=\<STRAT\>\] \[--dry-run\] \[--sync-erp\] \[--export-drive\] \[--engine=spark|polars\]\`

   \- Retorno de códigos de salida estándar (0 éxito, 1 error) y logging JSON estructurado.

2\. omnipricing/integrations/gdrive\_manager.py:

   \- Conector con Google Drive API v3 para descarga de catálogos y subida de reportes CSV/Parquet generados.

3\. omnipricing/integrations/erp\_exporter.py:

   \- Adaptador para Odoo (v14/v16/v17/v18) vía JSON-RPC/XML-RPC para actualizar el campo list\_price del modelo product.template / product.product.

   \- Adaptador directo a PostgreSQL para actualización de tablas maestras de precios.

4\. omnipricing/integrations/omniflow\_task.py:

   \- Wrapper de ejecución parametrizado para registrarse como Step/Node en los DAGs de OmniFlow.

5\. Dockerfile:

   \- Multi-stage build en Debian/Python 3.11-slim con OpenJDK 17 (para PySpark), Chromium para Playwright (\`playwright install \--with-deps chromium\`), dependencias optimizadas en requirements.txt y usuario no-root por seguridad.

Entrega los archivos completos de configuración, conectores y Dockerfile.

---

### ***FASE 6: Capa Analítica y Tableros de Control para OmniBI***

#### **Especificación Técnica**

- **Vistas Analíticas SQL:**  
  - `v_price_competitiveness_index` (PCI ponderado por ventas).  
  - `v_margin_opportunities` (productos donde somos innecesariamente más baratos y podemos capturar margen).  
  - `v_margin_risk_alerts` (competidores vendiendo por debajo de nuestro costo \+ margen mínimo).  
- **Especificación de Tableros OmniBI:**  
  - Panel 1: Monitor de Competitividad de Precios (PCI por Rubro/Marca).  
  - Panel 2: Matriz de Dispersión (Scatter Plot Delta vs Rotación).  
  - Panel 3: Simulador Interactivo de Margen y Elasticidad.  
  - Panel 4: Bandeja de Aprobación de Precios Sugeridos con disparo a sincronización.

#### **Prompt de Desarrollo — Fase 6**

Actúa como Especialista en Business Intelligence y UI/UX Analítico para OmniBI.

Diseña las vistas analíticas SQL y las especificaciones funcionales de los dashboards interactivos para el módulo "OmniPricing".

Requisitos obligatorios:

1\. omnipricing/sql/omnibi\_views.sql:

   \- Vista v\_price\_competitiveness\_index: Cálculo del PCI global y por categoría/marca, donde PCI \= (Precio Propio / Precio Promedio Competidores) \* 100\.

   \- Vista v\_margin\_opportunities: SKUs donde Precio Propio \< (Min Competidor \* 0.95) con stock activo, permitiendo subir precio hasta igualar el mercado.

   \- Vista v\_margin\_risk: SKUs donde el precio de mercado está por debajo de nuestro floor\_price (Costo \* (1 \+ Margen Min)).

   \- Vista v\_pricing\_approval\_queue: Tabla consolidada con las sugerencias pendientes de validación por el usuario.

2\. Especificación funcional y wireframes en Markdown de los 4 paneles para OmniBI:

   \- Panel de KPIs Ejecutivos.

   \- Matriz de Posicionamiento Competitivo (Scatter Plot de 4 cuadrantes).

   \- Simulador de Escenarios de Margen (Sliders interactivos).

   \- Bandeja de Aprobación Comercial (Acciones individuales y en lote con botón "Aprobar y Sincronizar a ERP").

Entrega el SQL completo de las vistas y el documento descriptivo de los tableros.

---

## **4\. Matriz de Control de Calidad y Pruebas Unitarias**

| Componente | Prueba Unitaria / Caso de Prueba | Criterio de Éxito |
| :---- | :---- | :---- |
| **Modelos Pydantic** | Validación de precios $\\le 0$, márgenes fuera de $\[0, 1\]$, EAN inválido | Lanzamiento de `ValidationError` inmediato |
| **Scraper Estático/Dinámico** | Extracción con selectores mutados, timeout, error 429 | Reintentos con backoff, fallback limpio sin detener el flujo |
| **Product Matcher** | Match exacto EAN vs Similitud de texto en productos ambiguos | EAN \= 1.0; variantes de empaque separadas correctamente |
| **Piso de Margen** | Competidor con precio inferior al costo del cliente | `suggested_price == floor_price`, alerta de margen en riesgo |
| **Standalone CLI** | Ejecución local sin conexión a OmniFlow con `--dry-run` | Generación de parquet/reporte local sin efectos secundarios |
| **Sync ERP** | Actualización de precios en Odoo / PostgreSQL | Precios actualizados únicamente para SKUs aprobados |

