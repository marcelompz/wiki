# Plan Maestro de Arquitectura y Guía de Prompts de Desarrollo: OmniPricing (v2 — Integrado a OmniFlow)

## 1. Visión General y Principios de Arquitectura

**OmniPricing** es el módulo de inteligencia de mercado y fijación dinámica de precios de **OmniFlow**. A diferencia de la versión standalone original (Python/PySpark/Docker separado), esta versión vive **dentro del monorepo de OmniFlow**, como un módulo NestJS más, con su propio dominio en el schema de Prisma, sus propias colas de BullMQ y sus propias vistas en el admin de Refine.dev. No hay un segundo runtime, un segundo Dockerfile ni un segundo sistema de auth/multi-tenant: reutiliza todo lo que OmniFlow ya resuelve.

```
┌────────────────────────────────────────────────────────────────────────┐
│              OMNIPRICING — MÓDULO NATIVO DE OMNIFLOW                   │
└────────────────────────────────────────────────────────────────────────┘

 [ Fuentes Competidores ] ──▶ [ Scraper Providers (BullMQ jobs) ]
                                          │
 [ Catálogo OmniFlow ]                   │   (Prisma: Product / ProductVariant,
   (Prisma existente) ───────────────────┼──▶  ya modelado en el módulo Productos)
                                          │
                                          ▼
                          [ Matching Service (Fuzzy + EAN) ]
                                          │
                                          ▼
                  [ Pricing Engine (SQL agregado + reglas TS) ]
                     (Piso de margen, Undercut, Matching)
                                          │
                                          ▼
           ┌──────────────────────────────┴──────────────────────────────┐
           │                                                              │
           ▼                                                              ▼
  [ Prisma / PostgreSQL ]                                    [ BullMQ / Redis ]
  - Tablas de hechos (particionadas)                         - Colas: pricing-scrape,
  - Vistas analíticas p/ dashboards                            pricing-match, pricing-calc
                                          │
                                          ▼
                        [ Refine.dev Admin — Panel OmniPricing ]
                        - Monitor de competitividad, simulador,
                          bandeja de aprobación, sync a Odoo
```

### Principios Rectores (se mantienen del plan original, sin cambios de fondo)

1. **Inviolabilidad de contratos de datos**: validación estricta con `class-validator`/`class-transformer` (el equivalente NestJS de Pydantic v2) en lugar de Pydantic. Ningún dato sin DTO validado entra al pipeline.
2. **Piso de seguridad de margen infranqueable**: `suggested_price = max(floor_price, strategy_price)` sigue siendo la regla que nada puede saltarse.
3. **Trazabilidad y auditoría**: cada `PricingRecommendation` conserva fuente, timestamp, `confidence_score` y `price_delta_pct`.
4. **Dry-run**: se implementa como parámetro del job de BullMQ (`dryRun: true`), no como flag de CLI — la ejecución dry-run genera la recomendación y la deja en estado `PENDING_REVIEW` sin disparar el sync a Odoo.
5. **Reutilización, no duplicación**: OmniPricing no reimplementa colas, multi-tenancy, ni el conector a Odoo — extiende lo que OmniFlow ya tiene.

### Qué cambia respecto al plan original y por qué

