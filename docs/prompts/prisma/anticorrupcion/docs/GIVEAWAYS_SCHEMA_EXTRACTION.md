# Giveaways — Extracción de Schema (P0)

**Estado:** Listo para implementar  
**Depende de:** `SCHEMA_DECOUPLING_PLAN.md`  
**Servicio objetivo:** `services/giveaways-standalone/`

---

## 1. Schema Prisma del standalone (versión final)

Archivo: `services/giveaways-standalone/prisma/schema.prisma`

```prisma
// Giveaways Standalone — Schema independiente
// No importa ni referencia modelos del monolito OrderFlow.

generator client {
  provider = "prisma-client-js"
  // Client aislado para no colisionar con el del core
  output   = "../node_modules/.prisma/giveaways-client"
}

datasource db {
  provider = "postgresql"
  // Ejemplo: postgresql://user:pass@host:5432/orderflow_db?schema=giveaways
  url      = env("GIVEAWAYS_DATABASE_URL")
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum GiveawayStatus {
  DRAFT
  ACTIVE
  COMPLETED
}

// ─────────────────────────────────────────────
// Domain
// ─────────────────────────────────────────────

model Giveaway {
  id          String         @id @default(uuid())
  tenantId    String // Solo ID — sin @relation a Tenant del core
  name        String
  description String?
  prizes      Json // [{ rank: 1, name: "iPhone 15" }, ...]
  background  Json? // { type: "color"|"image"|"video", color?, url? }
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
  @@index([endDate])
  @@map("giveaways")
}

/// Participante local (Anti-Corruption Layer).
/// Sustituye la FK directa a Contact del monolito.
model Participant {
  id                String   @id @default(uuid())
  tenantId          String
  /// ID del Contact en el Core (opcional, para trazabilidad)
  externalContactId String?
  name              String
  email             String?
  phone             String?
  authProvider      String? // google | facebook | manual
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  registrations GiveawayRegistration[]
  wins          GiveawayWinner[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([externalContactId])
  @@index([tenantId, phone])
  @@map("participants")
}

model GiveawayRegistration {
  id            String   @id @default(uuid())
  giveawayId    String
  participantId String
  utmSource     String // facebook, instagram, tiktok, whatsapp, web, ...
  authProvider  String?
  createdAt     DateTime @default(now())

  giveaway    Giveaway    @relation(fields: [giveawayId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([giveawayId, participantId])
  @@index([giveawayId])
  @@index([participantId])
  @@map("giveaway_registrations")
}

model GiveawayWinner {
  id            String   @id @default(uuid())
  giveawayId    String
  participantId String
  prizeName     String
  drawOrder     Int // 1, 2, 3...
  drawnAt       DateTime @default(now())

  giveaway    Giveaway    @relation(fields: [giveawayId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([giveawayId])
  @@index([participantId])
  @@map("giveaway_winners")
}
```

---

## 2. Variables de entorno del standalone

```env
# services/giveaways-standalone/.env
GIVEAWAYS_DATABASE_URL=postgresql://orderflow:SECRET@postgres:5432/orderflow_db?schema=giveaways
PORT=3020
NODE_ENV=production

# Auth (reutiliza auth-shared)
JWT_SECRET=...                 # mismo que el core o derivado
API_KEY_VALIDATION_URL=http://orderflow-backend:3010/internal/tenants/validate-api-key
CORE_INTERNAL_URL=http://orderflow-backend:3010

# Redis (eventos / cache de tenant)
REDIS_URL=redis://:SECRET@redis:6379
```

---

## 3. Migración de base de datos

### 3.1 Crear schema y tablas

```bash
# Desde services/giveaways-standalone
export GIVEAWAYS_DATABASE_URL="postgresql://.../orderflow_db?schema=giveaways"
npx prisma migrate dev --name init_giveaways_standalone
```

O manualmente:

```sql
CREATE SCHEMA IF NOT EXISTS giveaways;
-- luego prisma migrate deploy
```

### 3.2 Script de migración de datos (Node / SQL)

Archivo sugerido: `services/giveaways-standalone/scripts/migrate-from-core.ts`

Lógica:

1. Leer todos los `Giveaway` de `public.giveaways`.
2. Insertar en `giveaways.giveaways` (mismos IDs para zero-rewrite de URLs).
3. Recolectar todos los `contactId` usados en registrations + winners.
4. Para cada contact → crear `Participant` con:
   - `id` = mismo UUID del contact (simplifica el mapeo) **o** nuevo UUID + mapa
   - `externalContactId` = contact.id
   - name, email, phone del Contact
5. Insertar registrations y winners usando el mapeo contactId → participantId.
6. Verificación:
   ```sql
   SELECT COUNT(*) FROM public.giveaways;
   SELECT COUNT(*) FROM giveaways.giveaways;
   -- igual para registrations y winners
   ```

