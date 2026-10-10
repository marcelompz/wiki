# OmniFlow / OrderFlow — Auditoría de Migración Prisma Multi-Tier + Plan de Remediación

| Campo | Valor |
|-------|-------|
| **Proyecto** | OmniFlow (marca pública) / OrderFlow (capa técnica) |
| **Versión auditada** | `1.33.0` (tarball `orderflow_1.33.0.tar.gz`) |
| **Fecha del informe** | 2026-09-11 |
| **Alcance** | Migración `this.prisma` → `@TenantPrisma` / `TenantConnectionManager`, inconsistencias de versión, despliegues y versionamiento |
| **Estado declarado (ROADMAP)** | “Aislamiento Multi-Tenant DB 100% Completado” |
| **Estado real** | Infraestructura 100% · Business core ~85% · Residual ~15% · RLS policies no aplicadas |

---

## 1. Resumen Ejecutivo

La infraestructura de aislamiento multi-tier (shared vs dedicated DB) está **completa y bien diseñada**. Los módulos de negocio más críticos (Products, Contacts, Inventory, Loyalty, Giveaways, Biolinks) ya usan el patrón híbrido `getDb(db?)` y reciben el cliente correcto desde los controllers mediante `@TenantPrisma()`.

Sin embargo:

1. **La migración de aplicación no está al 100%.** Quedan llamadas hard a `this.prisma` en Orders (residuales), Auth, Billing, Users, Integraciones, OmniMessaging y OmniPulse.
2. **Existen inconsistencias de versión** entre `VERSION`, `backend/package.json`, `frontend/package.json` y `featurelist.json`.
3. **RLS a nivel PostgreSQL** está diseñado e implementado el interceptor, pero las policies no aparecen aplicadas en las migraciones del release.
4. El decorator `@TenantPrisma` tiene **fallback silencioso** al singleton compartido.
5. Jobs, queues y webhooks no siempre resuelven el cliente dedicado.

Este documento contiene el diagnóstico completo, el plan de remediación priorizado, las **instrucciones de versionamiento obligatorio** y el **procedimiento de despliegue** alineado con `AGENTS.md` y los scripts existentes.

---

## 2. Diagnóstico de la Migración Prisma

### 2.1 Arquitectura de resolución (estado actual)

```
Request
  → JwtAuthGuard / ApiKeyGuard
      → TenantResolutionService.resolveTenantById()
      → TenantResolutionService.resolveTenantPrisma(tenant)
          → TenantConnectionManager.getClient(tenant)
              · isolationTier === "shared"          → PrismaService (singleton)
              · isolationTier === "dedicated" + URL → PrismaClient dedicado (cache Map)
      → request.tenant + request.tenantPrisma
  → Controller @TenantPrisma() db
  → Service getDb(db) / (dbClient || this.prisma)
```


**Archivos clave:**

| Archivo | Rol |
|---------|-----|
| `backend/common/tenant-connection.manager.ts` | Pool de clientes dedicated |
| `backend/common/tenant-resolution.service.ts` | Resolución de tenant + cliente |
| `backend/common/tenant-prisma.decorator.ts` | Inyección en controllers |
| `backend/auth/jwt-auth.guard.ts` | Inyecta `tenantPrisma` en JWT |
| `backend/common/api-key.guard.ts` | Inyecta `tenantPrisma` en API Key |
| `backend/common/tenant-rls.interceptor.ts` | `set_config('app.tenant_id', ...)` |
| `backend/common/helpers/tenant-scope.helper.ts` | `scopedWhere()` estricto |

### 2.2 Progreso desde la auditoría del 2026-09-02

| Métrica | 2026-09-02 | Actual (1.33.0) |
|---------|------------|-----------------|
| Archivos con `this.prisma` (no-spec) | ~77 | ~42 |
| Módulos de negocio alto riesgo con `getDb` | Casi ninguno | Products, Contacts, Inventory, Loyalty, Giveaways, Biolinks |
| Controllers con `@TenantPrisma()` | Escasos | Orders, Products, Contacts, Giveaways, Biolinks, Customers |
| Infraestructura multi-tier | Parcial | Completa |

### 2.3 Clasificación de riesgo residual

#### 🔴 Alto — Cerrar primero

