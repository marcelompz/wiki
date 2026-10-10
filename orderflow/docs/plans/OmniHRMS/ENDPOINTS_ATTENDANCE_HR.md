# ENDPOINTS — Attendance + Human Capital (OmniFlow / OrderFlow)
**Versión del documento:** v1.0.0
**Propósito:** catálogo consolidado de todos los endpoints que necesitan `PLAN_FRONTEND_ADMIN_HR.md` y `PLAN_MOBILE_ASISTENCIA.md` para consumir los módulos `attendance` y `human-capital` ya ejecutados (`PLAN_OMNIASISTENCIAv2.md`, `PLAN_OMNICAPITALHUMANOv2.md`).

> **Advertencia:** los planes ejecutados definían el *modelo de datos* y las reglas de negocio, no siempre el path REST exacto de cada CRUD. Los endpoints marcados como ya documentados en los planes originales están tal cual; el resto son la convención REST estándar que se infiere de esos modelos, **a confirmar contra el código real** (`backend/src/attendance`, `backend/src/human-capital`) antes de que el frontend/mobile los consuma — los nombres de campos de los DTOs pueden diferir levemente de lo aquí escrito, especialmente por el patrón Contact↔Employee↔User que se agregó en la ejecución real.

---

## 1. Módulo `attendance`

### 1.1 Marcación (ya documentado en el plan original)
```
POST   /api/v1/attendance/mark                              → marcar asistencia (cualquier método)
GET    /api/v1/attendance/records                            → listar registros (filtros: employeeId, from, to, reviewStatus, method, workplaceId)
GET    /api/v1/attendance/records/:id                        → detalle de un registro
PATCH  /api/v1/attendance/records/:id/review                 → aprobar/rechazar registro FLAGGED
```

### 1.2 Sucursales / geocercas (`Workplace`)
```
GET    /api/v1/attendance/workplaces
POST   /api/v1/attendance/workplaces
GET    /api/v1/attendance/workplaces/:id
PATCH  /api/v1/attendance/workplaces/:id
DELETE /api/v1/attendance/workplaces/:id
```

### 1.3 Políticas de geocerca (`AttendancePolicy`)
```
GET    /api/v1/attendance/policies                           → filtros: role, employeeId
POST   /api/v1/attendance/policies
GET    /api/v1/attendance/policies/:id
PATCH  /api/v1/attendance/policies/:id
DELETE /api/v1/attendance/policies/:id
```

### 1.4 Turnos, horarios y feriados (`ShiftTemplate`, `WorkSchedule`, `Holiday`)
```
GET    /api/v1/attendance/shift-templates
POST   /api/v1/attendance/shift-templates
GET    /api/v1/attendance/shift-templates/:id
PATCH  /api/v1/attendance/shift-templates/:id
DELETE /api/v1/attendance/shift-templates/:id

GET    /api/v1/attendance/schedules                          → lista de WorkSchedule
POST   /api/v1/attendance/schedules
GET    /api/v1/attendance/schedules/:id                      → incluye WorkScheduleDetail (7 días)
PATCH  /api/v1/attendance/schedules/:id
PATCH  /api/v1/attendance/schedules/:id/details              → upsert masivo de los 7 WorkScheduleDetail (patrón de la grilla semanal)
DELETE /api/v1/attendance/schedules/:id

GET    /api/v1/attendance/schedules/assignments               → filtros: employeeId, vigentes vs históricas
POST   /api/v1/attendance/schedules/assignments               → crea una nueva WorkScheduleAssignment (cierra la anterior automáticamente si existe)
GET    /api/v1/attendance/schedules/assignments/:id
DELETE /api/v1/attendance/schedules/assignments/:id           → solo si aún no tiene assignedTo vigente cerrado

GET    /api/v1/attendance/holidays                            → filtros: jurisdiction, año
POST   /api/v1/attendance/holidays
GET    /api/v1/attendance/holidays/:id
PATCH  /api/v1/attendance/holidays/:id
DELETE /api/v1/attendance/holidays/:id

GET    /api/v1/attendance/shifts                              → WorkShift (turnos generados/reales), filtros: employeeId, from, to
POST   /api/v1/attendance/shifts                              → alta manual de un turno puntual (recurrente o ad-hoc por evento)
GET    /api/v1/attendance/shifts/:id
DELETE /api/v1/attendance/shifts/:id                          → usado también al aprobar un LeaveRequest, para cancelar turnos cubiertos
```

