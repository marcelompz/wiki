# OmniCRM — Integración Selectiva de cal.diy como Feature Granular

> **Proyecto:** OrderFlow / OmniFlow → OmniCRM  
> **Fuente:** `/opt/cal.diy` (Cal.com community fork, MIT)  
> **Versión Baseline:** v1.35.0  
> **Fecha:** 2026-09-21  
> **Área:** Scheduling engine, disponibilidad avanzada, integraciones calendar/video/payment, webhooks

---

## 1. Índice

1. [Visión Ejecutiva](#1-visión-ejecutiva)
2. [Alcance Selectivo](#2-alcance-selectivo)
3. [Arquitectura de Integración](#3-arquitectura-de-integración)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Fases de Implementación](#5-fases-de-implementación)
6. [Dependencias y Riesgos](#6-dependencias-y-riesgos)
7. [Checklist de Validación](#7-checklist-de-validación)

---

## 2. Visión Ejecutiva

cal.diy es una plataforma de scheduling open-source madura (fork de Cal.com) con un motor de disponibilidad, calendar sync, video conferencing y 70+ integraciones. **No se incorpora como reemplazo** del módulo `bookings` existente de OmniFlow, sino como **feature granular multi-tenant** que enriquece el core.

El objetivo es extraer el **motor de scheduling/availability** de cal.diy y reimplementarlo como un **servicio core reutilizable** por:
- **Bookings** (`backend/src/bookings/`) — disponibilidad doble, slots, bloqueos.
- **OmniCRM** (`backend/src/customers/`, `backend/src/follow-up/`) — programación de seguimientos, recordatorios, reglas de retención.
- **HR / Attendance** (`backend/src/hr/`) — turnos laborales, disponibilidad de empleados, marcaciones.
- **POS / KDS** (`backend/src/pos/`, `backend/src/kds/`) — disponibilidad de mesas, estaciones de cocina, comanderas.
- **Cualquier módulo futuro** que necesite lógica de scheduling.

Este servicio se implementa como **módulo NestJS independiente** (`backend/src/scheduling/`) con:
- Multi-tenant por `tenantId`.
- Interfaz pública clara (`ISchedulingService`).
- Sin dependencias de bookings ni de ningún módulo de negocio concreto.
- Eventos de dominio propios (`scheduling.slot.created`, `scheduling.slot.blocked`, etc.) para integración con el `EventBus` y webhooks.

---

## 3. Alcance Selectivo

### 3.1 Fuera de alcance (No se toca)
- Módulo `bookings` actual (`backend/src/bookings/`) — se mantiene intacto.
- Modelo `Service`, `BookingSlot`, `AppointmentAssignment`, `Resource`, `ResourceAvailability`, `ResourceException` — se conservan.
- Integraciones existentes: Google Calendar, WhatsApp, Follow-Up.
- POS, KDS, Inventory, Products, Orders — no se modifican directamente.

### 3.2 Dentro de alcance (Extracción selectiva)
| Componente cal.diy | Destino OmniFlow | Formato |
|-------------------|-----------------|---------|
| `packages/features/availability/` | `backend/src/scheduling/` | Módulo NestJS core |
| `packages/features/schedules/` | `backend/src/scheduling/` | Módulo NestJS core |
| `packages/features/busyTimes/` | `backend/src/scheduling/` | Módulo NestJS core |
| `packages/app-store/googlecalendar/` | `backend/src/integrations/calendar/` | NestJS Provider |
| `packages/app-store/zoomvideo/` | `backend/src/integrations/video/` | NestJS Provider |
| `packages/app-store/stripepayment/` | `backend/src/billing/gateways/` | NestJS Provider |
| `packages/features/webhooks/` | `backend/src/webhooks/` | Servicio existente (enriquecer) |
| `packages/emails/` | `backend/src/notifications/` | Servicio (reutilizar templates) |

### 3.3 Principios de extracción
1. **Sin reescritura total**: portar lógica pura, no el framework lock-in (Next.js/tRPC).
2. **Sin merge de schemas**: las tablas de OmniFlow se mantienen; se pueden agregar columnas sueltas si hacen falta.
3. **Multi-tenant first**: todo código nuevo filtra por `tenantId` desde el primer query.
4. **Interfaces propias**: definir `ISchedulingService`, `ICalendarService`, `IVideoService`, `IPaymentService` en OmniFlow, no importar tipos de cal.diy.
5. **Framework-agnostic core**: la lógica de scheduling no depende de NestJS; se puede testear y reutilizar desde cualquier módulo.

---

## 4. Arquitectura de Integración

```
/opt/orderflow/
├── backend/src/
│   ├── scheduling/                       # NUEVO — Feature granular core
│   │   ├── scheduling.module.ts
│   │   ├── scheduling.service.ts         # ISchedulingService
│   │   ├── interfaces/
│   │   │   ├── schedule.interface.ts
│   │   │   ├── availability.interface.ts
│   │   │   └── booking.interface.ts
│   │   ├── engines/
│   │   │   ├── availability.engine.ts    # Lógica pura de slots
│   │   │   ├── busy-times.engine.ts      # Overlay de calendarios
│   │   │   └── recurrence.engine.ts      # RRULE simplificada
│   │   ├── dto/
│   │   │   ├── get-slots.dto.ts
│   │   │   ├── check-availability.dto.ts
│   │   │   └── create-schedule.dto.ts
│   │   └── __tests__/
│   │       ├── availability.engine.spec.ts
│   │       └── scheduling.service.spec.ts
│   ├── integrations/
│   │   ├── calendar/                     # NUEVO — Adaptadores de calendar
│   │   │   ├── calendar.module.ts
│   │   │   ├── providers/
│   │   │   │   ├── google-calendar.provider.ts
│   │   │   │   ├── office365-calendar.provider.ts
│   │   │   │   └── caldav-calendar.provider.ts
│   │   │   └── interfaces/
│   │   │       └── calendar-service.interface.ts
│   │   └── video/                        # NUEVO — Adaptadores de video
│   │       ├── video.module.ts
│   │       ├── providers/
│   │       │   ├── daily.provider.ts
│   │       │   ├── zoom.provider.ts
│   │       │   └── teams.provider.ts
│   │       └── interfaces/
│   │           └── video-service.interface.ts
│   ├── bookings/                         # EXISTENTE — Se enriquece
│   │   ├── services/
│   │   │   ├── bookings.service.ts       # Ahora consume ISchedulingService
│   │   │   └── bookings-cache.service.ts
│   │   └── dto/
│   │       └── create-booking.dto.ts
│   ├── customers/                        # EXISTENTE — Consume scheduling
│   │   └── services/
│   │       └── customers.service.ts      # Programar seguimientos
│   ├── follow-up/                        # EXISTENTE — Consume scheduling
│   │   └── follow-up.service.ts          # Calcular ventanas de envío
│   ├── hr/                               # EXISTENTE — Consume scheduling
│   │   └── services/
│   │       └── attendance.service.ts     # Disponibilidad de empleados
│   └── pos/                              # EXISTENTE — Consume scheduling
│       └── services/
│           └── gastro-pos.service.ts     # Disponibilidad de mesas/estaciones
```

---

## 5. Modelo de Datos

### 5.1 Cambios menores en Prisma schema
Se agregan columnas a tablas existentes **sin crear tablas nuevas**:

```prisma
// En model AppointmentAssignment (schema.prisma existente)
model AppointmentAssignment {
  // ... campos existentes ...
  calendarEventId         String?   // ID del evento en calendar externo
  videoMeetingId          String?   // ID del meeting en video (Daily/Zoom)
  videoMeetingUrl         String?   // URL de join
  selectedCalendarId      String?   // FK a SelectedCalendar (si se crea)
  // ...
}

// En model Service (schema.prisma existente)
model Service {
  // ... campos existentes ...
  schedulingType          String?   @default("INDIVIDUAL") // INDIVIDUAL | COLLECTIVE | ROUND_ROBIN | SEATS
  seatsPerTimeSlot        Int?      @default(1)
  // ...
}

// En model Resource (schema.prisma existente)
model Resource {
  // ... campos existentes ...
  availabilityType        String?   @default("RECURRING") // RECURRING | SPECIFIC_DATES | HYBRID
  // ...
}

// Nuevo modelo: SelectedCalendar (si se justifica)
model SelectedCalendar {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String?  // null = calendar del tenant/evento
  serviceId     String?  // null = calendar del usuario
  credentialId  String?  // referencia a integración
  isPrimary     Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([tenantId])
  @@map("selected_calendars")
}
```

### 5.2 No se crean tablas de: User, Team, Membership, Profile, Host, HostGroup, BookingAudit, PlatformOAuthClient, DelegationCredential, etc. Esas son de cal.diy y no aplican al modelo OmniFlow.

---

## 6. Fases de Implementación

### Fase 1: Feature Granular ISchedulingService (FEAT-095)
**Objetivo:** Extraer el motor de disponibilidad como servicio core reutilizable.

**Entregables:**
- `SchedulingService` con interfaz pública:
  ```typescript
  interface ISchedulingService {
    getSlots(tenantId: string, request: GetSlotsRequest): Promise<Slot[]>;
    checkAvailability(tenantId: string, request: CheckAvailabilityRequest): Promise<AvailabilityResult>;
    blockSlots(tenantId: string, slotIds: string[], durationMinutes: number): Promise<BlockResult>;
    releaseSlots(tenantId: string, slotIds: string[]): Promise<void>;
    getBusyTimes(tenantId: string, resourceId: string, dateRange: DateRange): Promise<TimeRange[]>;
  }
  ```
- Motor de lógica pura (`engines/availability.engine.ts`) sin dependencias de NestJS.
- Soporte para:
  - Buffers (`bufferBeforeMinutes`, `bufferAfterMinutes`).
  - Excepciones (`ResourceException`: HOLIDAY, VACATION, etc.).
  - Disponibilidad base (`ResourceAvailability`).
  - Cache Redis opcional.
- Eventos de dominio: `scheduling.slots.calculated`, `scheduling.slot.blocked`, `scheduling.slot.released`.

**Consumidores iniciales:**
- `bookings` — `getAvailability` delega a `ISchedulingService`.
- `customers` — Programar seguimientos en ventanas disponibles.
- `follow-up` — Calcular ventanas de envío sin conflictos.

**Dependencias:** Ninguna (puede arrancar ya).

**Roadmap milestone:** v1.36.0

---

### Fase 2: Calendar Sync Providers (FEAT-096)
**Objetivo:** Sincronización bidireccional con Google Calendar, Office 365, CalDAV.

**Entregables:**
- Interfaz `ICalendarService` con métodos: `createEvent`, `updateEvent`, `deleteEvent`, `listEvents`.
- Providers: `GoogleCalendarProvider`, `Office365Provider`, `CalDAVProvider`.
- Modelo `SelectedCalendar` en Prisma.
- `SchedulingService` incorpora overlay de busy-time desde calendarios externos.
- Eventos de dominio: `scheduling.calendar.synced`, `scheduling.calendar.error`.

**Consumidores:**
- `bookings` — Sincronizar `AppointmentAssignment` con Google Calendar.
- `hr` — Sincronizar turnos laborales con calendario del empleado.
- `customers` — Sincronizar recordatorios de follow-up.

**Dependencias:** Fase 1 completada.

**Roadmap milestone:** v1.37.0

---

### Fase 3: Video Conferencing Providers (FEAT-097)
**Objetivo:** Crear meetings en Daily, Zoom, Teams al confirmar scheduling.

**Entregables:**
- Interfaz `IVideoService` con métodos: `createMeeting`, `updateMeeting`, `deleteMeeting`, `getJoinUrl`.
- Providers: `DailyProvider`, `ZoomProvider`, `TeamsProvider`.
- `SchedulingService` extiende `getSlots` con `createVideoMeeting` opcional.
- Eventos de dominio: `scheduling.video.created`, `scheduling.video.updated`.

**Consumidores:**
- `bookings` — Crear meeting al confirmar turno.
- `customers` — Crear meeting para sesiones virtuales VIP.

**Dependencias:** Fase 1 (para no mezclar responsabilidades).

**Roadmap milestone:** v1.38.0

---

### Fase 4: Recurrencia y Reglas de Scheduling (FEAT-098)
**Objetivo:** Soporte para eventos recurrentes y reglas de negocio avanzadas.

**Entregables:**
- Motor de recurrencia simplificada (RRULE básico: DAILY, WEEKLY, MONTHLY).
- Validación de `minAdvanceHours`, `maxAdvanceDays`.
- Límites de booking por usuario/tenant.
- Soporte a `schedulingType`: INDIVIDUAL, COLLECTIVE, ROUND_ROBIN, SEATS.
- Eventos de dominio: `scheduling.recurrence.created`, `scheduling.booking.limit.reached`.

**Consumidores:**
- `bookings` — Eventos recurrentes (clases, terapias).
- `hr` — Turnos rotativos semanales.
- `customers` — Programación de visitas recurrentes VIP.

**Dependencias:** Fase 1 completada.

**Roadmap milestone:** v1.39.0

---

### Fase 5: Webhooks Enriquecidos (FEAT-099)
**Objetivo:** Ampliar el sistema de webhooks existente con eventos de scheduling.

**Entregables:**
- Eventos nuevos: `scheduling.slot.available`, `scheduling.slot.booked`, `scheduling.slot.cancelled`, `scheduling.calendar.synced`, `scheduling.video.created`.
- Reutilizar `WebhookService` y `webhook-queue.producer.ts` existentes.
- DTO `SchedulingWebhookEventDto` para estandarizar payload.

**Dependencias:** Fases 1-4 (para tener eventos que webhookear).

**Roadmap milestone:** v1.40.0

---

### Fase 6: Payment Adapter (FEAT-100)
**Objetivo:** Abstraer pagos para soportar Stripe, Mercado Pago, Pagopar.

**Entregables:**
- Interfaz `IPaymentService` con métodos: `createPaymentIntent`, `capturePayment`, `refundPayment`, `getStatus`.
- Reutilizar lógica existente en `backend/src/billing/`.
- No portar el schema de `Payment` de cal.diy; usar el existente de OmniFlow.

**Dependencias:** Fase 2 (calendario) no bloquea; puede ir en paralelo.

**Roadmap milestone:** v1.41.0

---

## 7. Dependencias y Riesgos

### 7.1 Dependencias externas
| Componente | Riesgo | Mitigación |
|-----------|--------|-----------|
| Google Calendar API | Rate limits, OAuth tokens | Usar refresh tokens + cache de credenciales. |
| Zoom API | Cambios en endpoints v2 | Fijar versión de API en config. |
| Daily.co | Dependencia externa | Proveer fallback a "sin video". |
| Stripe | Webhooks duplicados | Verificar `idempotency_key` antes de procesar. |

### 7.2 Riesgos internos
| Riesgo | Mitigación |
|--------|-----------|
| Acoplamiento entre módulos | Definir interfaces estrictas; usar inyección de dependencias de NestJS. |
| Schema drift | Agregar columnas sueltas, nunca tablas de cal.diy completas. |
| Performance en `getSlots` con muchos recursos | Mantener cache Redis + índices en `resourceId`, `serviceId`, `startDatetime`. |
| Multi-tenant leakage | Aplicar `tenantId` en todos los queries nuevos; revisión de código obligatoria. |
| Over-engineering | Empezar por Fase 1 con lo mínimo viable; no implementar Fases 3-6 hasta needing. |

---

## 8. Checklist de Validación

- [ ] `prisma validate` pasa sin warnings.
- [ ] `prisma generate` exitoso.
- [ ] Tests unitarios de `SchedulingService` > 90% coverage.
- [ ] Tests de integración de calendar/video providers con mocks.
- [ ] `bookings.service.ts` no pierde cobertura existente.
- [ ] `customers.service.ts` puede consumir `ISchedulingService`.
- [ ] `follow-up.service.ts` puede consumir `ISchedulingService`.
- [ ] E2E: `/admin/bookings` carga sin 404.
- [ ] E2E: crear booking genera evento en Google Calendar (si está conectado).
- [ ] E2E: crear booking genera link de video (si está configurado).
- [ ] Webhook de `scheduling.slot.booked` llega al endpoint configurado.
- [ ] Cache Redis de disponibilidad sigue funcionando.
- [ ] No se eliminó `tenantId` de ninguna query.
- [ ] No se usó `if (mode === 'enterprise')` en services nuevos.
- [ ] Documentación sincronizada en `/opt/wiki/orderflow/docs/plans/omnicrm/`.

---

## 9. Referencias

- `/opt/cal.diy` — Código fuente de referencia (read-only).
- `/opt/orderflow/backend/src/bookings/` — Módulo existente.
- `/opt/orderflow/backend/prisma/schema.prisma` — Schema actual.
- `/opt/orderflow/docs/plans/omnicrm/ROADMAP_OMNICRM.md` — Roadmap existente.
+ `/opt/orderflow/docs/plans/scheduling/ROADMAP_SCHEDULING.md` — Roadmap de la vertical Scheduling.
- `/opt/orderflow/AGENTS.md` — Protocolo de actuación y convenciones.
- `/opt/orderflow/docs/plans/omnicrm/PLAN_MAESTRO_CALDIY_INTEGRATION.md` — Este plan.

---

## 10. Historial de Cambios

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-09-21 | 1.0.0 | Plan inicial. Feature granular reutilizable definida. |
