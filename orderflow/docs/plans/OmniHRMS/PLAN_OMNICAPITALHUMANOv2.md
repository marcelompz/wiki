# PLAN DE DESARROLLO — OmniCapitalHumano (Módulo de Capital Humano / RRHH)
**Proyecto:** OmniFlow / OrderFlow
**Versión del documento:** v1.0.0
**Feature ID sugerido:** FEAT-XXX (asignar el próximo libre según `featurelist.json` al momento de implementar)
**Nombre técnico interno (OrderFlow):** `human-capital` o `hr` (no usar "OmniCapitalHumano"/"OmniAsistencia" en código, tablas, rutas ni colas — son solo marca comercial, según convención de [[orderflow-protocolo]])
**Nombre comercial (OmniFlow):** OmniCapitalHumano
**Jurisdicción inicial de referencia:** Paraguay (compliance-by-design, parametrizable — ver sección 6)

---

## 0. Por qué este plan existe

Al diseñar el marcador de asistencia ([[omniflow-asistencia]], `PLAN_OMNIASISTENCIA.md`) surgió que OmniFlow **no tiene todavía dónde aplicarlo**: no existe un modelo de `Employee` propio con legajo, contrato, cargo y estructura salarial. Este documento resuelve esa base faltante, priorizando lo administrativo (legajo, remuneraciones, asistencia, faltas) y dejando lo no urgente (SST, teletrabajo formal, portal de colaborador) documentado como Fase 2.

**Relación con planes existentes:**
- El módulo `attendance` de `PLAN_OMNIASISTENCIA.md` **no se reescribe** — este plan le agrega la entidad `Employee` que le faltaba como base, y sus tablas (`AttendanceRecord`, `WorkShift`, `AttendancePolicy`) pasan a referenciar `Employee.id` en vez de un `employeeId` suelto sin tabla propia.
- Los conceptos de nómina que impliquen asientos contables se integran más adelante con [[omniledger-fastapi]] vía el mismo patrón DTO canónico/adapter que ya usa OrderFlow para otras integraciones — **no se construye lógica contable dentro de `human-capital`**, solo se emite el evento correspondiente.
- El personal de eventos (Vivento/EventOps) definido en [[eventops]] es un caso de uso explícito de `Employee` con turnos ad-hoc, no una tabla paralela.

**Fuente del marco legal:** el usuario adjuntó `matriz_de_cumplimiento_capital_humano.md`, un análisis del marco normativo paraguayo (Código del Trabajo, MTESS/REOP, IPS, Ley 1.682/2001 de datos personales, SST, teletrabajo, DNIT). Este plan traduce ese marco a modelo de datos y sprints, pero **no reemplaza la revisión de un abogado laboralista/contador local antes de producción** — ver limitaciones en la sección 8.

---

## 1. Alcance de esta fase (administración)

**Entra en esta fase:**
1. Legajo digital del colaborador (`Employee`) — identificación, datos laborales, datos de nómina, historial inmutable.
2. Contratación y movimientos básicos (`EmploymentContract`, flujo de estados).
3. Remuneraciones / nómina parametrizable (`PayrollConcept`, `CompensationPlan`, `PayrollRun`, `Payslip`).
4. Asistencia (ya diseñado en `PLAN_OMNIASISTENCIA.md`) — se conecta a `Employee`.
5. Faltas, ausencias y vacaciones (`LeaveRequest`, `VacationBalance`, `Absence`).
6. Amonestaciones (`Reprimand`) — mencionado como comentario en el plan de asistencia, se implementa acá.
7. Parámetros legales versionados (`LegalParameter`) — motor de compliance-by-design, aunque el cálculo fino de IPS/aguinaldo se deja parametrizable, no hardcodeado.
8. RBAC específico del módulo (Colaborador, Jefe, RRHH, Nómina, Auditor, Administrador).
9. Bitácora de auditoría no editable para legajo y nómina.