| Original (standalone Python) | v2 (nativo OmniFlow) | Motivo |
|---|---|---|
| Pydantic v2 + SQL propio | Prisma schema extendido + DTOs `class-validator` | Una sola fuente de verdad del catálogo (evita desincronización con el módulo Productos) |
| PySpark + Polars | Consultas SQL agregadas (window functions en Postgres) vía Prisma/raw SQL | Volumen real (catálogo de clientes + cotizaciones) no justifica un clúster Spark; se elimina la JVM del Dockerfile |
| CLI (`omnipricing run ...`) + DAGs propios | Jobs de BullMQ (`pricing-scrape`, `pricing-match`, `pricing-calc`) encolados por el scheduler de OmniFlow | Reutiliza reintentos, backoff y alertas que BullMQ ya provee |
| `erp_exporter.py` (adaptador Odoo propio) | Reutiliza el servicio de sync a Odoo existente de OmniFlow | Evita dos codepaths divergentes hacia el mismo Odoo |
| Playwright standalone en Docker con Chromium | Playwright como dependencia del monorepo, corrido en un worker dedicado de BullMQ (mismo patrón que cualquier job pesado) | Un solo pipeline de build/deploy |
| RapidFuzz (Python) | `fuzzball` o `fastest-levenshtein` + `string-similarity` (equivalentes maduros en Node) | Mismo algoritmo, sin salir del ecosistema TS |
| CatalogItem propio | Se deriva de `Product`/`ProductVariant` ya existentes en el schema Prisma (patrón `product.template`/`product.product`) | Un solo modelo de catálogo, con soporte nativo de variantes (Medidas, Colores, etc.) |

---

## 2. Estructura del Módulo (dentro del monorepo NestJS)

```
apps/api/src/modules/pricing/
├── pricing.module.ts
├── dto/
│   ├── competitor-quote.dto.ts       # class-validator: precio, moneda ISO 4217, EAN
│   ├── pricing-rule.dto.ts
│   └── pricing-recommendation.dto.ts
├── entities/                          # tipos derivados del schema Prisma (no se redefine el catálogo)
├── scrapers/
│   ├── base-scraper.provider.ts       # interfaz común: fetchCatalog(), parseItem(), healthCheck()
│   ├── static-scraper.provider.ts     # axios/got + cheerio (HTML/JSON rápido)
│   ├── dynamic-scraper.provider.ts    # Playwright (SPAs, lazy load)
│   └── scraper.factory.ts
├── matching/
│   ├── normalizer.service.ts          # limpieza léxica, unidades de medida, stopwords comerciales
│   └── matcher.service.ts             # EAN determinista + fuzzy ponderado
├── engine/
│   ├── pricing-strategy.factory.ts    # UNDERCUT_1PCT, MATCH_LOWEST, PERCENTILE_AVG, TARGET_MARGIN
│   └── pricing-calculator.service.ts  # aplica floor_price, calcula métricas
├── queues/
│   ├── pricing-scrape.processor.ts    # BullMQ worker: scraping por fuente
│   ├── pricing-match.processor.ts     # BullMQ worker: matching por lote
│   └── pricing-calc.processor.ts      # BullMQ worker: cálculo de recomendaciones
├── integrations/
│   └── odoo-sync.adapter.ts           # wrapper delgado sobre el servicio de sync a Odoo YA existente
├── pricing.controller.ts              # REST bajo /api/v1/pricing/
├── pricing.service.ts
└── pricing.resource.tsx (admin/)       # panel Refine.dev (recursos, dashboards, bandeja de aprobación)

prisma/schema.prisma (extensión)
├── model CompetitorSource
├── model CompetitorQuote
├── model PricingRule
├── model PricingRecommendation

sql/views/
├── v_price_competitiveness_index.sql
├── v_margin_opportunities.sql
└── v_margin_risk_alerts.sql
```

---

## 3. Fases de Desarrollo y Prompts Especializados

---

### FASE 1: Modelo de Datos (Prisma) y DTOs

#### Especificación Técnica

- **Extensión del schema Prisma** (no un esquema paralelo): `CompetitorSource`, `CompetitorQuote`, `PricingRule`, `PricingRecommendation`, todos con `tenantId`/`clientId` scoped igual que el resto de los modelos de OmniFlow, y `PricingRecommendation` con relación directa a `ProductVariant` (no a un `sku` suelto).
- **DTOs con `class-validator`**: validadores para EAN-13, moneda ISO 4217, márgenes en rango `[0, 1]`, análogos a los `@field_validator` de Pydantic del plan original.
- **Vistas SQL** para el data mart de OmniBI, particionadas por fecha donde aplique.

