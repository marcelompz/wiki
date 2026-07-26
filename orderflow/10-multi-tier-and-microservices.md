# Arquitectura Multi-Tier y Microservicios Standalone

> Documento de referencia para la evolución arquitectónica de OrderFlow: modos de operación, aislamiento multi-tier, y extracción de módulos como microservicios.

**Última Actualización:** 2026-07-26  
**Versión de referencia:** v1.1.0+ / v1.2.0-dev  
**Estado:** ✅ **IMPLEMENTADO AL 100%** (Migración `@TenantPrisma()` completada en todos los módulos core y microservicios standalone extraídos)

---

## 1. Visión General

OrderFlow evoluciona de un monolito multi-tenant a una plataforma con tres capacidades:

```
┌─────────────────────────────────────────────────────────────────┐
│                     OrderFlow Platform                          │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  ORDERFLOW_MODE      │  │  Microservicios      │            │
│  │  = community         │  │  Standalone           │            │
│  │                      │  │                       │            │
│  │  Multi-tenant:       │  │  ┌─────────────────┐ │            │
│  │  ├── shared (DB com.)│  │  │ Giveaways       │ │            │
│  │  └── dedicated (DB  )│  │  │ WhatsApp Catalog│ │            │
│  │      propia)         │  │  │ Bio-Links       │ │            │
│  │                      │  │  │ ...             │ │            │
│  │  ORDERFLOW_MODE      │  │  └─────────────────┘ │            │
│  │  = enterprise        │  │                       │            │
│  │                      │  │  Auth compartida via  │            │
│  │  Single-tenant:      │  │  packages/auth-shared │            │
│  │  (tenantId fijo)     │  │                       │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Modos de Operación (`ORDERFLOW_MODE`)

### 2.1 Modo `community` (default)

Es el modo actual de producción. Un backend NestJS sirve N tenants.

- **Auth:** `ApiKeyGuard` resuelve tenant por JWT + `x-api-key`.
- **Multi-tier:** cada tenant tiene `isolationTier`:
  - `"shared"` → DB compartida (PrismaService singleton).
  - `"dedicated"` → DB propia (connection string en `Tenant.dedicatedDatabaseUrl`).
- **Guard inyecta:** `req.tenant`, `req.user`, `req.isSuperAdmin`, `req.tenantPrisma`.

### 2.2 Modo `enterprise` (futuro, v0.7.0+)

Instancia dedicada para un solo cliente grande.

- **Auth:** `SingleTenantGuard` reemplaza a `ApiKeyGuard`. Solo JWT, sin `x-api-key`.
- **Tenant:** un `tenantId` fijo desde `ENTERPRISE_TENANT_ID` en `.env`.
- **Mismas queries:** `where: { tenantId }` funciona porque el `tenantId` es constante.
- **Sin:** SuperAdmin, tenant switcher, `UserTenantAccess` multi-tenant.

### 2.3 Principio de diseño: no bifurcar código

```
┌─────────────────────────────────────┐
│          Services / Modules         │
│  (orders, products, bookings, etc.) │
│                                     │
│  Siempre: where: { tenantId }       │
│  Nunca:   if (mode === 'enterprise')│
└────────────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │    Guard       │
         │  (capa auth)   │
         ├───────┬───────┤
    community    │   enterprise
    ApiKeyGuard  │   SingleTenantGuard
    multi-tenant │   tenantId fijo
         └───────┴───────┘
```

La lógica de negocio **nunca** condiciona por modo. Solo la capa de auth/guard cambia.

---

## 3. Multi-Tier Isolation (modo community)

### 3.1 Schema Prisma

```prisma
model Tenant {
  // ...campos existentes...
  isolationTier          String    @default("shared")  // "shared" | "dedicated"
  dedicatedDatabaseUrl   String?   // Connection string para enterprise
  dedicatedSchemaVersion String?   // Versión del schema aplicada
}
```

### 3.2 Componentes

| Componente | Archivo | Función |
|------------|---------|---------|
| `TenantConnectionManager` | `backend/src/common/tenant-connection.manager.ts` | Pool de PrismaClients por tenant. Cachea conexiones dedicadas. |
| `@TenantPrisma()` | `backend/src/common/tenant-prisma.decorator.ts` | Param decorator: extrae PrismaClient del request. |
| `ApiKeyGuard` (modificado) | `backend/src/common/api-key.guard.ts` | Inyecta `req.tenantPrisma` después de resolver tenant. |

### 3.3 Flujo de resolución

```
Request → ApiKeyGuard
  │
  ├── Resuelve tenant (JWT o x-api-key)
  │
  ├── tenant.isolationTier === "shared"?
  │   └── req.tenantPrisma = PrismaService (singleton)
  │
  └── tenant.isolationTier === "dedicated"?
      └── req.tenantPrisma = TenantConnectionManager.getClient(tenant)
          └── Cachea PrismaClient con dedicatedDatabaseUrl
