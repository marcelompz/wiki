# 07 – Plan de Implementación (ajustado a OrderFlow/OmniFlow)

Reemplaza al plan original. Mismo alcance funcional, pero:
- Sin infraestructura nueva (BullMQ/Redis en vez de Kafka/RabbitMQ, JWT en vez de mTLS).
- `tenant_id` desde la Fase 0, no como agregado posterior.
- Fase de Materiales adelantada respecto a Gantt (es el dolor real de campo).
- Se integra al protocolo de OrderFlow: FEAT ID, `docker-compose.standalone.yml`, Traefik, sync de versión/roadmap.

---

## Visión por fases

| Fase | Nombre | Duración estimada | Objetivo principal |
|------|--------|-------------------|---------------------|
| 0 | Fundamentos + alta en el ecosistema | 1-2 semanas | `eventops-standalone` corriendo, registrado, con contratos definidos |
| 1 | Núcleo Evento + Cronograma + Presupuesto | 3 semanas | Primer valor operativo |
| 2 | Materiales + Check-in/Check-out + reconciliación de stock | 3 semanas | Control logístico de campo (el dolor real) |
| 3 | Tareas + Checklists + Gantt | 2-3 semanas | Gestión de equipo |
| 4 | App móvil + Offline | 3-4 semanas | Experiencia de campo completa |
| 5 | Hardening y producción | 2 semanas | Calidad, seguridad y go-live |

**Duración total estimada:** 14-17 semanas — 3 a 4 semanas menos que
el plan original, principalmente por no tener que operar un event
bus nuevo ni mTLS, y por no bloquear valor real (materiales) detrás
del Gantt.

---

## Fase 0 – Fundamentos + alta en el ecosistema (1-2 semanas)

### Entregables
- Registro del módulo en `featurelist.json` con su Feature ID (próximo libre, `FEAT-081`) y entrada correspondiente en `ROADMAP.md`.
- Repositorio: carpeta `services/eventops-standalone/` dentro del monorepo core (no repo aparte).
- Base de datos PostgreSQL propia (`eventops-db`) + migraciones iniciales — **schema con `tenant_id NOT NULL` en todas las tablas desde el día uno**.
- `ORDERFLOW_MODE=enterprise` con `ORDERFLOW_TENANT_ID=provecchio-dimora-001` fijo (mismo switch que el resto del ecosistema, sin lógica condicional en services).
- Alta en `docker-compose.standalone.yml` (servicio + labels de Traefik v3.4, puerto `3027`, subdominio `eventos.*`).
- Auth: JWT del Identity Provider existente de OmniFlow, audiencia `eventops-standalone` — sin mTLS.
- Colas BullMQ `eventops-inbound` / `eventops-outbound` sobre el Redis compartido, con Outbox Pattern local para publicación confiable.
- Contrato de eventos formalizado (envelope + `tenant_id` + lista de eventos), documentado en el propio repo.
- Cliente Axios compartido para llamadas síncronas puntuales hacia el core.
- Health check + logs estructurados con `correlation_id`.
- Sync inicial en `docs/02-architecture.md`, `VERSION`, `CHANGELOG.md` y Wiki, como pide el protocolo.

### Criterios de aceptación
- `eventops-standalone` responde en `eventos.pesallaccia.com` (dev) detrás de Traefik.
- Se puede encolar y consumir un job de prueba de extremo a extremo en ambas colas.
- Pipeline de CI (build, lint, test) pasa en cada push.

---

## Fase 1 – Núcleo del Evento + Cronograma + Presupuesto (3 semanas)

### Entregables
- CRUD de Eventos (con `tenant_id` en cada query — nunca opcional).
- Fases y Actividades (cronograma operativo).
- Budget Items + Expenses, cálculo de desvíos.
- Endpoint de resumen (`GET /events/{id}/summary`).
- Consumo del job `omniflow.contract.confirmed` → creación automática de Evento.
- Publicación de `eventops.event.created` y `eventops.event.status_changed` a `eventops-outbound`.

### Criterios de aceptación
- Al confirmar un contrato en OmniFlow, el evento aparece en EventOps sin intervención manual.
- Se puede registrar cronograma y gastos de un evento de punta a punta vía API.

---

## Fase 2 – Materiales + Check-in/Check-out + reconciliación de stock (3 semanas)

Adelantada respecto al plan original: es la funcionalidad que resuelve
el problema concreto de campo ("¿qué volvió y en qué estado?").

