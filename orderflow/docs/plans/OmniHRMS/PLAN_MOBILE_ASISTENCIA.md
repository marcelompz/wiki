# PLAN MOBILE — App de Marcación de Asistencia (OmniMobile)
**Proyecto:** OmniFlow / OrderFlow
**Versión del documento:** v1.0.0
**Stack:** React Native ("ReactMobile", según convención ya definida para OmniMobile en [[omniflow-nfc]])
**Consume:** endpoints de `attendance` ejecutados (`PLAN_OMNIASISTENCIAv2.md`) — `POST /api/v1/attendance/mark` como endpoint central

---

## 0. Alcance y decisiones ya tomadas (no volver a discutir)

- **Biometría en el dispositivo, nunca en el servidor:** Face ID/huella se validan con `LocalAuthentication`/`BiometricPrompt`/`LAContext` del propio celular. La app nunca captura ni envía una plantilla biométrica cruda — solo el resultado (verificado/no verificado) firmado por el OS.
- **Selfie es respaldo, no el método principal:** solo se ofrece si el dispositivo no tiene biometría nativa disponible, o como verificación aleatoria si el backend lo solicita.
- **Geolocalización obligatoria** en toda marcación por `MOBILE_APP` — la app no debe permitir marcar sin permiso de ubicación concedido; si el permiso está denegado, mostrar una pantalla explicativa con acceso directo a los ajustes del sistema, no un fallback silencioso sin ubicación.
- La app **no calcula si está dentro o fuera de la geocerca** — eso lo hace el backend (`distanceMeters` vía Haversine server-side, nunca confiar en el cliente). La app solo muestra el resultado que devuelve la API (aprobado / marcado para revisión / rechazado, según `AttendancePolicy.geofenceEnforcement`).
- El personal de eventos (Vivento) puede no tener `Workplace` fijo — la app debe poder mostrar "vas a marcar para: [evento activo]" cuando corresponda, en vez de asumir siempre una sucursal fija.
- Este plan **no incluye** portal de autoservicio completo (ver recibos, solicitar vacaciones desde la app) — eso está documentado como Fase 2 en `PLAN_OMNICAPITALHUMANOv2.md`. Acá el foco es exclusivamente **marcar asistencia** de forma confiable. Si más adelante se decide sumar autoservicio, es una extensión de esta misma app, no una nueva.

---

## 1. Flujo principal — Marcar asistencia

```
Pantalla Home
  → Botón grande "Marcar entrada" / "Marcar salida" / "Iniciar pausa" / "Terminar pausa"
    (el botón visible depende del último AttendanceRecord del empleado hoy — no mostrar
     "Marcar entrada" si ya hay un CHECK_IN sin CHECK_OUT)
  → App solicita/verifica permiso de ubicación
  → App captura GPS (latitude, longitude, accuracyMeters)
  → App dispara biometría nativa del dispositivo
      → si el dispositivo la soporta y está enrolada: LocalAuthentication → biometricVerified=true/false
      → si no está disponible: fallback a cámara para selfie
  → POST /api/v1/attendance/mark
      { eventType, method: "MOBILE_APP", latitude, longitude, accuracyMeters,
        biometricMethod, biometricVerified, selfieUrl? }
  → Pantalla de resultado:
      - reviewStatus=OK → check verde, hora registrada
      - reviewStatus=FLAGGED → aviso amarillo: "Marcación registrada, pendiente de revisión por estar
        fuera del rango esperado" (no bloquea, informa)
      - 422 (STRICT, fuera de geocerca) → error claro con la distancia aproximada y a qué Workplace/evento
        se está comparando, para que el empleado entienda por qué no se aceptó
```

**Métodos adicionales desde la misma app (no exclusividad de MOBILE_APP):**
- Si el celular tiene NFC y el empleado tiene un `NfcTag` propio, la app puede leerlo y usarlo como atajo (llama al mismo flujo de `nfc-standalone` con `context: attendance`), sin pasar por geolocalización/biometría — es el mismo caso de uso que un tag físico, solo que leído por el celular.
- Si el local usa QR fijo en la pared, la app incluye un escáner de QR como método alternativo (útil para el empleado que se olvidó el celular con GPS habilitado o está en una zona sin señal GPS confiable, ej. sótano).

---

## 2. Pantallas

| Pantalla | Contenido |
|---|---|
| **Login** | Autenticación del empleado (reusar el mecanismo de auth ya existente en OmniMobile/OmniFlow) |
| **Home / Marcar** | Botón principal contextual (entrada/salida/pausa), estado del último registro del día, indicador de ubicación (GPS activo/inactivo) |
| **Resultado de marcación** | Confirmación visual, o aviso de FLAGGED/rechazo con explicación en lenguaje simple |
| **Historial personal** | Lista de `AttendanceRecord` propios de los últimos días/semanas, con método y estado de cada uno |
| **Mi horario** | `WorkScheduleAssignment` vigente del empleado — qué días/horarios le tocan, para que sepa si hoy le corresponde marcar |
| **Escáner QR** | Cámara para leer un QR de sucursal, como método alternativo |
| **Configuración de biometría** | Estado de Face ID/huella en el dispositivo, botón para re-verificar el enrolamiento si el OS lo requiere |