| Archivo | Problema |
|---------|----------|
| `orders/orders.service.ts` | ~7 llamadas hard a `this.prisma` (webhooks, `sendToKitchen`, algunos find/update) pese a que el resto ya acepta `dbClient` |

#### 🟡 Medio — Migrar en el siguiente sprint

- `auth/auth.service.ts`
- `billing/billing.service.ts`, `invoices.service.ts`, `subscriptions.service.ts`, `subscription-plans.service.ts`
- `users/services/users.service.ts`, `user-tenant-access.service.ts`
- `integrations/**` (odoo-webhooks, facturasend, tango, google-calendar, whatsapp, orderflow-connector)
- `modules/omnimessaging/**` (services, queue processor, webhook controller)
- `modules/omnipulse/**`

#### 🟢 Bajo / Aceptable (por ahora)

- `tenants/tenants.controller.ts`, `tenant-retention.service.ts` (plataforma)
- Guards, middleware, `TenantRlsInterceptor`, `TenantResolutionService`
- Controllers públicos de catálogo/storefront (solo lectura)

### 2.4 Problemas estructurales

1. **Fallback silencioso del decorator**  
   ```ts
   return request.tenantPrisma || request.app.get('PrismaService');
   ```
   Si el guard no resolvió el tenant, se usa la DB compartida sin error.

2. **`TenantRlsInterceptor` solo opera sobre el Prisma compartido**  
   `set_config` se ejecuta siempre contra `PrismaService`. En tenants `dedicated` las session vars se setean en la conexión incorrecta.

3. **Policies RLS no aplicadas** en el schema/migraciones del tarball. Solo existe el diseño en `docs/prompts/Implementación de RLS.md` y el interceptor.

4. **Jobs / queues / webhooks** no pasan por guards → no obtienen cliente dedicado de forma sistemática.

5. **Sin enforcement de CI** que prohíba `private readonly prisma: PrismaService` fuera de `common/` o que obligue a propagar `db`.

---

## 3. Inconsistencias de Versión Detectadas

| Artefacto | Versión encontrada | Esperada (release 1.33.0) |
|-----------|--------------------|---------------------------|
| `context/VERSION` | `1.33.0` | `1.33.0` |
| `backend/package.json` | `1.33.0` | `1.33.0` |
| `frontend/package.json` | `1.32.0` | `1.33.0` |
| `context/featurelist.json` | `1.32.0` | `1.33.0` |
| `context/README.md` | Menciona 1.27.x / 1.28.x | Actualizar a 1.33.0 |
| `context/ROADMAP.md` | Declara 1.33.0 | OK |
| Swagger (`backend/main.ts`) | Verificar en release | Debe coincidir con VERSION |

**Impacto:** Confusión en deploys, tags, CHANGELOG y sincronización con Wiki.

---

## 4. Plan de Remediación Priorizado

### Fase 0 — Alineación de versiones (inmediato, antes de cualquier deploy)

**Objetivo:** Dejar el árbol de código en estado versionado coherente `1.33.0` (o la siguiente versión de parche si se decide no releashear 1.33.0).

**Checklist obligatorio (AGENTS.md):**

```bash
# 1. Fuente de verdad
echo "1.33.0" > context/VERSION          # o 1.33.1 si se crea parche

# 2. package.json
# backend/package.json → "version": "1.33.0"
# frontend/package.json → "version": "1.33.0"

# 3. featurelist.json
# "version": "1.33.0", "last_updated": "YYYY-MM-DD"

# 4. Documentación
# - context/README.md (badge + sección de versión)
# - context/ROADMAP.md (ya alineado; verificar)
# - CHANGELOG.md (entrada 1.33.0 / 1.33.1)
# - backend/main.ts (Swagger version)
# - Cualquier *.manifest.json relevante

# 5. Tag
git add -A
git commit -m "chore(release): align versions to 1.33.0 and document Prisma isolation status"
git tag v1.33.0   # o v1.33.1
git push origin main --tags
```

**Regla de oro:** Nunca desplegar si `VERSION`, `backend/package.json` y `frontend/package.json` no coinciden.

---

### Fase 1 — Cerrar riesgo alto (Orders + Decorator)

**Duración estimada:** 0.5–1 día