#### Prompt de Desarrollo — Fase 1

Actúa como Arquitecto de Datos y Desarrollador Senior en NestJS/Prisma.

Extiende el schema de Prisma de OmniFlow para soportar el módulo "OmniPricing", sin duplicar el catálogo de productos ya existente.

Requisitos obligatorios:

1. En `prisma/schema.prisma`, agrega los modelos:
   - `CompetitorSource`: id, tenantId, name, baseUrl, parserType (STATIC | DYNAMIC), selectorsMap (Json), rateLimitConfig (Json), active.
   - `CompetitorQuote`: id, tenantId, competitorSourceId (FK), skuOrUrl, productNameRaw, barcodeEan (opcional), extractedPrice (Decimal > 0), currency (String, ISO 4217), inStock, scrapedAt, matchStatus (PENDING | ACCEPTED | REVIEW_NEEDED | REJECTED), confidenceScore, matchedVariantId (FK opcional a ProductVariant).
   - `PricingRule`: id, tenantId, categoryRubroId, strategyType (enum: UNDERCUT_1PCT, UNDERCUT_2PCT, MATCH_LOWEST, PERCENTILE_25, PERCENTILE_AVG, TARGET_MARGIN), maxDiscountPct, floorProtectionActive (bool).
   - `PricingRecommendation`: id, tenantId, productVariantId (FK), costPrice, currentPrice, minCompPrice, avgCompPrice, compCount, floorPrice, suggestedPrice, expectedMarginPct, priceDeltaPct, competitivenessStatus (CHEAPER | MATCHED | EXPENSIVE | NO_COMPETITOR), confidenceScore, status (PENDING_REVIEW | APPROVED | SYNCED | REJECTED), calculatedAt.
   - Todos los modelos con índice compuesto `(tenantId, ...)` acorde al patrón multi-tenant ya usado en el resto del schema.

2. En `apps/api/src/modules/pricing/dto/`, escribe los DTOs con `class-validator`:
   - Validador custom `@IsEan13()` para código de barras.
   - Validador custom `@IsIsoCurrency()`.
   - `@Min(0)` / `@Max(1)` para porcentajes de margen.

3. Genera la migración de Prisma y las vistas SQL iniciales en `sql/views/` como *raw SQL* ejecutado vía `prisma.$executeRaw` en un script de seed/migración, no como tablas separadas del data mart — reutiliza las tablas de hechos existentes de OmniFlow donde sea posible.

Entrega el diff del schema, los DTOs y el script de migración.

---

### FASE 2: Scrapers como Providers de NestJS

#### Especificación Técnica

- **BaseScraperProvider**: interfaz con métodos async `fetchCatalog()`, `parseItem()`, `healthCheck()`, inyectable vía DI de Nest.
- **StaticScraperProvider**: `axios`/`got` + `cheerio` para HTML/JSON rápido.
- **DynamicScraperProvider**: `playwright` para SPAs, scroll infinito, bloqueo de recursos pesados.
- **Resiliencia**: reintentos con backoff (librería `p-retry` o el retry nativo de BullMQ), rotación de User-Agents, rate limiting por dominio con `Bottleneck` o semáforos propios.

#### Prompt de Desarrollo — Fase 2

Actúa como Ingeniero Senior de Backend en NestJS.

Implementa el motor de extracción modular de competidores para "OmniPricing" como providers inyectables de Nest, ejecutados desde un worker de BullMQ (no como script standalone).

Requisitos obligatorios:

1. `scrapers/base-scraper.provider.ts`: interfaz abstracta con métodos async `fetchCatalog(source: CompetitorSource): Promise<RawQuote[]>`, `parseItem(raw: unknown): CompetitorQuoteDto`, `healthCheck(): Promise<boolean>`.

2. `scrapers/static-scraper.provider.ts`: implementación con `axios` + `cheerio`, selectores CSS parametrizables desde `selectorsMap`, soporte de paginación automática y lectura de endpoints JSON.