### 1.5 Terminales biométricos (`BiometricDevice`, `BiometricDeviceEnrollment`)
```
GET    /api/v1/attendance/devices
POST   /api/v1/attendance/devices
GET    /api/v1/attendance/devices/:id
PATCH  /api/v1/attendance/devices/:id
DELETE /api/v1/attendance/devices/:id

GET    /api/v1/attendance/devices/:id/enrollments
POST   /api/v1/attendance/devices/:id/enrollments             → vincula deviceUserId ↔ employeeId
DELETE /api/v1/attendance/devices/:id/enrollments/:enrollmentId

POST   /api/v1/attendance/webhooks/zkteco/:deviceToken        → push ZKTeco (ADMS/iClock) — llamado por el terminal, no por el frontend
POST   /api/v1/attendance/webhooks/hikvision/:deviceToken     → push Hikvision (ISAPI) — llamado por el terminal, no por el frontend
```

### 1.6 Reportes
```
GET    /api/v1/attendance/reports/summary                     → filtros: employeeId?, from, to → horas trabajadas, tardanzas, ausencias, horas extra, horas nocturnas
GET    /api/v1/attendance/reports/summary/:employeeId          → mismo reporte, un solo empleado
```
*(A confirmar: si el backend decidió exponer esto vía OmniBI en vez de un endpoint propio de `attendance`, según quedó abierto en `PLAN_OMNIASISTENCIA.md` Sprint 6 — verificar antes de que el frontend F-Sprint 8 lo consuma.)*

### 1.7 Servicio externo reusado (no vive en `attendance`, pero lo llama)
```
POST   /api/v1/nfc/scan                                        → en nfc-standalone, con { context: "attendance", ... }
```

---

## 2. Módulo `human-capital`

### 2.1 Identidad (`Contact` ↔ `Employee` ↔ `User`)

`Contact` y `User` **ya existen como módulos propios de OrderFlow** (paquete `contacts`, ya usado por POS/CRM) — `human-capital` los consume, no los reimplementa. Confirmar los paths reales antes de asumir estos:
```
GET    /api/v1/contacts                                        → ya existente, filtros: taxId/nationalId, nombre
POST   /api/v1/contacts                                        → ya existente
GET    /api/v1/contacts/:id                                    → ya existente
```

Endpoints propios de `human-capital`:
```
GET    /api/v1/human-capital/employees                         → filtros: status, position, branchId, managerId, nombre/nationalId
POST   /api/v1/human-capital/employees                          → { contactId (vincular existente) o datos para crear Contact nuevo, datos laborales, userId? }
GET    /api/v1/human-capital/employees/:id                      → incluye datos de Contact resuelto (nombre, cédula, contacto)
PATCH  /api/v1/human-capital/employees/:id                      → cualquier cambio a campo sensible dispara EmployeeAuditLog server-side
DELETE /api/v1/human-capital/employees/:id                      → soft-delete / status=TERMINATED, no borrado físico de legajo

GET    /api/v1/human-capital/employees/:id/audit-log            → EmployeeAuditLog, solo lectura
GET    /api/v1/human-capital/employees/:id/documents            → EmployeeDocument
POST   /api/v1/human-capital/employees/:id/documents
DELETE /api/v1/human-capital/employees/:id/documents/:docId
```

### 2.2 Contratación (`EmploymentContract`)
```
GET    /api/v1/human-capital/employees/:id/contracts
POST   /api/v1/human-capital/employees/:id/contracts
GET    /api/v1/human-capital/contracts/:id
PATCH  /api/v1/human-capital/contracts/:id                      → transición de status (DRAFT→IN_REVIEW→APPROVED→SIGNED→ACTIVE)
```

### 2.3 Remuneraciones (`PayrollConcept`, `CompensationPlan`)
```
GET    /api/v1/human-capital/payroll-concepts
POST   /api/v1/human-capital/payroll-concepts
GET    /api/v1/human-capital/payroll-concepts/:id
PATCH  /api/v1/human-capital/payroll-concepts/:id
DELETE /api/v1/human-capital/payroll-concepts/:id

GET    /api/v1/human-capital/employees/:id/compensation-plans   → histórico + vigente
POST   /api/v1/human-capital/employees/:id/compensation-plans   → crea uno nuevo, cierra el vigente (effectiveTo)
GET    /api/v1/human-capital/compensation-plans/:id              → incluye CompensationPlanLine[]
PATCH  /api/v1/human-capital/compensation-plans/:id/approve      → setea approvedBy, requiere usuario distinto de createdBy
```

