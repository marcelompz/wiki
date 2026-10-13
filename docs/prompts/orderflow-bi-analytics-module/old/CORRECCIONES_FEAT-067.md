# Correcciones Puntuales — FEAT-067 (Módulo BI)

Cada bloque indica en qué documento va, qué reemplaza y el texto corregido, listo para pegar.

---

## 1. `PROMPT_BI_FASE_0_DATA_FOUNDATION.md` — Backfill de campos "obligatorios"

**Reemplazar** la sección 3.1.A (tabla de campos del modelo `Order`) agregando esta subsección justo después de la tabla:

```markdown
> **Estrategia de migración para campos marcados "Sí" (obligatorio):**
> Como la tabla `Order` ya tiene datos en producción, ningún campo nuevo puede
> agregarse directamente como `NOT NULL`. Para `channel` y `locationId`
> (los dos únicos campos nuevos marcados obligatorios):
>
> 1. Agregar la columna como **nullable** en la migración inicial.
> 2. Ejecutar un **backfill** dentro de la misma migración (o en un script
>    posterior documentado) que asigne un valor por defecto a los registros
>    históricos:
>    - `channel`: usar `'POS'` como valor por defecto para todo registro
>      histórico sin canal explícito (es el canal predominante antes de
>      omnicanalidad).
>    - `locationId`: si el tenant es single-location, asignar el `id` de su
>      único local (si existe `Location`); si el tenant es multi-location y
>      no hay forma de inferir el local histórico, dejar `NULL` y documentarlo
>      como excepción conocida en el Data Quality Score.
> 3. Solo después del backfill, si el 100% de las filas quedaron pobladas,
>    aplicar `ALTER COLUMN ... SET NOT NULL` en una migración separada.
>    Si no se puede garantizar el 100%, el campo queda `nullable` de forma
>    permanente y "obligatorio" se interpreta como *obligatorio para
>    registros nuevos vía validación de aplicación*, no como constraint de DB.
>
> Documentar en el reporte final de la fase cuál de las dos rutas se tomó
> para cada campo.
```

**Reemplazar** en la sección 3.1 (Enum `OrderStatus`), agregar esta nota inmediatamente debajo del bloque de código del enum:

```markdown
> **Regla inviolable sobre el enum:** Solo se permite `ALTER TYPE ... ADD VALUE`
> para incorporar estados nuevos. **Nunca** eliminar ni renombrar valores que
> ya existan en el enum actual, aunque parezcan redundantes o mal nombrados —
> hacerlo rompe cualquier fila histórica que referencie ese valor. Si un
> estado actual no encaja con esta lista, documentar el mapeo (ej. "el status
> legado `X` se interpreta como `CONFIRMED` a nivel de BI") en vez de
> renombrarlo en la base de datos.
```

---

## 2. Unificar `dinersCount` (eliminar `party_size`)

**En `PLAN_DESARROLLO_MODULO_BI_v1_21_2_CORREGIDO.md`:**

Sección 4, tabla "Campos críticos de captura", fila:
```
| `party_size` / `dinersCount` | Recomendado | POS Restaurante | Spend per Diner, RevPASH |
```
**Reemplazar por:**
```
| `dinersCount`      | Recomendado | POS Restaurante | Spend per Diner, RevPASH |
```

Sección 7.1, tabla de KPIs, fila de **Spend per Diner**:
```
| **Spend per Diner**    | \(\frac{\text{Ventas Netas}}{\sum \text{dinersCount}}\)                           | `orders` (campo `dinersCount` / `party_size`) | Requiere captura confiable de comensales. Si es null se excluye del promedio o se imputa. |
```
**Reemplazar por:**
```
| **Spend per Diner**    | \(\frac{\text{Ventas Netas}}{\sum \text{dinersCount}}\)                           | `orders` (campo `dinersCount`) | Requiere captura confiable de comensales. Si es null se excluye del promedio o se imputa. |
```

Sección 11 (Data Quality Score), ítem de lista:
```
- `dinersCount` / `party_size`
```
**Reemplazar por:**
```
- `dinersCount`
```

---

## 3. `PROMPT_BI_FASE_1_BACKEND_CORE.md` — Conteo correcto de pedidos

