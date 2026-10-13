# PROMPT – FEAT-067 · Fase 3: Frontend Dashboard & UI Refine

**Gobernanza:** FEAT-067 v1.21.0
**Fase:** 3 – Frontend Dashboard & UI Refine
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`
**Dependencias:** Fase 1 (Backend Core) + Fase 2 (Caché) — duras. Fase 1.5 (Live Engine) es requisito solo para el tab "Live Operativo" (sección 3.3); si no está lista aún, ese tab puede quedar deshabilitado/oculto sin bloquear el resto.
**Prioridad:** Alta
**Stack:** React · Refine · Ant Design · WebSocket client (socket.io-client u equivalente) · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior de frontend especializado en React, Refine y Ant Design, con experiencia en dashboards de datos y consumo de WebSockets.
Tu tarea es implementar la **Fase 3 – Frontend Dashboard & UI Refine** del módulo OmniFlow BI (FEAT-067).

Esta fase construye la interfaz que consume los endpoints de agregación histórica (Fase 1, con caché de Fase 2) y, si está disponible, el stream en vivo (Fase 1.5). **No implementa lógica de negocio ni cálculos** — todo el procesamiento ya ocurre en el backend; el frontend solo consume, presenta y filtra.

Debes respetar estrictamente:
- Los contratos de datos ya definidos en Fase 1 (`/analytics/product-matrix`, `/analytics/kpi-summary`) y Fase 1.5 (eventos WebSocket).
- El aislamiento multi-tenant (el usuario solo puede ver datos de su propio tenant — esto ya lo garantiza el backend, el frontend no debe intentar sortearlo).
- Los nombres de tabs y secciones que las Fases 4, 5, 6 y 7 ya asumen que existen (ver sección 3.1).

---

## 2. Objetivo de la Fase

Construir la página `analytics.tsx` (o equivalente) con:

1. Filtros globales (años, rango de meses, categoría) que persistan entre tabs.
2. Tarjetas KPI del resumen ejecutivo.
3. Tabla matricial de productos (mes a mes / YoY).
4. Un tab operativo en vivo, alimentado por WebSocket cuando la Fase 1.5 esté disponible.
5. Puntos de extensión ya preparados (sin lógica real todavía) para los tabs que llenarán las Fases 6 y 7.

---

## 3. Alcance Detallado

### 3.1 Estructura de tabs (nombres fijos — no renombrar)

Estos nombres ya están referenciados textualmente por otras fases (Fase 4 los usa para ubicar los botones de exportación; Fase 6 y 7 asumen que existe un lugar donde insertar sus paneles). **No cambiar los labels:**

```tsx
<Tabs defaultActiveKey="resumen">
  <TabPane tab="Resumen Ejecutivo" key="resumen">
    <KpiSummaryView />
  </TabPane>
  <TabPane tab="Matriz de Productos" key="matriz">
    <ProductMatrixView />
  </TabPane>
  <TabPane tab="Live Operativo" key="live">
    <LiveOperationalView />
  </TabPane>
  <TabPane tab="Insights & Calidad de Datos" key="insights" disabled>
    {/* Placeholder — se activa en Fase 6 */}
  </TabPane>