1. **OrdersService**  
   - Convertir las ~7 llamadas residuales a `this.prisma` en uso de `getDb(db)` / `dbClient`.  
   - Asegurar que todos los métodos públicos que tocan datos de tenant acepten `db?: PrismaClient` (o el patrón ya usado).  
   - Verificar que `orders.controller.ts` y `public-orders.controller.ts` pasen siempre `@TenantPrisma() db`.

2. **Decorator `@TenantPrisma`**  
   - Eliminar (o restringir a super-admin) el fallback silencioso:  
     ```ts
     const client = request.tenantPrisma;
     if (!client) {
       throw new UnauthorizedException('TenantPrisma no resuelto. Guard de autenticación requerido.');
     }
     return client;
     ```
   - Alternativa segura: permitir fallback solo cuando `request.isSuperAdmin === true`.

3. **Tests de regresión**  
   - Caso shared: operaciones normales.  
   - Caso dedicated (mock de `TenantConnectionManager`): verificar que se usa el cliente del Map y no el singleton.

**Criterio de salida:** Cero `this.prisma.` hard en `orders.service.ts` para paths de negocio; decorator sin fallback silencioso.

---

### Fase 2 — Migración de riesgo medio

**Duración estimada:** 2–4 días

Orden sugerido:

1. `auth/auth.service.ts`
2. `billing/*`
3. `users/services/*`
4. Integraciones más usadas (FacturaSend, Odoo webhooks, Tango)
5. `modules/omnimessaging/*` y `modules/omnipulse/*`

**Patrón a aplicar (ya consolidado en Products/Contacts/Inventory):**

```ts
constructor(private prisma: PrismaService, /* ... */) {}

private getDb(db?: PrismaClient) {
  return db || this.prisma;
}

async someMethod(tenantId: string, /* ..., */ db?: PrismaClient) {
  const client = this.getDb(db);
  return client.model.findMany({ where: { tenantId, /* ... */ } });
}
```

En controllers:

```ts
async endpoint(@Req() req, @TenantPrisma() db: PrismaClient) {
  return this.service.someMethod(req.tenant.id, /* ..., */ db);
}
```

**Jobs / queues:** crear helper reutilizable:

```ts
// common/with-tenant-prisma.ts (ejemplo)
async function withTenantPrisma<T>(
  tenantId: string,
  resolution: TenantResolutionService,
  fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const tenant = await resolution.resolveTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  const db = await resolution.resolveTenantPrisma(tenant);
  return fn(db);
}
```

Usar en processors y webhooks.

**Criterio de salida:** Servicios de auth, billing, users e integraciones críticas aceptan y propagan `db`. Jobs usan el helper.

---

### Fase 3 — RLS real + enforcement

**Duración estimada:** 1–2 días (+ validación en staging)

1. Aplicar los SQL del diseño existente (`docs/prompts/Implementación de RLS.md` / carpeta `rls/` si existe en el repo completo):
   - Roles `orderflow_app` (sin `BYPASSRLS`) y `orderflow_migrator` (con `BYPASSRLS`).
   - Policies por `tenantId` y por FK en tablas hijas.
   - `FORCE ROW LEVEL SECURITY`.
2. Ajustar `TenantRlsInterceptor` para que, cuando el tenant sea `dedicated`, ejecute `set_config` sobre el **cliente dedicado** (`request.tenantPrisma`), no solo sobre el shared.
3. Añadir regla ESLint (o script en `scripts/init.sh`) que falle si detecta:
   - `private readonly prisma: PrismaService` en services fuera de `common/` (salvo excepciones documentadas).
   - Uso de `this.prisma.` en métodos que ya reciben `db`.
4. Test de aislamiento E2E:
   - Crear tenant `dedicated` con DB propia.
   - Ejecutar CRUD de products/orders/contacts.
   - Verificar que los datos solo existen en la DB dedicada y que un tenant shared no los ve.

**Criterio de salida:** Policies aplicadas en staging, interceptor correcto para dedicated, CI que impida regresiones.

---

### Fase 4 — Documentación y cierre de release

1. Actualizar `docs/audits/` con este informe (o enlace).
2. Actualizar ROADMAP: cambiar “100% Completado” por estado real + fecha de cierre de residuales.
3. Entrada en CHANGELOG describiendo el trabajo de aislamiento y los residuales cerrados.
4. Sincronizar Wiki (`/opt/wiki/orderflow/`) y documentación de Traefik si hubo cambios de ruteo (según AGENTS.md).

