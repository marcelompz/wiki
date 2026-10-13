# AUDITORÍA — Despliegue real de `backend/src/hr` vs. planes (v1.21.01)
**Fecha del análisis:** 31/08/2026 — tarball `orderflow_1.21.01_hr-audit.tar.gz`
**Estado oficial según `featurelist.json`:** `FEAT-107` (OmniCapitalHumano) = `in_progress`, `FEAT-108` (OmniAsistencia) = `pending`. `plan_progress`: Fase 1 (Core Backend & DB) = `in_progress`, Fase 2 (Marcador Asistencia) = `pending`, Fase 3 (Microservicio Standalone) = `pending`.

**Resumen en una línea:** lo que hay desplegado es un **MVP muy delgado** — el `schema.prisma` tiene prácticamente todos los modelos planeados, pero el `HrController`/`HrService` reales solo exponen **6 endpoints** (CRUD básico de `Employee` + marcar/listar asistencia). Todo lo demás — horarios, feriados, nómina, ausencias, terminales biométricos, RBAC, integraciones — existe en el modelo de datos pero no tiene API ni lógica de negocio todavía. Esto coincide con lo que dice `featurelist.json`: el propio proyecto ya sabía que estaba en Fase 1 parcial.

---

## 1. Lo que SÍ está implementado

| Endpoint real | Método HTTP | Coincide con el plan |
|---|---|---|
| `POST /api/v1/hr/employees` | Crear `Employee`, valida `nationalId` único por tenant | Sí (aunque sin flujo de `Contact`) |
| `GET /api/v1/hr/employees` | Lista con `manager` y `workScheduleAssignments` incluidos | Parcial (sin filtros, sin paginación) |
| `GET /api/v1/hr/employees/:id` | Detalle con `contracts`, `compensationPlans`, `leaveRequests`, `vacationBalances`, `reprimands`, últimos 20 `attendanceRecords` | Sí |
| `PUT /api/v1/hr/employees/:id` | Actualiza, registra `EmployeeAuditLog` **solo si cambia `position`** | Parcial — el plan pedía auditar *cualquier* campo sensible (`status`, `managerId` también), acá solo `position` dispara el log |
| `POST /api/v1/hr/attendance/scan` | Crea `AttendanceRecord`, calcula `distanceMeters` con Haversine | Parcial — ver gap crítico #2 abajo |
| `GET /api/v1/hr/attendance/records` | Lista últimas 100, filtro solo por `employeeId` | Parcial (sin filtro de fecha ni `reviewStatus`) |

El `schema.prisma` sí tiene ya los ~20 modelos de ambos planes (`ShiftTemplate`, `WorkSchedule`, `Holiday`, `LegalParameter`, `BiometricDevice`, `AttendancePolicy`, etc.) — el trabajo de modelado de datos está prácticamente completo. El cuello de botella es **la capa de servicio/controlador**, que solo cubre una fracción de esos modelos.

---

## 2. Gaps críticos (por impacto, no por orden de sprint)

### 2.1 No hay RBAC — cualquiera con `x-tenant-id` puede llamar cualquier endpoint
El proyecto ya tiene un mecanismo reusable (`PermissionsGuard` + `@RequirePermissions(...)`, en `backend/src/common/permissions.guard.ts`), usado en otros módulos. `HrController` **no lo importa ni lo aplica en ningún endpoint**. Hoy, un usuario autenticado de cualquier rol puede crear/editar legajos y marcar asistencia de cualquier empleado. Esto es más urgente que cualquier feature nueva — los roles Colaborador/Jefe/RRHH/Nómina/Auditor/Administrador del plan no existen en la práctica todavía.

### 2.2 `AttendancePolicy` existe en el schema pero nunca se consulta
El servicio de `recordAttendance` calcula la distancia y, si excede `workplace.radiusMeters`, **siempre** marca `FLAGGED` — no hay ninguna consulta a `AttendancePolicy` por `employeeId`/`role`, así que:
- El modo `STRICT` (bloquear la marcación) nunca se aplica, aunque el enum `GeofenceEnforcement` existe.
- El modo `NONE` (no validar) tampoco se respeta — si hay `workplaceId`+coordenadas, siempre valida.
- No hay resolución de prioridad `employeeId` > `role` > default de tenant, como pedía el plan.

En la práctica, hoy el sistema se comporta como si **todo el tenant tuviera política `FLAG` fija**, sin importar lo que se cargue en `AttendancePolicy`.

### 2.3 No existe el endpoint de revisión (`PATCH .../review`)
Los registros quedan `FLAGGED` para siempre — no hay forma de que RRHH los apruebe o rechace vía API. El campo `reviewedBy`/`reviewedAt`/`reviewNote` del modelo está sin usar.

### 2.4 Motor de nómina inexistente (no solo incompleto — directamente no está en el schema)
`PayrollConcept`, `PayrollRun`, `Payslip` y `CompensationPlanLine` **no están en `schema.prisma`**. Lo único que hay es `CompensationPlan.baseSalary` como número plano, sin desglose de conceptos, sin período, sin cálculo de horas extra/nocturnas/feriado, sin recibo. Esto es más atrás de lo que sugiere `plan_progress` en `featurelist.json` — ni siquiera el modelo de datos de nómina se migró todavía.

### 2.5 El patrón Contact↔Employee↔User del README no está implementado
El `README.md` del módulo describe la "Relación Tripartita Odoo-Style" como una característica ya construida, pero:
- `Employee` no tiene `contactId` ni `userId` en el schema.
- `CreateEmployeeDto` no acepta ni resuelve un `Contact` existente por `nationalId` — el `Employee` se crea aislado, duplicando datos de identidad que ya podrían existir en `contacts`.
Esto es una **discrepancia entre documentación y código real** que conviene corregir antes de que alguien más construya sobre el supuesto de que ese vínculo ya existe (por ejemplo, el frontend admin).

