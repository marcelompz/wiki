# PROMPT – FEAT-067 · Fase 4: Exportación Corporativa XLSX

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 4 – Exportación Corporativa XLSX  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 + Fase 1 (Backend Core) + Fase 2 (Caché) — duras para los endpoints de exportación. Fase 3 (Frontend) es requisito solo para la sección 3.5 (botones de descarga); los endpoints backend pueden desarrollarse y probarse en paralelo con Fase 3.  
**Prioridad:** Media-Alta  
**Stack:** NestJS · exceljs (o librería equivalente) · Prisma · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior full-stack con experiencia en generación de reportes corporativos Excel y APIs NestJS.  
Tu tarea es implementar la **Fase 4 – Exportación Corporativa XLSX** del módulo OmniFlow BI (FEAT-067).

Esta fase permite a los usuarios descargar los datos de analytics en formato Excel (.xlsx) alineado a una estructura corporativa clara, profesional y lista para compartir con stakeholders no técnicos.

Debes respetar:
- Los mismos filtros y contratos de datos de la Fase 1.
- El aislamiento multi-tenant.
- La reutilización de la lógica de agregación ya existente (no duplicar queries).
- El diseño visual y de navegación de la Fase 3.

---

## 2. Objetivo de la Fase

1. Permitir la descarga de reportes Excel desde el frontend de analytics.
2. Generar archivos `.xlsx` bien formateados (cabeceras, formatos de número/moneda, totales, metadata).
3. Soportar al menos dos tipos de exportación:
   - **KPI Summary** (resumen ejecutivo).
   - **Product Matrix** (matriz mes a mes / YoY).
4. Mantener consistencia de datos con lo que se ve en pantalla (mismos filtros → mismos números).
5. Cumplir el criterio de éxito del plan: “Generación exitosa de reportes XLSX alineados a la estructura corporativa oficial”.

---

## 3. Alcance Detallado

### 3.1 Backend – Endpoints de exportación

Agregar al módulo `analytics` (Fase 1):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/analytics/export/kpi-summary`    | Descarga Excel del resumen ejecutivo |
| `GET`  | `/analytics/export/product-matrix` | Descarga Excel de la matriz de productos |

**Query parameters:** idénticos a los de los endpoints de la Fase 1 (`year`, `years`, `monthFrom`, `monthTo`, `category`, `limit`, `sortBy`, etc.).

**Respuesta:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="analytics-kpi-summary-{tenant}-{fecha}.xlsx"` (o equivalente)
- Body: el archivo binario generado.

### 3.2 Librería y generación del archivo

Usar **exceljs** (recomendada) o la librería ya presente en el proyecto si existe una estándar.

Requisitos de formato:

- Hoja con nombre claro (`KPI Summary`, `Product Matrix`).
- Cabecera con:
  - Título del reporte
  - Nombre del tenant (o identificador legible)
  - Período analizado
  - Fecha/hora de generación
- Columnas con anchos razonables.
- Formato de moneda / número con separadores de miles y 2 decimales.
- Fila de totales donde corresponda.
- Estilos básicos: negrita en cabeceras, fondo gris claro en header, bordes sutiles.
- Congelar la primera fila (freeze pane) para facilitar la navegación.

### 3.3 Reutilización de lógica

**No duplicar** las queries de agregación.

Flujo recomendado:

```typescript
async exportKpiSummary(tenantId: string, query: KpiSummaryQueryDto, dbClient?: any) {
  // 1. Reutilizar exactamente el mismo método de la Fase 1
  const data = await this.getKpiSummary(tenantId, query, dbClient);
  
  // 2. Generar el workbook con exceljs a partir de `data`
  const buffer = await this.buildKpiSummaryExcel(data, query, tenantId);
  
  return buffer;
}
```

Lo mismo para la matriz de productos.

La caché de la Fase 2 se beneficia automáticamente (si hay hit, la exportación también será rápida).

### 3.4 Contenido mínimo de cada Excel

#### A. KPI Summary.xlsx

| Sección | Contenido |
|---------|-----------|
| Metadata | Título, Tenant, Período, Fecha de generación |
| KPIs principales | Facturación actual vs anterior, Crecimiento %, Nº Pedidos, Unidades, Ticket Promedio |
| Top Product | Nombre, Revenue, Quantity |
| (Opcional) | Notas o leyenda de filtros aplicados |

#### B. Product Matrix.xlsx

| Sección | Contenido |
|---------|-----------|
| Metadata | Título, Tenant, Años, Rango de meses, Categoría (si aplica), Fecha de generación |
| Tabla | Producto \| Categoría \| Meses del año 1 \| Total año 1 \| Meses del año 2 \| Total año 2 \| … \| Crecimiento % |
| Totales | Fila final con sumas |
| Notas | Filtros aplicados y criterio de ordenamiento |

### 3.5 Frontend – Botones de exportación

En las tabs correspondientes de la Fase 3:

- **Resumen Ejecutivo** → botón “Exportar Excel” (o icono de descarga).
- **Matriz de Productos** → botón “Exportar Excel”.

Comportamiento:
- Al hacer clic se llama al endpoint de exportación correspondiente pasando **exactamente los mismos filtros** que están activos en la pantalla.
- Mostrar estado de loading en el botón mientras se genera el archivo.
- La descarga debe iniciarse automáticamente (blob + link temporal o uso del mecanismo estándar del proyecto).
- Manejar errores (toast/notification) si la generación falla.

### 3.6 Nombre de archivo sugerido

```
analytics-kpi-{tenantSlug-or-id}-{yyyy-mm-dd}.xlsx
analytics-matrix-{tenantSlug-or-id}-{yyyy-mm-dd}.xlsx
```

Evitar caracteres especiales en el nombre.

### 3.7 Multi-tenant y seguridad

- El endpoint debe extraer el `tenantId` del usuario autenticado (igual que los endpoints de la Fase 1).
- Nunca permitir exportar datos de otro tenant.
- Soporte `dbClient?: any` para tiers Dedicated.

---

## 4. Restricciones Técnicas Inviolables

1. Reutilizar la lógica de agregación de la Fase 1 (DRY).
2. Mismos filtros → mismos números que se ven en pantalla.
3. Aislamiento total por `tenantId`.
4. No generar el Excel en el frontend (todo se genera en backend).
5. No implementar aún otros formatos (PDF, CSV) a menos que sea trivial y se documente.
6. No agregar lógica de Insights o Decision Intelligence.

---

## 5. Entregables Esperados

1. Dos endpoints de exportación en el backend (`/analytics/export/kpi-summary` y `/analytics/export/product-matrix`).
2. Generación de archivos `.xlsx` con formato profesional (exceljs o equivalente).
3. Botones de “Exportar Excel” en las tabs de Resumen Ejecutivo y Matriz de Productos.
4. Manejo de loading y errores en el frontend.
5. Tests backend:
   - El endpoint devuelve un buffer válido con Content-Type correcto.
   - Los números del Excel coinciden con los del endpoint JSON de la Fase 1 para los mismos parámetros.
   - No se pueden exportar datos de otro tenant.
6. Documentación breve del formato de los reportes.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Desde el tab Resumen Ejecutivo se puede descargar un Excel con los KPIs del período filtrado.
- [ ] Desde el tab Matriz de Productos se puede descargar un Excel con la matriz completa según filtros.
- [ ] Los valores numéricos del Excel coinciden con los mostrados en pantalla.
- [ ] El archivo tiene cabeceras claras, formato de moneda y fila de totales.
- [ ] El nombre del archivo es descriptivo y seguro.
- [ ] Existe estado de loading durante la generación.
- [ ] `npm run build` (backend y frontend) pasa.
- [ ] Tests de exportación pasan.

---

## 7. Fuera de Alcance (explícito)

- Exportación de datos Live / tiempo real (no aplica).
- Exportación de Insights o recomendaciones (Fases 6-7).
- Plantillas Excel muy complejas con gráficos embebidos o macros.
- Programación de reportes por email o envío automático.
- Otros formatos (PDF, Google Sheets, etc.).
- Personalización de columnas por usuario (versión futura).

---

## 8. Orden de Trabajo Recomendado

1. Revisar los DTOs y métodos `getKpiSummary` / `getProductMatrix` de la Fase 1.
2. Instalar / verificar `exceljs` (o librería elegida).
3. Implementar los métodos `buildKpiSummaryExcel` y `buildProductMatrixExcel`.
4. Crear los dos endpoints de exportación.
5. Escribir tests de backend (contenido y seguridad).
6. Agregar los botones de exportación en el frontend (Fase 3) pasando los filtros actuales.
7. Probar el flujo completo de descarga.
8. Ajustar formatos visuales del Excel (anchos, estilos, freeze).
9. Documentar.

---

## 9. Ejemplo de metadata en la hoja

```
OmniFlow BI – Resumen Ejecutivo
Tenant: Restaurante Ejemplo S.A.
Período: Enero 2026 – Agosto 2026 (vs 2025)
Generado: 2026-08-17 16:45:22 UTC
Filtros: Categoría = Todas
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Criterio de éxito nº 4 – XLSX alineados)
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Prompt Fase 2: `PROMPT_BI_FASE_2_OPTIMIZACION_CACHE.md`
- Prompt Fase 3: `PROMPT_BI_FASE_3_FRONTEND_DASHBOARD.md`

---

**Instrucción final:**  
Implementa la exportación corporativa a Excel descrita en este prompt.  
Prioriza fidelidad de datos (mismos números que la pantalla), formato profesional y reutilización de la lógica de la Fase 1.  
Al terminar, reporta:  
1) endpoints creados,  
2) librería utilizada,  
3) estructura de las hojas,  
4) cómo se dispara la descarga desde el frontend,  
5) resultado de los tests.
