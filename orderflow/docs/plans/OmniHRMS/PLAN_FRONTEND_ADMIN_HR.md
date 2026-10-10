# PLAN FRONTEND — Admin Capital Humano y Asistencia (`/admin/hr`)
**Proyecto:** OmniFlow / OrderFlow
**Versión del documento:** v1.0.0
**Stack:** Refine.dev + Ant Design (mismo patrón que el resto del admin de OmniFlow), consumiendo los endpoints de `human-capital` y `attendance` ya ejecutados (`PLAN_OMNICAPITALHUMANOv2.md`, `PLAN_OMNIASISTENCIAv2.md`)
**Base de rutas:** `provecchio.com/admin/hr/*`

---

## 0. Alcance y supuestos

Este plan cubre el **panel de administración web**, no la app móvil (ver `PLAN_MOBILE_ASISTENCIA.md`, documento hermano). Se apoya en los modelos ya implementados:

- `human-capital`: `Employee` (vinculado a `Contact`/`User` vía el patrón tripartito Odoo-like), `EmploymentContract`, `PayrollConcept`, `CompensationPlan`, `PayrollRun`/`Payslip`, `LeaveRequest`, `VacationBalance`, `Reprimand`, `LegalParameter`.
- `attendance`: `Workplace`, `AttendancePolicy`, `AttendanceRecord`, `ShiftTemplate`, `WorkSchedule`/`WorkScheduleDetail`/`WorkScheduleAssignment`, `Holiday`, `BiometricDevice`/`BiometricDeviceEnrollment`.

**Antes de arrancar, verificar contra el repo real** (el Implementador debe leerlo, no asumir): nombres exactos de los DTOs/endpoints que haya generado el agente que ejecutó los planes v2 pueden diferir levemente de lo documentado acá — leer `docs/00-contexto-agentes.md` y el código de `backend/src/human-capital` y `backend/src/attendance` antes de generar los `resources` de Refine.

**RBAC:** el panel debe respetar los roles ya definidos (Colaborador, Jefe, RRHH, Nómina, Auditor, Administrador) — un mismo layout de `/admin/hr` pero con menú y acciones condicionadas por rol, no páginas separadas por rol.

---

## 1. Mapa de navegación (resources de Refine)

```
/admin/hr
├── /employees                    → Legajo (Employee + Contact)
│   ├── /employees/create
│   ├── /employees/edit/:id
│   └── /employees/show/:id       → tabs: Datos, Contrato, Compensación, Documentos, Auditoría, Asistencia
├── /employees/:id/contracts      → EmploymentContract (histórico, dentro del show del empleado)
├── /compensation-plans           → CompensationPlan (aprobación en dos pasos)
├── /payroll-concepts             → PayrollConcept (catálogo, solo Administrador/Nómina)
├── /payroll-runs                 → PayrollRun (listar por período)
│   └── /payroll-runs/show/:id    → Payslips del período, estado, cierre
├── /leave-requests                → LeaveRequest (bandeja de aprobación para Jefe/RRHH)
├── /vacation-balances             → VacationBalance (consulta, ajuste manual excepcional)
├── /reprimands                    → Reprimand
├── /legal-parameters               → LegalParameter (solo Administrador, flujo DRAFT→REVIEWED→PUBLISHED)
├── /schedules                     → WorkSchedule + WorkScheduleDetail (builder visual semanal)
├── /shift-templates               → ShiftTemplate (catálogo de turnos reutilizables)
├── /holidays                      → Holiday (calendario)
├── /workplaces                    → Workplace (sucursales/geocercas, ya usado por otros módulos)
├── /attendance-policies           → AttendancePolicy (por rol/empleado)
├── /attendance-records             → AttendanceRecord (bandeja de revisión FLAGGED + histórico)
├── /biometric-devices              → BiometricDevice + enrollments (ZKTeco/Hikvision)
└── /reports                       → Reportes (horas, tardanzas, ausencias) — puede ser iframe/link a OmniBI si ese módulo ya expone el dashboard
```

---

## 2. Pantallas prioritarias (detalle)

