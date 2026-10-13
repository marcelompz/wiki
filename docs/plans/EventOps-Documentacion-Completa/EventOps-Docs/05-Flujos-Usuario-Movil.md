# 05 – Flujos de Usuario Móvil

Este documento describe las pantallas y flujos clave de la aplicación móvil de EventOps, con foco en:

- Check-out de materiales
- Check-in de materiales
- Vista Gantt de tareas
- Navegación general del evento

---

## 1. Navegación principal del Evento

```
┌────────────────────────────────────────┐
│  ← Casamiento García-López             │
│  15 Sep 2026 · Confirmado              │
├────────────────────────────────────────┤
│  [Resumen] [Cronograma] [Tareas] [Mat.]│
├────────────────────────────────────────┤
│                                        │
│   Contenido de la pestaña activa       │
│                                        │
└────────────────────────────────────────┘
```

**Pestañas principales:**
1. **Resumen** – Estado general, presupuesto, alertas
2. **Cronograma** – Fases y actividades
3. **Tareas** – Lista + acceso a Gantt
4. **Materiales** – Lista + Check-in/Check-out

---

## 2. Flujo de Check-out de Materiales

### Objetivo
Registrar la salida de materiales/equipos desde el depósito hacia el lugar del evento.

### Pantallas

#### 2.1 Lista de Materiales del Evento
```
┌────────────────────────────────────────┐
│  Materiales                    [+ Alta]│
├────────────────────────────────────────┤
│  Filtros: Todos | Pendientes | Con diff│
├────────────────────────────────────────┤
│  ☕ Cafetera industrial 20L            │
│     Plan: 2  |  Out: 0  |  In: 0       │
│     ──────────────────────────── [Out] │
│                                        │
│  🥄 Espátula silicona grande × 6       │
│     Plan: 6  |  Out: 0  |  In: 0       │
│     ──────────────────────────── [Out] │
│                                        │
│  🥡 Descartables (set 150 pax)         │
│     Plan: 1  |  Out: 0  |  In: 0       │
│     ──────────────────────────── [Out] │
└────────────────────────────────────────┘
```

#### 2.2 Selección múltiple para Check-out
El usuario puede seleccionar varios ítems y pulsar **“Iniciar Check-out”**.

```
┌────────────────────────────────────────┐
│  Check-out                    [Cancelar]│
├────────────────────────────────────────┤
│  Origen:  [Depósito Central      ▼]    │
│  Destino: [Salón Principal       ▼]    │
├────────────────────────────────────────┤
│  ☑ Cafetera industrial 20L             │
│     Cantidad: [2]     Estado: [Bueno ▼]│
│                                        │
│  ☑ Espátula silicona grande            │
│     Cantidad: [6]     Estado: [Bueno ▼]│
│                                        │
│  ☐ Buffetera                           │
│     Cantidad: [1]     Estado: [Bueno ▼]│
├────────────────────────────────────────┤
│  Notas: ________________________________│
│                                        │
│  [📷 Agregar fotos]                    │
│                                        │
│  [Firmar]              [Confirmar Out] │
└────────────────────────────────────────┘
```

#### 2.3 Confirmación y éxito
- Se muestra resumen del movimiento.
- Se actualizan las cantidades en tiempo real (o al sincronizar si está offline).
- Se genera evento `eventops.material.checked_out`.

---

## 3. Flujo de Check-in de Materiales

### Objetivo
Registrar la devolución de materiales al finalizar el evento y detectar faltantes o daños.

#### 3.1 Entrada al Check-in
Desde la lista de materiales → botón **“Iniciar Check-in”** (solo visible si hay ítems en estado “out”).

#### 3.2 Pantalla de Check-in
```
┌────────────────────────────────────────┐
│  Check-in                     [Cancelar]│
├────────────────────────────────────────┤
│  Origen:  [Salón Principal       ▼]    │
│  Destino: [Depósito Central      ▼]    │
├────────────────────────────────────────┤
│  Cafetera industrial 20L               │
│  Salieron: 2                           │
│  Devueltos: [2]   Estado: [Bueno    ▼] │
│  Faltantes: [0]                        │
│  Notas: _____________________________  │
│                                        │
│  Espátula silicona grande              │
│  Salieron: 6                           │
│  Devueltos: [5]   Estado: [Bueno    ▼] │
│  Faltantes: [1]                        │
│  Notas: No se encontró una unidad      │
│  [📷 Foto del faltante]                │
├────────────────────────────────────────┤
│  [Firmar]             [Confirmar In]   │
└────────────────────────────────────────┘
```