**Reemplazar** en la sección 3.4, tabla "Cálculos del KPI Summary", la fila:
```
| Total de pedidos           | `COUNT(DISTINCT orderId)` o `COUNT(orders)` filtrados |
```
**Por:**
```
| Total de pedidos           | `COUNT(DISTINCT o."id")` — **obligatorio usar DISTINCT** siempre que la query involucre un JOIN con `order_lines`, ya que sin DISTINCT cada línea de la orden se cuenta como un pedido separado. Nunca usar `COUNT(orders)` a secas sobre un resultado joineado. |
```

**Agregar** al final de la sección 3.4 (después de la tabla de KPIs):
```markdown
> **Nota sobre `$queryRawUnsafe`:** Queda **prohibido** su uso en esta fase.
> Todos los filtros dinámicos (`category`, `sortBy`, `sortOrder`, rangos de
> fecha) deben resolverse con `$queryRaw` + parámetros bindeados, o —si el
> nombre de columna a ordenar es dinámico— mediante un mapa fijo en código
> (`whitelist`) que traduzca el valor del DTO a la columna real, nunca por
> interpolación directa de strings del usuario en el SQL.
```

**Reemplazar** en la sección 3.3 (DTO de Product Matrix), la línea:
```
years: number[];          // ej. [2025, 2026] – obligatorio, máx 3 años
```
**Por:**
```
years: number[];          // ej. [2025, 2026] – obligatorio, mín 1, máx 3 años
```

---

## 4. `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md` — Snapshot inicial al conectar

**Agregar** una nueva subsección 3.9 (después de 3.8):

```markdown
### 3.9 Snapshot inicial al conectar (obligatorio)

Un cliente que se une al room `tenant:{tenantId}` a mitad del turno no debe
quedar en blanco hasta el próximo evento de orden. Inmediatamente después de
`client.join(tenant:{tenantId})`, el gateway debe:

1. Leer el snapshot actual (Redis o recálculo ligero, según la opción elegida
   en 3.5).
2. Emitir `live:metrics:update` **solo a ese cliente** (no al room completo)
   con el estado actual del día.

Esto garantiza que la UI siempre tenga datos al abrir el dashboard, sin
esperar la próxima transacción.
```

**Agregar** al final de la sección 3.5 (Cálculo de métricas live), después de "En ambos casos el filtro `tenantId`...":

```markdown
> **Idempotencia (obligatoria si se usa Opción A – Snapshot en Redis):**
> BullMQ puede reintentar un job ante una falla transitoria, lo que podría
> aplicar el mismo delta dos veces sobre el snapshot y duplicar ventas o
> pedidos. Cada actualización incremental debe ser idempotente: usar una
> clave de deduplicación (ej. `processed:{tenantId}:{orderId}:{eventType}`
> con TTL de algunas horas) y verificar antes de aplicar el delta que ese
> evento específico no fue procesado ya.
```

**Agregar** a la sección 5 (Entregables Esperados), como nuevo ítem:
```markdown
8. Emisión del snapshot inicial al cliente al conectarse al room (ver 3.9).
9. Mecanismo de idempotencia documentado para evitar doble conteo ante
   reintentos de BullMQ.
```

---

## 5. Aclarar la dependencia real de Fase 1.5

**En `PLAN_DESARROLLO_MODULO_BI_v1_21_2_CORREGIDO.md`**, sección 8 (Roadmap), fila de Fase 1.5:
```
| 1.5  | Live Real-Time Stream Engine                | OrdersGateway, EventBus, BullMQ, Redis Rooms, latencia < 500 ms                    | Fase 0 + 1            |
```
**Reemplazar por:**
```
| 1.5  | Live Real-Time Stream Engine                | OrdersGateway, EventBus, BullMQ, Redis Rooms, latencia < 500 ms                    | Fase 0 (dura). Fase 1 no es dependencia técnica: puede ejecutarse en paralelo. |
```

**En `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md`**, encabezado del documento:
```
**Dependencias:** Fase 0 (Data Foundation) + Fase 1 (Backend Core)
```
**Reemplazar por:**
```
**Dependencias:** Fase 0 (Data Foundation) — dura. Fase 1 (Backend Core) no es
requisito técnico (Live Engine no consulta el Strategic Engine ni sus
endpoints); puede ejecutarse en paralelo con Fase 1 si hay capacidad de equipo.
```
