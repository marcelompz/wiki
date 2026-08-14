# Priorización post-Giveaways: Social Catalog y Bio-Links

**Orden recomendado:** Social Catalog → Bio-Links  
**Razón:** Social Catalog tiene menos estado y cero dependencia fuerte de Contact/Order. Bio-Links requiere definir el contrato de resolución de bloques (`product` / `booking` / `giveaway`).

---

## 1. Social Catalog (P1) — Resumen de extracción

### Modelos a mover
- `CatalogChannelConfig`
- Enum `MessagingChannel` (`WHATSAPP | TELEGRAM | INSTAGRAM | MESSENGER | CUSTOM_WEBHOOK`)

### Schema objetivo (standalone)

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/social-catalog-client"
}

datasource db {
  provider = "postgresql"
  url      = env("SOCIAL_CATALOG_DATABASE_URL") // ?schema=social_catalog
}

enum MessagingChannel {
  WHATSAPP
  TELEGRAM
  INSTAGRAM
  MESSENGER
  CUSTOM_WEBHOOK
}

model CatalogChannelConfig {
  id          String           @id @default(uuid())
  tenantId    String           // sin @relation a Tenant
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

### Notas de diseño
- **No hay FK a Product/Order.** El catálogo y el checkout siguen en Commerce Core.
- El standalone gestiona canales + deep links + webhooks de mensajería.
- Productos se obtienen por API al Core (o se cachean snapshots si se necesita offline/edge).
- `IMessagingAdapter` puede vivir en el standalone o en `packages/messaging-adapters`.
- Migración de datos: simple `INSERT INTO social_catalog.catalog_channel_configs SELECT ... FROM public...`.
- Acoplamiento actual según ROADMAP: **0 deps cross-module** → extracción limpia.

### Checklist corto
- [ ] Schema + migración
- [ ] Script de copia de datos
- [ ] Apuntar `whatsapp-catalog-standalone` / social-catalog al nuevo schema
- [ ] Quitar modelo del schema del core
- [ ] Verificar ChannelSelector + deep links + webhooks de pago

---

## 2. Bio-Links (P1) — Resumen de extracción

### Modelos a mover
- `BioLink`
- `BioLinkClick`

### Schema objetivo (standalone)

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/biolinks-client"
}

datasource db {
  provider = "postgresql"
  url      = env("BIOLINKS_DATABASE_URL") // ?schema=biolinks
}

model BioLink {
  id              String   @id @default(uuid())
  tenantId        String   @unique  // 1 bio por tenant (como hoy)
  slug            String   @unique
  title           String
  bio             String?
  avatarUrl       String?  @map("avatar_url")
  themeColor      String   @default("#3D2235") @map("theme_color")
  textColor       String   @default("#FFFFFF") @map("text_color")
  buttonStyle     String   @default("rounded") @map("button_style")
  metaPixelId     String?  @map("meta_pixel_id")
  gaMeasurementId String?  @map("ga_measurement_id")
  tiktokPixelId   String?  @map("tiktok_pixel_id")
  blocks          Json     // ver contrato abajo
  showBranding    Boolean  @default(true) @map("show_branding")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  clicks BioLinkClick[]

  @@index([tenantId])
  @@index([slug])
  @@map("bio_links")
}

model BioLinkClick {
  id        String   @id @default(uuid())
  bioLinkId String
  blockId   String?
  blockType String?
  referrer  String?
  userAgent String?
  ipHash    String?
  createdAt DateTime @default(now())

  bioLink BioLink @relation(fields: [bioLinkId], references: [id], onDelete: Cascade)

  @@index([bioLinkId])
  @@index([createdAt])
  @@map("bio_link_clicks")
}
```

### Contrato de bloques (anti-corrupción)

Los bloques **no** deben depender de modelos Prisma del Core. Estructura recomendada:

```ts
type BioBlock =
  | { id: string; type: 'header' | 'social' | 'link'; label: string; value: string; icon?: string; isActive: boolean; order: number }
  | {
      id: string;
      type: 'product' | 'booking' | 'giveaway';
      resourceType: 'product' | 'booking' | 'giveaway';
      resourceId: string;           // ID en el Core o en el módulo dueño
      label: string;
      snapshot?: {                 // opcional, para render sin latencia
        name?: string;
        price?: number;
        imageUrl?: string;
      };
      isActive: boolean;
      order: number;
    };
```

**Resolución en runtime:**
- Bloques `link` / `header` / `social` → self-contained.
- Bloques `product` / `booking` / `giveaway` → el standalone llama al Core (o al servicio dueño) con cache corto, **o** usa solo el snapshot si se acepta eventual consistency.

Esto elimina la dependencia actual con `OrdersModule` (marcada 🟡 en el ROADMAP).

### Checklist corto
- [ ] Definir y documentar contrato de `blocks` (arriba)
- [ ] Schema + migración de datos
- [ ] Adaptar admin Drag&Drop y public SPA al nuevo client
- [ ] Resolver/cachear recursos externos
- [ ] Quitar modelos del schema del core
- [ ] Verificar Fast Checkout y tracking de clicks

---

## 3. Orden de trabajo sugerido

| Orden | Módulo          | Esfuerzo estimado | Bloqueante |
|-------|-----------------|-------------------|------------|
| 1     | Giveaways       | Medio             | No         |
| 2     | Social Catalog  | Bajo               | No         |
| 3     | Bio-Links       | Medio             | Contrato de bloques |
| 4     | (Opcional) Loyalty / Bookings | Alto / Medio | Event Bus recomendable |

---

## 4. Criterio de “terminado” por módulo

- Prisma Client propio, sin modelos de Platform/Commerce.
- Datos migrados y verificados.
- Tráfico de API del módulo apuntando al standalone.
- Modelos eliminados del schema monolítico.
- Tests E2E del flujo principal en verde.
- `ModuleInstallation` sigue controlando el acceso por tenant.
