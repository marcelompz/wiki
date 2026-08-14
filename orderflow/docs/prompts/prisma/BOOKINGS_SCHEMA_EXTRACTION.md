# Bookings / Turnos — Extracción de Schema (P2)

**Estado:** Documentado / Especificado  
**Depende de:** `SCHEMA_DECOUPLING_PLAN.md`  
**Servicio objetivo:** `services/bookings-standalone/`

---

## 1. Schema Prisma Standalone

Archivo: `services/bookings-standalone/prisma/schema.prisma`

```prisma
// =============================================================================
// Bookings Standalone — Schema independiente
// No importa ni referencia modelos Prisma del monolito OrderFlow / OmniFlow.
// =============================================================================

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/bookings-client"
}

datasource db {
  provider = "postgresql"
  // Ejemplo: postgresql://user:pass@host:5432/orderflow_db?schema=bookings
  url      = env("BOOKINGS_DATABASE_URL")
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum ResourceType {
  HUMAN    // Profesional / Empleado
  PHYSICAL // Cabina, consultorio, máquina, cancha
}

enum ExceptionType {
  VACATION
  SICK_LEAVE
  HOLIDAY
  TRAINING
  CUSTOM
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

// ─────────────────────────────────────────────
// Domain
// ─────────────────────────────────────────────

/// Servicio reservable (Extensión de Producto con configuración temporal).
model Service {
  id                       String   @id @default(uuid())
  tenantId                 String   // Solo ID sin @relation
  /// ID opaco de referencia al Product del Commerce Core
  externalProductId        String?
  name                     String
  description              String?
  durationMinutes          Int      @default(60)
  bufferBeforeMinutes      Int      @default(0)
  bufferAfterMinutes       Int      @default(0)
  requiresProfessional     Boolean  @default(true)
  requiresPhysicalResource Boolean  @default(false)
  maxAdvanceDays           Int      @default(30)
  minAdvanceHours          Int      @default(2)
  isOnlineBookable         Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  bookingSlots           BookingSlot[]
  appointmentAssignments AppointmentAssignment[]

  @@index([tenantId])
  @@index([externalProductId])
  @@map("services")
}

/// Recursos asignables (Humanos o Físicos)
model Resource {
  id                String       @id @default(uuid())
  tenantId          String
  name              String
  type              ResourceType
  specialtyCategory String?
  commissionRate    Decimal?     @default(0) @db.Decimal(5, 2)
  isActive          Boolean      @default(true)
  metadata          Json?
  odooModel         String?
  odooExternalId    String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  availability                 ResourceAvailability[]
  exceptions                   ResourceException[]
  professionalAppointments     AppointmentAssignment[] @relation("AppointmentProfessional")
  physicalResourceAppointments AppointmentAssignment[] @relation("AppointmentPhysicalResource")

  @@index([tenantId])
  @@index([tenantId, type])
  @@map("resources")
}

model ResourceAvailability {
  id                 String         @id @default(uuid())
  resourceId         String
  dayOfWeek          Int?           // 0-6
  startTime          String         // "HH:MM"
  endTime            String         // "HH:MM"
  exceptionDate      DateTime?      @db.Date
  exceptionType      ExceptionType?
  exceptionStartTime String?
  exceptionEndTime   String?
  createdAt          DateTime       @default(now())

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, exceptionDate])
  @@index([resourceId])
  @@index([resourceId, dayOfWeek])
  @@map("resource_availability")
}

model ResourceException {
  id         String        @id @default(uuid())
  resourceId String
  date       DateTime      @db.Date
  type       ExceptionType
  allDay     Boolean       @default(true)
  startTime  String?
  endTime    String?
  reason     String?
  createdAt  DateTime      @default(now())

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, date])
  @@index([resourceId])
  @@map("resource_exceptions")
}

model BookingSlot {
  id            String   @id @default(uuid())
  tenantId      String
  serviceId     String
  startDatetime DateTime
  endDatetime   DateTime
  isBlocked     Boolean  @default(false)
  blockedUntil  DateTime?
  appointmentId String?  @unique
  createdAt     DateTime @default(now())

  service     Service                @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  appointment AppointmentAssignment? @relation(name: "BookingAppointment")

  @@index([tenantId])
  @@index([serviceId, startDatetime])
  @@index([isBlocked])
  @@map("booking_slots")
}

/// Turno asignado y confirmado
model AppointmentAssignment {
  id                    String            @id @default(uuid())
  tenantId              String
  /// Referencias opacas hacia la Orden/Línea del Core
  externalOrderId       String?
  externalOrderLineId   String?
  /// Referencia opaca al Cliente
  externalCustomerId    String?
  customerName          String?
  customerPhone         String?
  serviceId             String
  professionalId        String?
  physicalResourceId    String?
  scheduledStart        DateTime
  scheduledEnd          DateTime
  status                AppointmentStatus @default(SCHEDULED)
  commissionAmount      Decimal?          @default(0) @db.Decimal(15, 2)
  appointmentId         String?           @unique
  googleCalendarEventId String?
  notes                 String?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  service          Service      @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  professional     Resource?    @relation(fields: [professionalId], references: [id], onDelete: SetNull, name: "AppointmentProfessional")
  physicalResource Resource?    @relation(fields: [physicalResourceId], references: [id], onDelete: SetNull, name: "AppointmentPhysicalResource")
  booking          BookingSlot? @relation(fields: [appointmentId], references: [id], name: "BookingAppointment")

  @@index([tenantId])
  @@index([serviceId])
  @@index([professionalId])
  @@index([scheduledStart])
  @@map("appointment_assignments")
}
```

