# PROMPT – FEAT-067 · Fase 4.5: Visor Collabora Online (WOPI) para Reportes OmniBI

**Gobernanza:** FEAT-067 v1.21.0
**Fase:** 4.5 – Visor Collabora Online (WOPI, solo lectura)
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`
**Dependencias:** Fase 1 (Backend Core) + Fase 4 (Exportación XLSX) — duras. Fase 2 (Caché) es recomendable pero no bloqueante (la regeneración transitoria del archivo se beneficia de ella).
**Infraestructura previa:** Collabora Online (CODE) ya desplegado vía Docker Compose + Traefik (`office.tudominio.com`), documentado en `/srv/collabora/README.md`.
**Prioridad:** Media
**Stack:** NestJS · Prisma · Protocolo WOPI · JWT · Collabora Online (CODE) · React/Refine

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en integraciones WOPI, autenticación con tokens de corta duración y arquitecturas multi-tenant.
Tu tarea es implementar la **Fase 4.5 – Visor Collabora Online** del módulo OmniFlow BI (FEAT-067).

Esta fase permite que los reportes que ya genera Fase 4 (`KPI Summary.xlsx`, `Product Matrix.xlsx`) se **visualicen embebidos** en el dashboard de Refine (fidelidad real de hoja de cálculo — formato, columnas, totales) en vez de forzar al usuario a descargarlos para verlos.

**Alcance explícito de esta fase: solo lectura (view-only).** No se implementa edición ni guardado de cambios (`PutFile`) — eso queda para una fase futura si se decide extenderlo.

Debes respetar estrictamente:
- El aislamiento multi-tenant (un `access_token` de un tenant nunca debe poder abrir el archivo de otro).
- La reutilización total de la lógica de generación de Excel de Fase 4 (`buildKpiSummaryExcel`, `buildProductMatrixExcel`) — no se duplica lógica de reportes.
- El contrato WOPI ya validado en el despliegue de Collabora (`/srv/collabora`), incluyendo `WOPI_ALIAS_GROUP` y el patrón de iframe documentado en su README.

---

## 2. Objetivo de la Fase

1. Implementar un **WOPI host mínimo** en el backend de OmniFlow (`CheckFileInfo` + `GetFile`; `PutFile` no se implementa en esta fase — ver sección 3.5).
2. Generar `access_token` JWT efímeros, atados a `tenantId` + `userId` + identificador de reporte, con expiración corta.
3. Embeber el visor de Collabora en las tabs "Resumen Ejecutivo" y "Matriz de Productos" del frontend (Fase 3), como alternativa a la descarga directa.
4. No persistir archivos en disco/S3: el WOPI host **regenera el XLSX de forma transitoria** en cada `GetFile`, a partir de los mismos filtros que ya usa Fase 4 — evita mantener un almacenamiento de archivos y una lógica de limpieza aparte.
5. Verificar de forma **proactiva** la disponibilidad de Collabora antes de ofrecer el botón "Ver reporte": si el servicio no responde, el usuario nunca debe llegar a intentarlo — directamente se le ofrece la descarga (ver sección 3.8).

---

## 3. Alcance Detallado

### 3.1 Identificador de archivo (`fileId`) sin almacenamiento persistente

En vez de guardar el `.xlsx` generado y referenciarlo por un id de base de datos, el `fileId` que viaja en la URL WOPI es un **token firmado y stateless** que codifica todo lo necesario para regenerar el archivo:

```typescript
interface WopiFileToken {
  tenantId: string;
  reportType: 'kpi-summary' | 'product-matrix';
  query: KpiSummaryQueryDto | ProductMatrixQueryDto;  // mismos DTOs de Fase 1/4
  userId: string;
  exp: number;  // expiración corta, ej. 15 minutos
}
```

- Firmar con el mismo mecanismo JWT que ya usa OmniFlow para auth (reutilizar `JwtService`, no inventar uno nuevo).
- El `fileId` de la URL WOPI **es** este JWT (o su id si se prefiere indirección vía Redis con TTL corto — cualquiera de las dos opciones es válida, documentar la elegida).
- Esto significa que `CheckFileInfo` y `GetFile` no consultan una tabla de "archivos generados": decodifican el token, validan tenant/expiración, y listo.

### 3.2 Endpoints WOPI mínimos

```
GET /wopi/files/{fileId}            → CheckFileInfo
GET /wopi/files/{fileId}/contents   → GetFile
```

**`CheckFileInfo`** debe responder (mínimo):

```json
{
  "BaseFileName": "kpi-summary-2026-08-22.xlsx",
  "Size": 24576,
  "OwnerId": "{tenantId}",
  "UserId": "{userId}",
  "UserFriendlyName": "{nombre del usuario}",
  "UserCanWrite": false,
  "UserCanNotWriteRelative": true,
  "ReadOnly": true,
  "DisableExport": false,
  "DisableCopy": false,
  "LastModifiedTime": "2026-08-22T19:00:00Z"
}
```

`UserCanWrite: false` y `ReadOnly: true` son la clave de esta fase: le indican a Collabora que abra el documento en modo visualización y que **nunca llame a `PutFile`**, sin necesidad de implementarlo todavía.

**`GetFile`** decodifica el `fileId`, valida tenant y expiración, llama internamente a `buildKpiSummaryExcel`/`buildProductMatrixExcel` (Fase 4) con el `query` embebido en el token, y devuelve el buffer resultante con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### 3.3 Validación de acceso (obligatoria en cada request)

En **ambos** endpoints:

1. Verificar la firma y expiración del JWT del `fileId`.
2. Extraer `tenantId` del token y compararlo contra el `tenantId` del usuario autenticado en la sesión que originó el `access_token` de WOPI (doble verificación: el `access_token` de la query string y el `fileId` deben pertenecer al mismo tenant).
3. Si algo no coincide, devolver `401`/`404` — nunca servir el archivo.
4. Loguear `tenantId` + `userId` + `reportType` en cada `GetFile` exitoso (mismo criterio de auditoría que el resto del módulo BI).

### 3.4 Generación del `access_token` y armado de la URL del iframe

Endpoint nuevo en el módulo `analytics` (o extensión del de exportación):

```
POST /analytics/export/kpi-summary/viewer-session
POST /analytics/export/product-matrix/viewer-session
```

Responde con la URL lista para el iframe:

```json
{
  "editorUrl": "https://office.tudominio.com/browser/xxxx/cool.html?WOPISrc=https%3A%2F%2Fapi.tudominio.com%2Fwopi%2Ffiles%2F{fileId}&access_token={accessToken}",
  "expiresAt": "2026-08-22T19:15:00Z"
}
```

- El `{fileId}` de esta URL es el `WopiFileToken` firmado de la sección 3.1.
- El `{accessToken}` es un segundo JWT, de vida corta (recomendado: igual TTL que `fileId`, ej. 15 min), que Collabora reenvía en cada llamada WOPI — se valida igual que en 3.3.
- El fragmento `/browser/xxxx/cool.html` (el discovery path real) **no se hardcodea**: se resuelve consultando `https://office.tudominio.com/hosting/discovery` y cacheando el XML de descubrimiento (TTL de horas, es prácticamente estático) para no pegarle a ese endpoint en cada request.

