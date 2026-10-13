# Correcciones Puntuales — FEAT-067 (Módulo BI) — v2

Actualiza y reemplaza el documento `CORRECCIONES_FEAT-067.md` anterior: las
correcciones de Fase 0/1/1.5 de esa versión no llegaron a aplicarse, y Fase 0
cambió de forma (el campo `channel` ahora es un enum `ChannelType`, y
`costAtSale` pasó a ser obligatorio), así que están reescritas acá contra el
estado actual de los documentos. Incluye además la baja del Master v2 y dos
problemas nuevos detectados en Fase 5 y Fase 6.

---

## 0. `PROMPT_MAESTRO_DESARROLLO_BI-v2.md` — Marcar como obsoleto

Confirmado con el equipo: este documento es una versión anterior, no la
fuente de verdad. **Reemplazar todo su contenido** por una nota de baja para
que nadie lo use por error:

```markdown
# PROMPT_MAESTRO_DESARROLLO_BI-v2.md — OBSOLETO

Este documento quedó **reemplazado** por los prompts de fase individuales:

- `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md`
- `PROMPT_BI_FASE_2_OPTIMIZACION_CACHE.md`
- `PROMPT_BI_FASE_4_EXPORT_XLSX.md`
- `PROMPT_BI_FASE_5_ERP_INVENTORY.md`
- `PROMPT_BI_FASE_6_INSIGHTS_DATA_QUALITY.md`
- `PROMPT_BI_FASE_7_DECISION_INTELLIGENCE.md`

No usar este archivo para implementación: define un schema y una API que
**no coinciden** con los prompts de fase vigentes (nombres de campos,
prefijo de rutas, esquema de caché, secuenciación de alcance). Se conserva
solo como referencia histórica del diseño original.
```

Si preferís no borrar el contenido original, como alternativa movelo a
`docs/archive/PROMPT_MAESTRO_DESARROLLO_BI-v2.md` y dejá el aviso de baja
en su lugar original.

---

## 1. `PROMPT_BI_FASE_0_DATA_FOUNDATION.md` — Backfill y contradicción interna de `costAtSale`

### 1.1 Contradicción a resolver primero

La sección 3.1.B marca `costAtSale` como **obligatorio (`Sí`)**, pero la
sección 3.4 pide calcular "% de `order_lines` que tienen `costAtSale` no
nulo" como parte del Data Quality Score. Esas dos cosas no pueden ser
ciertas a la vez: si el campo fuera realmente `NOT NULL`, esa métrica
siempre daría 100 % y no tendría sentido medirla. Además, el costo
histórico real al momento de la venta **no se puede reconstruir** para
filas ya existentes — no hay forma de "backfillear" con precisión un costo
que no se capturó en su momento (usar el costo actual como proxy
distorsionaría los márgenes históricos, que es justo lo que este campo
existe para evitar).

**Reemplazar** en la tabla de la sección 3.1.B, la fila de `costAtSale`:
```
| `costAtSale`     | `Decimal`   | **Sí**      | Costo al momento de la venta (permite márgenes históricos reales). **Obligatorio por plan corregido**. |
```
**Por:**
```
| `costAtSale`     | `Decimal?`  | Recomendado (obligatorio solo para filas nuevas vía validación de aplicación) | Costo al momento de la venta. No se puede backfillear con precisión en filas históricas — ver nota debajo. |
```

**Agregar** inmediatamente después de la tabla:
```markdown
> **Por qué `costAtSale` queda nullable a nivel de base de datos:** el costo
> real al momento de la venta de una orden histórica no se puede reconstruir
> de forma confiable. Usar el costo estándar actual del producto como
> sustituto introduciría márgenes históricos incorrectos, que es exactamente
> lo que este campo busca evitar. La columna se agrega como `Decimal?`; la
> obligatoriedad se aplica hacia adelante (nuevas filas) vía validación en el
> servicio de creación de `OrderLine`, no vía constraint de base de datos.
> El Data Quality Score (sección 3.4) es precisamente el mecanismo para medir
> qué porcentaje de filas nuevas cumple esto con el tiempo.
```

### 1.2 Backfill para `channel` (ahora `ChannelType`) y `locationId`

**Agregar** después de la tabla de la sección 3.1.A (antes del bloque del
enum `ChannelType`):