**Queda fuera de esta fase (Fase 2, documentado en sección 7):**
- Seguridad y Salud Ocupacional (SST): accidentes, exámenes médicos, matriz de riesgos.
- Teletrabajo formal (Ley 6.738): acuerdos específicos, control tecnológico.
- Exportadores reales a REOP/IPS/DNIT (se deja el modelo preparado, pero la integración/adaptador real es Fase 2).
- Firma electrónica de contratos y recibos.
- Portal móvil del colaborador (autoservicio) — más allá de la app de marcación de asistencia ya planeada.
- Analítica de rotación/ausentismo/costo laboral avanzada.

---

## 2. Modelo de datos (Prisma) — núcleo

```prisma
enum EmploymentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  SIGNED
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum ContractType {
  INDEFINITE       // plazo indefinido
  FIXED_TERM       // plazo fijo
  TRIAL_PERIOD     // período de prueba
  PART_TIME
  SEASONAL         // útil para personal de eventos/Vivento
}

enum WorkModality {
  ON_SITE
  HYBRID
  REMOTE
}

model Employee {
  id                String            @id @default(cuid())
  tenantId          String
  branchId          String?           // sucursal (reusa Workplace de attendance donde aplique)
  costCenterId      String?

  // Identificación
  firstName         String
  lastName          String
  nationalId        String            // cédula
  birthDate         DateTime?
  nationality       String?
  address           String?
  phone             String?
  email             String?

  // Datos laborales
  position          String
  managerId         String?           // jefe directo, self-relation
  workModality      WorkModality      @default(ON_SITE)
  hireDate          DateTime
  terminationDate   DateTime?
  status            EmploymentStatus  @default(DRAFT)

  // Datos de nómina (referencia — el detalle vive en CompensationPlan)
  bankName          String?
  bankAccount       String?
  ipsStatus         String?           // estado de inscripción IPS, texto libre parametrizable

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  manager           Employee?         @relation("EmployeeManager", fields: [managerId], references: [id])
  reports           Employee[]        @relation("EmployeeManager")
  contracts         EmploymentContract[]
  compensationPlans CompensationPlan[]
  leaveRequests     LeaveRequest[]
  vacationBalances  VacationBalance[]
  reprimands        Reprimand[]
  documents         EmployeeDocument[]
  auditLogs         EmployeeAuditLog[]

  @@index([tenantId])
  @@unique([tenantId, nationalId])
}

model EmployeeDocument {
  id          String   @id @default(cuid())
  tenantId    String
  employeeId  String
  type        String   // contrato, cédula, título, certificado médico, etc. (catálogo abierto)
  fileUrl     String
  uploadedAt  DateTime @default(now())
  uploadedBy  String

  employee    Employee @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId])
}

// Legajo histórico e inmutable: cualquier cambio a datos sensibles (salario, cargo, status)
// se registra acá en vez de sobreescribir Employee directamente.
model EmployeeAuditLog {
  id          String   @id @default(cuid())
  tenantId    String
  employeeId  String
  field       String   // ej. "position", "status", "compensationPlanId"
  previousValue String?
  newValue    String?
  changedBy   String
  reason      String?
  changedAt   DateTime @default(now())

  employee    Employee @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId])
}

model EmploymentContract {
  id           String           @id @default(cuid())
  tenantId     String
  employeeId   String
  contractType ContractType
  status       EmploymentStatus @default(DRAFT)
  startDate    DateTime
  endDate      DateTime?        // null si es indefinido
  fileUrl      String?          // PDF del contrato firmado
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  employee     Employee         @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId])
}

model PayrollConcept {
  id            String   @id @default(cuid())
  tenantId      String
  code          String   // ej. "SALARIO_BASE", "HORAS_EXTRA_50", "AGUINALDO", "DESC_IPS_TRABAJADOR"
  name          String
  isEarning     Boolean  // true = concepto remunerativo (suma), false = descuento
  isTaxable     Boolean  @default(true) // integra base imponible IPS
  createdAt     DateTime @default(now())

  @@unique([tenantId, code])
}

model CompensationPlan {
  id              String   @id @default(cuid())
  tenantId        String
  employeeId      String
  baseSalary      Decimal
  currency        String   @default("PYG")
  effectiveFrom   DateTime
  effectiveTo     DateTime? // null = vigente
  createdBy       String
  approvedBy      String?  // doble aprobación para cambios salariales (sección 6)
  createdAt       DateTime @default(now())

  employee        Employee @relation(fields: [employeeId], references: [id])
  lines           CompensationPlanLine[]

  @@index([tenantId, employeeId])
}

model CompensationPlanLine {
  id                  String   @id @default(cuid())
  compensationPlanId  String
  payrollConceptId    String
  amount              Decimal?  // monto fijo
  percentage          Decimal?  // o porcentaje sobre el salario base

  compensationPlan    CompensationPlan @relation(fields: [compensationPlanId], references: [id])
}

model PayrollRun {
  id           String   @id @default(cuid())
  tenantId     String
  period       String   // ej. "2026-08"
  status       String   // draft | calculated | approved | closed
  legalParameterSetId String  // referencia a la versión de parámetros legales usada (ver sección 6)
  createdAt    DateTime @default(now())
  closedAt     DateTime?

  payslips     Payslip[]

  @@index([tenantId, period])
}

model Payslip {
  id           String   @id @default(cuid())
  tenantId     String
  payrollRunId String
  employeeId   String
  grossAmount  Decimal
  netAmount    Decimal
  fileUrl      String?  // recibo generado (PDF)
  createdAt    DateTime @default(now())

  payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id])
  lines        PayslipLine[]

  @@index([tenantId, employeeId])
}

model PayslipLine {
  id               String   @id @default(cuid())
  payslipId        String
  payrollConceptId String
  amount           Decimal

  payslip          Payslip  @relation(fields: [payslipId], references: [id])
}

enum LeaveType {
  VACATION
  SICK
  MATERNITY
  PATERNITY
  UNPAID
  SPECIAL_PERMIT
  UNJUSTIFIED_ABSENCE
}

enum LeaveStatus {
  REQUESTED
  APPROVED
  REJECTED
  CANCELLED
}

model LeaveRequest {
  id          String      @id @default(cuid())
  tenantId    String
  employeeId  String
  type        LeaveType
  startDate   DateTime
  endDate     DateTime
  status      LeaveStatus @default(REQUESTED)
  approvedBy  String?
  reason      String?
  createdAt   DateTime    @default(now())

  employee    Employee    @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId])
}

model VacationBalance {
  id              String   @id @default(cuid())
  tenantId        String
  employeeId      String
  year            Int
  earnedDays      Int      // según antigüedad (12/18/30 días corridos, Código del Trabajo)
  takenDays       Int      @default(0)
  updatedAt       DateTime @updatedAt

  employee        Employee @relation(fields: [employeeId], references: [id])

  @@unique([tenantId, employeeId, year])
}

enum ReprimandSeverity {
  VERBAL_NOTICE
  WRITTEN_WARNING
  SUSPENSION
  FINAL_WARNING
}

model Reprimand {
  id           String            @id @default(cuid())
  tenantId     String
  employeeId   String
  severity     ReprimandSeverity
  reason       String
  evidenceUrl  String?
  relatedAttendanceRecordId String? // ej. tardanzas reiteradas — vínculo con AttendanceRecord, nunca automático sin revisión humana
  issuedBy     String
  issuedAt     DateTime          @default(now())

  employee     Employee          @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId])
}
```