#### 3.3 Resultado con diferencias
Si hay faltantes o daños:
- Se marca el movimiento con `has_differences = true`.
- Se publica el evento `eventops.material.missing_or_damaged`.
- Se muestra pantalla de resumen de incidencias.

---

## 4. Flujo de Tareas y Gantt

### 4.1 Lista de Tareas
```
┌────────────────────────────────────────┐
│  Tareas              [Gantt] [+ Nueva] │
├────────────────────────────────────────┤
│  Filtros: Todas | Mías | Vencidas      │
├────────────────────────────────────────┤
│  🔴 Montaje estación de café           │
│     María Pérez · Vence 15:00          │
│     ☐ Verificar cafetera               │
│     ☐ Preparar vasos                   │
│                                        │
│  🟡 Coordinar llegada de catering      │
│     Juan López · Vence 17:30           │
│                                        │
│  🟢 Revisión final de mesas            │
│     Completada · 14:20                 │
└────────────────────────────────────────┘
```

### 4.2 Detalle de Tarea + Checklist
```
┌────────────────────────────────────────┐
│  ← Montaje estación de café            │
├────────────────────────────────────────┤
│  Responsable: María Pérez              │
│  Prioridad: Alta                       │
│  Estado: En progreso                   │
│  Vence: 15 Sep 16:00                   │
├────────────────────────────────────────┤
│  Checklist                             │
│  ☑ Verificar cafetera y conexiones     │
│  ☐ Preparar vasos y servilletas        │
│  ☐ Colocar cartel de estación          │
│  ☐ Probar primera ronda de café        │
├────────────────────────────────────────┤
│  Comentarios (2)                       │
│  [Escribir comentario...]              │
├────────────────────────────────────────┤
│  [Marcar como completada]              │
└────────────────────────────────────────┘
```

### 4.3 Vista Gantt (móvil)

```
┌────────────────────────────────────────┐
│  Gantt          [Hoy] [Día] [3 días]   │
├────────────────────────────────────────┤
│  14:00    15:00    16:00    17:00      │
│  ────────────────────────────────────  │
│  María                                 │
│  ████████████ Montaje café             │
│                                        │
│  Juan                                  │
│           ██████████ Catering          │
│                                        │
│  Ana                                   │
│                    ████████ Mesas      │
└────────────────────────────────────────┘
```

**Interacciones:**
- Scroll horizontal para navegar el tiempo.
- Tap en una barra → abre detalle de la tarea.
- Pinch-to-zoom (opcional) o botones de escala (Día / 3 días / Semana).
- Línea vertical “Ahora”.
- Colores según estado o prioridad.

---

## 5. Otros flujos importantes

### 5.1 Cambio de estado del Evento
Desde Resumen → menú de acciones → “Iniciar evento” / “Cerrar evento”.  
Requiere confirmación y, en el cierre, muestra resumen de presupuesto y materiales.

### 5.2 Registro de gasto
Desde Resumen o sección Presupuesto → “Agregar gasto” → foto del comprobante + monto + categoría.

### 5.3 Notificaciones push
- Tarea asignada
- Tarea próxima a vencer
- Material con faltante detectado
- Desvío presupuestario significativo
- Cambio de estado del evento

---

## 6. Consideraciones de UX móvil

- Botones grandes y zonas de toque generosas (uso con guantes o prisa).
- Modo offline visible (banner “Sin conexión – los cambios se sincronizarán”).
- Confirmaciones claras en Check-out / Check-in (acciones irreversibles a efectos prácticos).
- Fotos obligatorias opcionales según configuración del evento o tipo de material.
- Firma digital simple (canvas) o solo confirmación con usuario autenticado.

---

*Siguiente documento recomendado: [06-Estrategia-Offline.md](06-Estrategia-Offline.md)*
