# Plan de Desacoplamiento de Schema — OmniFlow / OrderFlow

**Versión del documento:** 1.0  
**Fecha:** 2026-08-13  
**Versión del producto:** v1.20.3  
**Objetivo:** Eliminar la “mochila” del schema monolítico (64 modelos / ~1750 líneas) de los módulos que pueden funcionar como productos standalone, sin romper el monolito ni el multi-tenancy existente.

---

## 1. Principios

1. **Core delgado.** El schema principal solo contiene *Platform Core* + *Commerce Core*.
2. **Bounded Context por dominio.** Cada módulo standalone tiene su propio schema Prisma (y preferiblemente su propio schema de PostgreSQL).
3. **Identidad mínima.** Los standalone solo conocen `tenantId` (string) + validación vía `auth-shared` o API interna. Nunca importan el modelo `Tenant` completo.
4. **Sin Prisma Client compartido.** Cada servicio genera su propio client.
5. **Contratos, no tablas.** Comunicación entre core y módulos = eventos + APIs internas + DTOs compartidos (nunca modelos Prisma).
6. **Migración incremental y reversible.** Dual-write / dual-read donde haga falta. Feature flags (`ModuleInstallation`) siguen en el Core.

---

## 2. Clasificación de modelos (estado actual)

### 2.1 Platform Core (permanece en monolito)

| Modelo | Notas |
|--------|-------|
| `Tenant` | Incluye isolationTier, branding, white-label, odooConnection |
| `User`, `UserTenantAccess`, `Permission`, `RolePermission`, `UserTenantPermission` | Auth & RBAC |
| `ApiKeyRotation`, `ApiKeyAuditLog` | Rotación y auditoría de keys |
| `AuditLog` | Auditoría transversal |
| `ModuleInstallation` | Feature flags por tenant |
| `Server`, `DeployInstance` | Infra de despliegue |
| `SubscriptionPlan`, `Subscription`, `Invoice`, `SubscriptionAddon`, `PaymentTransaction` | Billing SaaS |

### 2.2 Commerce Core (permanece en monolito por ahora)

| Modelo | Notas |
|--------|-------|
| `Product`, `Warehouse`, `Location`, `StockQuant`, `StockMove` | Inventario |
| `Order`, `OrderLine`, `Payment`, `CashMovement` | Pedidos y caja |
| `Contact*`, `Customer` (legacy), `Supplier` | CRM unificado |
| `Integration`, `IntegrationFieldMap`, `Tango*`, `Facturasend*`, `ElectronicDocument` | Integraciones |
| `WebhookLog`, `ImportJob`, `ExchangeRate` | Soporte |
| `RetentionRule`, `FollowUpJob` | Motor de follow-up (depende de pedidos/canales) |

### 2.3 Feature Modules (candidatos a extracción)

| Módulo | Modelos | Acoplamiento actual | Prioridad de extracción | Estado standalone runtime |
|--------|---------|---------------------|-------------------------|---------------------------|
| **Giveaways** | `Giveaway`, `GiveawayRegistration`, `GiveawayWinner` + enum | `Contact` (FK) | **P0** | ✅ Ya existe `services/giveaways-standalone/` |
| **Social Catalog** | `CatalogChannelConfig` + enum `MessagingChannel` | Bajo (principalmente config) | **P1** | ✅ `whatsapp-catalog-standalone` / Social Catalog |
| **Bio-Links** | `BioLink`, `BioLinkClick` | Bajo (bloques JSON pueden referenciar productos/pedidos) | **P1** | ✅ `biolinks-standalone` (depende de Orders 🟡) |
| **Loyalty** | `LoyaltyCard`, `LoyaltyTransaction`, `LoyaltyRule`, `PushToken` | `Customer`/`Order` | P2 | No standalone aún |
| **Bookings** | `Service`, `Resource*`, `BookingSlot`, `AppointmentAssignment` | Bajo-medio | P2 | 0 deps cross-module (ROADMAP) |
| **Quotations** | `Quotation`, `QuotationItem` | Medio | P3 | 0 deps (ROADMAP) |

---