**Nota de integración con `attendance`:** en `PLAN_OMNIASISTENCIA.md`, `AttendanceRecord.employeeId` y `WorkShift.employeeId` quedan como `String` sueltos; al implementar este plan, agregar la FK real hacia `Employee.id` (migración de `human-capital` debe ir *antes* que el Sprint 0 de `attendance`, o coordinarse en el mismo sprint si `attendance` aún no está en producción).

---

## 3. Parámetros legales versionados — `LegalParameter` (compliance-by-design)

Siguiendo el enfoque del documento adjunto: ninguna regla legal (salario mínimo, porcentaje IPS, fórmula de horas extra, calendario de feriados) se hardcodea. Se modela como catálogo versionado:

```prisma
enum LegalParameterStatus {
  DRAFT
  REVIEWED
  PUBLISHED
  RETIRED
}

model LegalParameter {
  id             String                @id @default(cuid())
  tenantId       String?               // null = parámetro global de la jurisdicción, no específico de un tenant
  jurisdiction   String                @default("PY")
  key            String                // ej. "IPS_EMPLOYEE_RATE", "IPS_EMPLOYER_RATE", "MINIMUM_WAGE", "OVERTIME_FORMULA_50", "VACATION_DAYS_TIER"
  value          String                // JSON serializado si el parámetro es una fórmula/tabla, texto simple si es un número
  legalSource    String                // ej. "Ley N.º 213/1993, Código del Trabajo"
  effectiveFrom  DateTime
  effectiveTo    DateTime?
  status         LegalParameterStatus  @default(DRAFT)
  approvedBy     String?
  createdAt      DateTime              @default(now())

  @@index([jurisdiction, key, effectiveFrom])
}
```

