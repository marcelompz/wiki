# OrderFlow — Exploración de Patrones de Aislamiento de Datos

**Fecha:** 6 de agosto de 2026  
**Contexto:** Multi-tenancy en OrderFlow v1.16.0 (schema Prisma, middleware, modelo Tenant)

---

## 1. ¿Qué es aislamiento de datos en multi-tenancy?

Garantizar que un tenant **nunca** pueda leer, escribir o inferir datos de otro tenant — ni por bug de aplicación, ni por query mal formada, ni por acceso directo a la base.

Se evalúa en tres ejes:

| Eje | Pregunta |
|-----|----------|
| **Aislamiento lógico** | ¿El modelo de datos separa tenants? |
| **Aislamiento de enforcement** | ¿Quién garantiza el filtro: la app, la DB, o ambos? |
| **Aislamiento físico** | ¿Comparten proceso, conexión, disco, backup? |

Cuanto más abajo en el stack se enforce el aislamiento, más difícil es romperlo por error de código.

---

## 2. Los patrones clásicos (estado del arte)

### 2.1 Discriminator column (Shared DB + Shared Schema)

```
orders
─────────────
id | tenant_id | total | ...
```

- **Una** base, **un** schema, **todas** las tablas con `tenant_id`.
- El aislamiento depende de que **cada query** filtre por `tenant_id`.
- Es el patrón más barato y el más usado en SaaS early/mid-stage.

| Pros | Contras |
|------|---------|
| Costo mínimo, migraciones simples | Un `WHERE` olvidado = data leak |
| Conexión única, pool simple | Noisy neighbor (un tenant satura I/O) |
| Reporting cross-tenant fácil (super-admin) | Backups y restores son de toda la flota |
| | Compliance estricto (algunos sectores) no lo aceptan |

**Enforcement tipico:** middleware + repositorio que inyecta `tenantId`, o **Row Level Security (RLS)** en PostgreSQL.

### 2.2 Schema-per-tenant (Shared DB + Isolated Schema)

```
db: orderflow
  schema tenant_abc.orders
  schema tenant_xyz.orders
```

- Misma instancia PostgreSQL, schema distinto por tenant.
- `SET search_path TO tenant_abc` al inicio de cada request.
- Prisma lo soporta con limitaciones (un client por schema, o `$executeRaw` para cambiar path).

| Pros | Contras |
|------|---------|
| Aislamiento más fuerte que solo `tenant_id` | Migraciones × N tenants |
| `DROP SCHEMA tenant_abc CASCADE` = offboarding limpio | Connection pool más complejo |
| Extensiones/custom indexes por tenant posibles | Límite práctico de schemas (~miles, no decenas de miles) |
| | Herramientas ORM menos cómodas |

El README de OrderFlow menciona *“PostgreSQL (multi-tenant por schema)”* en la tabla de stack, pero el `schema.prisma` real es **un solo schema con `tenantId`**. Hay una discrepancia documentación ↔ implementación.

### 2.3 Database-per-tenant (Isolated DB)

```
tenant_abc → postgres://.../orderflow_abc
tenant_xyz → postgres://.../orderflow_xyz
```

- Máximo aislamiento físico y lógico.
- Connection string distinta por tenant.
- OrderFlow ya modela esto:

```prisma
isolationTier          String  @default("shared") // "shared" | "dedicated"
dedicatedDatabaseUrl   String?
dedicatedSchemaVersion String?
```

| Pros | Contras |
|------|---------|
| Aislamiento real; compliance amigable | Costo operativo alto (N bases) |
| Performance aislada | Migraciones y deploys coordinados |
| Restore de un solo tenant trivial | Connection management (pool por tenant o proxy) |
| | Observabilidad fragmentada |

Usado por OrderFlow como **tier enterprise** (`isolationTier = "dedicated"`).

### 2.4 Row Level Security (RLS) — enforcement en la DB