```markdown
> **Estrategia de migración para `channel` y `locationId` (marcados "Sí"):**
> La tabla `Order` ya tiene datos en producción, así que ninguno de los dos
> puede agregarse directamente como `NOT NULL`:
>
> 1. Agregar `channel` como `ChannelType?` (nullable) y `locationId` como
>    `String?` en la migración inicial.
> 2. Backfill dentro de la misma migración o en un script posterior
>    documentado:
>    - `channel`: asignar `'POS'` a todo registro histórico sin canal
>      explícito (canal predominante antes de la omnicanalidad).
>    - `locationId`: si el tenant es single-location, asignar el `id` de su
>      único local; si es multi-location y no hay forma de inferir el local
>      histórico, dejar `NULL` y documentarlo como excepción conocida en el
>      Data Quality Score.
> 3. Solo si el backfill logra cubrir el 100 % de las filas, aplicar
>    `ALTER COLUMN ... SET NOT NULL` en una migración separada. Si no se
>    puede garantizar el 100 %, el campo queda `nullable` de forma
>    permanente y la obligatoriedad se aplica vía validación de aplicación
>    para filas nuevas, no vía constraint de DB.
>
> Documentar en el reporte final de la fase qué ruta se tomó para cada campo.
```

### 1.3 Regla de solo-agregar en el enum `OrderStatus`

**Agregar** inmediatamente debajo del bloque de código del enum
`OrderStatus`:

```markdown
> **Regla inviolable sobre el enum:** Solo se permite `ALTER TYPE ... ADD VALUE`
> para incorporar estados nuevos. **Nunca** eliminar ni renombrar valores que
> ya existan en el enum actual, aunque parezcan redundantes — hacerlo rompe
> cualquier fila histórica que referencie ese valor. Si un estado actual no
> encaja con esta lista, documentar el mapeo (ej. "el status legado `X` se
> interpreta como `CONFIRMED` a nivel de BI") en vez de renombrarlo en la
> base de datos.
```

---

## 2. `PROMPT_BI_FASE_1_BACKEND_CORE.md`

**Reemplazar** en la sección 3.4, tabla "Cálculos del KPI Summary", la fila:
```
| Total de pedidos           | `COUNT(DISTINCT orderId)` o `COUNT(orders)` filtrados |
```
**Por:**
```
| Total de pedidos           | `COUNT(DISTINCT o."id")` — **obligatorio usar DISTINCT** siempre que la query involucre un JOIN con `order_lines`, ya que sin DISTINCT cada línea se cuenta como un pedido separado. Nunca usar `COUNT(orders)` a secas sobre un resultado joineado. |
```

**Agregar** al final de la sección 3.4:
```markdown
> **Nota sobre `$queryRawUnsafe`:** Queda **prohibido** su uso en esta fase.
> Todos los filtros dinámicos (`category`, `sortBy`, `sortOrder`, rangos de
> fecha) deben resolverse con `$queryRaw` + parámetros bindeados, o —si el
> nombre de columna a ordenar es dinámico— mediante un mapa fijo en código
> (`whitelist`) que traduzca el valor del DTO a la columna real, nunca por
> interpolación directa de strings del usuario en el SQL.
```

**Reemplazar** en la sección 3.3 (DTO de Product Matrix):
```
years: number[];          // ej. [2025, 2026] – obligatorio, máx 3 años
```
**Por:**
```
years: number[];          // ej. [2025, 2026] – obligatorio, mín 1, máx 3 años
```

---

## 3. `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md`

**Agregar** una nueva subsección 3.9 (después de 3.8):
```markdown
### 3.9 Snapshot inicial al conectar (obligatorio)

Un cliente que se une al room `tenant:{tenantId}` a mitad del turno no debe
quedar en blanco hasta el próximo evento de orden. Inmediatamente después de
`client.join(tenant:{tenantId})`, el gateway debe:

1. Leer el snapshot actual (Redis o recálculo ligero, según la opción
   elegida en 3.5).
2. Emitir `live:metrics:update` **solo a ese cliente** (no al room completo)
   con el estado actual del día.
```

**Agregar** al final de la sección 3.5:
```markdown
> **Idempotencia (obligatoria si se usa Opción A – Snapshot en Redis):**
> BullMQ puede reintentar un job ante una falla transitoria, lo que podría
> aplicar el mismo delta dos veces sobre el snapshot y duplicar ventas o
> pedidos. Cada actualización incremental debe ser idempotente: usar una
> clave de deduplicación (ej. `processed:{tenantId}:{orderId}:{eventType}`
> con TTL de algunas horas) y verificar antes de aplicar el delta que ese
> evento específico no fue procesado ya.
```

