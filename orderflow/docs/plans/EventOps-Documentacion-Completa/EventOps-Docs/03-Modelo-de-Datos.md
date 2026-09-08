# 03 – Modelo de Datos Completo

Base de datos recomendada: **PostgreSQL**.

Convenciones:
- Todas las tablas tienen `id` UUID como PK.
- Campos de auditoría: `created_at`, `updated_at`, `created_by`, `updated_by` (cuando aplica).
- Soft delete con `deleted_at` en entidades principales.
- Referencias a OmniFlow se guardan como `external_*_id` (UUID).

---

## 1. Diagrama de relaciones (texto)

```
Event 1───* EventPhase
Event 1───* Activity
Event 1───* BudgetItem
Event 1───* Expense
Event 1───* Task
Event 1───* MaterialItem
Event 1───* MaterialMovement

Task 1───* TaskChecklistItem
Task 1───* TaskDependency (como predecessor o successor)
Task *───1 User (assignee – referencia externa)

MaterialItem *───1 MaterialMovementItem *───1 MaterialMovement
MaterialMovement 1───* MaterialMovementItem
```

---

## 2. Tablas principales

### 2.1 `events`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | Identificador interno |
| external_contract_id | UUID | UNIQUE, NOT NULL | Referencia a contrato de OmniFlow |
| external_client_id | UUID | NOT NULL | Referencia a cliente de OmniFlow |
| name | VARCHAR(255) | NOT NULL | Nombre del evento |
| event_type | VARCHAR(50) | | wedding, corporate, social, other |
| status | VARCHAR(30) | NOT NULL | draft, confirmed, in_progress, closed, archived |
| start_at | TIMESTAMPTZ | NOT NULL | |
| end_at | TIMESTAMPTZ | NOT NULL | |
| location_name | VARCHAR(255) | | |
| location_address | TEXT | | |
| location_city | VARCHAR(100) | | |
| location_lat | DECIMAL(10,7) | | |
| location_lng | DECIMAL(10,7) | | |
| estimated_guests | INTEGER | | |
| currency | CHAR(3) | NOT NULL DEFAULT 'ARS' | |
| notes | TEXT | | |
| created_by | UUID | | external_user_id |
| updated_by | UUID | | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| deleted_at | TIMESTAMPTZ | | Soft delete |
| closed_at | TIMESTAMPTZ | | |
| closed_by | UUID | | |

**Índices:**  
`external_contract_id`, `external_client_id`, `status`, `start_at`

---

### 2.2 `event_phases`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| name | VARCHAR(100) | NOT NULL | Pre-evento, Día del evento, Post-evento... |
| sort_order | INTEGER | NOT NULL | |
| start_at | TIMESTAMPTZ | | |
| end_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.3 `activities`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| phase_id | UUID | FK → event_phases.id | Nullable |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| start_at | TIMESTAMPTZ | NOT NULL | |
| end_at | TIMESTAMPTZ | NOT NULL | |
| responsible_user_id | UUID | | external_user_id |
| status | VARCHAR(30) | NOT NULL | pending, in_progress, completed, cancelled |
| sort_order | INTEGER | | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.4 `budget_items`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| category | VARCHAR(50) | NOT NULL | staff, food, materials, transport, other |
| name | VARCHAR(255) | NOT NULL | |
| planned_amount | DECIMAL(14,2) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.5 `expenses`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| budget_item_id | UUID | FK → budget_items.id | Nullable |
| category | VARCHAR(50) | NOT NULL | |
| description | VARCHAR(255) | NOT NULL | |
| amount | DECIMAL(14,2) | NOT NULL | |
| currency | CHAR(3) | NOT NULL | |
| expense_date | DATE | NOT NULL | |
| receipt_url | TEXT | | Foto/PDF del comprobante |
| recorded_by | UUID | | external_user_id |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.6 `tasks`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| assignee_id | UUID | | external_user_id |
| priority | VARCHAR(20) | | low, medium, high, critical |
| status | VARCHAR(30) | NOT NULL | pending, in_progress, completed, cancelled |
| due_at | TIMESTAMPTZ | | |
| start_at | TIMESTAMPTZ | | Para Gantt |
| end_at | TIMESTAMPTZ | | Para Gantt |
| completed_at | TIMESTAMPTZ | | |
| completed_by | UUID | | |
| parent_task_id | UUID | FK → tasks.id | Subtareas (opcional) |
| sort_order | INTEGER | | |
| created_by | UUID | | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

