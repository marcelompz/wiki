# INFORME TÉCNICO & ROADMAP — OmniCapitalHumano & OmniAsistencia (`hr-standalone`)

> **Documento de Diagnóstico y Hoja de Ruta de Desarrollo**  
> **Versión del Sistema:** `v1.27.10`  
> **Fecha de Emisión:** 8 de Septiembre de 2026  
> **Ubicación:** `docs/info/INFORME_ROADMAP_HR_STANDALONE.md`  

---

## 📌 1. Resumen Ejecutivo

El módulo **OmniCapitalHumano & OmniAsistencia** tiene como objetivo dotar a la plataforma OrderFlow de una suite integral para la gestión de legajos de colaboradores (`Employee`), control de asistencia multi-método (NFC, QR, Biometría, Geocercas GPS con fórmula Haversine), administración de horarios/turnos y nómina.

Actualmente, el sistema cuenta con un **MVP funcional dentro del monolito core** (`backend/src/hr/`), el cual está integrado al frontend del panel de administración (`/admin/hr`). Sin embargo, existe una discrepancia con el `README.md` del App Store que describe la arquitectura final desacoplada de la suite **`services/hr-standalone`** (puerto `:3028` / `rrhh.<tenant>.<domain>`).

Este informe detalla el estado actual del desarrollo, la brecha técnica (gaps) y la hoja de ruta en fases para su extracción y completitud.

---

## 📊 2. Estado Actual de la Implementación (v1.27.10)

| Componente | Estado Actual | Ubicación en Código | Descripción / Cobertura |
|---|---|---|---|
| **Modelos de Datos (Prisma)** | ✅ **100% Completado** | `backend/prisma/schema.prisma` | Todos los modelos creados y vinculados (`Employee`, `AttendanceRecord`, `PayrollRun`, `Payslip`, `PayrollConcept`, `Workplace`, `BiometricDevice`, etc.). |
| **Backend Service & API** | ✅ **100% Completado** | `backend/src/hr/` | Endpoints completos para Legajos, Matriz de Turnos, Ausencias, Vacaciones (12/18/30d), Nómina (`l10n-py`), Recibos, Reporte REOP MTESS y Webhooks Hardware. |
| **Seguridad & RBAC** | ✅ **100% Completado** | `backend/src/hr/hr.controller.ts` | Protegido con `@UseGuards(PermissionsGuard)` y permisos granulares (`hr:*`) más auditoría inmutable de campos sensibles en `EmployeeAuditLog`. |
| **Localización Laboral (`hr-l10n`)** | ✅ **100% Completado** | `backend/src/hr/localization/` | Arquitectura Strategy + Registry con `ParaguayLocalizationAdapter` (IPS obrero 9%, patronal 16.5%, Aguinaldo 1/12, horas extra 50%/100%). |
| **Microservicio Standalone** | ✅ **100% Completado (v1.0.0)** | `services/hr-standalone` | Extraído como microservicio autónomo en puerto `:3028` configurado en `docker-compose.standalone.yml` y Traefik v3.4 (`rrhh.<tenant>.<domain>`). |

---

## 🔍 3. Diagnóstico de Gaps & Discrepancias

1. **Endpoints de Gestión Inexistentes (API):**
   - Aunque los modelos de horarios (`ShiftTemplate`, `WorkSchedule`), feriados (`Holiday`), ausencias/vacaciones (`LeaveRequest`, `VacationBalance`), reprimendas (`Reprimand`) y dispositivos biométricos (`BiometricDevice`) existen en la base de datos, no poseen endpoints expuestos en `HrController`.
2. **Geocercas & Políticas (`AttendancePolicy`):**
   - El backend valida la distancia GPS con la fórmula Haversine frente a `Workplace.radiusMeters`. Si excede el radio, marca el registro como `FLAGGED`. Sin embargo, la política por rol/empleado (`STRICT`, `FLAG`, `NONE`) aún no se evalúa dinámicamente desde `AttendancePolicy`.
3. **Dispositivos Hardware & NFC:**
   - La estructura recibe `nfcScanLogId` y campos de biometría, pero aún no cuenta con los webhooks ni adaptadores activos para terminales ZKTeco / Hikvision.
4. **Relación Tripartita Odoo-Style (`Contact` ↔ `Employee` ↔ `User`):**
   - El schema contempla `contactId` y `userId`, pero el flujo de creación en el frontend aún no fuerza la vinculación obligatoria desde la agenda de contactos unificada.

---

## 🗺️ 4. Hoja de Ruta (Roadmap de Implementación)

```mermaid
flowchart LR
    Fase1["Fase 1: Completar API Monolito (FEAT-107)"] --> Fase2["Fase 2: Marcador & Geocercas (FEAT-108)"]
    Fase2 --> Fase3["Fase 3: Extracción hr-standalone (:3028)"]
    Fase3 --> Fase4["Fase 4: Hardware & Biometría ZKTeco"]
```

### 🗓️ Fase 1: Completar Controladores y Lógica de Negocio del Monolito
- Exponer endpoints CRUD para `ShiftTemplate`, `WorkSchedule`, `Holiday` y `Workplace`.
- Habilitar la solicitud y aprobación de ausencias/vacaciones (`LeaveRequest`, `VacationBalance`).
- Implementar flujo de revisión y aprobación de marcaciones observadas (`PATCH /api/v1/hr/attendance/records/:id/review`).

### 🗓️ Fase 2: Profundización de Marcación y Geocercas Dinámicas
- Integrar la evaluación dinámica de políticas (`AttendancePolicy`) para soportar modos `STRICT` (bloqueo) y `NONE` (sin validación).
- Implementar validación GPS contra eventos temporales (`EventOps`).

### 🗓️ Fase 3: Extracción a Microservicio Standalone (`services/hr-standalone`)
- Crear directorio `services/hr-standalone/` desacoplado del monolito.
- Integrar `@orderflow/auth-shared` para autenticación ligera por JWT y API Key.
- Configurar puerto `:3028` en `docker-compose.standalone.yml`.
- Configurar regla de enrutamiento en Traefik v3.4 para soporte de subdominio `rrhh.<tenant>.<domain>`.

### 🗓️ Fase 4: Integración Hardware y Marcador Kiosko
- Webhooks de ingesta masiva para terminales ZKTeco y Hikvision.
- PWA / Marcador Kiosko PIN & QR de respuesta rápida para puntos de fichaje compartidos.

---

## 📌 5. Conclusión y Recomendación

El módulo `hr` **posee una base técnica sólida y desarrollada** en cuanto a modelo de datos y endpoints fundamentales de legajo y asistencia GPS.

Para resolver la visibilidad y acceso inmediato:
1. **Activar el módulo:** Asegurarse de que el módulo `hr` figure activado en la tabla `ModuleInstallation` del tenant actual.
2. **Acceso directo:** La ruta de la interfaz administrativa activa es `https://<tenant-domain>/admin/hr`.
3. **Continuidad del Roadmap:** Seguir el plan de fases para la extracción a `services/hr-standalone` en el puerto `:3028`.
