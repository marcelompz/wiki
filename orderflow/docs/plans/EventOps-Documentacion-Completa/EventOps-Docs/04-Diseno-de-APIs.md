# 04 – Diseño de APIs (REST)

**Base URL sugerida:** `https://api.eventops.example.com/v1`

**Autenticación:** Bearer JWT (emitido por Identity Provider de OmniFlow o propio federado).

**Formato:** JSON  
**Paginación:** `?page=1&page_size=20`  
**Ordenamiento:** `?sort=due_at:asc`  
**Filtros:** query params específicos por recurso.

---

## 1. Eventos

### `GET /events`
Lista de eventos (con filtros).

**Query params:**  
`status`, `client_id`, `from_date`, `to_date`, `search`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Casamiento García-López",
      "status": "confirmed",
      "start_at": "2026-09-15T18:00:00-03:00",
      "end_at": "2026-09-16T02:00:00-03:00",
      "external_client_id": "uuid",
      "external_contract_id": "uuid"
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total": 45 }
}
```

### `POST /events`
Crear evento (normalmente disparado desde OmniFlow al confirmar contrato).

### `GET /events/{event_id}`
Detalle completo del evento.

### `PATCH /events/{event_id}`
Actualización parcial (nombre, fechas, notas, estado...).

### `POST /events/{event_id}/status`
Cambio de estado controlado.

```json
{
  "status": "in_progress",
  "reason": "Inicio de montaje"
}
```

### `GET /events/{event_id}/summary`
Resumen ejecutivo (presupuesto, tareas, materiales). Ideal para dashboards de OmniFlow.

---

## 2. Cronograma operativo

### `GET /events/{event_id}/phases`
### `POST /events/{event_id}/phases`
### `PATCH /phases/{phase_id}`
### `DELETE /phases/{phase_id}`

### `GET /events/{event_id}/activities`
### `POST /events/{event_id}/activities`
### `PATCH /activities/{activity_id}`
### `DELETE /activities/{activity_id}`

---

## 3. Presupuesto y gastos

### `GET /events/{event_id}/budget`
Devuelve ítems de presupuesto + totales planificado vs real.

### `POST /events/{event_id}/budget/items`
### `PATCH /budget/items/{item_id}`
### `DELETE /budget/items/{item_id}`

### `GET /events/{event_id}/expenses`
### `POST /events/{event_id}/expenses`
```json
{
  "budget_item_id": "uuid | null",
  "category": "materials",
  "description": "Compra de descartables adicionales",
  "amount": 45000.00,
  "currency": "ARS",
  "expense_date": "2026-09-10",
  "receipt_url": "https://..."
}
```

### `GET /events/{event_id}/budget/deviation`
Resumen de desvíos por categoría.

---

## 4. Tareas + Checklists + Gantt

### `GET /events/{event_id}/tasks`
Filtros: `assignee_id`, `status`, `priority`, `due_before`, `due_after`

### `POST /events/{event_id}/tasks`
```json
{
  "title": "Montaje de estación de café",
  "description": "...",
  "assignee_id": "uuid",
  "priority": "high",
  "due_at": "2026-09-15T16:00:00-03:00",
  "start_at": "2026-09-15T14:00:00-03:00",
  "end_at": "2026-09-15T16:00:00-03:00",
  "checklist": [
    { "title": "Verificar cafetera", "sort_order": 1 },
    { "title": "Preparar vasos y servilletas", "sort_order": 2 }
  ]
}
```

### `GET /tasks/{task_id}`
### `PATCH /tasks/{task_id}`
### `POST /tasks/{task_id}/complete`
### `POST /tasks/{task_id}/checklist/{item_id}/toggle`

### `GET /events/{event_id}/gantt`
Endpoint optimizado para la vista Gantt móvil.

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Montaje estación de café",
      "assignee_id": "uuid",
      "assignee_name": "María Pérez",
      "start_at": "2026-09-15T14:00:00-03:00",
      "end_at": "2026-09-15T16:00:00-03:00",
      "status": "pending",
      "progress": 0,
      "dependencies": ["uuid-predecessor"]
    }
  ],
  "dependencies": [
    {
      "predecessor_id": "uuid",
      "successor_id": "uuid",
      "type": "finish_to_start"
    }
  ]
}
```

### Dependencias
- `POST /tasks/{task_id}/dependencies`
- `DELETE /task-dependencies/{dependency_id}`

---

## 5. Materiales + Check-in / Check-out

### `GET /events/{event_id}/materials`
Lista de materiales del evento con cantidades y estado actual.

### `POST /events/{event_id}/materials`
Alta de ítems (puede venir de catálogo de OmniFlow o ser libre).

### `PATCH /materials/{material_item_id}`
### `DELETE /materials/{material_item_id}`

### `POST /events/{event_id}/materials/check-out`
```json
{
  "location_from": "Depósito Central",
  "location_to": "Salón Principal",
  "notes": "Retiro para montaje",
  "items": [
    {
      "material_item_id": "uuid",
      "quantity": 2,
      "condition": "good",
      "notes": null
    }
  ],
  "signature_base64": "optional",
  "photo_urls": ["https://..."]
}
```

**Response 201:** movimiento creado + cantidades actualizadas.

### `POST /events/{event_id}/materials/check-in`
```json
{
  "location_from": "Salón Principal",
  "location_to": "Depósito Central",
  "items": [
    {
      "material_item_id": "uuid",
      "quantity": 2,
      "condition": "good",
      "missing_quantity": 0,
      "notes": null
    },
    {
      "material_item_id": "uuid",
      "quantity": 0,
      "condition": "damaged",
      "missing_quantity": 1,
      "notes": "No apareció la espátula"
    }
  ],
  "signature_base64": "optional",
  "photo_urls": ["https://..."]
}
```

### `GET /events/{event_id}/materials/movements`
Historial de movimientos (check-out y check-in).

### `GET /events/{event_id}/materials/differences`
Resumen de faltantes y dañados.

---

## 6. Archivos / Adjuntos

### `POST /uploads`
Subida de imágenes o PDFs (comprobantes, fotos de estado de materiales, firmas).

**Response:**
```json
{
  "url": "https://storage.example.com/...",
  "content_type": "image/jpeg",
  "size_bytes": 245678
}
```

---

## 7. Endpoints de integración (uso interno / OmniFlow)

### `POST /internal/events/from-contract`
Endpoint protegido (mTLS o JWT de servicio) que recibe el payload de `omniflow.contract.confirmed` y crea el evento.

### `GET /internal/events/{event_id}/summary`
Versión optimizada para consumo desde OmniFlow.

---

## 8. Códigos de error comunes

| Código | Significado |
|--------|-------------|
| 400 | Validación fallida |
| 401 | No autenticado |
| 403 | No autorizado |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej. estado inválido, cantidad insuficiente) |
| 422 | Error de regla de negocio |
| 429 | Rate limit |
| 500 | Error interno |

**Formato de error:**
```json
{
  "error": {
    "code": "MATERIAL_INSUFFICIENT_QUANTITY",
    "message": "No hay suficiente cantidad disponible para el check-out",
    "details": { "material_item_id": "uuid", "requested": 5, "available": 3 }
  }
}
```

---

## 9. Versionado

- Versionado en URL (`/v1/...`).
- Cambios breaking → nueva versión mayor.
- Deprecación anunciada con header `Deprecation` y `Sunset`.

---

*Siguiente documento recomendado: [05-Flujos-Usuario-Movil.md](05-Flujos-Usuario-Movil.md)*