**Recomendación de IDs:**  
Conservar los mismos UUIDs de `Giveaway`.  
Para `Participant` usar el UUID del `Contact` original como `id` **y** como `externalContactId` la primera vez (idempotente y simple). En registros futuros se generan UUIDs nuevos.

### 3.3 Dual-write (opcional pero recomendado)

En el monolito, durante 1-2 releases:

```ts
// Pseudocódigo en Orders/Giveaways service del core
async createRegistration(...) {
  // 1. Escribir en schema public (legacy)
  const reg = await this.prisma.giveawayRegistration.create(...);

  // 2. Si feature flag GIVEAWAYS_STANDALONE_WRITE=true → también escribir en standalone
  if (process.env.GIVEAWAYS_STANDALONE_WRITE === 'true') {
    await this.giveawaysClient.registration.create({ ...mapped });
  }
  return reg;
}
```

Cut-over: el frontend / Traefik empieza a enrutar tráfico de API de giveaways al standalone. Cuando esté estable → apagar dual-write y eliminar modelos del schema del core.

---

## 4. Cambios en el Core (monolito)

1. **No borrar todavía** los modelos `Giveaway*` del schema principal hasta completar cut-over y verificación.
2. Marcar los modelos como `@deprecated` en comentarios y dejar de usarlos en código nuevo.
3. Después del cut-over estable:
   - Eliminar modelos + enum del `schema.prisma` del core.
   - Generar migración que **no** haga `DROP TABLE` si los datos ya viven en `giveaways.*` (o hacer `DROP` solo de las tablas del schema `public`).
4. Actualizar `ModuleInstallation` / feature flags: el módulo sigue existiendo; solo cambia el servicio que lo atiende.

---

## 5. Auth y resolución de tenant

```ts
// Middleware típico en el standalone
async function resolveTenant(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const bearer = req.headers.authorization;

  // 1. Validar con auth-shared o llamar al core
  const tenant = await validateAgainstCore({ apiKey, bearer });
  // tenant = { id, active, ...mínimo }

  if (!tenant?.active) throw new UnauthorizedException();
  req.tenantId = tenant.id;
  next();
}
```

Cachear el resultado de validación de API Key en Redis (TTL 60-300s) para no saturar el core.

---

## 6. Eventos a emitir (packages/contracts)

```ts
export interface GiveawayParticipantRegistered {
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
  occurredAt: string; // ISO
}

export interface GiveawayDrawn {
  type: 'giveaway.drawn';
  tenantId: string;
  giveawayId: string;
  winners: Array<{
    participantId: string;
    externalContactId?: string;
    prizeName: string;
    drawOrder: number;
  }>;
  occurredAt: string;
}
```

El Core puede suscribirse a `giveaway.participant.registered` para mantener sincronizado el `Contact` (opcional, no bloqueante).

---

## 7. Checklist de implementación

### Infra & Schema
- [ ] Crear schema PostgreSQL `giveaways`
- [ ] Añadir `schema.prisma` del standalone (este documento §1)
- [ ] Primera migración Prisma (`init_giveaways_standalone`)
- [ ] Configurar `GIVEAWAYS_DATABASE_URL` en docker-compose / secrets

### Datos
- [ ] Escribir y probar script `migrate-from-core.ts` en staging
- [ ] Verificar conteos e integridad referencial
- [ ] Backup completo antes de producción

### Código standalone
- [ ] Reemplazar cualquier `prisma.contact` / `include: { contact }` por `Participant`
- [ ] Ajustar DTOs y responses (mantener compatibilidad de API pública si es posible)
- [ ] Integrar `auth-shared`
- [ ] Emitir eventos de registro y sorteo

### Core
- [ ] Dual-write (feature flag) **o** cut-over directo en ventana corta
- [ ] Actualizar Traefik / rutas para apuntar `/api/v1/giveaways*` al standalone (o BFF)
- [ ] Tras estabilidad: eliminar modelos Giveaway* del schema del core

### Frontend
- [ ] Confirmar que admin y landing pública siguen funcionando (mismo contrato de API o adapter)
- [ ] Feature flag de frontend si hay cambio de base URL

### QA
- [ ] Registro de participante (manual + OAuth)
- [ ] Impedir doble registro
- [ ] Sorteo y listado de ganadores
- [ ] Multi-tenant isolation (tenant A no ve datos de B)
- [ ] ModuleInstallation desactiva el módulo correctamente
- [ ] Carga / k6 smoke

---

## 8. Orden de despliegue recomendado

1. Staging: schema + migración de datos + dual-write o cut-over.
2. Validación E2E + conteos.
3. Producción: backup → schema → migración de datos → cut-over de tráfico → monitoreo 24-48h.
4. Eliminar dual-write y modelos del core en el siguiente release.

---

## 9. Siguiente después de Giveaways

1. **Social Catalog** — extracción de `CatalogChannelConfig` (más simple).
2. **Bio-Links** — extracción de `BioLink` + `BioLinkClick` + contrato de resolución de bloques.

Ver `SCHEMA_DECOUPLING_PLAN.md` §7.