### 3.5 `PutFile` — explícitamente no implementado

No crear el endpoint `POST /wopi/files/{fileId}/contents` en esta fase. Como `CheckFileInfo` reporta `UserCanWrite: false`, Collabora no lo va a invocar. Si en el futuro se decide habilitar edición, esa es una fase aparte con sus propias implicancias (persistencia del archivo editado, versionado, conflictos de escritura concurrente).

### 3.6 Frontend (extensión de Fase 3)

En las tabs "Resumen Ejecutivo" y "Matriz de Productos" (Fase 3), agregar un botón **"Ver reporte"** junto al de exportar (Fase 4):

```tsx
async function openViewer(reportType: 'kpi-summary' | 'product-matrix', filters: AnalyticsFilters) {
  const { editorUrl } = await api.post(`/analytics/export/${reportType}/viewer-session`, filters);
  setViewerUrl(editorUrl); // abre un modal/drawer con el iframe
}
```

```tsx
<iframe
  src={viewerUrl}
  style={{ width: '100%', height: '100vh', border: 'none' }}
  allow="clipboard-read *; clipboard-write *;"
/>
```

- Mostrar el visor en un modal/drawer de pantalla completa, no navegar fuera del dashboard.
- Si `viewer-session` falla (Collabora caído, token inválido, etc.), degradar con gracia: mostrar un mensaje y dejar disponible el botón de descarga normal de Fase 4 como alternativa — **nunca** dejar que un fallo de Collabora bloquee la exportación tradicional.