**Reemplazar** el encabezado:
```
**Dependencias:** Fase 0 (Data Foundation) + Fase 1 (Backend Core)
```
**Por:**
```
**Dependencias:** Fase 0 (Data Foundation) — dura. Fase 1 (Backend Core) no
es requisito técnico (Live Engine no consulta el Strategic Engine ni sus
endpoints); puede ejecutarse en paralelo con Fase 1 si hay capacidad de
equipo.
```

---

## 4. `PROMPT_BI_FASE_5_ERP_INVENTORY.md` — Convención de nombres inconsistente

Fase 0 y Fase 1 establecen como regla inviolable "nombres de columnas
camelCase entre comillas dobles" (`priceAtSale`, `costAtSale`, `tenantId`).
Fase 5 rompe esa convención: define campos como `cost_price_pmp`,
`sifen_fiscal_status`, `account_move_id`, `b2b_sales_amount`,
`supplier_lead_time` en snake_case, tanto en la tabla de mapeo como en el
`analytics.manifest.json`. No queda claro si son los nombres reales de las
columnas Prisma o los nombres de origen en el ERP.

**Agregar** al inicio de la sección 3.1, antes de la tabla de campos:
```markdown
> **Convención de nombres:** los nombres en snake_case de esta sección
> (`cost_price_pmp`, `sifen_fiscal_status`, `account_move_id`,
> `b2b_sales_amount`, `supplier_lead_time`) son los **nombres de origen en
> el ERP/proveedor fiscal**, no nombres de columna en Prisma/Postgres. Al
> incorporarlos al schema de OmniFlow deben mapearse a camelCase siguiendo
> la convención del resto del proyecto (ej. `cost_price_pmp` → `costPricePmp`).
> Documentar explícitamente la tabla de mapeo origen → destino en el PR, y
> usar los nombres camelCase (entre comillas dobles) en cualquier SQL raw.
```

**Reemplazar** en `analytics.manifest.json` (sección 3.1), el bloque `"erp"`:
```json
"erp": {
  "requiredFields": ["cost_price_pmp", "sifen_fiscal_status"],
  "optionalFields": ["account_move_id", "b2b_sales_amount", "supplier_lead_time"],
  "sources": ["odoo_18", "odoo_19", "tango", "facturasend"]
}
```
**Por:**
```json
"erp": {
  "requiredFields": ["costPricePmp", "sifenFiscalStatus"],
  "optionalFields": ["accountMoveId", "b2bSalesAmount", "supplierLeadTime"],
  "sources": ["odoo_18", "odoo_19", "tango", "facturasend"]
}
```

---

## 5. `PROMPT_BI_FASE_6_INSIGHTS_DATA_QUALITY.md` — Residuo de `party_size`

La tabla de reglas del Data Quality Score (sección 3.1) todavía tiene:
```
| Restaurante   | `dinersCount` / `party_size` informado              | Medio         | Cuando el canal es POS restaurante |
```
**Reemplazar por:**
```
| Restaurante   | `dinersCount` informado                             | Medio         | Cuando el canal es POS restaurante |
```

---

## 6. Menor — `PROMPT_BI_FASE_4_EXPORT_XLSX.md`: dependencia dura de Fase 3

La dependencia declarada es "Fase 0 + Fase 1 + Fase 2 + Fase 3", pero los
dos endpoints de exportación (backend) no requieren que el frontend exista
— solo reutilizan `getKpiSummary`/`getProductMatrix` de Fase 1. Solo la
sección 3.5 (botones en el frontend) depende de Fase 3.

**Reemplazar** el encabezado:
```
**Dependencias:** Fase 0 + Fase 1 (Backend Core) + Fase 2 (Caché) + Fase 3 (Frontend)
```
**Por:**
```
**Dependencias:** Fase 0 + Fase 1 (Backend Core) + Fase 2 (Caché) — duras
para los endpoints de exportación. Fase 3 (Frontend) es requisito solo para
la sección 3.5 (botones de descarga); los endpoints backend pueden
desarrollarse y probarse en paralelo con Fase 3.
```