---

## 5. Protocolo de Versionamiento Correcto (obligatorio)

Basado en `AGENTS.md` v2.2.1 y la práctica del proyecto.

### 5.1 Fuente de verdad

| Archivo | Rol |
|---------|-----|
| `context/VERSION` | **Única fuente de verdad** del número de versión del release |
| `backend/package.json` | Debe coincidir exactamente |
| `frontend/package.json` | Debe coincidir exactamente |
| `context/featurelist.json` → `"version"` | Debe coincidir |
| `CHANGELOG.md` | Entrada con la misma versión |
| `context/ROADMAP.md` | Debe reflejar la versión actual |
| `backend/main.ts` (Swagger) | Debe reflejar la versión actual |
| Tag Git | `vX.Y.Z` idéntico a VERSION |

### 5.2 Cuándo incrementar

| Tipo | Cuándo | Ejemplo |
|------|--------|---------|
| **PATCH** (1.33.0 → 1.33.1) | Fixes de aislamiento, bugs, seguridad, alineación de versiones | Este plan de remediación |
| **MINOR** (1.33.x → 1.34.0) | Features nuevas (Gate Gastro, Landed Costs, etc.) | Según ROADMAP |
| **MAJOR** (→ 2.0.0) | Go-Live definitivo del ecosistema | Target Feb 2027 |

### 5.3 Checklist de release (copiar en cada entrega)

```text
[ ] 1. featurelist.json: ítems afectados → "completed" (o "in_progress" si no se cierra)
[ ] 2. context/VERSION actualizado
[ ] 3. backend/package.json y frontend/package.json alineados
[ ] 4. featurelist.json "version" + "last_updated" alineados
[ ] 5. CHANGELOG.md con entrada de la versión
[ ] 6. ROADMAP.md y README.md actualizados
[ ] 7. Swagger version en main.ts
[ ] 8. ./scripts/init.sh pasa en limpio
[ ] 9. git status limpio (o solo archivos intencionales)
[ ] 10. git commit + git tag vX.Y.Z + git push origin main --tags
[ ] 11. Sincronización Wiki / Traefik docs si aplica
[ ] 12. Autorización explícita del usuario antes de cualquier deploy
```

### 5.4 Prohibiciones (AGENTS.md)

- No condicionar lógica de negocio por `ORDERFLOW_MODE`.
- No instanciar `new PrismaClient()` fuera de `TenantConnectionManager`.
- No eliminar `tenantId` de queries/tablas.
- No desplegar sin autorización explícita del usuario.
- No dejar versiones desalineadas entre VERSION y package.json.

---

## 6. Instrucciones de Despliegue (nuevos y existentes)

### 6.1 Precondiciones (siempre)

1. **Autorización explícita** del usuario (regla 9 de AGENTS.md).  
2. Versiones alineadas (Fase 0).  
3. Working tree limpio o cambios commiteados y pusheados a `origin/main` (el script de deploy hace `git stash` + usa el remoto).  
4. Variables de entorno críticas presentes en el `.env` del target:

   ```text
   DATABASE_URL
   JWT_SECRET
   JWT_REFRESH_SECRET
   MASTER_API_KEY
   ```

   (`SecretsValidationService` aborta el arranque si faltan o son débiles.)

5. Backup de DB antes de migraciones destructivas o de aplicación de RLS.

### 6.2 Target Production (Hetzner)

```bash
# Desde la raíz del repo (máquina con acceso SSH a hetzner-orderflow)
./scripts/deploy-production.sh production
```

**Comportamiento del script (resumen):**

- Host: `hetzner-orderflow` → `/srv/orderflow`
- Compose: `docker-compose.prod.yml`
- Env: prioriza `.env`, luego `.env.production` / `.env.prod`
- Genera artefacto de rollback y backup SQL con timestamp
- Requiere las variables listadas arriba

**Post-deploy recomendado:**

```bash
# Health
curl -fsS https://<dominio>/api/v1/health   # o endpoint real de health

# Verificar versión expuesta (Swagger / endpoint de versión si existe)
# Verificar logs del backend por errores de SecretsValidation o Prisma
```

### 6.3 Target Provecchio (red local / jump)

```bash
./scripts/deploy-production.sh provecchio
```