3. `scrapers/dynamic-scraper.provider.ts`: implementación con Playwright, espera explícita de selectores, scroll infinito, bloqueo de requests de imágenes/fuentes para performance.

4. `scrapers/scraper.factory.ts`: factory que, dado un `CompetitorSource`, resuelve el provider adecuado vía DI.

5. `queues/pricing-scrape.processor.ts`: BullMQ processor que consume la cola `pricing-scrape`, invoca el scraper correspondiente, valida cada item con el DTO de Fase 1, y persiste `CompetitorQuote` en Prisma. Reintentos configurados en la definición del job de BullMQ (no reimplementados a mano), con backoff exponencial en 429/502/503/504.

Entrega el código TypeScript completo, tipado, con los providers registrados en `pricing.module.ts`.

---

### FASE 3: Motor de Matching

#### Especificación Técnica

- **NormalizerService**: limpieza de stopwords comerciales, normalización de unidades de medida por regex, extracción de marca/modelo.
- **MatcherService**: dos fases — determinista por EAN (score 1.0) y fuzzy ponderado (título 60%, marca 20%, categoría 20%) usando una librería de similitud de strings en Node (`fuzzball`, port de RapidFuzz/FuzzyWuzzy, o `string-similarity`).
- **Umbrales**: `>= 0.85` ACCEPTED, `0.70–0.84` REVIEW_NEEDED, `< 0.70` REJECTED — igual que el plan original.
- El resultado del match se guarda en `matchedVariantId`, apuntando directo al `ProductVariant` del catálogo existente (no a un ítem propio).

#### Prompt de Desarrollo — Fase 3

Actúa como Ingeniero de Backend especializado en resolución de entidades.

Implementa el `MatcherService` y `NormalizerService` para "OmniPricing", enlazando `CompetitorQuote` con `ProductVariant` del catálogo existente.

Requisitos obligatorios:

1. `matching/normalizer.service.ts`: normalización de texto (minúsculas, sin acentos, sin stopwords comerciales como "oferta"/"combo"/"descuento"), normalización de unidades de medida por regex (`'1.000 g' -> '1kg'`, `'750 c.c.' -> '750ml'`, `'pack 6 un' -> '6u'`), extractor de marca/modelo.

2. `matching/matcher.service.ts`:
   - Fase determinista: si `barcodeEan` coincide con el de algún `ProductVariant` → match directo, `confidenceScore = 1.0`, `matchType = 'EAN_EXACT'`.
   - Fase fuzzy: si no hay EAN, calcular similitud ponderada (título 60%, marca 20%, categoría 20%) contra los `ProductVariant` del `tenantId` correspondiente.
   - Clasificación por umbral: `ACCEPTED (>=0.85)`, `REVIEW_NEEDED (0.70–0.84)`, `REJECTED (<0.70)`.

3. `queues/pricing-match.processor.ts`: BullMQ processor que consume `CompetitorQuote` en estado `PENDING`, ejecuta el matching y actualiza `matchStatus`, `confidenceScore` y `matchedVariantId`.

4. Tests unitarios con Jest que cubran nombres abreviados, variaciones ortográficas de marca y distintas presentaciones de empaque.

Entrega el código completo con tests.

---

### FASE 4: Motor de Cálculo de Precios

#### Especificación Técnica

- Reemplaza PySpark/Polars por **agregación en SQL** (window functions de Postgres: `MIN`, `AVG`, `PERCENTILE_CONT`, `COUNT` por `productVariantId`), ejecutada vía `prisma.$queryRaw` o Kysely para consultas tipadas — sin salir de la base de datos ya existente.
- **Piso de seguridad**: `floorPrice = costPrice * (1 + minMarginPct)`.
- **Regla de oro**: `suggestedPrice = GREATEST(floorPrice, strategyCalculatedPrice)`, aplicada directamente en SQL o en el servicio TS tras traer los agregados.
- Estrategias soportadas: idénticas al plan original (Undercut 1%/2%, Match Lowest, Percentile, Target Margin).

