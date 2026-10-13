# Prompt de Implementación — FEAT-071: OmniBI Analytics Hub (Ingesta Histórica)

> Copiar este documento completo como instrucción inicial para el agente/desarrollador que implemente FEAT-071. Referencia obligatoria: `docs/planes/OMNIBI_HISTORICAL_INGESTION_PLAN.md` (versión corregida) y `context/AGENTS.md`.

---

## 0. Antes de escribir código

1. Leer `docs/00-contexto-agentes.md` (Regla 1 de `AGENTS.md` — primer paso obligatorio).
2. Leer `docs/planes/OMNIBI_HISTORICAL_INGESTION_PLAN.md` completo. Es la especificación de esta tarea; no reinterpretar decisiones ya tomadas ahí (standalone, aislamiento por `tenantId`, idempotencia).
3. Confirmar en `context/featurelist.json` que `FEAT-071` sigue en estado `in_progress` y tomarla (no crear una feature nueva).
4. Consultar `docs/troubleshooting/README.md` por síntomas relacionados a Odoo/XML-RPC antes de investigar cualquier error de conexión desde cero (Regla 2.1 de `AGENTS.md`).

---

## 1. Rol Líder / Planificador

- Confirmar que no existe ya `services/omnibi-standalone/` en el repo (si existe, esta tarea es de continuación, no de creación desde cero — ajustar el resto del prompt en consecuencia).
- Trazar el plan de las 5 etapas de la §4 del plan de ingesta, sin modificar código de negocio en esta fase.
- Verificar que ningún otro módulo del monorepo (`backend/schema.prisma`) referencia ya modelos `BI_*` — si existen, hay que decidir si se migran al schema standalone o se elimina la duplicación antes de avanzar.

## 2. Rol Implementador

Ejecutar en este orden. Cada paso debe respetar las Reglas Inviolables de `AGENTS.md` (`tenantId` en toda tabla/query, sin `new PrismaClient()` directo salvo el manager designado, sin lógica condicionada por `ORDERFLOW_MODE` en services, cero Nginx, solo Traefik).

### 2.1 Scaffolding del servicio standalone
- Crear `services/omnibi-standalone/` calcando la estructura de `services/giveaways-standalone/` (`Dockerfile`, `docker-compose.yml`, `jest.config.js`, `package.json`, `tsconfig.json`, `prisma/`, `src/`, `test/`).
- `prisma/schema.prisma`: generar client aislado (`output = "../node_modules/.prisma/omnibi-client"`), `datasource` apuntando a `OMNIBI_DATABASE_URL`.
- Modelos: `BiContactsHistory`, `BiSalesHistory`, `BiPurchasesHistory`, `BiBomHistory`, `BiSyncCheckpoint` — **todos con `tenantId String` indexado**, sin excepción. Clave única compuesta `(tenantId, sourceModel, sourceId)` en cada tabla de histórico para soportar upsert.

### 2.2 Extractor histórico Odoo 14
- `services/omnibi-standalone/src/extractors/odoo-historical-extractor.ts`.
- Conexión XML-RPC read-only a Odoo 14 (host/puerto configurables por env, no hardcodeados — el plan menciona puerto 8081 para Provecchio, pero otros tenants tendrán otro host).
- Firma de la función principal debe exigir `tenantId` como parámetro obligatorio (sin valor por defecto) — falla explícita si no se provee.
- Paginación configurable (tamaño de página por env, default conservador, p. ej. 200 registros).
- Modo incremental: leer `BiSyncCheckpoint` por `(tenantId, sourceModel)`, filtrar por `write_date >` el último checkpoint; si no hay checkpoint previo, correr dump completo.
- Al finalizar cada página exitosa, actualizar el checkpoint (no esperar a que termine todo el dump — así una corrida interrumpida no pierde el progreso ya hecho).
- Logging estructurado de errores por página (no abortar todo el proceso por un fallo puntual de red; reintentar la página con backoff antes de marcar el checkpoint como fallido).