---

## 3. Manejo de casos límite

- **Sin conexión al marcar:** encolar la marcación localmente (con timestamp del dispositivo) y reintentar el envío cuando vuelva la conexión — dejar claro en la UI que la marcación está "pendiente de sincronizar", no confirmada, hasta que el backend responda. El backend debe validar que el `timestamp` enviado no sea manipulable más allá de un margen razonable (a definir con el equipo de backend si el timestamp de marcación es el de creación server-side o el que reporta el cliente en el encolado offline).
- **GPS impreciso (`accuracyMeters` alto):** si la precisión reportada es mala (ej. > 50m), avisar al usuario antes de enviar ("tu ubicación no es precisa, ¿querés reintentar o marcar igual?") en vez de enviar silenciosamente un dato de baja calidad.
- **Biometría no enrolada en el dispositivo:** la app debe detectarlo antes de intentar `LocalAuthentication` y pasar directo al flujo de selfie, sin mostrar un error de biometría al usuario.
- **Empleado de evento (Vivento) sin turno activo:** si no hay `WorkShift`/evento activo para ese empleado en ese momento, la app debe permitir igual la marcación (el backend decide si la flaggea) pero mostrar un aviso ("no encontramos un turno asignado para vos ahora") en vez de bloquear silenciosamente.

---

## 4. Roadmap por sprints

| Sprint | Contenido | Depende de |
|---|---|---|
| M-Sprint 0 | Setup de la app OmniMobile (si no existe todavía el shell base) o del módulo de asistencia dentro de la app existente; auth reusando el login de OmniFlow | Backend `attendance` Sprint 0 |
| M-Sprint 1 | Flujo principal de marcación por geolocalización + biometría nativa (Face ID/huella) | M-Sprint 0, backend Sprint 3-4 |
| M-Sprint 2 | Fallback de selfie cuando no hay biometría nativa disponible | M-Sprint 1 |
| M-Sprint 3 | Lectura de NFC (si el celular lo soporta) y escáner de QR como métodos alternativos | M-Sprint 1, backend Sprint 1 |
| M-Sprint 4 | Historial personal y "Mi horario" | M-Sprint 1 |
| M-Sprint 5 | Manejo offline (cola de marcaciones pendientes de sincronizar) | M-Sprint 1 |
| M-Sprint 6 | Aviso de evento activo para personal de Vivento (integración con EventOps) | M-Sprint 1, backend Sprint 5 |

---

## 5. Prompts de implementación por fase

> Seguir el protocolo de [[orderflow-protocolo]]. La app es React Native ("ReactMobile"); si el shell base de OmniMobile ya existe, extenderlo — no crear un proyecto paralelo. Nunca capturar ni transmitir datos biométricos crudos, solo el resultado firmado por el OS.

### Prompt M-Sprint 0 — Setup
```
Actuá como Implementador de OmniMobile (React Native). Antes de tocar código, leé docs/00-contexto-agentes.md
y confirmá si ya existe un shell base de la app (proyecto ReactMobile) para extenderlo, o si hay que iniciarlo
desde cero — preguntar al usuario si no está claro por el estado del repo.

Tarea:
1. Si no existe, inicializar el proyecto React Native base con navegación (React Navigation) y las pantallas
   vacías: Login, Home, Historial, Mi horario.
2. Implementar el login reusando el mecanismo de autenticación ya existente en el backend de OmniFlow (no crear
   un flujo de auth paralelo).
3. Configurar el cliente HTTP con Axios (cliente oficial del proyecto) apuntando a los endpoints de attendance.
No implementar todavía el flujo de marcación (eso es M-Sprint 1).
```

