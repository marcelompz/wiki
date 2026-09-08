# 07 – Plan de Implementación

Roadmap recomendado para construir e integrar el servicio **EventOps** de forma incremental y de bajo riesgo.

---

## Visión por fases

| Fase | Nombre | Duración estimada | Objetivo principal |
|------|--------|-------------------|--------------------|
| 0 | Fundamentos | 2-3 semanas | Infraestructura y contratos listos |
| 1 | Núcleo Evento + Cronograma + Presupuesto | 3-4 semanas | Primer valor operativo |
| 2 | Tareas + Checklists + Gantt | 3 semanas | Gestión de equipo |
| 3 | Materiales + Check-in/Check-out | 3-4 semanas | Control logístico de campo |
| 4 | Integración avanzada + App móvil | 4 semanas | Experiencia completa y offline |
| 5 | Hardening y producción | 2-3 semanas | Calidad, seguridad y go-live |

**Duración total estimada:** 17-21 semanas (aprox. 4-5 meses) con un equipo pequeño-mediano.

---

## Fase 0 – Fundamentos (2-3 semanas)

### Entregables
- Repositorio y estructura del proyecto (monorepo o polyrepo)
- CI/CD básico (build, test, lint, deploy a entorno `dev`)
- Base de datos PostgreSQL + migraciones iniciales
- Autenticación (JWT + integración con Identity Provider de OmniFlow)
- Implementación del **Outbox Pattern**
- Definición formal y versionado de los contratos de eventos (documento 02)
- Esqueleto del Event Bus (productor + consumidor de prueba)
- Observabilidad mínima (logs estructurados + health checks)

### Criterios de aceptación
- Se puede publicar y consumir un evento de prueba de extremo a extremo.
- Pipeline de CI pasa en cada push a `main`.

---

## Fase 1 – Núcleo del Evento + Cronograma + Presupuesto (3-4 semanas)

### Entregables
- CRUD de Eventos
- Fases y Actividades (cronograma operativo)
- Budget Items + Expenses
- Cálculo de desvíos presupuestarios
- Endpoint de resumen (`/events/{id}/summary`)
- Consumo del evento `omniflow.contract.confirmed` → creación automática de Evento
- Publicación de `eventops.event.created` y `eventops.event.status_changed`

### Criterios de aceptación
- Desde OmniFlow se puede confirmar un contrato y aparece el evento en EventOps.
- Se puede registrar el cronograma y gastos de un evento de punta a punta vía API.

---

## Fase 2 – Tareas + Checklists + Gantt (3 semanas)

### Entregables
- Modelo y API de Tareas
- Checklists anidadas
- Dependencias entre tareas
- Endpoint optimizado `/events/{id}/gantt`
- Asignación de responsables (usando caché de usuarios de OmniFlow)
- Eventos `task.completed` y `task.overdue`
- Notificaciones push básicas (opcional en esta fase)

### Criterios de aceptación
- Un coordinador puede crear tareas, asignarlas y completar checklists.
- La vista Gantt recibe datos correctos y performantes.

---

## Fase 3 – Materiales + Check-in / Check-out (3-4 semanas)

### Entregables
- Modelo de MaterialItem + MaterialMovement + MaterialMovementItem
- APIs de alta de materiales y listado
- Flujo completo de **Check-out**
- Flujo completo de **Check-in** (con detección de faltantes/daños)
- Actualización transaccional de cantidades
- Eventos de materiales (`checked_out`, `checked_in`, `missing_or_damaged`)
- Sincronización opcional con catálogo de OmniFlow
- Reportes de diferencias

### Criterios de aceptación
- Se puede realizar un ciclo completo de salida y devolución de materiales.
- Los faltantes y daños generan los eventos correspondientes y quedan auditados.

---

## Fase 4 – Integración avanzada + App Móvil (4 semanas)

### Entregables
- BFF / API Gateway (orquestación OmniFlow + EventOps)
- App móvil (Flutter o React Native) con las pantallas principales:
  - Resumen del evento
  - Cronograma
  - Tareas + Checklist + Gantt
  - Materiales + Check-out + Check-in
- **Modo offline** (precarga + outbox local + sync)
- Subida de fotos y firmas
- Notificaciones push
- Dashboards cruzados básicos

### Criterios de aceptación
- Un usuario de campo puede operar un evento completo desde el móvil, incluso sin conexión, y sincronizar al recuperar señal.
- Los flujos de Check-in/out y Gantt son usables en condiciones reales de evento.

---

## Fase 5 – Hardening y Producción (2-3 semanas)

### Entregables
- Pruebas de carga y performance
- Pruebas de resiliencia (OmniFlow caído, Event Bus degradado)
- Seguridad (revisión de scopes, mTLS/JWT servicio-a-servicio, cifrado)
- Monitoreo y alertas en producción
- Documentación de APIs (OpenAPI/Swagger) y de eventos
- Runbooks operativos
- Plan de rollback y feature flags
- Go-live controlado (piloto con 1-2 eventos reales)

### Criterios de aceptación
- El servicio cumple los SLAs definidos.
- Existe capacidad de detectar y responder a incidentes.
- El piloto se completa exitosamente.

---

## Equipo sugerido

| Rol | Dedicación |
|-----|------------|
| Backend Lead / Arquitecto | 100% |
| Backend Developer | 100% |
| Mobile Developer | 100% (a partir de Fase 3-4) |
| QA / Automation | 50-100% |
| DevOps / Platform | 25-50% |
| Product Owner / Domain Expert | 25% |

---

## Riesgos principales y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Cambios frecuentes en contratos de OmniFlow | Alto | Versionado estricto de eventos + dual-publish temporal |
| Complejidad del modo offline | Alto | Empezar con operaciones críticas (tareas + materiales) y expandir |
| Baja adopción del personal de campo | Medio | Involucrar usuarios reales desde Fase 3, UX simple y feedback rápido |
| Problemas de sincronización de materiales | Alto | Reglas de negocio estrictas en servidor + pruebas de conflicto |
| Sobrecarga del equipo | Medio | Mantener el alcance de cada fase cerrado y hacer demos frecuentes |

---

## Métricas de éxito (post go-live)

- % de eventos operados completamente desde EventOps
- Tiempo medio de registro de Check-out / Check-in
- % de movimientos realizados offline
- Número de incidencias de materiales detectadas vs reportadas manualmente
- Desvío presupuestario promedio detectado a tiempo
- Satisfacción del equipo de operaciones (NPS interno)

---

## Próximos pasos inmediatos recomendados

1. Validar y ajustar los contratos de eventos con el equipo de OmniFlow.
2. Definir el stack definitivo (NestJS vs FastAPI, Flutter vs RN).
3. Crear el repositorio y la estructura de Fase 0.
4. Agendar sesión de alineación de dominio (eventos gastronómicos / logísticos) con operaciones.

---

*Fin de la serie de documentos EventOps.*  
*Todos los archivos se encuentran en la carpeta `EventOps-Docs`.*