### 2.3 Backend BI Engine
- `services/omnibi-standalone/src/bi/` — módulo NestJS con endpoints de consulta (comparativo YoY, evolución de costos, LTV de contactos), todos con guard de `tenantId` obligatorio en cada query (usar `this.prisma`, nunca instanciar `PrismaClient` directo).
- Autenticación: reutilizar `@orderflow/auth-shared` (mismo paquete que ya usan los otros standalone).

### 2.4 Frontend
- `frontend/pages/admin/bi.tsx` (confirmar convención de carpeta exacta mirando cómo están montadas las demás páginas admin standalone, p. ej. `frontend/giveaways-admin.tsx`, antes de asumir una ruta).
- Selector de rango temporal + selector de fuente (Odoo 14 Legacy / Odoo 18 Live / OmniFlow POS).
- Consumir la API del servicio standalone (no la del backend core).

### 2.5 Documentación y sincronización
- Agregar `omnibi-standalone` a `docs/guides/ROADMAP_MICROSERVICES.md` (Regla 6, obligatoria).
- Actualizar `context/featurelist.json`: mover `FEAT-071` a `completed` **solo** cuando el paso 3 (Revisor) pase, y solo entonces — no antes. Corregir el campo `assigned_module` a las rutas reales usadas (no dejar `backend/src/bi/` si terminó en `services/omnibi-standalone/`).
- Agregar entrada nueva en `docs/guides/CHANGELOG.md` para la versión que corresponda, con el detalle real de lo entregado (no agrupar con otras features si esta se entrega en una versión distinta — ya se detectó en auditorías previas que agrupar entregas hace perder trazabilidad).
- Sincronizar `docs/00-contexto-agentes.md` si cambia el conteo de microservicios standalone activos.

## 3. Rol Revisor / Auditor

- Pedir confirmación explícita al usuario antes de correr `./scripts/init.sh` (Regla 3 de `AGENTS.md` — consume CPU/RAM alto).
- Verificar además, específicamente para esta feature:
  - Ninguna query a las tablas `Bi*History` corre sin filtro de `tenantId`.
  - Correr el extractor dos veces seguidas sobre el mismo tenant no duplica filas (probar upsert).
  - El extractor falla de forma clara y explícita si se invoca sin `tenantId`.
  - `git status` limpio antes de cualquier despliegue (Regla 3.1) y cambios commiteados/pusheados a `origin/main`.
- Sincronizar versión en `VERSION`, `CHANGELOG.md`, `docs/ROADMAP.md`, `context/ROADMAP.md`, `docs/timeline.md`, `README.md`/`context/README.md`, `backend/main.ts` (Swagger), `package.json` de los paquetes tocados y `featurelist.json` — **en el mismo paso**, no en commits separados (causa raíz de las 15 incoherencias detectadas en auditorías previas de este proyecto).
- Tag de versión (`git tag vX.Y.Z && git push --tags`) y sync a Wiki oficial (`/opt/wiki/orderflow/`) según Regla 7.

---

## 4. Criterios de aceptación (Definition of Done)

- [ ] `services/omnibi-standalone/` existe, builda y sus tests unitarios pasan.
- [ ] Las 5 tablas de §3 del plan existen en el schema standalone, todas con `tenantId` indexado.
- [ ] El extractor corre en modo dump completo e incremental, es idempotente, y rechaza correr sin `tenantId`.
- [ ] `/admin/bi` renderiza y consume la API del servicio standalone (verificado en la suite E2E de `init.sh`).
- [ ] `docs/guides/ROADMAP_MICROSERVICES.md` incluye a OmniBI.
- [ ] `featurelist.json` refleja `FEAT-071` como `completed` con `assigned_module` actualizado a rutas reales.
- [ ] Versión sincronizada en los 8 archivos listados en el rol Revisor, en el mismo commit.