Patrón transversal, no alternativo a los anteriores. Se aplica sobre Shared Schema:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Al inicio del request:
SET app.tenant_id = 'uuid-del-tenant';
```

Aunque la app olvide el `WHERE tenant_id = ?`, PostgreSQL filtra igual.

| Pros | Contras |
|------|---------|
| Defensa en profundidad | Hay que setear la variable en **cada** conexión/request |
| Protege contra bugs de app y SQL crudo | Prisma + RLS requiere cuidado (pgBouncer transaction mode, etc.) |
| Auditable a nivel DB | Policies mal hechas pueden ser bypasseadas por roles superuser |

El README de OrderFlow menciona *“Row-level security + connection pooling”* como parte del aislamiento, pero **no hay evidencia en el extracto de código** de policies RLS ni de `SET app.tenant_id`. Hoy el enforcement parece ser **solo a nivel de aplicación**.

### 2.5 Híbridos modernos

| Patrón | Descripción | Quién lo usa |
|--------|-------------|--------------|
| **Shared + RLS + dedicated opcional** | Default barato; enterprise en DB propia | Muchos SaaS B2B |
| **Schema-per-tenant + pooler** | Aislamiento medio sin N clusters | Apps con cientos de tenants |
| **Cell-based / shard por grupo de tenants** | Varios “cells” shared; routing por tenant | SaaS a escala (Slack, Salesforce patterns) |
| **Citus / distributed Postgres** | Shared schema con sharding por `tenant_id` | Escala horizontal de un solo logical DB |

---

## 3. Qué hace OrderFlow hoy

### 3.1 Modelo de datos

```
┌─────────────────────────────────────────┐
│  PostgreSQL (shared por defecto)        │
│  schema: public (único)                 │
│                                         │
│  Tenant                                 │
│    isolationTier: shared | dedicated    │
│    dedicatedDatabaseUrl?                │
│    dedicatedSchemaVersion?              │
│                                         │
│  Order, Product, Contact, ...           │
│    tenantId  (FK + índices compuestos)  │
└─────────────────────────────────────────┘
```

- **Patrón dominante:** Discriminator column (`tenantId` en ~todas las tablas de negocio).
- **Patrón opcional:** Database-per-tenant para enterprise.
- **Índices:** bien pensados (`@@index([tenantId, status])`, `@@unique([tenantId, skuInterno])`, etc.).

### 3.2 Resolución de tenant (request path)

```
Request
  → TenantByHostMiddleware
      · customDomain == host  → tenant
      · subdomain == slug     → tenant
      · adjunta req.tenant + apiKey
  → ApiKeyGuard / JWT
  → @TenantPrisma()  → PrismaClient “del tenant”
  → Service (debe filtrar por tenant.id)
```

El middleware resuelve identidad. El decorator sugiere que existe (o se pretende) un client Prisma scoped. El extracto no muestra la implementación de `@TenantPrisma()` ni un pool de clients por `dedicatedDatabaseUrl`.

### 3.3 Enforcement real observado

En `OrdersService`:

```ts
const order = await prisma.order.findUnique({ where: { id: orderId }, ... });
if (!order || order.tenantId !== tenantId) {
  throw new BadRequestException('Pedido no encontrado o sin acceso');
}
```

Patrón **check-after-fetch**: se lee por `id` global y luego se valida `tenantId`. Funciona, pero:

1. Depende de disciplina humana en **cada** método.
2. Un `findMany` sin `where: { tenantId }` filtra mal en silencio.
3. El `retryPendingWebhooks()` del mismo servicio hace:

```ts
const pendingOrders = await this.prisma.order.findMany({
  where: { status: 'CONFIRMED', webhookSent: false },
  // ← sin filtro de tenant (job global; OK si es super-admin,
  //   peligroso si se reutiliza en contexto de request)
});
```

### 3.4 Documentación vs código

| Afirmación en docs | Evidencia en extracto |
|--------------------|------------------------|
| “multi-tenant por schema” | Schema único + `tenantId` |
| “Row-level security” | No hay policies ni `SET app.current_tenant` |
| `isolationTier` shared/dedicated | Campos en `Tenant` ✅ |
| “NO instanciar PrismaClient directamente” | Regla documentada; enforcement no visible |
| “NO eliminar tenantId” | Correcto y crítico |

Hay **intención** de un modelo híbrido maduro; la **implementación visible** es discriminator column + checks de aplicación + campos preparados para dedicated DB.

---

## 4. Comparativa aplicada a OrderFlow

| Criterio | Shared + tenantId (hoy) | + RLS | Schema-per-tenant | DB-per-tenant (enterprise) |
|----------|-------------------------|-------|-------------------|----------------------------|
| Costo | Bajo | Bajo+ | Medio | Alto |
| Riesgo de leak por bug de app | **Alto** | Bajo | Bajo | Muy bajo |
| Migraciones | Simples | Simples | Complejas (×N) | Complejas (×N) |
| Noisy neighbor | Sí | Sí | Parcial | No |
| Offboarding | Soft delete / anonimizar | Igual | `DROP SCHEMA` | `DROP DATABASE` |
| Compliance estricto | Débil | Mejor | Mejor | Fuerte |
| Encaje con Prisma | Excelente | Requiere disciplina | Friction | Un client por tenant |
| Encaje con OrderFlow actual | **Ya está** | Encaja bien | Choca con schema único | **Ya modelado** |

---

## 5. Riesgos concretos del diseño actual

### 5.1 Enforcement solo en aplicación
Cualquier path nuevo (`raw query`, script de migración, job BullMQ, endpoint olvidado) puede omitir el filtro. No hay red de seguridad en la DB.

### 5.2 IDs globales predecibles/enumerables
`findUnique({ where: { id } })` + check posterior: si alguien adivina/obtiene un UUID de otro tenant, el round-trip existe (aunque se rechace). Mejor: `findFirst({ where: { id, tenantId } })` siempre.

### 5.3 Jobs y procesos de fondo
Workers sin contexto de request no pasan por el middleware. Deben recibir `tenantId` explícito o iterar tenants de forma consciente. `retryPendingWebhooks` es el ejemplo.

### 5.4 Dedicated DB sin orquestación visible
Los campos existen; falta (en el extracto) el **router de conexiones**: dado un tenant, ¿qué `PrismaClient` se usa? ¿Se cachea por tenant? ¿Cómo se aplican migraciones a N bases dedicated?

### 5.5 Super-admin y cross-tenant
Reporting global, billing, soporte: necesitan bypass controlado. Sin un rol de DB separado o un modo explícito `bypassRLS`, es fácil que el bypass se filtre a código de tenant.

---

## 6. Patrones recomendados para OrderFlow (evolución)

### Fase A — Defensa en profundidad sobre shared (prioridad alta)

**1. Query scope obligatorio a nivel de repositorio**

```ts
// Nunca exponer Prisma crudo a los services de negocio
class OrderRepository {
  findById(tenantId: string, id: string) {
    return this.db.order.findFirst({
      where: { id, tenantId }, // ambos siempre
    });
  }
}
```

**2. PostgreSQL RLS**

```sql
-- Ejemplo
CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

