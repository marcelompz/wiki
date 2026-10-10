# PLAN MAESTRO — OmniAsistencia (Módulo de Marcador de Asistencia)
**Proyecto:** OmniFlow / OrderFlow
**Versión del documento:** v1.0.0
**Feature ID sugerido:** FEAT-XXX (asignar el próximo libre según `featurelist.json` al momento de implementar)
**Nombre técnico interno (OrderFlow):** `attendance` / `hr` (no usar "OmniAsistencia" en código, tablas, rutas ni colas — ese nombre es solo marca comercial, según convención de [[orderflow-protocolo]])
**Nombre comercial (OmniFlow):** OmniAsistencia (RRHH / Capital Humano)

---

## 0. Contexto y alcance

Este plan cubre dos capas relacionadas pero separables:

1. **Marcador de asistencia (core, prioridad alta):** múltiples métodos de fichaje — NFC (reusando `nfc-standalone`), QR, PIN en kiosko, app móvil con geolocalización + verificación biométrica, y terminales biométricos dedicados de terceros (ZKTeco, Hikvision) — con política de geocerca configurable por rol/empleado.
2. **Capital Humano / Talento Humano (comentario a desarrollar, prioridad menor / fase posterior):** gestión de salarios, beneficios, amonestaciones y vacaciones, construida *sobre* los datos que genera el marcador de asistencia.

> **Nota de alcance:** la capa 2 se deja explícitamente como evolución futura del mismo módulo, no como un sprint obligatorio de este plan. Se detalla al final (Fase 5) como comentario/roadmap, para que el modelo de datos de la Fase 1 ya la contemple y no requiera migraciones destructivas después.

### Decisiones ya tomadas (no volver a discutir en la implementación)

- El backend sigue el patrón NestJS + Prisma + PostgreSQL multi-tenant de OmniFlow; `tenantId` nunca se omite de queries ni tablas.
- Face ID / huella dactilar se validan **en el dispositivo** (OS del celular) — el backend nunca recibe ni almacena datos biométricos crudos, solo un token de confirmación firmado.
- La selfie es un método de respaldo (dispositivo sin biometría) o de auditoría por muestreo — no el método principal.
- El comportamiento ante marcación fuera del radio de geocerca **depende del rol/empleado** (`STRICT` bloquea, `FLAG` permite y marca para revisión, `NONE` no valida ubicación) — no hay una regla global única.
- El personal de eventos (Vivento/EventOps) no tiene un `Workplace` fijo: la geocerca debe poder resolverse contra la ubicación del evento activo ese día en [[eventops]], no solo contra sucursales.
- El NFC reusa el servicio `nfc-standalone` ya diseñado (modelo `NfcTag`/`NfcScanLog` polimórfico, endpoint central `POST /api/v1/nfc/scan`) — no se duplica lógica de NFC dentro de este módulo.
- Los terminales biométricos dedicados (ZKTeco, Hikvision) son huella dactilar y/o reconocimiento facial capturados y verificados **en el propio dispositivo**; el backend de `attendance` nunca recibe ni procesa la plantilla biométrica cruda, solo el evento de marcación ya resuelto por el terminal (empleado identificado + timestamp + resultado).

---

## 1. Modelo de datos (Prisma) — Fase 1