- Un `PayrollRun` referencia el conjunto de `LegalParameter` vigente a la fecha del período (`legalParameterSetId` o resolución por `effectiveFrom`/`effectiveTo`), de modo que **recalcular una nómina histórica use la ley que regía en ese momento**, no la actual.
- Parámetros de ejemplo a semillar para Paraguay (sujeto a validación por contador/abogado local antes de producción, según lo aclara el documento adjunto): cuota obrera IPS (~9%), cuota patronal IPS (~14% + adicional patronal ~2.5%), tramos de vacaciones por antigüedad (12/18/30 días).
- **Nunca marcar un `LegalParameter` como `PUBLISHED` sin que el usuario confirme que fue validado por un profesional local** — el Implementador debe dejarlo en `DRAFT` por defecto y preguntar antes de cambiar el estado.

---

## 4. RBAC del módulo

| Rol | Acciones permitidas |
|---|---|
| Colaborador | Ver su propio legajo (limitado), solicitar vacaciones/permisos, descargar sus recibos |
| Jefe | Aprobar solicitudes de su equipo (`managerId`), sin ver salario si la política del tenant lo restringe |
| RRHH | Gestionar legajos, contratos, ausencias, documentos, amonestaciones |
| Nómina | Preparar y cerrar `PayrollRun`, sin alterar datos históricos sin autorización explícita |
| Auditor | Solo lectura de `EmployeeAuditLog`, `PayrollRun`, `Payslip` — sin modificación |
| Administrador | Configuración de `LegalParameter`, `PayrollConcept`, roles — acceso excepcional monitoreado |

Reglas adicionales del documento adjunto a respetar en la implementación:
- Doble aprobación (`createdBy` + `approvedBy`) para cambios en `CompensationPlan` y cierre de `PayrollRun`.
- Bitácora de auditoría (`EmployeeAuditLog`) no editable ni por Administrador.
- Los datos sensibles (salud, biometría — ya cubiertos por `AttendanceRecord.selfieUrl`/`biometricMethod` en `attendance`) siguen la Ley 1.682/2001: acceso restringido, nunca expuestos a roles sin necesidad de negocio.

---

## 5. Roadmap por sprints

| Sprint | Contenido | Depende de |
|---|---|---|
| Sprint 0 | `Employee`, `EmployeeDocument`, `EmployeeAuditLog`, `EmploymentContract` — legajo digital básico | — |
| Sprint 1 | `PayrollConcept`, `CompensationPlan`/`CompensationPlanLine` — remuneraciones (sin motor de cálculo todavía, solo estructura y CRUD) | Sprint 0 |
| Sprint 2 | Conectar `attendance` (`PLAN_OMNIASISTENCIA.md`) a `Employee.id` real; migrar/ajustar FKs de `AttendanceRecord`/`WorkShift`/`AttendancePolicy` | Sprint 0, `attendance` Sprint 0 |
| Sprint 3 | `LeaveRequest`, `VacationBalance` (devengamiento por antigüedad, 12/18/30 días), `Reprimand` | Sprint 0 |
| Sprint 4 | `LegalParameter` — catálogo versionado, semilla inicial en `DRAFT` para Paraguay | — (puede ir en paralelo a 0-3) |
| Sprint 5 | `PayrollRun`/`Payslip` — motor de cálculo básico que consume `CompensationPlan` + `LegalParameter` vigente + `AttendanceRecord` (horas reales) | Sprint 1, 2, 4 |
| Sprint 6 | Generación de recibo (PDF) y exportador base (`MTESS_REOP_2026_v1` como adaptador versionado, sin integración real todavía — solo formato de archivo) | Sprint 5 |
| Sprint 7 | RBAC completo del módulo + bitácora de auditoría no editable | Sprint 0-6 |