### 2.1 Legajo del empleado (`/employees`)
- **Lista:** tabla con filtros por `status`, `position`, `branchId`; búsqueda por nombre/`nationalId`.
- **Alta (`create`):** formulario en pasos — (1) datos de `Contact` (si no existe, crearlo; si existe por `nationalId`, vincularlo, no duplicar), (2) datos laborales de `Employee`, (3) opcional: crear cuenta de `User` (checkbox "dar acceso al sistema").
- **Detalle (`show`):** tabs:
  - **Datos:** identificación + datos laborales, con botón "Editar" que pasa por `EmployeeAuditLog` (mostrar historial de cambios en un sub-tab "Auditoría", solo lectura).
  - **Contrato:** timeline de `EmploymentContract` (Borrador→Revisión→Aprobado→Firmado→Vigente), con badge de estado.
  - **Compensación:** `CompensationPlan` vigente + histórico, botón "Nuevo plan" (exige `approvedBy` antes de guardar como vigente — el form no permite marcar vigente sin un segundo usuario aprobador).
  - **Vacaciones:** `VacationBalance` del año actual (días ganados/tomados, barra de progreso) + historial de `LeaveRequest`.
  - **Amonestaciones:** listado de `Reprimand`, alta rápida desde acá o desde el detalle de un `AttendanceRecord`.
  - **Asistencia:** últimas marcaciones del empleado (`AttendanceRecord`), horario asignado (`WorkScheduleAssignment` vigente).

### 2.2 Bandeja de asistencia (`/attendance-records`)
- Vista principal: **filtro por defecto `reviewStatus = FLAGGED`** (lo que RRHH necesita resolver hoy), con acceso a "ver todo" para el histórico completo.
- Cada fila expandible muestra: método (ícono distinto por NFC/QR/PIN/MOBILE_APP/DEVICE_BIOMETRIC), distancia a la geocerca si aplica, selfie si existe (con blur por defecto, click para revelar — dato sensible), y botones **Aprobar/Rechazar** que llaman a `PATCH /attendance/records/:id/review`.
- Vista de calendario/timeline por empleado (cruce visual `WorkSchedule` esperado vs `AttendanceRecord` real) — útil para que RRHH vea tardanzas/ausencias de un vistazo antes de ir al reporte formal.

### 2.3 Builder de horarios (`/schedules`)
- Grilla semanal (7 columnas, día por día) donde cada celda asigna un `ShiftTemplate` o se marca como `isDayOff`.
- Al guardar, genera/actualiza `WorkScheduleDetail` para cada día.
- Un segundo paso asigna el `WorkSchedule` resultante a uno o varios `Employee` (`WorkScheduleAssignment`, con `assignedFrom`/`assignedTo` — versionado, igual que `CompensationPlan`: no se edita una asignación vigente, se cierra y se crea una nueva).

### 2.4 Nómina (`/payroll-runs`)
- Lista de `PayrollRun` por período, con estado (draft/calculated/approved/closed).
- Botón "Calcular período" (dispara el motor de cálculo del backend) — solo visible para rol Nómina/Administrador.
- Detalle: tabla de `Payslip` por empleado, desglose de `PayslipLine` al expandir, botón de descarga del PDF del recibo.
- Cierre de `PayrollRun` requiere confirmación explícita (doble check) porque bloquea recálculo posterior.

### 2.5 Parámetros legales (`/legal-parameters`)
- Tabla con `key`, `value`, `status`, `effectiveFrom`/`effectiveTo`, `legalSource`.
- **El botón para pasar de `DRAFT`/`REVIEWED` a `PUBLISHED` debe mostrar una advertencia explícita** ("¿Confirmás que este valor fue validado por un contador/abogado local?") antes de habilitar el cambio — reflejar en la UI la misma cautela que ya está en los prompts de backend.

### 2.6 Terminales biométricos (`/biometric-devices`)
- Alta de `BiometricDevice` (vendor, protocolo, número de serie, `Workplace`).
- Sub-vista de `BiometricDeviceEnrollment`: tabla simple para vincular manualmente cada `deviceUserId` reportado por el equipo a un `Employee` — este paso es manual por diseño (ver `PLAN_OMNIASISTENCIA.md` sección 1bis), así que la UI debe dejarlo explícito, no intentar automatizarlo.

---

## 3. Roadmap por sprints (frontend)

| Sprint | Contenido | Depende de |
|---|---|---|
| F-Sprint 0 | Setup del resource base `/admin/hr` en Refine (layout, menú condicionado por rol, auth guard) | Backend Sprint 0 de ambos módulos ejecutados |
| F-Sprint 1 | Legajo (`/employees` CRUD completo + tabs de detalle) | F-Sprint 0 |
| F-Sprint 2 | Bandeja de asistencia (`/attendance-records`) + `/workplaces` + `/attendance-policies` | F-Sprint 0 |
| F-Sprint 3 | Builder de horarios (`/schedules`, `/shift-templates`, `/holidays`) | F-Sprint 1 |
| F-Sprint 4 | Compensación y nómina (`/compensation-plans`, `/payroll-concepts`, `/payroll-runs`) | F-Sprint 1 |
| F-Sprint 5 | Ausencias, vacaciones, amonestaciones (`/leave-requests`, `/vacation-balances`, `/reprimands`) | F-Sprint 1 |
| F-Sprint 6 | Parámetros legales (`/legal-parameters`) — solo Administrador | — |
| F-Sprint 7 | Terminales biométricos (`/biometric-devices`) | F-Sprint 2 |
| F-Sprint 8 | Reportes / dashboard (link o embed a OmniBI si corresponde) | F-Sprint 2, 3, 4 |