#### Prompt de Desarrollo — Fase 4

Actúa como Ingeniero de Backend Senior especialista en SQL avanzado y NestJS.

Desarrolla el motor de cálculo de precios para "OmniPricing", usando agregación SQL nativa en PostgreSQL en lugar de un motor de procesamiento distribuido.

Requisitos obligatorios:

1. `engine/pricing-calculator.service.ts`:
   - Query SQL (via `prisma.$queryRaw` o Kysely) que agregue `CompetitorQuote` filtrados por `inStock = true` y `confidenceScore >= 0.85`, agrupados por `matchedVariantId`: `MIN(extractedPrice)`, `AVG(extractedPrice)`, `PERCENTILE_CONT(0.25)`, `COUNT(DISTINCT competitorSourceId)`.
   - Cruce con `ProductVariant`/`Product` para traer `costPrice`, `currentPrice`, `minMarginPct`, `targetMarginPct`.
   - Cálculo de `floorPrice = costPrice * (1 + minMarginPct)`.

2. `engine/pricing-strategy.factory.ts`: factory de estrategias — `UNDERCUT_1PCT: minCompPrice * 0.99`, `MATCH_LOWEST: minCompPrice`, `PERCENTILE_AVG: avgCompPrice`, `TARGET_MARGIN: costPrice * (1 + targetMarginPct)`.

3. Aplicación estricta de la regla de oro: `suggestedPrice = Math.max(floorPrice, strategyPrice)`.

4. Cálculo de métricas: `expectedMarginPct`, `priceDeltaPct`, `competitivenessStatus`.

5. `queues/pricing-calc.processor.ts`: BullMQ processor que ejecuta el cálculo por lote (por `tenantId` + `categoryRubroId`) y persiste `PricingRecommendation` en estado `PENDING_REVIEW`.

Entrega código TypeScript tipado, con las queries SQL documentadas y sin N+1 queries.

---

### FASE 5: Orquestación vía BullMQ y Sync a Odoo

#### Especificación Técnica

- **Sin CLI propio**: la ejecución se dispara desde el scheduler de OmniFlow (cron job o trigger manual desde el admin) que encola los jobs `pricing-scrape` → `pricing-match` → `pricing-calc` en secuencia (o como un flujo de BullMQ con `FlowProducer`).
- **Dry-run**: parámetro del job; si es `true`, el flujo se detiene en `PENDING_REVIEW` sin llamar al sync de Odoo.
- **Sync a Odoo**: se reutiliza el servicio de sync existente de OmniFlow — `odoo-sync.adapter.ts` es un wrapper delgado que traduce `PricingRecommendation` aprobadas al formato que ese servicio ya espera, no un cliente XML-RPC nuevo.

#### Prompt de Desarrollo — Fase 5

Actúa como Ingeniero Backend Senior especialista en BullMQ y arquitectura de colas.

Desarrolla la orquestación end-to-end del pipeline de OmniPricing y la integración de sync a Odoo, reutilizando la infraestructura existente de OmniFlow.

Requisitos obligatorios:

1. Define un `FlowProducer` de BullMQ que encadene `pricing-scrape` → `pricing-match` → `pricing-calc` por `tenantId`, con la opción `dryRun` propagada a través de todo el flujo.

2. `pricing.controller.ts`: endpoints REST bajo `/api/v1/pricing/`:
   - `POST /runs` — dispara el flujo (con `dryRun`, `rubroId`, `strategyOverride` opcionales).
   - `GET /recommendations` — lista `PricingRecommendation` filtrables por estado.
   - `POST /recommendations/:id/approve` — aprueba y dispara el sync a Odoo.
   - `POST /recommendations/bulk-approve` — aprobación en lote.

