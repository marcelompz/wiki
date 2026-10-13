# Auditoría del Módulo de Bookings (Agendamiento)

**Fecha:** 2026-06-23  
**Módulo:** `bookings`  
**Versión:** `0.2.0-alpha.4`

---

## 1. Visión General y Arquitectura

El módulo de **Bookings** en OrderFlow implementa un sistema avanzado de agendamiento y gestión de citas inspirado en plataformas como Agendit. Su arquitectura está orientada a servicios y es **100% compatible con multi-tenant**, lo que permite a diferentes inquilinos gestionar sus propios recursos humanos (profesionales) y físicos (cabinas/consultorios) de forma independiente.

El módulo depende fuertemente de otros módulos core (`orders`, `products`, `customers`), entrelazando la venta de un servicio (como producto) con su agendamiento físico y asignación de recursos.

---

## 2. Características Principales (Key Features)

1. **Validación de Doble Disponibilidad:**  
   Es el corazón del módulo. Al agendar un servicio, el sistema valida que **tanto el profesional (HUMAN) como el recurso físico (PHYSICAL)** estén disponibles simultáneamente en el rango de tiempo seleccionado, previniendo solapamientos (Overbookings).

2. **Cálculo Dinámico de Slots:**  
   Los horarios disponibles no están pre-generados estáticamente en la base de datos, sino que se calculan "on the fly" a partir de las disponibilidades base (`ResourceAvailability`), excepciones (`ResourceException`) y los turnos ya ocupados (`AppointmentAssignment`).

3. **Bloqueo Temporal de Slots (Soft Lock):**  
   Implementa un sistema de bloqueo de 10 minutos (`isBlocked`, `blockedUntil` en `BookingSlot`) para evitar colisiones mientras un cliente está en el proceso de *checkout* (pago/confirmación).

4. **Sincronización Masiva (Upsert):**  
   Provee endpoints para la sincronización y actualización masiva de Recursos y Servicios provenientes de integraciones externas (ej. Odoo o CRMs).

---

## 3. Análisis del Backend

### 3.1. `bookings.controller.ts`
Expone una API REST limpia y protegida por `ApiKeyGuard` que asegura que todas las peticiones estén asociadas a un `tenantId`.
- **Endpoints Clave:**
  - `GET /api/v1/bookings/availability`: Consulta de slots.
  - `POST /api/v1/bookings/check-availability`: Validación profunda de doble recurso.
  - `POST /api/v1/bookings/slots/:id/block`: Soft lock temporal.
  - `POST /api/v1/bookings`: Crea la reserva, la orden (`Order`), y la línea de orden (`OrderLine`) atómicas.
  - `PATCH /api/v1/bookings/:id`: Reasignación de profesionales/cabinas (útil para administración manual).

### 3.2. `bookings.service.ts`
Maneja toda la lógica de negocio y las transacciones de base de datos usando `PrismaService`.
- **Fortalezas:**
  - Separación clara de responsabilidades.
  - Funciones auxiliares privadas muy útiles (`getResourceAvailability`, `isSlotOccupied`, `isResourceOccupied`, `parseTime`).
  - Creación de "Walk-in Customer" de forma automática si la reserva se realiza sin registrar un usuario previo.
- **Observaciones:**
  - El método `createBooking` hace múltiples llamadas a la base de datos (crea Customer, Order, OrderLine, AppointmentAssignment). Si bien es funcional, en el futuro se beneficiaría de utilizar una transacción explícita de Prisma (`prisma.$transaction`) para asegurar la atomicidad y el rollback automático en caso de fallos intermedios.

---

## 4. Análisis del Frontend

### 4.1. Panel Administrativo (`bookings.tsx`)
Una interfaz construida con Ant Design y `@refinedev/core`.
- **Funcionalidad:** Permite a los administradores visualizar todas las citas (`AppointmentAssignment`) e incluye la capacidad de reasignar fácilmente a los profesionales mediante un dropdown (`Select`).
- **Diseño de Datos:** Se alinea perfectamente con la estructura relacional, obteniendo el profesional, el recurso físico, el cliente y el servicio en una sola vista.

### 4.2. Componente de Cliente (`SlotPicker.tsx`)
Un modal de UI que los clientes finales utilizan para elegir la fecha y el bloque de tiempo.
- **Experiencia de Usuario:** Maneja estados de carga (`Spin`), alertas en caso de no haber turnos o errores (`Alert`), y una selección de fechas con deshabilitación de días pasados (`minDate={dayjs()}`).
- **Eficiencia:** Solo consulta disponibilidad al backend al abrir el modal o cambiar la fecha.

---

## 5. Puntos Fuertes (Good Practices)

- **Aislamiento Multi-Tenant:** Todas las consultas SQL generadas por Prisma filtran de manera implícita usando `tenantId` (ya sea directamente o a través de relaciones `product.tenantId` u `order.tenantId`).
- **Abstracción del Manifiesto:** El `bookings.manifest.json` está correctamente tipado e incluye versiones y compatibilidad cruzada, facilitando su integración en el futuro ecosistema "App Store".
- **Comisiones Preparadas:** La arquitectura de datos (vincular `OrderLine` con `AppointmentAssignment` y `Professional`) deja la base de datos totalmente preparada para reportes de comisiones y liquidaciones a fin de mes.

---

## 6. Áreas de Mejora y Recomendaciones (Deuda Técnica)

1. **Transacciones de Base de Datos:**
   Como se mencionó, el flujo de `createBooking` debe migrarse a `$transaction` de Prisma para garantizar integridad en escenarios de alta concurrencia o caída del servidor a mitad de la creación.
   
2. **Caché para Disponibilidad Base:**
   La función `getAvailability` itera sobre profesionales y calcula slots en tiempo real. En tenants con muchos profesionales y servicios complejos, esta operación podría ser lenta. Se recomienda implementar una capa de caché (Redis) para la disponibilidad "base" de los profesionales.

3. **Zona Horaria (Timezones):**
   Las fechas y horarios se manejan como fechas UTC globales en el servidor. Es importante asegurar que en el frontend el componente `DatePicker` y `dayjs` estén configurados explícitamente en la zona horaria local de Asunción (`America/Asuncion`), o adaptar el backend para recibir offsets.

---
**Conclusión:**
El módulo de *Bookings* es altamente robusto, moderno, y está diseñado para escalar de forma eficiente dentro de la arquitectura SaaS. Su lógica central de doble validación es sólida y cumple con los estándares exigidos para plataformas clínicas, de estética y bienestar.
