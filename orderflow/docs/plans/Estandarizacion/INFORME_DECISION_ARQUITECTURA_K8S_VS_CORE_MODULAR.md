# 📐 Informe: Decisión de Arquitectura — Core Modular vs Salto a Kubernetes

**Fecha:** 2026-09-15
**Contexto:** Diagnóstico solicitado tras revisión del `ROADMAP.md` v1.34.0 y la decisión de consolidar los 18 microservicios standalone en un core mínimo con módulos acoplables.
**Objetivo del documento:** Dejar constancia de por qué se frena el avance hacia arquitectura standalone/K8s, y establecer las métricas objetivas que deben cumplirse antes de reabrir esa puerta.

---

## 1. Diagnóstico: contradicción entre el ROADMAP actual y la decisión tomada

El `ROADMAP.md` (v1.34.0) describe la **Suite Microservicios Standalone** (`:3020`-`:3027`, BioLinks, Catalog, Bookings, Giveaways, OmniBI, OmniLedger, etc.) como arquitectura al 92% de madurez y "Production Ready". Esto ya no refleja la dirección real del proyecto.

**Decisión vigente (no reflejada aún en el ROADMAP):** pasar de microservicios verdaderamente standalone (cada uno con su propio Postgres y su propio auth) a un **core mínimo** que centraliza autenticación, con módulos livianos acoplables que corren siempre junto al core. Ninguno de los módulos actuales necesita instalarse de forma independiente en un servidor sin el core de OmniFlow corriendo — la separación en servicios era solo por mantenibilidad interna, no por necesidad real de distribución externa.

**Motivo original de la decisión:** el modelo standalone actual consume más recursos de los esperados (cada servicio duplicando conexión a DB, middleware de auth, footprint de runtime).

**Por qué esto no es un volantazo sino una secuencia lógica:** el propio ROADMAP, en su sección v3.0.0, ya establecía que Docker Compose es el runtime hasta v2.x y que K8s recién se evalúa "según volumen de tenants y microservicios standalone desplegados". La consolidación a core modular es aplicar ese mismo criterio un nivel más abajo: antes de escalar infraestructura, hay que consolidar arquitectura de servicios.

---

## 2. Por qué ir a K8s ahora sería prematuro (evidencia del propio repo)

Estos hallazgos, ya documentados en auditorías previas del repo, son la razón de fondo para no escalar infraestructura todavía:

| Hallazgo | Estado | Riesgo si se pasa a K8s sin resolver |
|---|---|---|
| `JwtAuthGuard` (protege POS/admin/KDS) nunca setea `tenantPrisma` | Sin resolver en múltiples auditorías consecutivas | Todo el tráfico de sesión normal cae al cliente Prisma compartido — fuga entre tenants se multiplica por cada pod/réplica adicional |
| `@TenantPrisma()` migrado solo en un puñado de archivos de negocio vs decenas con `this.prisma` directo | Sin resolver | Migrar a K8s no arregla el aislamiento; solo lo distribuye a más instancias con el mismo bug |
| Endpoint `DELETE /:id/hard-delete` de Tenant sigue vivo, bypasea soft-delete y retención | Sin resolver | Orquestación no mitiga un botón de borrado sin red de seguridad — lo hace más accesible si se automatiza el despliegue |
| Cola de tareas durable (BullMQ/Redis) para webhooks/integraciones | Prerrequisito planificado para v1.16.0, no confirmado como completo | Sin colas durables, reintentos automáticos de K8s (restart de pods) no garantizan que los webhooks perdidos se recuperen |

**Conclusión:** escalar infraestructura antes de cerrar estos puntos aumenta el radio de impacto de bugs ya conocidos, no lo reduce.

---

## 3. Checklist de métricas — Gate de decisión "¿Estoy listo para K8s?"

Usar esta tabla como gate real antes de reabrir la discusión de K8s. Mientras no se cumplan **todos** los prerrequisitos de la sección A, no evaluar la sección B (son bloqueantes, no opcionales).

### A. Prerrequisitos bloqueantes (deben estar en ✅ antes de mirar la sección B)

| # | Prerrequisito | Cómo se mide | Umbral de "listo" |
|---|---|---|---|
| A1 | Aislamiento de tenant resuelto de raíz | Conteo de archivos de negocio con `this.prisma` directo vs `@TenantPrisma()` | 0 archivos de negocio con `this.prisma` directo fuera de `common/`/lectura pública |
| A2 | `JwtAuthGuard` setea `tenantPrisma` correctamente | Test de integración que fuerza una request de sesión (no API key) y verifica el tenant resuelto | Test verde en CI, no solo revisión manual |
| A3 | Endpoint hard-delete de tenant sin red de seguridad | Búsqueda del endpoint en el router | Eliminado o forzado a pasar por soft-delete + retención |
| A4 | Cola de tareas durable para integraciones externas | Verificación de BullMQ/Redis en `orders.service.confirm()` y webhooks de FacturaSend/pasarelas | Confirmado en producción, con reintentos probados |
| A5 | Secrets sin defaults hardcodeados | Grep de patrones tipo `-change-in-production` en el repo | 0 ocurrencias, fail-fast real si falta env var |