---

## 4. Prompts de implementación por fase

> Seguir el protocolo de [[orderflow-protocolo]]: leer `docs/00-contexto-agentes.md` primero, usar Refine.dev + Ant Design (patrón ya establecido en el admin de OmniFlow), Axios como cliente HTTP oficial, no mezclar marca "OmniCapitalHumano"/"OmniAsistencia" con nombres técnicos de rutas/componentes salvo en textos visibles al usuario.

### Prompt F-Sprint 0 — Setup del resource base
```
Actuá como Implementador del frontend admin de OrderFlow (Refine.dev + Ant Design). Antes de tocar código, leé
docs/00-contexto-agentes.md y revisá cómo están estructurados los resources existentes del admin (ej. products,
orders) para seguir el mismo patrón de carpetas y convenciones.

Tarea: crear la base de navegación /admin/hr:
1. Registrar el grupo de resources hr.* en el config de Refine (employees, compensation-plans, payroll-concepts,
   payroll-runs, leave-requests, vacation-balances, reprimands, legal-parameters, schedules, shift-templates,
   holidays, workplaces, attendance-policies, attendance-records, biometric-devices), apuntando a los endpoints
   reales de human-capital y attendance (leer el código del backend para confirmar los paths exactos antes de
   hardcodearlos).
2. Menú lateral condicionado por rol (Colaborador/Jefe/RRHH/Nómina/Auditor/Administrador) — un Colaborador no
   debe ver siquiera la opción de menú a compensation-plans o legal-parameters.
3. Auth guard reusando el mecanismo de autenticación ya existente en el admin de OmniFlow (no crear uno nuevo).
No implementar todavía las pantallas de detalle de cada resource — eso es F-Sprint 1 en adelante.
```

### Prompt F-Sprint 1 — Legajo
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe la base de /admin/hr (F-Sprint 0).

Tarea: implementar el resource employees completo según PLAN_FRONTEND_ADMIN_HR.md (sección 2.1).
- Lista con filtros (status, position, branchId) y búsqueda por nombre/nationalId.
- Alta en pasos: datos de Contact (buscar/vincular por nationalId antes de crear uno nuevo, para no duplicar
  identidad), datos laborales de Employee, checkbox opcional para crear User de acceso.
- Detalle (show) con tabs: Datos, Contrato, Compensación, Vacaciones, Amonestaciones, Asistencia, Auditoría
  (esta última solo lectura, mostrando EmployeeAuditLog).
- El tab Compensación no debe permitir marcar un CompensationPlan como vigente sin approvedBy — reflejar en el
  form que hace falta una segunda persona que apruebe, no solo quien lo carga.
Antes de asumir los nombres exactos de campos del DTO de Employee/Contact, leer el código real del backend
human-capital ejecutado (puede diferir levemente del schema documentado en PLAN_OMNICAPITALHUMANOv2.md).
```

### Prompt F-Sprint 2 — Bandeja de asistencia
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con employees (F-Sprint 1).

Tarea: implementar attendance-records, workplaces y attendance-policies según PLAN_FRONTEND_ADMIN_HR.md
(sección 2.2).
- attendance-records: filtro por defecto reviewStatus=FLAGGED, fila expandible con método/distancia/selfie
  (selfie con blur por defecto, requiere click para revelar), botones Aprobar/Rechazar que llaman a
  PATCH /attendance/records/:id/review.
- Agregar una vista de calendario/timeline simple por empleado que cruce visualmente WorkSchedule esperado vs
  AttendanceRecord real (puede ser una librería de calendario ya usada en otro módulo del admin, reusarla en
  vez de agregar una dependencia nueva si es posible).
- workplaces y attendance-policies: CRUD simple, sin lógica especial más allá de los formularios.
```

### Prompt F-Sprint 3 — Builder de horarios
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con employees y attendance-records
(F-Sprint 1-2).

