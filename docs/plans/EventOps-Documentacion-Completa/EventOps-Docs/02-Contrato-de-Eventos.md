# 02 – Contrato de Eventos (Integration Events)

Este documento define los **payloads exactos** de los eventos de integración entre OmniFlow y EventOps.

**Convenciones generales:**
- Formato: JSON
- Encoding: UTF-8
- Fechas: ISO 8601 (`2026-08-23T21:00:00-03:00`)
- IDs: UUID v4
- Todos los eventos incluyen una cabecera común (envelope)

---

## 1. Envelope común de todos los eventos

```json
{
  "event_id": "uuid",
  "event_type": "string",
  "event_version": "1.0",
  "occurred_at": "2026-08-23T21:00:00-03:00",
  "producer": "omniflow | eventops",
  "correlation_id": "uuid",
  "causation_id": "uuid | null",
  "payload": { }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `event_id` | UUID | Identificador único del evento (idempotencia) |
| `event_type` | string | Nombre del evento (ej: `eventops.event.created`) |
| `event_version` | string | Versión del schema del payload |
| `occurred_at` | datetime | Momento en que ocurrió el hecho de negocio |
| `producer` | string | Sistema que originó el evento |
| `correlation_id` | UUID | Para trazar una conversación completa |
| `causation_id` | UUID | Evento que causó este (opcional) |
| `payload` | object | Datos específicos del evento |

---

## 2. Eventos publicados por OmniFlow → EventOps

### 2.1 `omniflow.user.created` / `omniflow.user.updated`

```json
{
  "event_type": "omniflow.user.updated",
  "payload": {
    "user_id": "uuid",
    "email": "string",
    "full_name": "string",
    "phone": "string | null",
    "roles": ["coordinator", "staff", "admin"],
    "is_active": true,
    "updated_at": "2026-08-23T21:00:00-03:00"
  }
}
```

### 2.2 `omniflow.client.updated`

```json
{
  "event_type": "omniflow.client.updated",
  "payload": {
    "client_id": "uuid",
    "legal_name": "string",
    "trade_name": "string | null",
    "tax_id": "string | null",
    "primary_contact_name": "string | null",
    "primary_contact_email": "string | null",
    "primary_contact_phone": "string | null",
    "updated_at": "2026-08-23T21:00:00-03:00"
  }
}
```

### 2.3 `omniflow.contract.confirmed`

Este evento es el principal disparador para crear un Evento operativo en EventOps.

```json
{
  "event_type": "omniflow.contract.confirmed",
  "payload": {
    "contract_id": "uuid",
    "client_id": "uuid",
    "contract_number": "string",
    "event_name": "string",
    "event_type": "wedding | corporate | social | other",
    "start_at": "2026-09-15T18:00:00-03:00",
    "end_at": "2026-09-16T02:00:00-03:00",
    "location": {
      "name": "string",
      "address": "string",
      "city": "string",
      "coordinates": {
        "lat": -34.6037,
        "lng": -58.3816
      }
    },
    "estimated_guests": 150,
    "currency": "ARS",
    "total_amount": 2500000.00,
    "confirmed_at": "2026-08-20T14:30:00-03:00",
    "account_manager_id": "uuid"
  }
}
```

### 2.4 `omniflow.catalog_item.changed`

```json
{
  "event_type": "omniflow.catalog_item.changed",
  "payload": {
    "catalog_item_id": "uuid",
    "sku": "string | null",
    "name": "string",
    "category": "utensil | disposable | gastronomic_equipment | furniture | other",
    "unit_of_measure": "unit | set | box | kg",
    "is_active": true,
    "default_image_url": "string | null",
    "updated_at": "2026-08-23T21:00:00-03:00"
  }
}
```

---

## 3. Eventos publicados por EventOps → OmniFlow (y otros consumidores)

### 3.1 `eventops.event.created`

```json
{
  "event_type": "eventops.event.created",
  "payload": {
    "event_id": "uuid",
    "external_contract_id": "uuid",
    "external_client_id": "uuid",
    "name": "string",
    "status": "draft | confirmed | in_progress | closed | archived",
    "start_at": "2026-09-15T18:00:00-03:00",
    "end_at": "2026-09-16T02:00:00-03:00",
    "created_by": "uuid",
    "created_at": "2026-08-23T21:00:00-03:00"
  }
}
```

### 3.2 `eventops.event.status_changed`

```json
{
  "event_type": "eventops.event.status_changed",
  "payload": {
    "event_id": "uuid",
    "external_contract_id": "uuid",
    "previous_status": "confirmed",
    "new_status": "in_progress",
    "changed_by": "uuid",
    "changed_at": "2026-09-15T10:00:00-03:00",
    "reason": "string | null"
  }
}
```

### 3.3 `eventops.budget.deviation_detected`

```json
{
  "event_type": "eventops.budget.deviation_detected",
  "payload": {
    "event_id": "uuid",
    "external_contract_id": "uuid",
    "category": "staff | food | materials | transport | other",
    "planned_amount": 450000.00,
    "actual_amount": 512000.00,
    "deviation_amount": 62000.00,
    "deviation_percentage": 13.78,
    "currency": "ARS",
    "detected_at": "2026-09-14T18:30:00-03:00"
  }
}
```

### 3.4 `eventops.task.completed` / `eventops.task.overdue`

```json
{
  "event_type": "eventops.task.completed",
  "payload": {
    "event_id": "uuid",
    "task_id": "uuid",
    "title": "string",
    "assignee_id": "uuid",
    "completed_at": "2026-09-15T12:45:00-03:00",
    "completed_by": "uuid"
  }
}
```

```json
{
  "event_type": "eventops.task.overdue",
  "payload": {
    "event_id": "uuid",
    "task_id": "uuid",
    "title": "string",
    "assignee_id": "uuid",
    "due_at": "2026-09-15T10:00:00-03:00",
    "detected_at": "2026-09-15T10:05:00-03:00"
  }
}
```

### 3.5 `eventops.material.checked_out`

```json
{
  "event_type": "eventops.material.checked_out",
  "payload": {
    "event_id": "uuid",
    "movement_id": "uuid",
    "performed_by": "uuid",
    "performed_at": "2026-09-15T08:30:00-03:00",
    "items": [
      {
        "material_item_id": "uuid",
        "external_catalog_item_id": "uuid | null",
        "name": "Cafetera industrial 20L",
        "quantity": 2,
        "condition": "good | fair | damaged",
        "notes": "string | null"
      }
    ],
    "location_from": "Depósito Central",
    "location_to": "Salón Evento",
    "signature_url": "string | null",
    "photo_urls": ["string"]
  }
}
```

### 3.6 `eventops.material.checked_in`

```json
{
  "event_type": "eventops.material.checked_in",
  "payload": {
    "event_id": "uuid",
    "movement_id": "uuid",
    "performed_by": "uuid",
    "performed_at": "2026-09-16T03:15:00-03:00",
    "items": [
      {
        "material_item_id": "uuid",
        "external_catalog_item_id": "uuid | null",
        "name": "Cafetera industrial 20L",
        "quantity_returned": 2,
        "condition": "good | fair | damaged",
        "missing_quantity": 0,
        "notes": "string | null"
      }
    ],
    "location_from": "Salón Evento",
    "location_to": "Depósito Central",
    "has_differences": false,
    "signature_url": "string | null",
    "photo_urls": ["string"]
  }
}
```

### 3.7 `eventops.material.missing_or_damaged`

```json
{
  "event_type": "eventops.material.missing_or_damaged",
  "payload": {
    "event_id": "uuid",
    "movement_id": "uuid",
    "items": [
      {
        "material_item_id": "uuid",
        "name": "Espátula de silicona grande",
        "issue_type": "missing | damaged",
        "quantity": 1,
        "notes": "No se encontró al momento del check-in",
        "photo_urls": ["string"]
      }
    ],
    "reported_by": "uuid",
    "reported_at": "2026-09-16T03:20:00-03:00"
  }
}
```

### 3.8 `eventops.event.closed`

```json
{
  "event_type": "eventops.event.closed",
  "payload": {
    "event_id": "uuid",
    "external_contract_id": "uuid",
    "closed_at": "2026-09-16T11:00:00-03:00",
    "closed_by": "uuid",
    "budget_summary": {
      "planned_total": 2500000.00,
      "actual_total": 2615000.00,
      "deviation_percentage": 4.6,
      "currency": "ARS"
    },
    "materials_summary": {
      "total_items_checked_out": 87,
      "items_with_issues": 3,
      "missing_count": 1,
      "damaged_count": 2
    },
    "tasks_summary": {
      "total_tasks": 42,
      "completed": 40,
      "cancelled": 2
    }
  }
}
```

---

## 4. Reglas de versionado y compatibilidad

- Se utiliza versionado semántico en `event_version` (`1.0`, `1.1`, `2.0`...).
- Los consumidores **deben** ignorar campos desconocidos (forward compatibility).
- Los productores **no deben** eliminar ni renombrar campos existentes en la misma versión mayor.
- Cambios breaking requieren nueva versión mayor y período de dual-publish si es necesario.

---

## 5. Idempotencia y entrega

- Todos los consumidores deben tratar los eventos como **at-least-once**.
- Se recomienda usar `event_id` como clave de idempotencia.
- El Outbox Pattern en EventOps garantiza que un evento se publique al menos una vez después de commit exitoso.

---

*Siguiente documento recomendado: [03-Modelo-de-Datos.md](03-Modelo-de-Datos.md)*