</Tabs>
```

> El tab "Insights & Calidad de Datos" se agrega **deshabilitado** (o con un
> mensaje "Disponible próximamente") en esta fase — solo la estructura visual,
> sin llamadas a endpoints que todavía no existen (esos endpoints los crea
> Fase 6). Esto evita que Fase 6/7 tengan que tocar el layout general del
> dashboard, solo reemplazar el contenido del tab.

### 3.2 Filtros globales

Componente `AnalyticsFilters` compartido entre "Resumen Ejecutivo" y "Matriz de Productos":

| Filtro | Tipo | Notas |
|---|---|---|
| `years` | multi-select | 1 a 3 años (igual que el DTO de Fase 1) |
| `monthFrom` / `monthTo` | select 1-12 | |
| `category` | select (poblado desde `p.category`, con opción "Todas") | |
| `sortBy` / `sortOrder` | solo visible en el tab de Matriz de Productos | |

El estado de estos filtros vive en el componente padre de la página (o en un store como Zustand/Context si el proyecto ya lo usa) y se pasa a ambas vistas — **no duplicar el estado de filtros por tab**.

### 3.3 Tab "Resumen Ejecutivo"

Consume `GET /analytics/kpi-summary` (Fase 1, con caché de Fase 2 transparente).

- Tarjetas KPI: Facturación actual vs anterior (con % de crecimiento), Nº de pedidos, Unidades vendidas, Ticket promedio, Top Selling Product.
- Usar el color/ícono de crecimiento (verde/rojo) según `growthPercent` sea positivo o negativo.
- Estado de loading con skeleton de Ant Design mientras se resuelve la request.
- Manejo de error: si el endpoint falla, mostrar un `Alert` con opción de reintentar — nunca dejar la pantalla en blanco sin feedback.

### 3.4 Tab "Matriz de Productos"

Consume `GET /analytics/product-matrix`.

- Tabla con columnas dinámicas: Producto, Categoría, una columna por cada mes de cada año solicitado, Total por año, Crecimiento %.
- Paginación o límite visible acorde al `limit` del DTO (default 50, máx 200).
- Orden controlado por `sortBy`/`sortOrder` del filtro global.
- Mismo manejo de loading/error que 3.3.

### 3.5 Tab "Live Operativo"

Este tab depende de que la Fase 1.5 esté desplegada. Si el WebSocket no conecta o el backend no expone el gateway, el tab debe degradar con gracia (mensaje "Live Engine no disponible" en vez de romper la página).

Comportamiento esperado:

1. Al montar el componente, conectarse al WebSocket con el token de auth existente y unirse implícitamente al room `tenant:{tenantId}` (esto lo resuelve el backend al autenticar la conexión — el frontend no arma el nombre del room).
2. Al conectar, el backend emite un snapshot inicial (ver Fase 1.5, sección 3.9) — usarlo para el primer render sin esperar el próximo evento.
3. Escuchar `live:metrics:update` y actualizar en tiempo real:
   - Tarjetas: ventas netas del día, ticket promedio, pedidos por estado (preparando/listos/entregados).
   - Gráfico de barras/líneas de ventas por hora (`byHour`), actualizado incrementalmente sin recargar todo el gráfico.
4. Escuchar `live:order:status` y `live:order:new` solo si se quiere mostrar un feed de actividad reciente (opcional en esta fase — no bloqueante para el DoD).
5. **Sin polling.** Si el WebSocket se desconecta, reintentar conexión con backoff; no caer a hacer fetch periódico por HTTP como sustituto.
6. Desmontar la conexión al salir del tab/página (`useEffect` cleanup) para no dejar sockets huérfanos.

### 3.6 Puntos de extensión para Fase 4, 6 y 7 (dejar listos, no implementar)

- **Fase 4 (Exportación):** reservar un slot de botón "Exportar Excel" en la cabecera de "Resumen Ejecutivo" y "Matriz de Productos" (puede ser un botón deshabilitado o directamente omitirse — no es obligatorio implementarlo en esta fase, pero si se agrega debe apuntar a `/analytics/export/kpi-summary` y `/analytics/export/product-matrix` pasando los filtros activos, tal como especifica Fase 4).
- **Fase 6 (Insights):** dejar un lugar en el header del dashboard para un badge "X insights nuevos" (puede ser un componente vacío/oculto por ahora).
- **Fase 7 (Decision Intelligence):** el tab "Insights & Calidad de Datos" es también donde eventualmente vivirá el panel de recomendaciones — no crear un tab aparte para esto todavía.

### 3.7 Manejo de tenant y autenticación

- El frontend nunca arma ni envía un `tenantId` explícito en las requests — se resuelve del contexto de sesión/token, igual que el resto de OmniFlow.
- Ningún request debe incluir parámetros que permitan forzar la consulta de otro tenant.

---

## 4. Restricciones Técnicas Inviolables

1. **No implementar cálculos ni agregaciones en el frontend** — todo viene resuelto del backend (Fase 1/1.5/2).
2. **No hacer polling** para el tab Live — debe ser 100% push vía WebSocket.
3. **No renombrar los tabs** de la sección 3.1 — otras fases ya los referencian por nombre.
4. **No romper el tab Live si la Fase 1.5 no está disponible** — degradar visualmente, nunca crashear la página completa.
5. El estado de filtros es compartido entre "Resumen Ejecutivo" y "Matriz de Productos" — no duplicar.
6. No construir lógica de exportación real en esta fase (eso es Fase 4) — solo dejar el slot de UI si se decide agregarlo.
7. No implementar los dashboards especializados adicionales del plan (P&L Dinámico, Menu Engineering, Rentabilidad Industrial, Inventario) — dependen de endpoints que no existen todavía (se construyen en Fases 5/6/7 o en una extensión posterior de esta fase). Ver sección 7.

---

## 5. Entregables Esperados

1. Página `analytics.tsx` (o el nombre estándar del proyecto) con los 4 tabs de la sección 3.1.
2. Componente `AnalyticsFilters` compartido.
3. `KpiSummaryView` consumiendo `/analytics/kpi-summary`.
4. `ProductMatrixView` consumiendo `/analytics/product-matrix`.
5. `LiveOperationalView` consumiendo el WebSocket de Fase 1.5, con degradación elegante si no está disponible.
6. Manejo de loading y error consistente en las tres vistas activas.
7. Tests (al menos):
   - Render de `KpiSummaryView` con datos mock.
   - Render de `ProductMatrixView` con datos mock, incluyendo el caso de columnas dinámicas por año.
   - `LiveOperationalView` actualiza el estado al recibir un evento `live:metrics:update` simulado.
   - `LiveOperationalView` no rompe si la conexión WebSocket falla.
8. Documentación breve de los componentes y de cómo un tab futuro (Fase 6/7) debe integrarse en el layout existente.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Los tabs "Resumen Ejecutivo", "Matriz de Productos" y "Live Operativo" existen con los labels exactos de la sección 3.1.
- [ ] Los filtros globales afectan tanto a Resumen Ejecutivo como a Matriz de Productos sin duplicar estado.
- [ ] El tab Live se actualiza sin recargar la página y sin hacer polling.
- [ ] Si el WebSocket de Live no conecta, el resto del dashboard sigue funcionando.
- [ ] Loading y error están manejados en las tres vistas activas (nunca pantalla en blanco silenciosa).
- [ ] El tab "Insights & Calidad de Datos" existe como placeholder, sin llamar a endpoints inexistentes.
- [ ] `npm run build` (frontend) pasa sin errores.
- [ ] Tests de los componentes principales pasan.
- [ ] No se rompió ningún endpoint ni contrato de las fases anteriores.

---

## 7. Fuera de Alcance (explícito)

- Dashboards especializados de P&L Dinámico, Menu Engineering, Rentabilidad Industrial e Inventario (dependen de endpoints de Fases 5/6/7 que aún no existen; se agregan como tabs adicionales cuando esas fases estén listas).
- Exportación real a Excel (Fase 4) — solo el slot de UI opcional.
- Insights y recomendaciones reales (Fases 6 y 7) — solo el placeholder del tab.
- Personalización de dashboard por usuario/rol (vistas diferenciadas por perfil mencionadas en el plan como visión de largo plazo).
- Internacionalización / soporte multi-idioma más allá del que ya tenga el proyecto.

---

## 8. Orden de Trabajo Recomendado

1. Revisar los DTOs y respuestas reales de Fase 1 (`getKpiSummary`, `getProductMatrix`) y el contrato de eventos de Fase 1.5.
2. Construir el layout de tabs y el componente `AnalyticsFilters`.
3. Implementar `KpiSummaryView`.
4. Implementar `ProductMatrixView`.
5. Implementar `LiveOperationalView`, incluyendo la lógica de reconexión y degradación.
6. Agregar el placeholder del tab de Insights.
7. Escribir tests con datos mock.
8. Ejecutar build + tests.
9. Documentar.

---

## 9. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Sección 8 – Roadmap, Sección 9 – Dashboards Especializados)
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md` (contrato de `/analytics/product-matrix` y `/analytics/kpi-summary`)
- Prompt Fase 1.5: `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md` (contrato de eventos WebSocket y snapshot inicial)
- Prompt Fase 2: `PROMPT_BI_FASE_2_OPTIMIZACION_CACHE.md` (la caché es transparente para el frontend, no requiere manejo especial)
- Prompt Fase 4: `PROMPT_BI_FASE_4_EXPORT_XLSX.md` (usa los nombres de tab definidos acá)

---

## 10. Instrucción final

Implementa únicamente el Frontend Dashboard descrito en este prompt.
Prioriza la fidelidad a los contratos de datos ya definidos, la degradación elegante del tab Live y el respeto a los nombres de tabs que otras fases ya asumen.
Al terminar, reporta: 1) componentes creados, 2) cómo se maneja la reconexión del WebSocket, 3) capturas o descripción del estado de loading/error, 4) resultado de los tests.