---

## 2. Variables de entorno del standalone

```env
# services/bookings-standalone/.env
BOOKINGS_DATABASE_URL=postgresql://orderflow:SECRET@postgres:5432/orderflow_db?schema=bookings
PORT=3023
NODE_ENV=production

# Auth & Core Internal
JWT_SECRET=...
API_KEY_VALIDATION_URL=http://orderflow-backend:3010/internal/tenants/validate-api-key
CORE_INTERNAL_URL=http://orderflow-backend:3010

# Integraciones
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
```

---

## 3. Anti-Corruption Layer (ACL)

1. **Sin FK a `OrderLine` ni `Customer`**:
   `AppointmentAssignment` guarda sólo `externalOrderLineId`, `externalOrderId` y `externalCustomerId` como referencias opacas de texto, además de un snapshot de `customerName` y `customerPhone` para operabilidad offline del profesional.
2. **Sin FK a `Product`**:
   `Service` utiliza `externalProductId` como referencia opaca opcional.

---

## 4. Script de migración de datos

Archivo sugerido: `services/bookings-standalone/scripts/migrate-from-core.ts`

```ts
import { PrismaClient } from '@prisma/client';

const CORE = new PrismaClient({ datasourceUrl: process.env.CORE_DATABASE_URL });
const STANDALONE = new PrismaClient({ datasourceUrl: process.env.BOOKINGS_DATABASE_URL });

async function migrate() {
  console.log('[Migrate] Copiando servicios, recursos y turnos a schema bookings...');

  const services = await CORE.service.findMany({ include: { product: true } });
  for (const s of services) {
    await STANDALONE.service.upsert({
      where: { id: s.id },
      update: { name: s.product.name, durationMinutes: s.durationMinutes },
      create: {
        id: s.id,
        tenantId: s.product.tenantId,
        externalProductId: s.productId,
        name: s.product.name,
        description: s.product.description,
        durationMinutes: s.durationMinutes,
        bufferBeforeMinutes: s.bufferBeforeMinutes,
        bufferAfterMinutes: s.bufferAfterMinutes,
        requiresProfessional: s.requiresProfessional,
        requiresPhysicalResource: s.requiresPhysicalResource,
        maxAdvanceDays: s.maxAdvanceDays,
        minAdvanceHours: s.minAdvanceHours,
        isOnlineBookable: s.isOnlineBookable,
      },
    });
  }

  const resources = await CORE.resource.findMany({ include: { availability: true, exceptions: true } });
  for (const r of resources) {
    await STANDALONE.resource.upsert({
      where: { id: r.id },
      update: { name: r.name, isActive: r.isActive },
      create: {
        id: r.id,
        tenantId: r.tenantId,
        name: r.name,
        type: r.type as any,
        specialtyCategory: r.specialtyCategory,
        commissionRate: r.commissionRate,
        isActive: r.isActive,
        metadata: r.metadata ?? undefined,
        odooModel: r.odooModel,
        odooExternalId: r.odooExternalId,
      },
    });

    for (const a of r.availability) {
      await STANDALONE.resourceAvailability.upsert({
        where: { id: a.id },
        update: { startTime: a.startTime, endTime: a.endTime },
        create: {
          id: a.id,
          resourceId: a.resourceId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          exceptionDate: a.exceptionDate,
          exceptionType: a.exceptionType as any,
          exceptionStartTime: a.exceptionStartTime,
          exceptionEndTime: a.exceptionEndTime,
        },
      });
    }
  }

  console.log('[Migrate] Migración de Bookings completada con éxito.');
}

migrate()
  .catch(console.error)
  .finally(() => Promise.all([CORE.$disconnect(), STANDALONE.$disconnect()]));
```