```prisma
enum AttendanceMethod {
  NFC
  QR
  PIN
  MOBILE_APP
  DEVICE_BIOMETRIC
}

enum BiometricDeviceVendor {
  ZKTECO
  HIKVISION
}

enum BiometricDeviceProtocol {
  ZKTECO_PUSH        // el terminal empuja eventos vía HTTP al servidor (ZKTeco PUSH SDK / ADMS)
  ZKTECO_PULL_SDK     // el servidor consulta al terminal (ZKTeco Standalone SDK / puerto propietario)
  HIKVISION_ISAPI     // ISAPI event listener / HTTP notification del terminal Hikvision
}

enum BiometricMethod {
  NONE
  FACE_ID
  FINGERPRINT
  SELFIE
}

enum GeofenceEnforcement {
  STRICT   // bloquea la marcación fuera del radio
  FLAG     // permite y marca para revisión
  NONE     // no valida ubicación
}

enum AttendanceEventType {
  CHECK_IN
  CHECK_OUT
  BREAK_START
  BREAK_END
}

enum AttendanceReviewStatus {
  OK
  FLAGGED
  REVIEWED_APPROVED
  REVIEWED_REJECTED
}

model BiometricDevice {
  id          String                    @id @default(cuid())
  tenantId    String
  workplaceId String                    // el terminal está físicamente fijo en un Workplace
  vendor      BiometricDeviceVendor
  protocol    BiometricDeviceProtocol
  serialNumber String                   // SN del equipo (clave para mapear eventos entrantes al Workplace correcto)
  ipAddress   String?                   // relevante para ZKTECO_PULL_SDK / consultas activas al terminal
  isActive    Boolean                   @default(true)
  lastSyncAt  DateTime?
  createdAt   DateTime                  @default(now())

  workplace   Workplace                 @relation(fields: [workplaceId], references: [id])
  employeeLinks BiometricDeviceEnrollment[]

  @@unique([tenantId, serialNumber])
  @@index([tenantId])
}

// Mapea el ID interno de empleado que usa el terminal (userId propietario ZKTeco/Hikvision,
// normalmente numérico y sin relación con el cuid de Employee) al Employee real de OmniFlow.
model BiometricDeviceEnrollment {
  id                String          @id @default(cuid())
  tenantId          String
  biometricDeviceId String
  employeeId        String
  deviceUserId      String          // ID/PIN del empleado tal como está enrolado en el terminal
  enrolledAt        DateTime        @default(now())

  device            BiometricDevice @relation(fields: [biometricDeviceId], references: [id])

  @@unique([biometricDeviceId, deviceUserId])
  @@index([tenantId, employeeId])
}

model Workplace {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  latitude    Float
  longitude   Float
  radiusMeters Int     @default(100)
  isEventBased Boolean @default(false) // true si se resuelve dinámicamente contra EventOps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attendanceRecords AttendanceRecord[]
  biometricDevices  BiometricDevice[]

  @@index([tenantId])
}

model AttendancePolicy {
  id                  String              @id @default(cuid())
  tenantId            String
  role                String?             // aplica por rol si employeeId es null
  employeeId          String?             // override puntual por empleado
  geofenceEnforcement GeofenceEnforcement @default(FLAG)
  allowedMethods      AttendanceMethod[]
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([tenantId])
  @@index([employeeId])
}

model AttendanceRecord {
  id                String                  @id @default(cuid())
  tenantId          String
  employeeId        String
  eventType         AttendanceEventType
  method            AttendanceMethod
  timestamp         DateTime                @default(now())

  // Común
  workplaceId       String?
  eventOpsEventId   String?                 // si la marcación se resuelve contra un evento de EventOps

  // NFC
  nfcScanLogId      String?                 // referencia al NfcScanLog de nfc-standalone

  // Terminal biométrico dedicado (ZKTeco/Hikvision)
  biometricDeviceId String?                 // referencia al BiometricDevice que originó el evento
  deviceEventRawId  String?                 // ID/log del evento tal como lo reporta el terminal (para trazabilidad/dedup)

  // Mobile app
  latitude          Float?
  longitude         Float?
  accuracyMeters    Float?
  distanceMeters     Float?                 // distancia calculada contra el Workplace/evento
  biometricMethod   BiometricMethod         @default(NONE)
  biometricVerified Boolean                 @default(false)
  selfieUrl         String?

  reviewStatus      AttendanceReviewStatus  @default(OK)
  reviewedBy        String?
  reviewedAt        DateTime?
  reviewNote        String?

  createdAt         DateTime                @default(now())

  workplace         Workplace?              @relation(fields: [workplaceId], references: [id])

  @@index([tenantId, employeeId, timestamp])
  @@index([reviewStatus])
}

model WorkShift {
  id           String   @id @default(cuid())
  tenantId     String
  employeeId   String
  workplaceId  String?
  eventOpsEventId String?  // turno ad-hoc ligado a un evento de Vivento
  startsAt     DateTime
  endsAt       DateTime
  createdAt    DateTime @default(now())

  @@index([tenantId, employeeId])
}
```