### Entregables
- Modelo `MaterialItem` + `MaterialMovement` + `MaterialMovementItem`.
- Flujo completo de Check-out y Check-in vía API (`POST /events/{id}/materials/check-out|check-in`).
- Detección y registro de faltantes/daños (`material_condition_logs`).
- Publicación de `eventops.material.checked_out`, `checked_in`, `missing_or_damaged`.
- **Consumidor en el core**: cuando el material tiene `external_catalog_item_id`, el job dispara una reserva/liberación real en el módulo de inventario de OmniFlow (no queda como tracking paralelo). Los ítems sin referencia a catálogo (ad-hoc, alquileres) se quedan solo en EventOps.
- Reportes de diferencias (`GET /events/{id}/materials/differences`).

### Criterios de aceptación
- Un ciclo completo de salida y devolución de materiales queda auditado en EventOps.
- Un material con `external_catalog_item_id` se refleja como reservado en el stock real de OmniFlow mientras está fuera del depósito.
- Faltantes y daños generan los eventos correspondientes.

---

## Fase 3 – Tareas + Checklists + Gantt (2-3 semanas)

### Entregables
- Modelo y API de Tareas + checklists anidadas + dependencias.
- Endpoint optimizado `GET /events/{id}/gantt`.
- Asignación de responsables usando `sync_cache_users`.
- Eventos `task.completed` / `task.overdue` a `eventops-outbound`.

### Criterios de aceptación
- Un coordinador puede crear tareas, asignarlas y completar checklists.
- La vista Gantt recibe datos correctos vía el endpoint optimizado.

---

## Fase 4 – App Móvil + Offline (3-4 semanas)

Sin cambios de fondo respecto al diseño original en cuanto a
estrategia offline (outbox local, sync worker, resolución de
conflictos por escenario) — eso ya estaba bien resuelto. Se sugiere
validar primero con un piloto liviano antes de invertir en la app
nativa completa.

### Entregables
- Validación temprana: versión mínima (PWA o formulario web simple) para check-in/out de campo, usada por 1-2 eventos reales antes de comprometerse a la app nativa completa.
- App móvil (Flutter o React Native) con Resumen, Cronograma, Tareas+Gantt, Materiales+Check-in/out.
- Modo offline: precarga, outbox local, sync worker, resolución de conflictos.
- Subida de fotos y firmas en background.
- Notificaciones push.

### Criterios de aceptación
- Un usuario de campo opera un evento completo desde el móvil, incluso sin conexión, y sincroniza al recuperar señal.

---

## Fase 5 – Hardening y Producción (2 semanas)

### Entregables
- Pruebas de carga y resiliencia (core caído, Redis degradado).
- Revisión de scopes JWT y cifrado en tránsito/reposo.
- Documentación OpenAPI/Swagger + contrato de eventos final.
- Runbooks operativos, plan de rollback, feature flags.
- Sync final de versión en todos los archivos del protocolo (`VERSION`, `package.json` back/front, `README.md`, `ROADMAP.md`, `CHANGELOG.md`, manifiestos, Wiki).
- Go-live piloto con 1-2 eventos reales de Vivento.

### Criterios de aceptación
- El servicio cumple SLAs definidos.
- El piloto se completa exitosamente y queda documentado en la Wiki.

---

## Equipo sugerido

| Rol | Dedicación |
|-----|------------|
| Backend Lead / Arquitecto | 100% |
| Backend Developer | 100% |
| Mobile Developer | 100% (a partir de Fase 4) |
| QA / Automation | 50% |
| Product Owner / Domain Expert (Vivento) | 25% |

Se elimina la dedicación de DevOps/Platform como rol separado: al no
sumar infraestructura nueva (Kafka, mTLS), el trabajo de plataforma
lo absorbe el Backend Lead con la config existente de Traefik/Redis.

---

## Riesgos principales y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Cambios frecuentes en contratos de OmniFlow | Alto | Versionado estricto de eventos + `event_id` como `jobId` para dedup |
| Doble contabilidad de stock (EventOps vs. inventario real) | Alto | Resuelto por diseño en Fase 2 — reconciliación obligatoria vía `external_catalog_item_id` |
| Complejidad del modo offline | Medio | Ya viene de un diseño offline sólido; validar antes con piloto liviano (Fase 4) |
| Baja adopción del personal de campo | Medio | Involucrar al equipo de Vivento desde Fase 2, demos frecuentes |
| Sobrecarga del equipo | Medio | Alcance de cada fase cerrado, sin arrancar Fase 4 sin señal de Fase 1-3 |

---

## Próximos pasos inmediatos

1. Registrar `FEAT-081` en `featurelist.json` con este plan.
2. Confirmar `tenant_id` fijo (`provecchio-dimora-001`) con el equipo de OmniFlow.
3. Crear `services/eventops-standalone/` y sumar la entrada a `docker-compose.standalone.yml`.
4. Definir con el módulo de inventario cómo se expone la reserva/liberación de stock que consumirá EventOps en Fase 2.

---

*Fin del plan ajustado. Reemplaza al documento 07 original de la serie EventOps-Docs.*
