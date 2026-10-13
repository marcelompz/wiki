# 📅 Manual de Usuario: Gestión de Turnos & Agendamiento (Bookings / Spa)

> **Módulos:** Sistema de Turnos (`/admin/bookings`) y Spa Dashboard (`/admin/spa`)  
> **Destinado a:** Recepcionistas, Terapeutas, Barberos y Profesionales de Servicios  

---

## 1. Introducción
El módulo de **Bookings & Spa** permite a los clientes agendar citas en línea desde la página web pública o catálogo, mientras que el personal gestiona la disponibilidad, asignación de especialistas y confirmación de turnos.

---

## 2. Agendamiento desde la Tienda Pública
1. Los clientes ingresan a la sección de servicios en tu tienda (`/tienda`).
2. Al seleccionar un servicio o tratamiento, se desplegará el **Agendador de Citas (`SlotPicker`)**.
3. El cliente elige la fecha, el especialista disponible y la hora deseada.
4. Al confirmar la cita, el turno queda reservado y bloqueado en el calendario del especialista.

---

## 3. Administración de Agenda & Calendario

### 3.1 Vista de Turnos (`/admin/bookings`)
1. Ingresa a la sección **Turnos** en el menú administrativo.
2. Visualiza el calendario diario/semanal por profesional o especialista.
3. Para agendar un turno presencial o telefónico:
   - Haz clic en **+ Nuevo Turno**.
   - Selecciona el cliente, el servicio, la fecha, hora y el especialista asignado.
   - Presiona **Guardar Reserva**.

### 3.2 Confirmación y Gestión de Estados
- **Pendiente:** Cita solicitada por el cliente.
- **Confirmado:** Cita validada por la recepción o pago de seña.
- **En Atención:** El cliente está siendo atendido por el profesional.
- **Completado:** Servicio finalizado (registra la comisión correspondiente).
- **Cancelado:** Cita liberada en el calendario.