**Notas de diseño para el Implementador:**
- `distanceMeters` se calcula server-side (fórmula Haversine) en el momento de la marcación, nunca confiar en un valor enviado por el cliente.
- `AttendancePolicy` resuelve por prioridad: `employeeId` específico > `role` > default del tenant (`FLAG`).
- Si `Workplace.isEventBased = true`, la resolución de lat/long en tiempo de marcación debe consultarse contra el servicio/tabla de [[eventops]] para el evento activo del empleado ese día, no contra `Workplace.latitude/longitude` fijos.
- `deviceEventRawId` (único por `biometricDeviceId`) es clave para deduplicar: los terminales ZKTeco/Hikvision suelen reintentar el envío de un mismo evento ante cortes de red; sin este campo se duplicarían marcaciones.

---

## 1bis. Integración con terminales biométricos dedicados (ZKTeco, Hikvision)

A diferencia de la biometría del celular (Sprint 4, verificada por el OS del dispositivo del empleado), acá el terminal es un equipo físico fijo en la entrada del local, propiedad del negocio, que hace su propia verificación (huella o rostro) contra una plantilla enrolada previamente en el equipo.

**Dos formas de integrarlos, según el protocolo que soporte el modelo del equipo:**

1. **Push (recomendado cuando el equipo lo soporta):** el terminal envía cada evento de marcación a un endpoint HTTP de OmniFlow apenas ocurre.
   - **ZKTeco (línea con ADMS/PUSH SDK):** el equipo se configura con la IP/URL del servidor de OmniFlow y empuja los eventos (`cmd=attlog` o vía el protocolo iClock/ADMS) a un endpoint público con autenticación por token de dispositivo.
   - **Hikvision (ISAPI):** el terminal soporta suscripción HTTP de eventos (`ISAPI/Event/notification/httpHosts`) apuntando a un endpoint de OmniFlow, o el equipo se registra contra un listener que recibe notificaciones de acceso/asistencia en formato XML/JSON.
   - En ambos casos, OmniFlow expone un único endpoint webhook por vendor (ver sección 2), y el `serialNumber` del payload identifica de qué `BiometricDevice`/`Workplace` viene el evento.

2. **Pull (fallback cuando el equipo es más viejo o no soporta push):** un worker de OmniFlow consulta periódicamente al terminal por su IP local (SDK propietario ZKTeco, o polling ISAPI de Hikvision) y trae los eventos nuevos desde el último `lastSyncAt`. Esto requiere que el terminal sea alcanzable en red desde el servidor (VPN o red local con el backend, ya que estos SDKs no siempre están pensados para exponerse a internet directamente).

**Mapeo de identidad — el punto más delicado:** los terminales biométricos identifican al empleado con su propio ID interno (`deviceUserId`, generalmente numérico, asignado al enrolar la huella/rostro en el equipo), que no tiene relación con el `id` de `Employee` en OmniFlow. Por eso `BiometricDeviceEnrollment` existe como tabla de mapeo explícita — sin ella, un evento entrante no se puede asociar a ningún empleado. El enrolamiento físico (poner el dedo/cara en el equipo) sigue haciéndose desde el software propio del fabricante (ZKTeco/Hikvision), y el paso de "vincular ese `deviceUserId` a un `Employee` de OmniFlow" es manual desde el admin de `attendance`.