### B. Señales de necesidad real de K8s (solo evaluar si A está 100% ✅)

| # | Métrica | Cómo se mide | Umbral orientativo para considerar K8s |
|---|---|---|---|
| B1 | Tenants activos simultáneos | Conteo en producción (Super Admin) | Definir umbral propio según capacidad real observada del VPS actual (no un número de "libro") |
| B2 | Distribución de carga entre módulos | CPU/memoria por servicio en ventanas de pico (Grafana/Prometheus o métricas nativas de Docker) | Algún módulo satura de forma sostenida mientras otros quedan ociosos — necesidad de escalar de forma **desigual** |
| B3 | Frecuencia de despliegue por módulo | Historial de deploys por servicio | Cadencias muy distintas entre módulos, con deploys de uno afectando la disponibilidad de otros sin necesidad |
| B4 | Incidentes por falta de auto-healing | Registro de caídas que requirieron intervención manual y que un restart automático más agresivo hubiera evitado | Repetición del mismo tipo de incidente pese a `restart: unless-stopped` + réplica standby (FEAT-011) |
| B5 | Requisito real de multi-región/multi-cloud | Contrato o cliente concreto que lo exige | Existe un caso de negocio real, no solo roadmap especulativo |
| B6 | Capacidad operativa | ¿Hay una persona/equipo dedicado a operar el cluster? | Respuesta afirmativa y sostenible — si la respuesta es "yo solo, cuando tenga tiempo", no está listo independientemente de B1-B5 |

**Regla de decisión:** si A no está completo, la respuesta es no, sin excepción. Si A está completo pero B no muestra al menos 2-3 señales concretas y sostenidas (no picos aislados), seguir en Docker Compose + core modular es la opción correcta.

---

## 4. Instrucciones para actualizar la documentación

### 4.1 En `ROADMAP.md`

1. **Corregir la fila "Suite Microservicios Standalone"** en la Matriz de Madurez (línea ~19): ya no es la arquitectura objetivo. Reemplazar la descripción por el estado real (core mínimo + módulos acoplables) o marcarla explícitamente como "en transición hacia core modular — ver `PLAN_ARQUITECTURA_CORE_MODULAR.md`".
2. **Agregar una nota en la sección "🚀 v1.10.0 — Infrastructure Deploy Manager"** o crear una nueva sección `v1.x — Consolidación Core Modular` documentando el paso de 18 servicios standalone a core + módulos acoplables, antes de las secciones que asumen la arquitectura standalone como dada.
3. **En la sección `v3.0.0 — Kubernetes + Escala`** (línea ~521), agregar como prerrequisito explícito el checklist de la Sección 3 de este informe (o un link a él), reemplazando o complementando el texto actual de "Estrategia de escalado".
4. Mantener la frase ya existente ("Docker Compose... es el runtime hasta v2.x") pero anclarla ahora al gate de métricas en vez de solo a una versión de release — la condición es el checklist, no el número de versión.

### 4.2 Documento nuevo sugerido

Crear `docs/plans/PLAN_ARQUITECTURA_CORE_MODULAR.md` siguiendo el mismo patrón que `PLAN_BLINDAJE_ORDERFLOW.md` / `PLAN_CIERRE_TENANT_ISOLATION.md` (plan maestro + prompts de implementación por fase), cubriendo:
- Fase 0: diagnóstico del estado real de cada uno de los 18 módulos (¿cuáles ya no necesitan su propio Postgres/auth?)
- Fase 1: diseño del core mínimo (auth centralizado, contrato de módulo acoplable)
- Fase 2: migración módulo por módulo, empezando por los de menor riesgo
- Fase 3: cierre — cuándo se considera completada la consolidación

### 4.3 Seguimiento del gate de K8s

Incorporar la tabla de la Sección 3 (A y B) como un documento vivo, por ejemplo `docs/plans/GATE_DECISION_KUBERNETES.md`, actualizado en cada auditoría de estado del arte (mismo ritmo que las auditorías de `this.prisma` vs `@TenantPrisma()` que ya se vienen haciendo tar.gz a tar.gz), de forma que cada revisión registre el avance real de A1-A5 y B1-B6 en vez de reevaluar todo desde cero.

---

*Fin del informe.*