3. `integrations/odoo-sync.adapter.ts`: wrapper que llama al servicio de sync a Odoo YA existente en OmniFlow para actualizar `list_price` en `product.template`/`product.product`, evitando un segundo cliente Odoo. Si ese servicio no soporta aún actualización de precios, extiéndelo ahí — no lo dupliques dentro de `pricing`.

4. Registro del job programado (cron) en el scheduler existente de OmniFlow para ejecución periódica automática por tenant activo.

Entrega el código completo de colas, controller y adaptador.

---

### FASE 6: Capa Analítica y Panel en Refine.dev

#### Especificación Técnica

- **Vistas SQL** (iguales en espíritu al plan original): `v_price_competitiveness_index`, `v_margin_opportunities`, `v_margin_risk_alerts`, `v_pricing_approval_queue`.
- **Panel en Refine.dev / Ant Design** (en vez de "tableros OmniBI" genéricos, ya que el admin de OmniFlow es Refine): recurso `pricing-recommendations` con vista de lista + bandeja de aprobación, y un dashboard con los 4 paneles del plan original adaptados a componentes de Ant Design (gráficos con `@ant-design/plots` o `recharts`).

#### Prompt de Desarrollo — Fase 6

Actúa como Desarrollador Frontend Senior especialista en Refine.dev y Ant Design.

Diseña las vistas SQL y el panel de administración de "OmniPricing" dentro del admin existente de OmniFlow.

Requisitos obligatorios:

1. `sql/views/`: `v_price_competitiveness_index` (PCI = Precio Propio / Precio Promedio Competidores × 100, global y por categoría/marca), `v_margin_opportunities` (SKUs con precio propio < 95% del mínimo competidor y stock activo), `v_margin_risk_alerts` (SKUs por debajo del floor_price), `v_pricing_approval_queue` (recomendaciones `PENDING_REVIEW`).

2. Recurso de Refine.dev `pricing-recommendations`:
   - Vista de lista con filtros por `competitivenessStatus`, `tenantId`, `categoryRubroId`.
   - Acciones individuales y en lote: "Aprobar y Sincronizar a Odoo".

3. Dashboard con 4 paneles (componentes React + Ant Design):
   - Panel de KPIs ejecutivos (PCI global, cantidad de alertas de riesgo de margen).
   - Matriz de posicionamiento competitivo (scatter plot delta vs. rotación).
   - Simulador de escenarios de margen (sliders interactivos, cálculo en cliente sobre datos ya traídos).
   - Bandeja de aprobación comercial.

Entrega el SQL de las vistas y los componentes React del panel.

---

## 4. Matriz de Control de Calidad y Pruebas Unitarias

| Componente | Prueba Unitaria / Caso de Prueba | Criterio de Éxito |
|---|---|---|
| **DTOs (class-validator)** | Precios ≤ 0, márgenes fuera de [0,1], EAN inválido | Lanzamiento inmediato de `BadRequestException` |
| **Scraper Providers** | Selectores mutados, timeout, error 429 | Reintentos con backoff (config de BullMQ), fallback limpio sin detener el job |
| **MatcherService** | Match exacto EAN vs. similitud de texto en productos ambiguos | EAN = 1.0; variantes de empaque separadas correctamente |
| **PricingCalculatorService** | Competidor con precio inferior al costo del cliente | `suggestedPrice === floorPrice`, `competitivenessStatus` marca riesgo |
| **Flujo BullMQ (dry-run)** | Ejecución con `dryRun: true` | Recomendaciones quedan en `PENDING_REVIEW`, cero llamadas al adaptador de Odoo |
| **Sync a Odoo** | Aprobación de recomendaciones | Precios actualizados únicamente para variantes con `status = APPROVED`, vía el servicio de sync existente (no un cliente Odoo paralelo) |
| **Multi-tenancy** | Query de recomendaciones sin `tenantId` scoped | Rechazado o filtrado automáticamente por el guard/middleware de tenant ya existente en OmniFlow |