**Consideración de red:** estos equipos casi siempre están en la red local del negocio, no expuestos a internet. Si el modo elegido es push, el terminal debe poder alcanzar el dominio público de OmniFlow (o un endpoint expuesto vía Traefik); si es pull, es el backend el que necesita alcanzar la IP local del terminal, típicamente vía VPN site-to-site o un agente/gateway liviano corriendo en la red del local que reenvíe los eventos — a decidir con el usuario según qué locales tienen estos equipos y su conectividad real.

---

## 2. Endpoints — Fase 1

```
POST   /api/v1/attendance/mark          → marcar asistencia (cualquier método)
GET    /api/v1/attendance/records        → listar registros (filtros: employeeId, rango de fechas, reviewStatus)
GET    /api/v1/attendance/records/:id    → detalle de un registro
PATCH  /api/v1/attendance/records/:id/review  → aprobar/rechazar registro flagged
GET    /api/v1/attendance/workplaces      → listar sucursales/geocercas
POST   /api/v1/attendance/workplaces      → crear sucursal/geocerca
GET    /api/v1/attendance/policies        → listar políticas
POST   /api/v1/attendance/policies        → crear/editar política por rol o empleado
GET    /api/v1/attendance/shifts          → turnos por empleado/período
POST   /api/v1/attendance/shifts          → crear turno (recurrente o ad-hoc por evento)
```

El endpoint de NFC sigue siendo `POST /api/v1/nfc/scan` (en `nfc-standalone`), con `context: "attendance"` en el payload; ese servicio internamente hace un POST server-to-server a `attendance/mark` al recibir un scan de este contexto.

```
POST   /api/v1/attendance/devices                         → registrar un BiometricDevice (vendor, protocol, serialNumber, workplaceId)
GET    /api/v1/attendance/devices                          → listar terminales por tenant/workplace
POST   /api/v1/attendance/devices/:id/enrollments          → vincular un deviceUserId del terminal a un Employee (BiometricDeviceEnrollment)
POST   /api/v1/attendance/webhooks/zkteco/:deviceToken     → endpoint push para terminales ZKTeco (ADMS/iClock)
POST   /api/v1/attendance/webhooks/hikvision/:deviceToken  → endpoint push para terminales Hikvision (ISAPI event notification)
```

Ambos webhooks son endpoints públicos autenticados por `deviceToken` (no por sesión de usuario, ya que quien llama es el terminal), validan el `serialNumber` contra `BiometricDevice`, resuelven el `Employee` vía `BiometricDeviceEnrollment`, y terminan escribiendo en `attendance/mark` internamente con `method=DEVICE_BIOMETRIC` — igual que hace `nfc-standalone` con su context `attendance`, para no duplicar la lógica de geocerca/políticas en cada integrador.

---

## 3. Roadmap por sprints

| Sprint | Contenido | Depende de |
|---|---|---|
| Sprint 0 | Modelo de datos base (`Workplace`, `AttendancePolicy`, `AttendanceRecord`, `WorkShift`), migraciones, seed de sucursales existentes | — |
| Sprint 1 | Marcación por NFC (integración con `nfc-standalone`, context `attendance`) y QR | Sprint 0 |
| Sprint 2 | Marcación por PIN en kiosko (tablet fija) | Sprint 0 |
| Sprint 3 | Marcación por app móvil: geolocalización + cálculo de distancia + política de geocerca por rol | Sprint 0 |
| Sprint 4 | Biometría nativa (Face ID/huella vía token firmado del OS) + fallback selfie con política de retención | Sprint 3 |
| Sprint 5 | Integración con EventOps: `Workplace.isEventBased`, resolución de geocerca contra evento activo, cruce automático de presencia de personal Vivento por evento | Sprint 3, [[eventops]] |
| Sprint 6 | Reportes (horas trabajadas, tardanzas, ausencias, horas extra) — candidato a vivir en OmniBI | Sprint 1–5 |
| Sprint 7 | Terminales biométricos dedicados (ZKTeco, Hikvision): `BiometricDevice`, `BiometricDeviceEnrollment`, webhooks push por vendor, y fallback pull para equipos sin push | Sprint 0 |

