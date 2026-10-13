# 02 – Contrato de Eventos (vía BullMQ)

Reemplaza al documento original que asumía Kafka/RabbitMQ/EventBridge
como bus de eventos. El **payload y el envelope no cambian** — solo
el transporte, que pasa a ser Redis/BullMQ, el mismo motor async
que ya usa OmniFlow.

---

## 1. Colas

Dos colas, sentido único cada una (evita ambigüedad sobre quién
produce/consume):

| Cola | Productor | Consumidor | Contenido |
|------|-----------|------------|-----------|
| `eventops-inbound` | OmniFlow (core) | eventops-standalone | Eventos que el core empuja hacia EventOps (`omniflow.*`) |
| `eventops-outbound` | eventops-standalone | OmniFlow (core) | Eventos que EventOps empuja hacia el core (`eventops.*`) |

Ambas viven en el mismo Redis compartido (`REDIS_URL`) que ya usa
BullMQ en el resto del ecosistema — no hay Redis nuevo que levantar.

---

## 2. Envelope (sin cambios respecto al diseño original)

El envelope se mantiene idéntico y viaja como `data` del job de BullMQ:

```typescript
interface EventEnvelope<T> {
  event_id: string;        // UUID v4 — se usa también como jobId (idempotencia)
  event_type: string;      // ej: "eventops.material.checked_out"
  event_version: string;   // "1.0"
  occurred_at: string;     // ISO 8601
  producer: 'omniflow' | 'eventops';
  tenant_id: string;       // NUEVO — obligatorio, ver ajuste de multi-tenancy
  correlation_id: string;
  causation_id?: string;
  payload: T;
}
```

**Cambio respecto al original:** se agrega `tenant_id` al envelope
(no solo a las tablas). Así el consumidor puede rechazar o rutear
sin tener que abrir el payload primero.

---

## 3. Idempotencia

BullMQ soporta deduplicación nativa vía `jobId`. Usamos `event_id`
como `jobId` — un evento duplicado (reintento de red, replay) no
crea un job nuevo:

```typescript
await eventopsInboundQueue.add(
  envelope.event_type,      // job name = event_type
  envelope,                 // job data = envelope completo
  {
    jobId: envelope.event_id,   // dedup automático por BullMQ
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 },   // 24h de retención para debug
    removeOnFail: false,                 // los fallidos quedan para inspección manual
  },
);
```

El worker sigue tratando la entrega como **at-least-once** (igual
que en el diseño original) — no confiar solo en el dedup de BullMQ
si el proceso puede reiniciarse a mitad de un job; el handler debe
ser idempotente igual.

---

## 4. Eventos: OmniFlow → EventOps (cola `eventops-inbound`)

El nombre del evento (`event_type`) se usa tal cual como **job
name** de BullMQ. Los payloads son los mismos del diseño original,
solo se les agrega `tenant_id` al nivel del envelope.

| job name | Dispara |
|---|---|
| `omniflow.user.created` / `omniflow.user.updated` | Actualiza `sync_cache_users` |
| `omniflow.client.updated` | Actualiza `sync_cache_clients` |
| `omniflow.contract.confirmed` | Crea Evento en EventOps (llama al mismo caso de uso que `POST /internal/events/from-contract`) |
| `omniflow.catalog_item.changed` | Actualiza `sync_cache_catalog` |

Productor (lado core, NestJS):

```typescript
await this.eventopsInboundQueue.add('omniflow.contract.confirmed', {
  event_id: crypto.randomUUID(),
  event_type: 'omniflow.contract.confirmed',
  event_version: '1.0',
  occurred_at: new Date().toISOString(),
  producer: 'omniflow',
  tenant_id: contract.tenantId,
  correlation_id: correlationId,
  payload: { /* igual al schema original */ },
}, { jobId: eventId, attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
```

Consumidor (lado eventops-standalone):

```typescript
@Processor('eventops-inbound')
export class InboundProcessor extends WorkerHost {
  async process(job: Job<EventEnvelope<ContractConfirmedPayload>>) {
    switch (job.name) {
      case 'omniflow.contract.confirmed':
        return this.eventsService.createFromContract(job.data);
      // ...resto de casos
    }
  }
}
```

---

## 5. Eventos: EventOps → OmniFlow (cola `eventops-outbound`)

Mismos `event_type` del diseño original
(`eventops.event.created`, `eventops.event.status_changed`,
`eventops.budget.deviation_detected`, `eventops.task.completed`,
`eventops.task.overdue`, `eventops.material.checked_out`,
`eventops.material.checked_in`, `eventops.material.missing_or_damaged`,
`eventops.event.closed`) — payloads sin cambios, solo el `tenant_id`
agregado al envelope.

**Caso especial — reconciliación de stock:**
Cuando `eventops.material.checked_out` / `checked_in` traen
`external_catalog_item_id` no nulo, el core debe consumirlos y
generar el movimiento de stock real (reserva al salir, liberación
al volver) en el módulo de inventario, en vez de solo loguearlos.
Si `external_catalog_item_id` es nulo (ítem ad-hoc, alquiler
externo), el core los ignora — quedan solo como tracking interno
de EventOps.

```typescript
@Processor('eventops-outbound')
export class OutboundProcessor extends WorkerHost {
  async process(job: Job<EventEnvelope<MaterialCheckedOutPayload>>) {
    if (job.name !== 'eventops.material.checked_out') return;

    const catalogItems = job.data.payload.items.filter(
      (i) => i.external_catalog_item_id !== null,
    );
    if (catalogItems.length === 0) return; // ítems ad-hoc, no tocan stock real

    return this.inventoryService.reserveStock({
      tenantId: job.data.tenant_id,
      items: catalogItems,
      reference: `eventops:${job.data.payload.event_id}`,
    });
  }
}
```

---

## 6. Outbox local en EventOps (sin cambios de fondo)

La tabla `outbox_messages` se mantiene tal cual el diseño original.
Lo único que cambia es el publisher: en vez de un cliente Kafka,
un worker liviano lee filas `published_at IS NULL` y hace
`queue.add()` a `eventops-outbound` dentro de la misma transacción
lógica de negocio (patrón transactional outbox estándar, ahora
sobre BullMQ en vez de un broker externo).

---

## 7. Reglas de versionado y compatibilidad

Sin cambios respecto al original: versionado semántico en
`event_version`, forward-compatibility obligatoria en consumidores,
prohibido eliminar/renombrar campos en la misma versión mayor.

---

*Reemplaza la sección de transporte del documento 02 original.
Los payloads de cada evento (secciones 2.x y 3.x del doc original)
siguen vigentes tal cual, solo agregando `tenant_id` al envelope.*