### 2.6 Sin endpoints para: `Workplace`, `ShiftTemplate`, `WorkSchedule`/`WorkScheduleDetail`/`WorkScheduleAssignment`, `Holiday`, `BiometricDevice`/`BiometricDeviceEnrollment`, `LeaveRequest`, `VacationBalance`, `Reprimand`, `LegalParameter`, `EmploymentContract`, `EmployeeDocument`
Todos estos modelos existen en `schema.prisma` (algunos hasta están `include`idos en las consultas, ej. `workScheduleAssignments` en `getEmployees`), pero **no tienen ni un solo endpoint** en `HrController`. Sin esto:
- No se puede cargar un horario, feriado, ni terminal biométrico desde la API — solo por acceso directo a la base.
- `LeaveRequest`/`VacationBalance`/`Reprimand` no se pueden crear ni consultar (aunque aparecen en el `include` del detalle de empleado, así que se ven vacíos siempre).
- Nadie puede aprobar contratos, ni subir documentos del legajo.

Nota: `CreateWorkScheduleDto` **ya existe** en `dto/attendance.dto.ts`, pero no está conectado a ningún método del controlador — es código muerto a medio camino, señal de que se empezó y se dejó pausado.

### 2.7 Integraciones no wireadas: NFC, terminales biométricos, EventOps
- `RecordAttendanceDto.nfcScanLogId` se acepta y se guarda tal cual, pero no hay ninguna llamada real a `nfc-standalone`, ni verificación de que ese scan exista — es un campo de paso, no una integración.
- No hay webhooks de ZKTeco/Hikvision (`biometricDeviceId`/`deviceEventRawId` existen en el modelo, sin ningún endpoint que los reciba).
- No hay resolución de `Workplace.isEventBased` contra EventOps — el campo existe, la lógica no.

### 2.8 Sin tests
No hay ningún `.spec.ts` para `hr.controller.ts` ni `hr.service.ts` — el resto de los módulos del repo (`giveaways`, `contacts`, `orders`) sí tienen sus specs. Esto es consistente con el estado "MVP en progreso", pero conviene levantarlo antes de agregar RBAC/nómina encima, para no construir sobre una base sin cobertura.

### 2.9 Detalles menores
- `PUT` en vez de `PATCH` para actualizar `Employee` (funcionalmente no bloquea nada, pero difiere de la convención REST que usaba el resto de los planes).
- `getEmployees`/`getAttendanceRecords` no tienen paginación real (solo `take: 100` fijo en attendance) — en un tenant con muchos empleados esto se vuelve un problema pronto.
- `LegalParameter.valueJson` (Json) en vez de `value: String` + `legalSource: String` del plan — perdió el campo `legalSource` (la cita de la norma legal), que era parte central del enfoque "compliance-by-design" del documento que adjuntaste originalmente.

---

## 3. Qué NO es un gap (aclaración para no sobre-corregir)

- Es **correcto y esperado** que el frontend (`PLAN_FRONTEND_ADMIN_HR.md`) y la app móvil (`PLAN_MOBILE_ASISTENCIA.md`) todavía no tengan nada que consumir más allá de estos 6 endpoints — no tiene sentido avanzar esos planes todavía sobre una API tan parcial.
- El cálculo de Haversine está bien implementado y coincide con lo pedido (server-side, no confía en el cliente).
- La estructura de `EmployeeAuditLog` (aunque subutilizada) es correcta cuando se usa.
- El nombre final del módulo quedó unificado como `hr` (no separado en `attendance`/`human-capital` como decían los planes originales) — es una decisión de organización de carpetas razonable, no un error; solo hay que usarlo de forma consistente en la documentación de acá en adelante.

---

## 4. Orden de prioridad sugerido para cerrar los gaps

No es un sprint plan nuevo — es una relectura de los sprints ya definidos en `PLAN_OMNICAPITALHUMANOv2.md`/`PLAN_OMNIASISTENCIAv2.md`, priorizados por lo que ya está expuesto en producción:

1. **RBAC (2.1)** — es un hueco de seguridad sobre endpoints que ya están vivos y en uso, no una feature pendiente. Aplicar `PermissionsGuard`/`@RequirePermissions` a `HrController` antes de sumar nada más.
2. **Resolución real de `AttendancePolicy` + endpoint de revisión (2.2, 2.3)** — el comportamiento actual (`FLAG` fijo para todos) puede estar dando una falsa sensación de control de geocerca por rol que no existe.
3. **Corregir el README/documentación del patrón Contact↔Employee↔User (2.5)** — antes de que el frontend asuma ese vínculo al construir el alta de empleados.
4. **Workplaces, ShiftTemplate/WorkSchedule/Holiday (2.6)** — desbloquea el uso real de lo que ya está en el schema y es prerequisito para que la asistencia tenga contra qué compararse.
5. **Ausencias/vacaciones/amonestaciones y EmploymentContract (2.6)** — ya están en el `include` del detalle de empleado, así que completar sus endpoints es la forma más rápida de que el legajo se sienta completo.
6. **Motor de nómina desde cero (2.4)** — es el gap más grande de trabajo nuevo (modelos + lógica), conviene encararlo como su propio bloque, no intercalado con lo demás.
7. **Terminales biométricos y NFC real (2.7)** — depende de que haya hardware/tags físicos disponibles para probar, tiene sentido dejarlo último de este grupo.
8. **Tests (2.8)** — ir agregando `.spec.ts` a medida que se toca cada endpoint, no como bloque separado al final.

¿Querés que te arme los prompts de implementación concretos para cerrar los puntos 1 a 3 (los más urgentes), en el mismo formato que los planes anteriores?