---

## 4. Prompts de implementación por fase

> Seguir el protocolo de [[orderflow-protocolo]]: leer `docs/00-contexto-agentes.md` antes de tocar código, no usar "OmniAsistencia" en código/tablas/rutas (usar `attendance`), no ejecutar `./scripts/init.sh` sin confirmación explícita, `tenantId` siempre presente.

### Prompt Sprint 0 — Modelo de datos base
```
Actuá como Implementador del proyecto OrderFlow (OmniFlow). Antes de tocar código, leé docs/00-contexto-agentes.md.

Tarea: crear el módulo `attendance` (backend NestJS + Prisma) con los modelos Workplace, AttendancePolicy,
AttendanceRecord y WorkShift según el schema del PLAN_OMNIASISTENCIA.md (sección 1). Reglas:
- tenantId presente y filtrado en todas las queries/tablas.
- No instanciar PrismaClient directamente: usar this.prisma o @TenantPrisma().
- Generar la migración de Prisma y correr `prisma generate`.
- Crear un seed opcional con las sucursales/Workplace ya existentes del tenant provecchio-dimora-001.
- No commitear ni pushear cambios salvo pedido explícito.
Reportar al final qué archivos se crearon/modificaron y el nombre de la migración generada.
```

### Prompt Sprint 1 — NFC y QR
```
Actuá como Implementador de OrderFlow. Contexto: ya existe el servicio nfc-standalone con el endpoint
POST /api/v1/nfc/scan (modelo NfcTag/NfcScanLog). Ya existe el módulo attendance del Sprint 0.

Tarea:
1. En nfc-standalone, agregar soporte a un campo `context` en el payload de /nfc/scan. Cuando context = "attendance",
   el servicio debe hacer un POST server-to-server a attendance/mark con method=NFC y el nfcScanLogId generado.
2. En el módulo attendance, implementar POST /api/v1/attendance/mark soportando method=NFC y method=QR.
3. Para QR: generar un QR dinámico de corta duración por empleado o por Workplace (a definir con el usuario si es
   QR fijo en la pared del local o QR rotativo por seguridad — preguntar si no está claro antes de implementar).
4. Validar tenantId end-to-end en ambos servicios.
No ejecutar ./scripts/init.sh sin confirmación previa del usuario.
```

### Prompt Sprint 2 — PIN en kiosko
```
Actuá como Implementador de OrderFlow. Ya existe el módulo attendance (Sprint 0) con soporte NFC/QR (Sprint 1).

Tarea: implementar method=PIN para marcación desde una tablet/kiosko fijo.
- Cada empleado tiene un PIN corto (4-6 dígitos), hasheado, no reversible.
- El endpoint POST /api/v1/attendance/mark debe aceptar { employeeId o identificador corto, pin, workplaceId }.
- Rate limiting agresivo por intentos fallidos de PIN (evitar fuerza bruta) — usar el mecanismo de rate limiting
  ya existente en el proyecto si existe, o proponer uno nuevo consistente con AGENTS.md.
- El Workplace queda implícito por el kiosko (variable de config del dispositivo), no lo elige el empleado.
```