## 3. Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (misma instancia)                 │
│  schema: public          schema: giveaways                      │
│  (Platform + Commerce)   (Giveaway, Registration, Winner,       │
│                          Participant)                           │
│                          schema: biolinks                       │
│                          schema: social_catalog                 │
│                          schema: loyalty (futuro)               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     auth-shared / JWT / API Key     ┌──────────────────┐
│  OrderFlow Core  │◄───────────────────────────────────►│ giveaways-       │
│  (NestJS)        │     Events (BullMQ / Redis)         │ standalone       │
│                  │     Internal HTTP (tenant validate) │                  │
└──────────────────┘                                     └──────────────────┘
```

**Decisión de datos (Fase 1):**  
Misma instancia PostgreSQL + **schemas lógicos separados** (`CREATE SCHEMA giveaways`).  
Más adelante se puede promover a DB completamente separada por módulo si el volumen lo justifica.

---

## 4. Estructura de repositorio objetivo

```
orderflow/
├── packages/
│   ├── auth-shared/                 # Ya existe
│   ├── contracts/                   # DTOs + eventos compartidos (nuevo)
│   └── db-platform/                 # Prisma client solo Platform+Commerce (nuevo)
├── backend/                         # Monolito (schema reducido)
│   └── prisma/
│       ├── schema.prisma            # generator + datasource + imports
│       └── models/
│           ├── platform.prisma
│           └── commerce.prisma
├── services/
│   ├── giveaways-standalone/
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Solo dominio Giveaways
│   │   ├── src/
│   │   └── Dockerfile
│   ├── social-catalog-standalone/
│   ├── biolinks-standalone/
│   └── ...
└── docs/
    └── SCHEMA_DECOUPLING_PLAN.md    # Este documento
