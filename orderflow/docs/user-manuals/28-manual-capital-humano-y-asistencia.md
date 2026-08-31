# 📘 Manual de Usuario: OmniCapitalHumano & OmniAsistencia (`v1.21.01`)

> **Módulo:** Gestor de Personal, Legajo Digital, Marcador de Asistencia, Horarios y Geocercas  
> **Ubicación del Documento:** `docs/user-manuals/28-manual-capital-humano-y-asistencia.md`  
> **Versión de OrderFlow / OmniFlow:** v1.21.01+  
> **Fecha:** 31 de Agosto de 2026  

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![OmniCapitalHumano & OmniAsistencia](/home/marcelompz/.gemini/antigravity-cli/brain/f362fccd-f3f9-4c34-a636-cb6b031397a6/manual_hr_attendance_1788148544301.jpg)

**OmniCapitalHumano** y **OmniAsistencia** integran la suite de gestión de personal, marcación de asistencia multi-método, control de horarios y auditoría laboral compliance-by-design para OrderFlow / OmniFlow.

### 🎯 Características Clave:
1. **Legajo Digital (`Employee`):** Ficha laboral inmutable con historial de cargos, contratos, sucursales y datos de remuneración.
2. **Vinculación Tripartita (Contact ↔ Employee ↔ User):** Integra el Directorio Unificado de Contactos (`Contact`) con el perfil de RRHH (`Employee`) y la cuenta opcional de acceso a la plataforma (`User`).
3. **Marcación Multi-Método:** Soporta fichaje por NFC (`nfc-standalone`), QR Kiosko, PIN, App Móvil con validación biométrica en el sistema operativo local (Face ID / Huella), y terminales dedicados (ZKTeco / Hikvision).
4. **Matriz de Horarios Flexible (`WorkSchedule` & `ShiftTemplate`):** Configuración de turnos fijos, flexibles o rotativos con tolerancia a tardanzas (`gracePeriodMins`) y asignación de días libres (`isDayOff`).
5. **Geocercas Dinámicas (`Workplace`):** Validación GPS en tiempo real con política estricta (`STRICT`) o para revisión (`FLAG`). Soporta eventos dinámicos para personal en campo (Vivento/EventOps).

---

## 2. ARQUITECTURA DE DATOS Y FLUJO DE MARCACIÓN

```mermaid
graph TD
    Device["Dispositivo (Móvil / Kiosko PIN / Hardware ZKTeco)"]
    NfcService["nfc-standalone / API Scan Endpoint"]
    HrController["HrController (/api/v1/hr/attendance/scan)"]
    HrService["HrService (Verificación Geocerca + Haversine)"]
    Prisma["Prisma ORM (AttendanceRecord & Employee Audit Log)"]

    Device -->|1. Evento de Fichaje (Timestamp + GPS / Token)| NfcService
    NfcService -->|2. Dispatch a Marcador| HrController
    HrController -->|3. Procesa DTO RecordAttendanceDto| HrService
    HrService -->|4. Valida Radio Workplace / Evento| Prisma
    Prisma -->>Device: 5. Retorna Marcación Registrada (OK / FLAGGED)
```

---

## 3. PASO A PASO: GESTIÓN DE COLABORADORES Y MARCADOR

### 🔹 Paso 1: Alta de Colaborador (Legajo Digital)
1. Navega a **Capital Humano > Colaboradores** (`/admin/hr/employees`).
2. Haz clic en **"Nuevo Colaborador"**.
3. Completa los datos obligatorios: Nombre, Apellidos, Cédula / Documento (`nationalId`), Cargo, Fecha de Ingreso y Modalidad Laboral (`ON_SITE`, `HYBRID` o `REMOTE`).
4. **Vinculación Tripartita:** Especifica de forma opcional el `contactId` (para asociar una persona/proveedor preexistente) o el `userId` (para concederle credenciales de acceso al sistema).

### 🔹 Paso 2: Configuración de Plantillas y Horarios
1. En **Capital Humano > Horarios**, crea una plantilla de turno (`ShiftTemplate`), por ejemplo *Turno Administrativo 08:00 - 17:00* con 10 minutos de tolerancia.
2. Crea una matriz semanal (`WorkSchedule`) marcando los días laborales y los días libres (`isDayOff`).
3. Asigna la matriz de horario al colaborador vía `WorkScheduleAssignment`.

### 🔹 Paso 3: Marcación de Asistencia (OmniAsistencia)
1. **Por Móvil / App:** El colaborador ingresa, la app verifica biometría nativa en el teléfono y calcula la distancia GPS contra el `Workplace` asignado.
2. **Por Terminal Hardware (ZKTeco / Hikvision):** El empleado apoya la huella o rostro en el terminal físico; el terminal envía el ID del evento procesado al endpoint de OrderFlow.
3. Si la marcación se realiza fuera del radio permitido, el registro se guarda con estado **`FLAGGED`** para revisión de RRHH.

---

## 4. CONTROL DE ACCESOS (RBAC) Y AUDITORÍA COMPLIANCE

El acceso a las funciones del módulo está estrictamente regido por el motor **RBAC** de OrderFlow:

| Acción | Permiso Requerido | Rol Típico |
|---|---|---|
| Crear Colaborador | `hr:employees:create` | Admin / RRHH |
| Consultar Legajos | `hr:employees:read` | Admin / RRHH / Jefe |
| Editar Legajo y Cargo | `hr:employees:update` | Admin / RRHH |
| Fichar Asistencia | `hr:attendance:mark` | Colaborador / Kiosko |
| Consultar Marcaciones | `hr:attendance:read` | Admin / RRHH / Auditor |

Todas las modificaciones en cargos (`position`), estado laboral (`status`) o gerencia asignada (`managerId`) quedan registradas de forma inmutable en **`EmployeeAuditLog`**, indicando el valor anterior, el nuevo valor y la identidad del usuario que ejecutó el cambio.