```

### 3.4 Migración gradual de services

Los services existentes usan `this.prisma` (inyectado por NestJS DI). Esto sigue funcionando para tenants `shared`.

Para soportar `dedicated`, hay dos opciones por service:

**Opción A (inmediata, sin cambios):** El service usa `this.prisma` que siempre apunta a la DB compartida. Para tenants `dedicated`, esto no funciona.

**Opción B (migración gradual):** El controller usa `@TenantPrisma()` y pasa el PrismaClient al service:

```typescript
// Controller
@Get()
async findAll(@TenantPrisma() prisma: PrismaClient, @Request() req) {
  return this.ordersService.findAll(req.tenant.id, prisma);
}

// Service
async findAll(tenantId: string, prisma?: PrismaClient) {
  const db = prisma || this.prisma;
  return db.order.findMany({ where: { tenantId } });
}
```

**Estrategia:** no se migra todo de golpe. Se migran los services que un tenant `dedicated` necesita, progresivamente.

---

## 4. Microservicios Standalone

### 4.1 Objetivo

Vender módulos individuales (Giveaways, WhatsApp Catalog, etc.) como productos SaaS independientes fuera del ecosistema OrderFlow.

### 4.2 Análisis de acoplamiento (Jul 2026)

| Módulo | Deps a `common/` | Deps cross-module | Candidato standalone |
|--------|-------------------|-------------------|---------------------|
| **Giveaways** | `PrismaService` | ❌ Ninguna | 🟢 Excelente |
| **WhatsApp Catalog** | `PrismaService` | ❌ Ninguna | 🟢 Excelente |
| **Quotations** | `PrismaService` | ❌ Ninguna | 🟢 Excelente |
| **Bookings** | `PrismaService` | ❌ Ninguna | 🟢 Excelente |
| **Bio-Links** | `PrismaService`, `RedisService` | `OrdersModule` | 🟡 Bueno (Fast Checkout opcional) |
| **Loyalty** | `PrismaService` | `AuthModule` | 🟡 Bueno |
| **POS/KDS** | Todo | `Orders`, `Products`, `WebSockets` | 🔴 Muy acoplado |

### 4.3 Estructura de un microservicio standalone

```
services/giveaways-standalone/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── prisma/
│   └── schema.prisma        # Solo: Tenant, Giveaway, GiveawayRegistration, GiveawayWinner, Contact
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── giveaways/            # Copiado de backend/src/giveaways/
│   ├── common/
│   │   ├── prisma.service.ts
│   │   └── jwt-auth.guard.ts # Usa packages/auth-shared
│   └── health/
└── README.md
```

### 4.4 Auth compartida (`packages/auth-shared`)

Paquete npm workspace que ambos (monolito + standalone) usan:

```typescript
export function validateJwt(token: string, secret: string): TenantContext
export function validateApiKey(apiKey: string, masterKey: string): TenantContext
export interface TenantContext {
  tenantId: string;
  userId?: string;
  isSuperAdmin: boolean;
}
```

### 4.5 Modelo híbrido

```
┌──────────────────────────────────────────────────────┐
│  Dentro de OrderFlow (modo community):               │
│  → Módulos gestionados por App Store / feature flags │
│  → ModuleInstallation por tenant                     │
│                                                      │
│  Fuera de OrderFlow (standalone):                    │
│  → Microservicio con su propia DB y deploy           │
│  → Auth compartida via auth-shared                   │
│  → Routing via Traefik (path o subdominio)           │
└──────────────────────────────────────────────────────┘
```

El módulo original **sigue existiendo** en el monolito para clientes OrderFlow. El standalone es una copia independiente para venta individual.

---

## 5. Infraestructura

### 5.1 Fase actual: Docker Compose (v0.5.1 → v1.0.0)

- Todo corre en Docker Compose sobre Hetzner VPS.
- Microservicios standalone se agregan como servicios adicionales en compose.
- Traefik v3.3 rutea por path o subdominio.

### 5.2 Fase futura: Kubernetes (v2.0.0+)

- Migración a K8s cuando el volumen de tenants y standalone lo justifique.
- Helm charts para OrderFlow core + cada microservicio.
- Traefik como Ingress Controller nativo.
- PostgreSQL Operator (CrunchyData/Zalando) para DB-per-tenant automático.

---

## 6. Variables de Entorno Nuevas

| Variable | Valores | Default | Descripción |
|----------|---------|---------|-------------|
| `ORDERFLOW_MODE` | `community`, `enterprise` | `community` | Modo de operación |
| `ENTERPRISE_TENANT_ID` | UUID | — | tenantId fijo en modo enterprise |

---

## 7. Reglas para Developers

1. **`tenantId` siempre presente** en queries. Nunca eliminarlo.
2. **No condicionar con `ORDERFLOW_MODE`** en services. Solo en guards/middleware.
3. **No instanciar `PrismaClient`** directamente. Usar `this.prisma` o `@TenantPrisma()`.
4. **Al crear nuevo módulo:** verificar acoplamiento cross-module. Si es 0, es candidato a standalone futuro.
5. **Al extraer standalone:** copiar a `services/`, crear schema minimal, usar `auth-shared`.