### Prompt M-Sprint 1 — Marcación por geolocalización y biometría nativa
```
Actuá como Implementador de OmniMobile. Ya existe el shell base con login (M-Sprint 0).

Tarea: implementar el flujo principal de PLAN_MOBILE_ASISTENCIA.md (sección 1).
1. Pantalla Home con el botón contextual (entrada/salida/pausa) según el último AttendanceRecord del empleado
   hoy (consultar GET /api/v1/attendance/records filtrado por employeeId propio y fecha de hoy).
2. Solicitar permiso de ubicación; si está denegado, mostrar pantalla explicativa con acceso a ajustes del
   sistema — nunca marcar sin ubicación.
3. Capturar GPS (latitude, longitude, accuracyMeters) con la librería de geolocalización ya usada en otros
   módulos de OmniMobile si existe, o proponer una (ej. react-native-geolocation) si no.
4. Disparar biometría nativa vía LocalAuthentication (o el paquete RN equivalente): Face ID/huella. NUNCA
   capturar ni enviar la plantilla biométrica — solo el resultado booleano biometricVerified firmado por el OS.
   Si el dispositivo no tiene biometría enrolada, saltar directo al flujo de selfie sin mostrar error.
5. Enviar POST /api/v1/attendance/mark con el payload correspondiente y manejar los tres resultados posibles
   (OK, FLAGGED, 422 rechazado) mostrando pantallas de resultado distintas y claras para el usuario.
Si accuracyMeters reportado es pobre (> 50m, valor a confirmar con el usuario), avisar antes de enviar en vez
de mandar el dato silenciosamente.
```

### Prompt M-Sprint 2 — Fallback de selfie
```
Actuá como Implementador de OmniMobile. Ya existe el flujo de marcación con biometría nativa (M-Sprint 1).

Tarea: implementar el fallback de selfie cuando LocalAuthentication no está disponible.
- Usar la cámara frontal del dispositivo (react-native-camera o equivalente ya usado en el proyecto).
- Subir la selfie a storage antes de enviar attendance/mark, y pasar la selfieUrl resultante en el payload con
  biometricMethod=SELFIE.
- No implementar comparación facial en el cliente ni en este sprint — la selfie queda para revisión humana en
  el admin (PLAN_FRONTEND_ADMIN_HR.md sección 2.2), tal como está definido en el backend.
```

### Prompt M-Sprint 3 — NFC y QR como métodos alternativos
```
Actuá como Implementador de OmniMobile. Ya existe el flujo principal de marcación (M-Sprint 1).

Tarea:
1. Si el celular soporta NFC, agregar un botón "Marcar con NFC" en Home que lea el NfcTag del empleado
   (reusando el mismo flujo que ya usa nfc-standalone con context=attendance) — confirmar con el usuario si
   los empleados van a tener NfcTag propio en celular/llavero antes de asumir el caso de uso.
2. Agregar un escáner de QR (cámara) como método alternativo, apuntando al mismo endpoint de QR ya implementado
   en el backend (PLAN_OMNIASISTENCIA.md Sprint 1) — confirmar si el QR es fijo por sucursal o rotativo antes
   de implementar el parseo del código.
```

### Prompt M-Sprint 4 — Historial y horario personal
```
Actuá como Implementador de OmniMobile. Ya existe el flujo principal de marcación (M-Sprint 1).

Tarea: implementar las pantallas Historial y Mi horario de PLAN_MOBILE_ASISTENCIA.md (sección 2).
- Historial: lista paginada de AttendanceRecord propios (GET /api/v1/attendance/records filtrado por
  employeeId propio), con ícono de método y badge de reviewStatus por marcación.
- Mi horario: consumir el WorkScheduleAssignment vigente del empleado y mostrar la grilla semanal resultante
  en formato simple de lista (día, horario, o "franco").
```

### Prompt M-Sprint 5 — Manejo offline
```
Actuá como Implementador de OmniMobile. Ya existe el flujo principal de marcación (M-Sprint 1).

Tarea: implementar cola local de marcaciones cuando no hay conexión.
- Guardar la marcación intentada (payload completo + timestamp local del dispositivo) en storage local del
  dispositivo (AsyncStorage o equivalente) si el POST falla por falta de red.
- Mostrar en la UI que la marcación está "pendiente de sincronizar", con reintento automático al recuperar
  conexión (listener de estado de red) y opción de reintento manual.
- Antes de implementar la validación de cuánto margen de desfasaje entre el timestamp local y el momento real
  de sincronización es aceptable, confirmar con el equipo de backend cuál es la regla que van a aplicar del
  lado del servidor (esto no lo decide el cliente).
```

### Prompt M-Sprint 6 — Integración con EventOps (personal de Vivento)
```
Actuá como Implementador de OmniMobile. Ya existe el flujo principal de marcación (M-Sprint 1) y el backend ya
integró attendance con eventops (PLAN_OMNIASISTENCIA.md Sprint 5).

Tarea: cuando el empleado tenga un evento activo de Vivento en vez de un Workplace fijo, mostrar en la pantalla
de marcación "vas a marcar para: [nombre del evento]" en lugar de un nombre de sucursal, consumiendo la
información que ya resuelve el backend (Workplace.isEventBased). Si no hay evento activo ni turno asignado en
ese momento, mostrar el aviso correspondiente sin bloquear la marcación (ver PLAN_MOBILE_ASISTENCIA.md
sección 3).
```
