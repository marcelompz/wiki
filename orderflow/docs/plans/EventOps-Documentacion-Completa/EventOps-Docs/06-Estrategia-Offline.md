# 06 – Estrategia de Modo Offline

El modo offline es **crítico** en EventOps porque los eventos suelen realizarse en lugares con conectividad intermitente o nula (salones, jardines, zonas rurales, sótanos, etc.).

---

## 1. Objetivos

1. Permitir que el personal de campo realice las operaciones esenciales **sin conexión**.
2. Garantizar que, al recuperar la conexión, los datos se sincronicen de forma confiable y sin pérdida.
3. Resolver conflictos de forma predecible y auditable.
4. Dar feedback claro al usuario sobre el estado de sincronización.

---

## 2. Operaciones soportadas offline

| Operación | Soporte Offline | Notas |
|-----------|------------------|-------|
| Ver detalle del evento | Sí | Datos precargados |
| Ver y completar tareas + checklists | Sí | |
| Ver Gantt (datos locales) | Sí | |
| Registrar gastos (con foto local) | Sí | |
| Check-out de materiales | Sí | |
| Check-in de materiales | Sí | |
| Tomar fotos y firmas | Sí | Almacenamiento local |
| Crear nuevas tareas | Limitado | Solo si se precargó el evento |
| Cambiar estado del evento | No (o con cola) | Preferible online |
| Consultar datos maestros nuevos | No | Usa caché |

---

## 3. Arquitectura offline en el cliente

```
┌─────────────────────────────────────────────────────┐
│                   App Móvil                         │
├─────────────────────────────────────────────────────┤
│  UI Layer                                           │
├─────────────────────────────────────────────────────┤
│  Offline Repository / Sync Engine                   │
│  ├── Local DB (SQLite / Hive / Drift / Realm)       │
│  ├── Outbox local de mutaciones                     │
│  ├── Conflict Resolver                              │
│  └── Sync Worker (background)                       │
├─────────────────────────────────────────────────────┤
│  Network Layer (detecta conectividad)               │
└─────────────────────────────────────────────────────┘
```

### Tecnologías recomendadas por stack

| Stack móvil | Base local | Sync |
|-------------|------------|------|
| Flutter | Drift (SQLite) o Hive | Workmanager + connectivity_plus |
| React Native | WatermelonDB / SQLite | NetInfo + Background Fetch |
| Nativo | Room / Core Data | WorkManager / BGTaskScheduler |

---

## 4. Estrategia de datos locales

### 4.1 Precarga (antes del evento)
Cuando el usuario abre un evento o se asigna a él:
- Se descargan y persisten localmente:
  - Datos del evento
  - Fases y actividades
  - Tareas + checklists + dependencias (para Gantt)
  - Lista de materiales y cantidades
  - Usuarios relevantes (responsables)
  - Último resumen de presupuesto

### 4.2 Mutaciones offline (Outbox local)
Cualquier acción de escritura se guarda primero en una **cola local de mutaciones** (outbox):

```json
{
  "mutation_id": "uuid",
  "type": "material.check_out",
  "payload": { ... },
  "created_at": "2026-09-15T08:32:00-03:00",
  "status": "pending",
  "retries": 0
}
```

Tipos de mutación principales:
- `task.complete`
- `task.checklist.toggle`
- `task.create` / `task.update`
- `expense.create`
- `material.check_out`
- `material.check_in`
- `material.update_quantities` (interno)

### 4.3 Sincronización
Cuando hay conectividad:
1. Se envían las mutaciones pendientes **en orden**.
2. Cada mutación exitosa se marca como `synced`.
3. Se descargan cambios remotos (otras personas del equipo).
4. Se resuelven conflictos si los hay.

---

## 5. Resolución de conflictos

| Escenario | Estrategia recomendada |
|-----------|------------------------|
| Dos personas completan la misma tarea | Last-write-wins + registro de auditoría. Se notifica al segundo usuario. |
| Check-out de más cantidad de la disponible | El servidor rechaza (409). El cliente muestra error y permite ajustar. |
| Check-in con cantidades distintas | Se acepta el del servidor si ya existe un movimiento; o se fusiona con reglas de negocio. |
| Actualización de notas / campos de texto | Last-write-wins o merge manual en UI si es crítico. |
| Creación de ítems de material duplicados | Detección por nombre + categoría + evento → se unifican o se pide confirmación. |

**Principio:** las operaciones de **materiales (check-out/in)** y **tareas completadas** tienen reglas de negocio estrictas en el servidor. El cliente nunca asume que la mutación fue aceptada hasta recibir confirmación.

---

## 6. Experiencia de usuario offline

### Indicadores visuales
- Banner superior: **“Sin conexión – Los cambios se guardarán localmente”**
- Icono de nube con estado (sincronizando / pendiente / error)
- En listas: badge “Pendiente de sync” en ítems modificados offline

### Feedback al volver online
- Toast o pantalla de “Sincronizando X cambios…”
- Resumen al terminar: “5 cambios sincronizados correctamente. 1 requiere atención.”
- Si hay conflictos: pantalla dedicada con opciones claras.

### Fotos y firmas
- Se guardan en almacenamiento local del dispositivo.
- Se suben en background al recuperar conexión (cola de archivos).
- Mientras tanto se referencian con URIs locales en las mutaciones.

---

## 7. Límites y políticas

- **Tamaño de caché**: limitar eventos precargados (ej. solo eventos de los próximos 30 días + eventos en curso).
- **Retención de mutaciones**: eliminar mutaciones sincronizadas después de X días.
- **Tamaño de fotos**: comprimir antes de guardar localmente.
- **Seguridad**: la base local debe estar cifrada (SQLCipher o equivalente) si contiene datos sensibles.

---

## 8. Flujo resumido de una operación offline (ejemplo Check-out)

1. Usuario realiza Check-out sin conexión.
2. App valida reglas locales (cantidades disponibles según datos precargados).
3. Se crea registro en outbox local + se actualiza la UI optimísticamente.
4. Se guardan fotos/firma en disco local.
5. Al recuperar conexión:
   - Sync Worker toma la mutación.
   - Sube fotos primero → obtiene URLs definitivas.
   - Envía `POST /materials/check-out` con las URLs.
   - Si éxito → marca mutación como synced y actualiza IDs locales si es necesario.
   - Si error de negocio → marca como `failed` y notifica al usuario.

---

## 9. Pruebas recomendadas

- Operar un evento completo en modo avión.
- Simular pérdida de conexión a mitad de un Check-in.
- Dos dispositivos modificando la misma tarea.
- Check-out de cantidad mayor a la disponible (debe fallar al sincronizar).
- Subida de muchas fotos con conexión intermitente.

---

*Siguiente documento recomendado: [07-Plan-de-Implementacion.md](07-Plan-de-Implementacion.md)*