### Prompt Sprint 3 — App móvil: geolocalización y geocerca por rol
```
Actuá como Implementador de OrderFlow. Ya existe el módulo attendance (Sprints 0-2).

Tarea:
1. Implementar method=MOBILE_APP en POST /api/v1/attendance/mark, recibiendo latitude, longitude, accuracyMeters.
2. Calcular distanceMeters server-side (Haversine) contra el Workplace correspondiente (nunca confiar en un
   distanceMeters enviado por el cliente).
3. Implementar la resolución de AttendancePolicy: buscar política por employeeId específico, luego por role,
   luego default del tenant (FLAG).
4. Aplicar geofenceEnforcement:
   - STRICT: si distanceMeters > Workplace.radiusMeters, rechazar la marcación con 422 y mensaje claro.
   - FLAG: permitir la marcación pero setear reviewStatus=FLAGGED.
   - NONE: no validar distancia.
5. Implementar PATCH /api/v1/attendance/records/:id/review para que RRHH apruebe/rechace registros FLAGGED.
No implementar todavía biometría (Sprint 4) ni integración con EventOps (Sprint 5).
```

### Prompt Sprint 4 — Biometría nativa + selfie de respaldo
```
Actuá como Implementador de OrderFlow (backend) — este sprint también requiere cambios en OmniMobile (React
Native), coordinar con quien implemente el lado móvil.

Tarea backend:
1. Extender POST /api/v1/attendance/mark para aceptar biometricMethod (FACE_ID | FINGERPRINT | SELFIE) y
   biometricVerified.
2. Para FACE_ID/FINGERPRINT: el backend NUNCA recibe datos biométricos crudos. Solo recibe y valida un token/
   assertion firmado por el OS del dispositivo (ver LocalAuthentication en React Native / BiometricPrompt en
   Android / LAContext en iOS) confirmando que el usuario autenticado localmente es el dueño del dispositivo
   enrolado. Documentar en el código el mecanismo exacto de verificación del token.
3. Para SELFIE: aceptar selfieUrl (subida previa a storage), NO comparar automáticamente contra foto de
   referencia en este sprint (dejarlo para un sprint de verificación facial si se decide más adelante) —
   por ahora la selfie queda disponible para revisión humana o auditoría por muestreo.
4. Definir y documentar una política de retención de selfies (ej. 90 días) — preguntar al usuario el plazo
   antes de hardcodear un valor.
5. Actualizar AttendancePolicy para poder exigir biometricMethod != NONE cuando method=MOBILE_APP, configurable
   por rol/empleado.
```

### Prompt Sprint 5 — Integración con EventOps
```
Actuá como Implementador de OrderFlow. Ya existe el módulo attendance (Sprints 0-4) y el módulo eventops
(Vivento/Provecchio).

Tarea:
1. Extender Workplace con isEventBased=true como caso especial: cuando un WorkShift tiene eventOpsEventId
   seteado, la geocerca de esa marcación se resuelve contra la ubicación del evento en eventops (no contra
   Workplace.latitude/longitude).
2. Al marcar asistencia con method=MOBILE_APP o NFC para un empleado con turno ad-hoc de evento activo,
   resolver automáticamente el Workplace efectivo contra el evento en curso.
3. Agregar un endpoint o vista que cruce AttendanceRecord con eventOpsEventId para reportar automáticamente
   qué personal de Vivento estuvo presente en cada evento, sin carga manual.
Coordinar con el modelo de datos real de eventops antes de asumir nombres de campos — leerlo primero.
```

### Prompt Sprint 6 — Reportes
```
Actuá como Implementador de OrderFlow. Ya existe el módulo attendance completo (Sprints 0-5).

Tarea: implementar reportes de horas trabajadas, tardanzas, ausencias y horas extra por empleado/período,
cruzando AttendanceRecord (marcaciones reales) contra WorkShift (turnos esperados).
Evaluar si este reporte debe vivir dentro de attendance o exponerse como fuente de datos para OmniBI
(FEAT-067) — preguntar al usuario antes de decidir la ubicación final si no está claro por el contexto
del repo.
```