**Índices:** `event_id`, `assignee_id`, `status`, `due_at`

---

### 2.7 `task_checklist_items`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| task_id | UUID | FK → tasks.id | |
| title | VARCHAR(255) | NOT NULL | |
| is_completed | BOOLEAN | NOT NULL DEFAULT false | |
| completed_at | TIMESTAMPTZ | | |
| completed_by | UUID | | |
| sort_order | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.8 `task_dependencies`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| predecessor_task_id | UUID | FK → tasks.id | |
| successor_task_id | UUID | FK → tasks.id | |
| dependency_type | VARCHAR(20) | NOT NULL DEFAULT 'finish_to_start' | |
| created_at | TIMESTAMPTZ | | |

**Constraint:** UNIQUE (predecessor_task_id, successor_task_id)

---

### 2.9 `material_items`

Representa un ítem de material **asignado a un evento concreto**.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| external_catalog_item_id | UUID | | Referencia opcional al catálogo de OmniFlow |
| name | VARCHAR(255) | NOT NULL | |
| category | VARCHAR(50) | NOT NULL | utensil, disposable, gastronomic_equipment, furniture, other |
| unit_of_measure | VARCHAR(20) | NOT NULL DEFAULT 'unit' | |
| planned_quantity | DECIMAL(10,2) | NOT NULL | |
| checked_out_quantity | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| checked_in_quantity | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| missing_quantity | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| damaged_quantity | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| current_location | VARCHAR(255) | | |
| notes | TEXT | | |
| image_url | TEXT | | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

---

### 2.10 `material_movements`

Cabecera de un movimiento de check-out o check-in.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| event_id | UUID | FK → events.id | |
| movement_type | VARCHAR(20) | NOT NULL | check_out, check_in |
| performed_by | UUID | NOT NULL | external_user_id |
| performed_at | TIMESTAMPTZ | NOT NULL | |
| location_from | VARCHAR(255) | | |
| location_to | VARCHAR(255) | | |
| notes | TEXT | | |
| signature_url | TEXT | | |
| has_differences | BOOLEAN | DEFAULT false | Solo relevante en check-in |
| created_at | TIMESTAMPTZ | | |

---

### 2.11 `material_movement_items`

Detalle de cada ítem dentro de un movimiento.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| movement_id | UUID | FK → material_movements.id | |
| material_item_id | UUID | FK → material_items.id | |
| quantity | DECIMAL(10,2) | NOT NULL | |
| condition | VARCHAR(20) | | good, fair, damaged |
| missing_quantity | DECIMAL(10,2) | DEFAULT 0 | Usado en check-in |
| notes | TEXT | | |
| photo_urls | JSONB | | Array de URLs |

---

### 2.12 `material_condition_logs` (opcional pero recomendado)

Historial detallado de estado de un material.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| material_item_id | UUID | FK → material_items.id | |
| movement_item_id | UUID | FK → material_movement_items.id | Nullable |
| previous_condition | VARCHAR(20) | | |
| new_condition | VARCHAR(20) | | |
| notes | TEXT | | |
| photo_urls | JSONB | | |
| logged_by | UUID | | |
| logged_at | TIMESTAMPTZ | | |

---

### 2.13 Tablas de soporte

#### `outbox_messages` (Outbox Pattern)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| event_type | VARCHAR(100) | |
| payload | JSONB | |
| occurred_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | |

#### `sync_cache_users` / `sync_cache_clients` / `sync_cache_catalog`

Caché local de datos maestros provenientes de OmniFlow (estructura mínima según payloads del documento 02).

---

## 3. Relaciones y reglas de integridad

- Al eliminar lógicamente un `Event`, no se eliminan en cascada los movimientos históricos (se conservan para auditoría).
- `checked_out_quantity` y `checked_in_quantity` se actualizan de forma transaccional al crear movimientos.
- Un `MaterialItem` no puede tener `checked_out_quantity` > `planned_quantity` + margen configurable (regla de negocio).
- Las dependencias de tareas no pueden formar ciclos (validación en capa de aplicación).

---

## 4. Vistas recomendadas (para queries de móvil y reportes)

- `v_event_budget_summary` → planned vs actual por categoría
- `v_event_task_progress` → % completado, tareas vencidas
- `v_material_status_by_event` → resumen de materiales con diferencias
- `v_gantt_tasks` → tareas proyectadas con start/end y dependencias para el frontend

---

*Siguiente documento recomendado: [04-Diseno-de-APIs.md](04-Diseno-de-APIs.md)*