En el interceptor NestJS, tras resolver el tenant:

```ts
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
```

`true` = es local a la transacción (compatible con poolers en modo transaction).

**3. Prohibir `PrismaClient` suelto**  
ESLint custom + code review: solo repositorios / `@TenantPrisma()`.

**4. Tests de aislamiento**  
Suite que crea 2 tenants, inserta datos, y verifica que con el token de A no se lee nada de B (incluyendo IDs directos, listados, exports, webhooks).

### Fase B — Dedicated DB operacional (prioridad media)

- Connection manager: `Map<tenantId, PrismaClient>` con TTL y límite de idle.
- Pipeline de migraciones: `prisma migrate deploy` contra cada `dedicatedDatabaseUrl` (y registro en `dedicatedSchemaVersion`).
- Provisioning script (ya existe `provision-orderflow-company.sh` en docs) como camino único de alta.
- Health checks por tenant dedicated en el Dashboard (propuesta UI previa).

### Fase C — Cell / shard cuando la escala lo pida (prioridad baja)

Cuando el shared DB tenga noisy neighbors reales:

- Agrupar tenants en “cells” (varios shared DBs).
- Routing por `tenant.cellId` o hash.
- No hace falta schema-per-tenant si RLS + cells cubren el caso.

**No recomendar schema-per-tenant** como siguiente paso para OrderFlow: el schema único ya es grande (~1600 líneas); multiplicar migraciones por tenant sin un equipo de platform dedicado suele doler más de lo que aporta, teniendo ya la vía dedicated.

---

## 7. Matriz de decisión rápida

| Situación | Patrón a usar |
|-----------|----------------|
| Tenant free / pro, volumen normal | Shared + `tenantId` + **RLS** |
| Tenant enterprise, compliance, o tráfico alto | `isolationTier = dedicated` |
| Job de sistema (webhooks, billing) | Contexto explícito por tenant o rol superuser de DB |
| Super-admin reporting | Conexión/rol sin RLS *o* policy con `app.is_superadmin` |
| Export / GDPR delete de un tenant | Shared: delete filtrado + anonimizar; Dedicated: drop DB |

---

## 8. Checklist de madurez de aislamiento

| # | Control | Estado OrderFlow (extracto) |
|---|---------|------------------------------|
| 1 | `tenantId` en todas las tablas de negocio | ✅ |
| 2 | Índices compuestos por `tenantId` | ✅ |
| 3 | Resolución de tenant por host / API key | ✅ |
| 4 | Check `order.tenantId === tenantId` en servicios | ⚠️ Parcial (disciplina manual) |
| 5 | Repositorio que **fuerza** `tenantId` en todo query | ❌ No visible |
| 6 | RLS en PostgreSQL | ❌ No visible (solo mencionado en docs) |
| 7 | Dedicated DB modelada | ✅ Campos |
| 8 | Dedicated DB operada (pool, migrate, provision) | ⚠️ Scripts mencionados, no en extracto |
| 9 | Tests automatizados de cross-tenant isolation | ❌ No visible |
| 10 | Jobs con tenant context explícito | ⚠️ `retryPendingWebhooks` global |

---

## 9. Conclusión

OrderFlow implementa el patrón **más pragmático y correcto para su etapa**: *shared database + discriminator column*, con una **vía de escape enterprise** (database-per-tenant) ya modelada en el schema.

El eslabón débil no es el modelo de datos: es el **enforcement**. Hoy la seguridad depende de que cada desarrollador recuerde filtrar por `tenantId`. Eso no escala con el equipo ni con la superficie de features (y el monolito acoplado que ya analizamos aumenta la superficie de error).

El siguiente paso de mayor valor / menor drama es:

1. **RLS en PostgreSQL** + `set_config` por request  
2. **Repositorios** que no permitan queries sin `tenantId`  
3. **Tests de aislamiento** en CI  

Con eso, el patrón shared deja de ser “esperanza” y pasa a ser “defensa en profundidad”, y el tier dedicated conserva su sentido para quien realmente lo necesita.

---

*Basado en `schema.prisma` (Tenant.isolationTier, tenantId ubicuo), `TenantByHostMiddleware`, uso de tenant en `OrdersService`, y notas de seguridad del README de OrderFlow 1.16.0.*