```

---

## 5. Plan por fases

### Fase 0 — Preparación (1 sprint)

| # | Tarea | Criterio de hecho |
|---|-------|-------------------|
| 0.1 | Congelar nuevos modelos de feature en el schema monolítico | Documentado en CONTRIBUTING / AGENTS |
| 0.2 | Organizar schema monolítico en multi-file Prisma | `prisma/models/*.prisma` + build OK |
| 0.3 | Crear `packages/contracts` con eventos y DTOs base | Publicable internamente |
| 0.4 | Documentar clasificación de los 64 modelos | Este documento + diagrama |

### Fase 1 — Giveaways (P0) — detalle en §6

### Fase 2 — Social Catalog (P1)

- Extraer `CatalogChannelConfig` + enum `MessagingChannel`.
- El standalone ya existe; el objetivo es que **deje de depender del schema monolítico**.
- Los productos y pedidos siguen en Commerce Core; el catálogo solo necesita IDs + snapshot de precio/nombre cuando sea necesario (o llamada al core).

### Fase 3 — Bio-Links (P1)

- Extraer `BioLink` + `BioLinkClick`.
- Resolver la dependencia actual con OrdersModule (bloques tipo `product` / `booking` / `giveaway`):
  - Opción recomendada: bloques guardan solo `resourceType` + `resourceId` + snapshot; resolución en runtime vía API del core o eventos.
- Schema propio `biolinks`.

### Fase 4 — Loyalty / Bookings / Quotations (P2-P3)

- Mismo patrón.
- Loyalty es el más acoplado (Customer + Order) → dejarlo para después de tener Event Bus.

### Fase 5 — Event Bus + Outbox (paralelo / después de Fase 1)

- BullMQ + Redis (ya en stack).
- Patrón Outbox en el Core para `order.confirmed`, `tenant.updated`, etc.
- Los standalone consumen eventos en lugar de hacer joins cross-schema.

---

## 6. Plan detallado: Giveaways (P0)

### 6.1 Situación actual

```prisma
model Giveaway {
  tenantId    String
  tenant      Tenant @relation(...)          // ← acoplamiento
  registrations GiveawayRegistration[]
  winners       GiveawayWinner[]
}

model GiveawayRegistration {
  contactId String
  contact   Contact @relation(...)           // ← acoplamiento fuerte
  ...
}

model GiveawayWinner {
  contactId String
  contact   Contact @relation(...)           // ← acoplamiento fuerte
}
```

**Problema:** El standalone no puede generar un Prisma Client liviano ni vivir sin el modelo `Contact` / `Tenant` del monolito.

### 6.2 Modelo objetivo del standalone

```prisma
// services/giveaways-standalone/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/giveaways-client"
}

datasource db {
  provider = "postgresql"
  url      = env("GIVEAWAYS_DATABASE_URL")
  // Ejemplo: postgresql://.../orderflow_db?schema=giveaways
}

enum GiveawayStatus {
  DRAFT
  ACTIVE
  COMPLETED
}

model Giveaway {
  id          String         @id @default(uuid())
  tenantId    String         // solo ID, sin relación Prisma a Tenant
  name        String
  description String?
  prizes      Json
  background  Json?
  status      GiveawayStatus @default(ACTIVE)
  startDate   DateTime
  endDate     DateTime
  drawDate    DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  registrations GiveawayRegistration[]
  winners       GiveawayWinner[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("giveaways")
}

/// Participante local (anti-corruption). 
/// No depende del Contact del Core.
model Participant {
  id            String   @id @default(uuid())
  tenantId      String
  /// Referencia opaca al Contact del Core (si existe)
  externalContactId String?
  email         String?
  phone         String?
  name          String
  authProvider  String?  // google, facebook, manual
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  registrations GiveawayRegistration[]
  wins          GiveawayWinner[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([externalContactId])
  @@map("participants")
}

model GiveawayRegistration {
  id            String   @id @default(uuid())
  giveawayId    String
  participantId String
  utmSource     String
  authProvider  String?
  createdAt     DateTime @default(now())

  giveaway    Giveaway    @relation(fields: [giveawayId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([giveawayId, participantId])
  @@index([giveawayId])
  @@map("giveaway_registrations")
}

model GiveawayWinner {
  id            String   @id @default(uuid())
  giveawayId    String
  participantId String
  prizeName     String
  drawOrder     Int
  drawnAt       DateTime @default(now())

  giveaway    Giveaway    @relation(fields: [giveawayId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([giveawayId])
  @@map("giveaway_winners")
}
```

### 6.3 Estrategia de datos e identidad

| Concepto | En standalone | En Core |
|----------|---------------|---------|
| Tenant | Solo `tenantId` (validado con auth-shared o `GET /internal/tenants/:id`) | Modelo completo |
| Contact / Participante | Modelo `Participant` local + `externalContactId` opcional | `Contact` |
| Sincronización | Al registrarse: si viene de OAuth/Core → guardar `externalContactId` y snapshot de name/email/phone | Opcional: evento `giveaway.participant.registered` para crear/actualizar Contact |

### 6.4 Pasos de migración (Giveaways)

| Paso | Acción | Riesgo | Rollback |
|------|--------|--------|----------|
| 1 | Crear schema PostgreSQL `giveaways` | Bajo | `DROP SCHEMA` |
| 2 | Desplegar `schema.prisma` del standalone + migración inicial | Bajo | Revert migration |
| 3 | Script de migración de datos (public → giveaways) | Medio | Restaurar desde backup |
| 4 | Dual-write temporal en el monolito (opcional, 1-2 releases) | Medio | Feature flag |
| 5 | Apuntar `giveaways-standalone` a la nueva DB/schema | Bajo | Cambiar env |
| 6 | Quitar modelos Giveaway* del schema monolítico | Medio | Restaurar modelos + datos |
| 7 | Actualizar frontend admin para llamar al standalone (o BFF) | Medio | Feature flag de ruta |
| 8 | Eliminar dual-write y código legacy | Bajo | — |

**Script de migración de datos (conceptual):**

```sql
-- 1. Crear schema
CREATE SCHEMA IF NOT EXISTS giveaways;

-- 2. Crear tablas (via prisma migrate)

-- 3. Copiar giveaways
INSERT INTO giveaways.giveaways (...)
SELECT id, "tenantId", name, ... FROM public.giveaways;

-- 4. Crear participants a partir de contacts usados en registrations/winners
INSERT INTO giveaways.participants (id, "tenantId", "externalContactId", name, email, phone, ...)
SELECT DISTINCT c.id, c."tenantId", c.id, c.name, c.email, c.phone, ...
FROM public.contacts c
WHERE c.id IN (SELECT "contactId" FROM public.giveaway_registrations
               UNION
               SELECT "contactId" FROM public.giveaway_winners);

-- 5. Copiar registrations / winners mapeando contactId → participantId
```

### 6.5 Auth y multi-tenancy en el standalone

- Reutilizar `packages/auth-shared` (JWT + API Key).
- Middleware: extrae `tenantId` del token / API Key validada contra el Core (cache Redis).
- No se instancia el modelo `Tenant` de Prisma en el standalone.

### 6.6 Eventos mínimos (contracts)

```ts
// packages/contracts/src/events/giveaways.ts
export type GiveawayParticipantRegistered = {
  type: 'giveaway.participant.registered';
  tenantId: string;
  giveawayId: string;
  participant: {
    id: string;
    externalContactId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  utmSource: string;
  occurredAt: string;
};

export type GiveawayDrawn = {
  type: 'giveaway.drawn';
  tenantId: string;
  giveawayId: string;
  winners: Array<{ participantId: string; prizeName: string; drawOrder: number }>;
  occurredAt: string;
};
```

### 6.7 Criterios de aceptación (Giveaways)

- [ ] Prisma Client del standalone no contiene modelos de Platform/Commerce.
- [ ] Arranque del standalone < 2s en frío (sin cargar 64 modelos).
- [ ] Migración de datos 100% verificada (conteos + sample de IDs).
- [ ] Registro de participante funciona sin Contact del Core.
- [ ] Sorteo y listado de ganadores OK.
- [ ] Frontend admin y landing pública siguen funcionando.
- [ ] Feature flag / ModuleInstallation sigue controlando disponibilidad por tenant.
- [ ] Zero downtime en producción (o ventana de mantenimiento documentada < 5 min).

---

## 7. Priorización siguiente: Social Catalog y Bio-Links

### 7.1 Social Catalog (P1)

**Modelos a extraer:** `CatalogChannelConfig` + enum `MessagingChannel`.

**Particularidades:**
- Muy poco estado propio (principalmente configuración de canales).
- El catálogo de productos y el checkout siguen en Commerce Core.
- El standalone ya existe; el trabajo es **schema ownership** + eliminar dependencia del client monolítico.
- Strategy `IMessagingAdapter` puede vivir en el standalone o en un package compartido de adapters.

**Schema mínimo propuesto:**

```prisma
enum MessagingChannel {
  WHATSAPP
  TELEGRAM
  INSTAGRAM
  MESSENGER
  CUSTOM_WEBHOOK
}

model CatalogChannelConfig {
  id          String           @id @default(uuid())
  tenantId    String
  channel     MessagingChannel
  phoneNumber String?
  username    String?
  webhookUrl  String?
  active      Boolean          @default(true)
  isDefault   Boolean          @default(false)
  config      Json?            @default("{}")
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([tenantId])
  @@index([tenantId, channel])
  @@map("catalog_channel_configs")
}
```

**Dependencias residuales:**  
Productos y órdenes se resuelven por API al Core o por eventos. No hay FK Prisma a `Product`/`Order`.

### 7.2 Bio-Links (P1)

**Modelos a extraer:** `BioLink`, `BioLinkClick`.

**Particularidades:**
- `blocks` es JSON flexible (`link | product | booking | giveaway | header | social`).
- ROADMAP indica dependencia actual con OrdersModule (🟡).
- Estrategia anti-corrupción: los bloques guardan solo referencias (`resourceType`, `resourceId`) + snapshot opcional. La resolución de “producto actual / precio / stock” se hace en runtime contra el Core (o cache).

**Schema mínimo propuesto:** Idéntico al actual, sin relación Prisma a `Tenant` (solo `tenantId`).

**Orden recomendado tras Giveaways:**
1. Social Catalog (más simple, menos estado).
2. Bio-Links (requiere definir el contrato de resolución de bloques).

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos en migración | Backup + script idempotente + verificación de conteos + dual-write temporal |
| Downtime | Migración online (schema nuevo) + cut-over corto; o dual-write |
| Inconsistencia Contact ↔ Participant | `externalContactId` + evento de sincronización; no se elimina Contact del Core |
| Frontend roto | Feature flag de rutas / BFF que enrute al standalone |
| Aumento de latencia (llamadas inter-servicio) | Cache Redis de tenant + validación de API Key; snapshots en bloques de BioLink |
| Drift de schema entre entornos | Migraciones versionadas por servicio + CI que valide `prisma migrate` |

---

## 9. Métricas de éxito

- Schema monolítico: de ~64 modelos → ≤ 35 (Platform + Commerce).
- Tiempo de `prisma generate` del Core reducido significativamente.
- Cada standalone: ≤ 8 modelos, client propio, deploy independiente.
- Cero dependencias Prisma cross-module en Giveaways, Social Catalog y Bio-Links.
- Tiempo de arranque de cada standalone medible y < umbral acordado.

---

## 10. Próximos pasos inmediatos

1. Aprobar este plan. ✅
2. Ejecutar **Fase 0** (schema plano documentado + freeze). ✅ Completado 2026-08-13.
3. Implementar **Giveaways** según §6 (schema, migración, cut-over). 🔄 Schema standalone listo, migración de datos pendiente.
4. Continuar con **Social Catalog** y luego **Bio-Links**.

---

## 11. Estado de implementación (2026-08-13)

### Fase 0 — Completada
- Schema monolítico documentado con bounded contexts en `backend/prisma/schema.prisma`.
- Clasificación de modelos registrada en este documento.
- Schema standalone de Giveaways creado en `services/giveaways-standalone/prisma/schema.prisma`.
- Script de migración idempotente en `services/giveaways-standalone/scripts/migrate-from-core.ts`.
- Validación completa: `prisma validate` + `prisma generate` + `init.sh` (580 tests, builds limpios, E2E QA OK).

### Fase 1 — Preparada (pendiente migración de datos + cut-over)
- Schema standalone validado y cliente generado (`giveaways-client`).
- `.env.example` y configuración lista.
- Próximo paso: crear schema PostgreSQL `giveaways`, ejecutar migración y dual-write.

---

*Documento vivo. Actualizar al completar cada fase.*