- Path remoto: `/srv/orderflow`
- Env: `.env.prod` o `.env.provecchio` en el servidor
- Puede usar ProxyJump según conectividad

### 6.4 Despliegues que tocan aislamiento Prisma / RLS

Orden **obligatorio** cuando se aplica Fase 1–3:

1. **Staging primero** (nunca directo a production).
2. Aplicar migraciones Prisma (`prisma migrate deploy`) con el rol `orderflow_migrator` (BYPASSRLS) si se introdujeron cambios de schema.
3. Si se activan policies RLS:
   ```bash
   psql "$MIGRATE_DATABASE_URL" -f sql/002_roles_and_grants.sql
   psql "$MIGRATE_DATABASE_URL" -f sql/001_enable_rls.sql
   psql "$MIGRATE_DATABASE_URL" -f sql/003_verify_rls.sql
   ```
4. La aplicación en runtime **debe** conectar con el rol `orderflow_app` (sin BYPASSRLS).
5. Smoke test de aislamiento:
   - Tenant shared: CRUD normal.
   - Tenant dedicated: CRUD y verificar que no “ve” datos de otros tenants y que usa su connection string.
6. Solo después de green en staging → production con el mismo procedimiento + backup previo.

### 6.5 Rollback

- El script de deploy genera `deploy-artifacts/rollback-*.env` y backup SQL.
- Revertir tag/commit y re-ejecutar deploy del tag anterior.
- Si se aplicaron policies RLS y hay problema: usar el script de emergencia `999_disable_rls.sql` (solo con autorización y en ventana controlada).

### 6.6 Validación post-deploy (checklist corto)

```text
[ ] Health endpoint OK
[ ] Login JWT + API Key OK
[ ] Crear/listar producto en tenant shared
[ ] (Si hay dedicated) Crear/listar producto en tenant dedicated y confirmar aislamiento
[ ] No aparecen errores de "TenantPrisma no resuelto" ni de SecretsValidation
[ ] Versión reportada coincide con context/VERSION
```

---

## 7. Criterios de Aceptación del Plan

El plan se considera **cerrado** cuando:

1. `VERSION` = `backend/package.json` = `frontend/package.json` = `featurelist.json.version`.
2. Cero llamadas hard a `this.prisma` en paths de negocio de Orders (y resto de módulos de Fase 1–2 migrados o justificados).
3. `@TenantPrisma` no hace fallback silencioso a shared (salvo super-admin explícito).
4. Jobs/queues críticos usan resolución de cliente por tenant.
5. (Opcional pero recomendado) Policies RLS aplicadas y verificadas en staging.
6. CI o `scripts/init.sh` detecta regresiones de uso de Prisma.
7. ROADMAP y CHANGELOG reflejan el estado real.
8. Al menos un deploy a staging con el checklist de §6.6 en verde.

---

## 8. Referencias Internas

- `context/AGENTS.md` — Protocolo de harness, reglas inviolables, versionamiento y deploy
- `context/ROADMAP.md` — Matriz de madurez y plan Go-Live
- `context/featurelist.json` — Fuente de features y estados
- `docs/audits/audit-this-prisma-usage-2026-09-02.md` — Auditoría previa
- `docs/prompts/Implementación de RLS.md` — Diseño de policies y roles
- `backend/common/tenant-connection.manager.ts`
- `backend/common/tenant-prisma.decorator.ts`
- `backend/common/tenant-rls.interceptor.ts`
- `scripts/deploy-production.sh`
- `scripts/init.sh`

---

## 9. Próximos pasos sugeridos (orden de ejecución)

1. **Inmediato:** Ejecutar Fase 0 (alinear versiones) y abrir tag `v1.33.1` (o mantener 1.33.0 si se documenta solo como “status correction”).
2. **Corto plazo:** Fase 1 (Orders residuales + decorator).
3. **Siguiente sprint:** Fase 2 (auth, billing, users, integraciones, messaging).
4. **Staging:** Fase 3 (RLS + CI).
5. Actualizar este documento en `docs/audits/` y sincronizar Wiki.

---

*Informe generado a partir del análisis estático del tarball `orderflow_1.33.0.tar.gz`. No sustituye pruebas E2E en un entorno con tenants dedicated reales ni la autorización de despliegue requerida por AGENTS.md.*