### 3.7 Multi-tenant y `WOPI_ALIAS_GROUP`

El despliegue ya restringe, a nivel de Collabora, qué orígenes pueden pedirle WOPI (`WOPI_ALIAS_GROUP=https://.*\\.tudominio\\.com:443`). Esto es una capa adicional, no la única: la validación real de tenant ocurre en el WOPI host (sección 3.3). Documentar esto explícitamente para que nadie asuma que `WOPI_ALIAS_GROUP` reemplaza la validación de aplicación.

### 3.8 Verificación proactiva de disponibilidad (obligatoria)

El chequeo de disponibilidad debe ocurrir **antes** de que el usuario vea la opción de abrir el visor, no como consecuencia de un intento fallido.

**Backend — endpoint de salud:**

```
GET /analytics/viewer/status
```

```json
{ "available": true, "checkedAt": "2026-08-22T19:10:00Z" }
```

- Internamente hace un `HEAD` (o `GET` liviano) contra `https://office.tudominio.com/hosting/discovery`, el mismo endpoint que ya se usa para validar el despliegue (sección 8 del README de Collabora).
- **Timeout agresivo:** 1–2 segundos. Si no responde en ese margen, `available: false` — nunca dejar al usuario esperando por esto.
- **Cachear el resultado** (Redis o memoria del proceso), TTL corto de 30–60 segundos. No pegarle a Collabora en cada carga de tab; un servicio caído/recuperado se refleja con ese margen de latencia, que es aceptable.
- Si el chequeo falla por timeout o error de red, tratarlo igual que `available: false` — no dejar que una excepción no controlada rompa la carga del dashboard.

**Frontend:**

- Al montar el dashboard (o al entrar a cada tab de reporte), consultar `/analytics/viewer/status`.
- Si `available: true` → mostrar ambos botones: "Ver reporte" y "Exportar Excel".
- Si `available: false` → **ocultar o deshabilitar** "Ver reporte" (con un tooltip breve, ej. "Visor no disponible en este momento") y dejar únicamente "Exportar Excel" visible y funcional.
- Esta verificación proactiva **no reemplaza** la degradación reactiva de la sección 3.6: Collabora puede caerse entre el chequeo y el clic real del usuario, así que `viewer-session` y la carga del iframe deben seguir manejando ese error puntual igual que antes.

---

## 4. Restricciones Técnicas Inviolables

1. **Sin `PutFile` en esta fase** — el documento es siempre de solo lectura.
2. **Sin almacenamiento persistente de archivos generados** — todo se regenera transitoriamente a partir de los DTOs de Fase 1/4.
3. **Doble validación de tenant** en cada request WOPI (token + coincidencia con la sesión que lo originó).
4. **Reutilizar exactamente** `buildKpiSummaryExcel`/`buildProductMatrixExcel` de Fase 4 — no crear una segunda ruta de generación de Excel.
5. **Degradación elegante en el frontend**: un fallo de Collabora nunca debe impedir la descarga tradicional del XLSX.
6. **TTL corto** en `fileId` y `access_token` (recomendado 15 minutos) — no tokens de larga duración para este flujo.
7. No modificar el comportamiento de los endpoints existentes de Fase 1/2/4.

---

## 5. Entregables Esperados

1. Endpoints `GET /wopi/files/{fileId}` y `GET /wopi/files/{fileId}/contents`.
2. Endpoints `POST /analytics/export/kpi-summary/viewer-session` y `POST /analytics/export/product-matrix/viewer-session`.
3. Endpoint `GET /analytics/viewer/status` (chequeo de disponibilidad, cacheado).
4. Servicio de resolución/caché del discovery XML de Collabora.
5. Botón "Ver reporte" + modal con iframe en las tabs correspondientes de Fase 3, condicionado al resultado de `/analytics/viewer/status`.
6. Tests:
   - `CheckFileInfo` responde `UserCanWrite: false` y datos correctos para un token válido.
   - `GetFile` devuelve un XLSX idéntico en contenido al que generaría el endpoint de exportación de Fase 4 con los mismos filtros.
   - Un token de un tenant no puede abrir/leer el archivo de otro tenant (403/404).
   - Un token expirado es rechazado.
   - `/analytics/viewer/status` devuelve `available: false` cuando Collabora no responde dentro del timeout, sin lanzar excepción.
   - El resultado de `/analytics/viewer/status` se sirve desde caché dentro del TTL (no repite la llamada a Collabora en cada request).
   - El frontend oculta/deshabilita "Ver reporte" cuando `available: false`.
   - El frontend degrada al botón de descarga normal si `viewer-session` falla pese a que el chequeo de disponibilidad haya dado `true` (caída entre medio).