---

## 6. Prompts de implementación por fase

> Seguir el protocolo de [[orderflow-protocolo]]: leer `docs/00-contexto-agentes.md` antes de tocar código, usar `human-capital` (no "OmniCapitalHumano") en código/tablas/rutas, `tenantId` siempre presente, no ejecutar `./scripts/init.sh` sin confirmación explícita, no instanciar `PrismaClient` directamente.

### Prompt Sprint 0 — Legajo digital
```
Actuá como Implementador del proyecto OrderFlow (OmniFlow). Antes de tocar código, leé docs/00-contexto-agentes.md.

Tarea: crear el módulo `human-capital` (backend NestJS + Prisma) con los modelos Employee, EmployeeDocument,
EmployeeAuditLog y EmploymentContract según PLAN_OMNICAPITALHUMANO.md (sección 2). Reglas:
- tenantId presente y filtrado en todas las queries/tablas; unique [tenantId, nationalId] en Employee.
- Cualquier cambio a un campo sensible de Employee (position, status, managerId) debe registrarse en
  EmployeeAuditLog con previousValue/newValue/changedBy/reason ANTES de aplicar el update — nunca sobreescribir
  sin dejar rastro.
- No instanciar PrismaClient directamente: usar this.prisma o @TenantPrisma().
- Generar la migración de Prisma y correr `prisma generate`.
No commitear ni pushear cambios salvo pedido explícito. Reportar archivos creados/modificados y nombre de la
migración generada.
```

### Prompt Sprint 1 — Remuneraciones (estructura)
```
Actuá como Implementador de OrderFlow. Ya existe el módulo human-capital (Sprint 0).

Tarea: implementar PayrollConcept, CompensationPlan y CompensationPlanLine (PLAN_OMNICAPITALHUMANO.md sección 2).
- CRUD de PayrollConcept (catálogo de conceptos remunerativos/no remunerativos por tenant).
- Endpoint para crear un CompensationPlan nuevo para un Employee, cerrando automáticamente el
  CompensationPlan anterior (effectiveTo = fecha del nuevo effectiveFrom) — nunca se edita un plan vigente
  in place, se versiona.
- El endpoint de creación debe exigir approvedBy además de createdBy (doble aprobación) antes de considerarse
  vigente — si approvedBy es null, el plan queda en estado "pendiente de aprobación" y no debe usarse en
  cálculos de nómina.
No implementar todavía el motor de cálculo de PayrollRun (eso es Sprint 5).
```

### Prompt Sprint 2 — Conectar Attendance a Employee real
```
Actuá como Implementador de OrderFlow. Ya existen human-capital (Sprint 0) y el módulo attendance de
PLAN_OMNIASISTENCIA.md (al menos su Sprint 0).

Tarea: migrar AttendanceRecord.employeeId, WorkShift.employeeId y AttendancePolicy.employeeId de String suelto
a foreign key real hacia Employee.id.
- Si attendance ya tiene datos en producción, escribir una migración de datos que valide que cada employeeId
  existente tiene un Employee correspondiente antes de aplicar la FK (si falta alguno, listar los huérfanos y
  preguntar al usuario cómo resolverlos, no borrar datos).
- Actualizar los DTOs y validaciones de attendance para usar el Employee real (ej. resolver el nombre del
  empleado en las respuestas de GET /api/v1/attendance/records).
No tocar la lógica de geocerca ni biometría de attendance en este sprint.
```