Tarea: implementar schedules, shift-templates y holidays según PLAN_FRONTEND_ADMIN_HR.md (sección 2.3).
- shift-templates: CRUD simple de ShiftTemplate (nombre, horario, breakDurationMins, gracePeriodMins,
  isOvernight).
- holidays: CRUD de Holiday, con vista de calendario anual.
- schedules: grilla semanal (7 columnas) donde cada celda asigna un ShiftTemplate o se marca isDayOff; al
  guardar, crea/actualiza los WorkScheduleDetail correspondientes. Segundo paso: asignar el WorkSchedule
  resultante a uno o varios Employee (WorkScheduleAssignment) — el form debe dejar claro que asignar un nuevo
  horario a un empleado con una asignación vigente cierra la anterior (assignedTo = fecha de la nueva
  assignedFrom), no la sobreescribe.
```

### Prompt F-Sprint 4 — Compensación y nómina
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con employees (F-Sprint 1).

Tarea: implementar compensation-plans, payroll-concepts y payroll-runs según PLAN_FRONTEND_ADMIN_HR.md
(sección 2.4).
- payroll-concepts: CRUD simple, solo visible para Nómina/Administrador.
- compensation-plans: alta de un nuevo plan para un Employee, con líneas (CompensationPlanLine) editables
  como sub-tabla del formulario; requiere approvedBy antes de considerarse vigente.
- payroll-runs: lista por período, botón "Calcular período" (visible solo Nómina/Administrador) que dispara el
  cálculo en backend; detalle con tabla de Payslip por empleado, desglose de PayslipLine al expandir, descarga
  del PDF del recibo. El cierre de un PayrollRun requiere un modal de confirmación explícito, dejando claro
  que no se puede recalcular después salvo una reliquidación nueva.
```

### Prompt F-Sprint 5 — Ausencias, vacaciones y amonestaciones
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con employees (F-Sprint 1).

Tarea: implementar leave-requests, vacation-balances y reprimands según PLAN_FRONTEND_ADMIN_HR.md.
- leave-requests: bandeja de aprobación (vista principal filtrada por status=REQUESTED) visible para Jefe
  (solo de sus reports, vía Employee.managerId) y RRHH (todos); botones Aprobar/Rechazar con campo de motivo
  opcional al rechazar.
- vacation-balances: vista de solo consulta por empleado/año, con opción de ajuste manual excepcional
  (solo RRHH/Administrador, dejando reason obligatorio en el ajuste).
- reprimands: alta y listado, con opción de vincular un AttendanceRecord existente (relatedAttendanceRecordId)
  si se está creando la amonestación desde la bandeja de asistencia.
```

### Prompt F-Sprint 6 — Parámetros legales
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr (F-Sprint 0 en adelante), este
resource solo debe ser visible para el rol Administrador.

Tarea: implementar legal-parameters según PLAN_FRONTEND_ADMIN_HR.md (sección 2.5).
- Tabla con key, value, status, effectiveFrom/effectiveTo, legalSource.
- El cambio de status a PUBLISHED debe abrir un modal de confirmación explícito con el texto: "¿Confirmás que
  este valor fue validado por un contador/abogado local antes de publicarlo?" — sin esa confirmación explícita
  en el modal, no se debe habilitar el botón de guardar el cambio de estado.
```

### Prompt F-Sprint 7 — Terminales biométricos
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con attendance-records
(F-Sprint 2).

Tarea: implementar biometric-devices según PLAN_FRONTEND_ADMIN_HR.md (sección 2.6).
- Alta de BiometricDevice (vendor, protocolo, número de serie, Workplace).
- Sub-vista de enrollments: tabla para vincular manualmente cada deviceUserId reportado por el terminal a un
  Employee (buscador por nombre/nationalId). Dejar explícito en la UI que este vínculo es manual, no automático.
```

### Prompt F-Sprint 8 — Reportes
```
Actuá como Implementador del frontend admin de OrderFlow. Ya existe /admin/hr con attendance-records, schedules
y payroll-runs (F-Sprint 2-4).

Tarea: implementar la vista de reportes (horas trabajadas, tardanzas, ausencias, horas extra) según lo que
exponga el backend (PLAN_OMNIASISTENCIA.md Sprint 6). Si el backend decidió exponer esto como fuente de datos
para OmniBI en vez de un endpoint propio de attendance, esta pantalla debe ser un link o embed al dashboard de
OmniBI correspondiente, no una reimplementación del cálculo en el frontend. Confirmar con el usuario cuál de
las dos rutas se tomó en el backend antes de implementar.
```