### 2.4 Nómina (`PayrollRun`, `Payslip`)
```
GET    /api/v1/human-capital/payroll-runs                       → filtros: period, status
POST   /api/v1/human-capital/payroll-runs                       → crea el run en status=draft
POST   /api/v1/human-capital/payroll-runs/:id/calculate         → dispara el motor de cálculo → status=calculated
POST   /api/v1/human-capital/payroll-runs/:id/approve           → status=approved
POST   /api/v1/human-capital/payroll-runs/:id/close             → status=closed (bloquea recálculo directo)
POST   /api/v1/human-capital/payroll-runs/:id/reliquidate        → crea un nuevo PayrollRun vinculado al original, para corregir un período cerrado

GET    /api/v1/human-capital/payroll-runs/:id/payslips
GET    /api/v1/human-capital/payslips/:id                        → incluye PayslipLine[]
GET    /api/v1/human-capital/payslips/:id/receipt                → descarga del PDF (Payslip.fileUrl)
GET    /api/v1/human-capital/employees/:id/payslips              → histórico de recibos de un empleado (vista Colaborador)
```

### 2.5 Ausencias, vacaciones y amonestaciones
```
GET    /api/v1/human-capital/leave-requests                     → filtros: employeeId, status, managerId (para bandeja de Jefe)
POST   /api/v1/human-capital/leave-requests
GET    /api/v1/human-capital/leave-requests/:id
PATCH  /api/v1/human-capital/leave-requests/:id/approve
PATCH  /api/v1/human-capital/leave-requests/:id/reject           → body: { reason }
PATCH  /api/v1/human-capital/leave-requests/:id/cancel

GET    /api/v1/human-capital/employees/:id/vacation-balance      → filtro: year
PATCH  /api/v1/human-capital/employees/:id/vacation-balance      → ajuste manual excepcional, requiere reason (solo RRHH/Administrador)

GET    /api/v1/human-capital/reprimands                          → filtros: employeeId, severity
POST   /api/v1/human-capital/reprimands                          → body opcional: relatedAttendanceRecordId
GET    /api/v1/human-capital/reprimands/:id
```

### 2.6 Parámetros legales (`LegalParameter`)
```
GET    /api/v1/human-capital/legal-parameters                    → filtros: key, jurisdiction, status
POST   /api/v1/human-capital/legal-parameters                    → siempre nace status=DRAFT
GET    /api/v1/human-capital/legal-parameters/:id
PATCH  /api/v1/human-capital/legal-parameters/:id
PATCH  /api/v1/human-capital/legal-parameters/:id/status          → transición DRAFT→REVIEWED→PUBLISHED→RETIRED (solo Administrador)
GET    /api/v1/human-capital/legal-parameters/resolve             → query: key, jurisdiction, date → devuelve el vigente a esa fecha
```

### 2.7 RBAC / roles
```
GET    /api/v1/human-capital/roles                                → catálogo de roles del módulo (Colaborador/Jefe/RRHH/Nómina/Auditor/Administrador)
GET    /api/v1/human-capital/employees/:id/role                   → rol efectivo del empleado en el módulo, para condicionar menú del frontend
```
*(A confirmar contra el mecanismo de auth/roles real de OrderFlow — puede que esto no sea un endpoint propio de `human-capital` sino que se resuelva desde el token de sesión/`auth` ya existente.)*

---

## 3. Notas para quien consuma este catálogo

- **No asumir 1:1** entre este documento y el código real: es un catálogo de referencia armado a partir de los modelos y reglas de negocio ya definidos en los planes v2, para que el frontend/mobile tengan un mapa completo desde el arranque. Antes de cablear cada pantalla, el Implementador debe correr algo como `grep -r "@Controller\|@Get\|@Post\|@Patch\|@Delete" backend/src/attendance backend/src/human-capital` (o el equivalente que use el proyecto) y ajustar paths/verbos donde difieran.
- **Paginación y formato de respuesta:** este documento no define el shape de paginación (cursor vs offset) ni el envelope de respuesta (`{ data, meta }` vs array plano) porque eso ya debería estar estandarizado en otros módulos de OrderFlow — reusar esa convención existente, no inventar una nueva para `attendance`/`human-capital`.
- **Autenticación:** todos los endpoints salvo los webhooks de terminales biométricos (sección 1.5) requieren el mecanismo de auth ya existente en OrderFlow (JWT/sesión + `tenantId` del contexto) — no hay endpoints públicos adicionales más allá de esos dos webhooks.