7. Documentación breve del flujo completo (chequeo de disponibilidad → armado de token → iframe → llamadas WOPI).

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Desde "Resumen Ejecutivo" y "Matriz de Productos" se puede abrir el reporte embebido en modo lectura.
- [ ] `curl -I https://office.tudominio.com/hosting/discovery` sigue respondiendo 200 (no se rompió el despliegue existente).
- [ ] `/analytics/viewer/status` refleja correctamente la disponibilidad real de Collabora, cacheada con el TTL definido.
- [ ] Si Collabora no está disponible, el botón "Ver reporte" no se ofrece — el usuario nunca llega a intentarlo y fallar.
- [ ] Un usuario del tenant A no puede, bajo ninguna combinación de parámetros, visualizar el reporte de un tenant B.
- [ ] Los tokens `fileId`/`access_token` expiran y son rechazados correctamente pasado el TTL.
- [ ] No se implementó `PutFile` ni ninguna ruta de escritura.
- [ ] `npm run build` (backend y frontend) pasa.
- [ ] Tests pasan.
- [ ] La descarga tradicional de Fase 4 sigue funcionando sin cambios, con o sin disponibilidad de Collabora.

---

## 7. Fuera de Alcance (explícito)

- Edición y guardado de cambios (`PutFile`) — fase futura si se decide.
- Versionado de documentos o historial de cambios.
- Visualización de otros tipos de documento (contratos, PDFs, etc.) — esta fase es específica a los dos reportes de Fase 4.
- Colaboración simultánea multi-usuario sobre el mismo documento (no aplica en modo solo-lectura).
- Almacenamiento persistente de los archivos generados.

---

## 8. Orden de Trabajo Recomendado

1. Validar que el despliegue de Collabora responde correctamente (`/hosting/discovery`, `/hosting/capabilities`) desde el servidor de OmniFlow.
2. Implementar `/analytics/viewer/status` (chequeo de disponibilidad cacheado, sección 3.8).
3. Implementar la firma/verificación del `WopiFileToken` (sección 3.1) reutilizando `JwtService`.
4. Implementar `CheckFileInfo` y `GetFile`.
5. Implementar el servicio de resolución/caché del discovery XML.
6. Implementar los endpoints `viewer-session`.
7. Integrar el botón "Ver reporte" + iframe en Fase 3, condicionado a `/analytics/viewer/status` y con degradación elegante ante fallas posteriores.
8. Escribir tests de aislamiento multi-tenant, expiración de tokens y del chequeo de disponibilidad.
9. Probar el flujo completo end-to-end contra el Collabora ya desplegado.
10. Documentar.

---

## 9. Referencias

- Despliegue de Collabora: `/srv/collabora/README.md`, `/srv/collabora/docker-compose.yml`, `/srv/collabora/.env`
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Prompt Fase 3: `PROMPT_BI_FASE_3_FRONTEND_DASHBOARD.md` (slot de botón de exportación, sección 3.6)
- Prompt Fase 4: `PROMPT_BI_FASE_4_EXPORT_XLSX.md` (`buildKpiSummaryExcel`, `buildProductMatrixExcel`)
- Especificación WOPI: `https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/rest/` (protocolo de referencia que Collabora implementa)

---

## 10. Instrucción final

Implementa únicamente el visor Collabora de solo lectura descrito en este prompt.
Prioriza el aislamiento multi-tenant en cada llamada WOPI, la no-persistencia de archivos, y la degradación elegante del frontend por encima de cualquier optimización de UX del visor.
Al terminar, reporta: 1) endpoints WOPI creados, 2) cómo se firma y valida el `fileId`, 3) resultado de los tests de aislamiento multi-tenant, 4) captura o descripción del flujo de apertura del visor desde el dashboard.
