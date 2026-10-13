# Social Catalog — Extracción de Schema (P1)

**Estado:** Documentado / Especificado  
**Depende de:** `SCHEMA_DECOUPLING_PLAN.md`  
**Servicio objetivo:** `services/whatsapp-catalog-standalone/` (ó `services/social-catalog-standalone/`)

---

## 1. Schema Prisma Standalone

Archivo: `services/whatsapp-catalog-standalone/prisma/schema.prisma`

```prisma
// =============================================================================
// Social Catalog Standalone — Schema independiente
// No importa ni referencia modelos Prisma del monolito OrderFlow / OmniFlow.
// =============================================================================

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/social-catalog-client"
}

datasource db {
  provider = "postgresql"
  // Ejemplo: postgresql://user:pass@host:5432/orderflow_db?schema=social_catalog
  url      = env("SOCIAL_CATALOG_DATABASE_URL")
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum MessagingChannel {
  WHATSAPP
  TELEGRAM
  INSTAGRAM
  MESSENGER
  CUSTOM_WEBHOOK
}

// ─────────────────────────────────────────────
// Domain
// ─────────────────────────────────────────────

/// Configuración de canales de mensajería social por tenant.
model CatalogChannelConfig {
  id          String           @id @default(uuid())
  /// Solo ID — sin @relation a Tenant del core (Anti-Corruption)
  tenantId    String
  channel     MessagingChannel
  phoneNumber String?
  username    String?
  webhookUrl  String?
  active      Boolean          @default(true)
  isDefault   Boolean          @default(false)
  /// Configuración flexible en JSON (tokens, plantillas custom, etc.)
  config      Json?            @default("{}")
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([tenantId])
  @@index([tenantId, channel])
  @@map("catalog_channel_configs")
}

/// Registro opcional de eventos/interacciones de catálogo por canal.
model CatalogChannelLog {
  id          String           @id @default(uuid())
  tenantId    String
  channel     MessagingChannel
  eventType   String           // "catalog_view", "checkout_click", "message_sent"
  recipientId String?          // Teléfono o ChatId
  payload     Json?
  createdAt   DateTime         @default(now())

  @@index([tenantId])
  @@index([tenantId, channel])
  @@index([createdAt])
  @@map("catalog_channel_logs")
}
```

---

## 2. Variables de entorno del standalone

```env
# services/whatsapp-catalog-standalone/.env
SOCIAL_CATALOG_DATABASE_URL=postgresql://orderflow:SECRET@postgres:5432/orderflow_db?schema=social_catalog
PORT=3021
NODE_ENV=production

# Auth (reutiliza auth-shared)
JWT_SECRET=...
API_KEY_VALIDATION_URL=http://orderflow-backend:3010/internal/tenants/validate-api-key
CORE_INTERNAL_URL=http://orderflow-backend:3010

# Redis (cache de tenant / eventos)
REDIS_URL=redis://:SECRET@redis:6379
```

---

## 3. Anti-Corruption Layer (ACL)

1. **Sin FK a `Product` ni `Order`**:
   El catálogo omnicanal (WhatsApp, Telegram, etc.) resuelve precios y disponibilidad llamando a la API pública del Core (`GET /api/v1/public/catalog/products`) o consumiendo eventos `product.updated`.
2. **Sin FK a `Tenant`**:
   `tenantId` es un simple `string`. La validación de vigencia del tenant y API Key se realiza con `auth-shared` y se cachea en Redis.

---

## 4. Script de migración de datos

Archivo sugerido: `services/whatsapp-catalog-standalone/scripts/migrate-from-core.ts`

```ts
import { PrismaClient } from '@prisma/client';

const CORE = new PrismaClient({ datasourceUrl: process.env.CORE_DATABASE_URL });
const STANDALONE = new PrismaClient({ datasourceUrl: process.env.SOCIAL_CATALOG_DATABASE_URL });

async function migrate() {
  console.log('[Migrate] Copiando catalog_channel_configs a schema social_catalog...');
  const configs = await CORE.catalogChannelConfig.findMany();
  
  for (const c of configs) {
    await STANDALONE.catalogChannelConfig.upsert({
      where: { id: c.id },
      update: {
        channel: c.channel,
        phoneNumber: c.phoneNumber,
        username: c.username,
        webhookUrl: c.webhookUrl,
        active: c.active,
        isDefault: c.isDefault,
        config: c.config ?? undefined,
      },
      create: {
        id: c.id,
        tenantId: c.tenantId,
        channel: c.channel,
        phoneNumber: c.phoneNumber,
        username: c.username,
        webhookUrl: c.webhookUrl,
        active: c.active,
        isDefault: c.isDefault,
        config: c.config ?? undefined,
      },
    });
  }
  console.log(`[Migrate] Migrados ${configs.length} canal(es). OK`);
}

migrate()
  .catch(console.error)
  .finally(() => Promise.all([CORE.$disconnect(), STANDALONE.$disconnect()]));
```