### Prompt Sprint 3 — Ausencias, vacaciones y amonestaciones
```
Actuá como Implementador de OrderFlow. Ya existe human-capital (Sprint 0).

Tarea: implementar LeaveRequest, VacationBalance y Reprimand (PLAN_OMNICAPITALHUMANO.md sección 2).
- VacationBalance.earnedDays se calcula por antigüedad del Employee (hireDate) según los tramos del Código
  del Trabajo paraguayo (12/18/30 días corridos) — implementar como función pura testeable, no como valor
  hardcodeado por empleado, y dejar los tramos exactos como constantes fácilmente ajustables (referenciar
  LegalParameter si ya existe del Sprint 4, o dejar un TODO explícito si ese sprint no se hizo todavía).
- LeaveRequest debe soportar flujo REQUESTED → APPROVED/REJECTED, con approvedBy obligatorio para aprobar.
- Reprimand.relatedAttendanceRecordId es opcional: si se crea una amonestación desde una vista de asistencia
  (ej. tardanzas reiteradas), vincular el registro, pero la creación de la amonestación SIEMPRE requiere
  acción humana explícita — nunca generarla automáticamente sin revisión.
```

### Prompt Sprint 4 — Parámetros legales versionados
```
Actuá como Implementador de OrderFlow. Ya existe human-capital (Sprint 0).

Tarea: implementar LegalParameter (PLAN_OMNICAPITALHUMANO.md sección 3).
- CRUD con status DRAFT | REVIEWED | PUBLISHED | RETIRED. El endpoint de creación/edición debe forzar
  status=DRAFT por defecto.
- Implementar un endpoint de resolución: dado key + jurisdiction + fecha, devolver el LegalParameter vigente
  a esa fecha (effectiveFrom <= fecha <= effectiveTo o effectiveTo null).
- Semillar (seed, no hardcodear en código de negocio) los parámetros de ejemplo mencionados en el plan para
  Paraguay: IPS_EMPLOYEE_RATE, IPS_EMPLOYER_RATE, VACATION_DAYS_TIER — todos en status=DRAFT.
- IMPORTANTE: no cambiar ningún LegalParameter a PUBLISHED sin que el usuario confirme explícitamente que fue
  validado por un contador/abogado local. Si el usuario no lo confirma, dejarlo en DRAFT y avisar.
```

### Prompt Sprint 5 — Motor de cálculo de nómina (PayrollRun/Payslip)
```
Actuá como Implementador de OrderFlow. Ya existen human-capital (Sprints 0,1,3,4) y attendance conectado
(Sprint 2).

Tarea: implementar PayrollRun y Payslip (PLAN_OMNICAPITALHUMANO.md sección 2).
- Un PayrollRun por tenant/período agrupa un Payslip por Employee activo.
- El cálculo de cada Payslip debe combinar: CompensationPlan vigente del empleado en ese período + horas
  reales trabajadas desde AttendanceRecord/WorkShift (para horas extra) + LegalParameter vigente a la fecha
  del período (nunca el parámetro actual si el período es histórico).
- Guardar cada línea de cálculo en PayslipLine referenciando el PayrollConcept correspondiente, para que el
  recibo (Sprint 6) pueda desglosar exactamente de dónde sale cada monto.
- Un PayrollRun cerrado (status=closed) no debe permitir recalcular sus Payslips salvo una operación explícita
  de "reliquidación" que genere un nuevo PayrollRun vinculado al original, preservando el histórico — nunca
  sobreescribir un Payslip cerrado.
Antes de implementar la fórmula exacta de horas extra/aguinaldo/IPS, preguntar al usuario si ya tiene los
valores validados o si deben quedar como placeholder en LegalParameter (status DRAFT) para completar después.
```