### Prompt Sprint 7 — Terminales biométricos dedicados (ZKTeco, Hikvision)
```
Actuá como Implementador de OrderFlow. Ya existe el módulo attendance (al menos Sprint 0; idealmente 0-6).

Tarea:
1. Crear los modelos BiometricDevice y BiometricDeviceEnrollment según PLAN_OMNIASISTENCIA.md (sección 1bis),
   con migración de Prisma. Agregar method=DEVICE_BIOMETRIC a AttendanceMethod, y biometricDeviceId +
   deviceEventRawId a AttendanceRecord.
2. Implementar POST /api/v1/attendance/devices y POST /api/v1/attendance/devices/:id/enrollments para que
   RRHH registre terminales y vincule cada deviceUserId del equipo a un Employee real.
3. Implementar el webhook POST /api/v1/attendance/webhooks/zkteco/:deviceToken siguiendo el protocolo push
   ADMS/iClock de ZKTeco: validar deviceToken y serialNumber, deduplicar por deviceEventRawId, resolver el
   Employee vía BiometricDeviceEnrollment, y llamar internamente a attendance/mark con method=DEVICE_BIOMETRIC.
4. Implementar el webhook equivalente POST /api/v1/attendance/webhooks/hikvision/:deviceToken siguiendo el
   formato de notificación de eventos ISAPI de Hikvision (confirmar con el usuario el modelo exacto de
   terminal Hikvision que va a usar, ya que el payload XML/JSON puede variar entre líneas de producto, antes
   de asumir un esquema fijo de parseo).
5. Si algún terminal del usuario no soporta push (equipo más viejo), implementar un worker de polling (pull)
   que consulte al terminal por su IP local usando el SDK propietario correspondiente, guardando lastSyncAt
   en BiometricDevice para no reprocesar eventos ya traídos.
6. No asumir conectividad directa entre el terminal y el backend: preguntar al usuario cómo está la red del
   local (VPN site-to-site, red local expuesta vía Traefik, o necesidad de un agente/gateway liviano) antes
   de fijar la arquitectura de conexión final.
No ejecutar ./scripts/init.sh sin confirmación previa del usuario.
```

---

## 5. Comentario / Roadmap futuro — Módulo de Capital Humano (Talento Humano y Administración)

**Este bloque es un comentario de alcance, no un sprint a implementar en esta fase.** Se documenta ahora para que el modelo de datos de la Fase 1 no quede reñido con esta evolución futura.

La idea es que, una vez que `attendance` esté maduro, se construya un módulo **OmniCapitalHumano** (nombre técnico sugerido: `hr` o `human-capital`) que se apoye en `Employee`, `AttendanceRecord` y `WorkShift` para cubrir:

- **Salarios:** estructura salarial por empleado/rol, cálculo de jornales a partir de horas trabajadas reales (`AttendanceRecord`), integración futura con [[omniledger-fastapi]] para la contabilización.
- **Beneficios:** catálogo de beneficios (aguinaldo, bonos, viáticos, beneficios propios de Provecchio/Vivento), asignables por empleado o rol.
- **Amonestaciones:** registro de llamados de atención/sanciones, con severidad, motivo y evidencia adjunta; candidato natural a cruzarse con `AttendanceRecord.reviewStatus` (ej. tardanzas reiteradas → amonestación automática sugerida, nunca automática sin revisión humana).
- **Vacaciones:** solicitud, aprobación y calendario de vacaciones por empleado, validando contra `WorkShift` para no dejar turnos sin cobertura.

**Al momento de implementar la Fase 1 (Sprint 0), tener en cuenta:**
- No hardcodear supuestos que compliquen agregar `Employee.salaryStructureId`, `Benefit`, `Reprimand` y `VacationRequest` más adelante.
- Si ya existe un modelo `Employee`/`User` de RRHH en el repo real de OrderFlow, el Implementador del Sprint 0 debe leerlo primero y reusarlo, no crear uno paralelo.

Cuando se decida avanzar con este módulo, conviene generar un plan maestro propio (`PLAN_OMNICAPITALHUMANO.md`) siguiendo el mismo formato de este documento, en vez de expandir este archivo.