### Prompt Sprint 6 — Recibos y exportador base
```
Actuá como Implementador de OrderFlow. Ya existe el motor de PayrollRun/Payslip (Sprint 5).

Tarea:
1. Generar un recibo de salario en PDF por Payslip (usar la librería/skill de generación de PDF ya disponible
   en el entorno), guardando la URL en Payslip.fileUrl.
2. Implementar un exportador de planilla laboral como adaptador versionado (patrón ya usado en OrderFlow para
   adaptadores legacy, ver [[omniledger-fastapi]]): nombrarlo MTESS_REOP_2026_v1, generando el archivo en el
   formato que el usuario confirme (Excel u otro) — esto es exportación de archivo, NO integración real con
   REOP/MTESS (eso es Fase 2, sección 7).
No asumir el formato exacto del archivo sin confirmarlo con el usuario primero.
```

### Prompt Sprint 7 — RBAC y auditoría
```
Actuá como Implementador de OrderFlow. Ya existe human-capital completo (Sprints 0-6).

Tarea: implementar el RBAC de PLAN_OMNICAPITALHUMANO.md (sección 4) sobre los endpoints de human-capital:
Colaborador, Jefe, RRHH, Nómina, Auditor, Administrador.
- Colaborador solo puede ver su propio Employee y sus propios Payslips/LeaveRequests.
- Jefe puede aprobar LeaveRequest de sus reports (Employee.managerId), sin acceso a CompensationPlan salvo que
  el tenant lo habilite explícitamente.
- Auditor tiene acceso de solo lectura a EmployeeAuditLog, PayrollRun y Payslip — verificar que ningún endpoint
  de escritura acepte el rol Auditor.
- Administrador es el único rol que puede modificar LegalParameter y PayrollConcept.
Usar el mecanismo de RBAC/guards ya existente en OrderFlow si existe uno genérico; si no existe, proponer uno
consistente con AGENTS.md antes de implementar uno nuevo desde cero.
```

---

## 7. Fase 2 — Cumplimiento avanzado (fuera de alcance de esta fase, documentado para no bloquear el modelo de datos)

- **SST (Seguridad y Salud Ocupacional):** `WorkplaceIncident`, `RiskMatrix`, `PPEDelivery` (entrega de equipos de protección), `MedicalExam` — con controles reforzados de confidencialidad (Ley 1.682/2001), sin exponer diagnósticos clínicos a roles no autorizados.
- **Teletrabajo (Ley 6.738):** acuerdos específicos de modalidad remota, evidencias de cumplimiento tecnológico, ligado a `Employee.workModality = REMOTE`.
- **Integraciones reales:** adaptadores efectivos contra REOP, IPS/REI, bancos (archivo de pago) y DNIT/Marangatu — hoy solo existe el exportador de archivo (Sprint 6), no la integración transaccional.
- **Firma electrónica/digital** de contratos y recibos.
- **Portal móvil del colaborador** (autoservicio más allá de marcar asistencia): ver su legajo, descargar recibos, solicitar vacaciones desde OmniMobile.
- **Analítica de rotación, ausentismo y costo laboral.**
- **Reglamento interno de trabajo** y demás documentación regulatoria versionada como plantillas.

---

## 8. Límites y advertencia de cumplimiento

Este plan traduce el marco legal paraguayo compartido por el usuario a un diseño técnico parametrizable, pero:

- **No reemplaza asesoría legal/contable local.** Los porcentajes de IPS, tramos de vacaciones, fórmulas de horas extra y formatos de exportación deben validarse con un abogado laboralista y un contador paraguayo antes de marcar cualquier `LegalParameter` como `PUBLISHED` o de usar el módulo en producción para liquidar sueldos reales.
- Las normas, resoluciones y formatos de planilla pueden cambiar — por eso el diseño versiona todo (`LegalParameter`, exportadores con sufijo de año) en vez de hardcodear valores.
- Antes de la Fase 1 de este plan, el documento adjunto recomienda una **Fase 0 de relevamiento jurídico** (matriz requisito/fuente legal/obligación/dato/proceso/evidencia/módulo/riesgo, revisada por abogado, contador, especialista de RRHH y responsable de seguridad de la información) — este plan no sustituye esa revisión, solo dispone la arquitectura para que, una vez validada, se pueda cargar sin fricción.
