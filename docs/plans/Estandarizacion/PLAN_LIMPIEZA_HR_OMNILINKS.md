# PLAN_LIMPIEZA_HR_OMNILINKS.md

**Base auditada:** tarball v1.34.0 completo (post-fix de `pack_orderflow_audit.sh`, 68/68 módulos de `app.module.ts` presentes).
**Contexto:** el commit de limpieza `6b13d8e0` retiró `services/hr-standalone/`, `services/biolinks-standalone/` y `services/omnilinks-standalone/`. La documentación quedó desalineada con ese cambio en distintos grados — no es el mismo tipo de arreglo para cada caso.

---

## Punto 1 — `featurelist.json`: FEAT-107 apunta a una ruta que ya no existe

**Estado actual real:**
```json
"assigned_module": "services/hr-standalone/, backend/src/hr/, docs/planes/capital-humano/PLAN_OMNICAPITALHUMANO.md",
"description": "...Diseñado como microservicio standalone desacoplado (services/hr-standalone, :3028 / rrhh.<domain>) compartiendo @orderflow/auth-shared."
```

**Corrección:**
- `assigned_module` → quitar `services/hr-standalone/`, dejar solo `backend/hr/, docs/planes/capital-humano/PLAN_OMNICAPITALHUMANO.md` (la ruta real hoy es `backend/hr/`, no `backend/src/hr/` — el backend está aplanado).
- `description` → quitar el framing de "microservicio standalone desacoplado (:3028 / rrhh.\<domain\>)". El módulo vive y va a seguir viviendo en el core, consistente con la decisión de arquitectura core-modular ya tomada (ningún módulo se vende suelto).
- `status`: **no tocar sin confirmar primero** — el propio informe (Punto 2) reporta gaps reales (endpoints de horarios/ausencias/dispositivos sin exponer, `AttendancePolicy` sin evaluación dinámica, webhooks ZKTeco/Hikvision inactivos). `in_progress` parece seguir siendo correcto, pero no es algo que deba decidir yo sin que lo confirmes contra el estado real del código.

## Punto 2 — `docs/info/INFORME_ROADMAP_HR_STANDALONE.md`: documenta una extracción que no ocurrió

El informe afirma en su tabla de estado: **"Microservicio Standalone: ✅ 100% Completado (v1.0.0) — Extraído como microservicio autónomo en puerto :3028"**. Esto es falso — `hr-standalone` fue un intento abandonado, nunca llegó a v1.0.0 real de producción, y se borró. Este documento, tal como está, puede llevar a alguien a asumir que existe un servicio en `:3028`/`rrhh.<tenant>.<domain>` que no existe.

**Corrección:**
- Renombrar el archivo a `INFORME_ESTADO_HR_CORE.md` (o similar) — retirar "STANDALONE" del nombre, ya que esa arquitectura no es el objetivo.
- Reescribir el Resumen Ejecutivo y la tabla de estado: eliminar la fila "Microservicio Standalone", dejar registrado que el módulo vive en `backend/hr/` como parte del core y que **no hay planes de extraerlo** (alineado con la decisión de core-modular).
- Mantener intacta la sección de gaps reales (Punto 3 del informe: endpoints faltantes, `AttendancePolicy`, webhooks hardware) — esa parte sigue siendo información válida y útil, no depende de la arquitectura standalone.

**Hallazgo adicional no pedido pero relacionado:** existe una copia completa y duplicada del informe (idéntica, confirmado por diff) en `docs/info/orderflow_1.34.0/docs/info/INFORME_ROADMAP_HR_STANDALONE.md` — dentro de una carpeta anidada `docs/info/orderflow_1.34.0/` de **37 MB** que contiene una copia entera de un tarball viejo (`desktop/`, `packages/auth-shared/`, etc.) pegada dentro de `docs/info/` en el repo real. Esto no es un artefacto de mi copia — está en `/opt/orderflow` — recomiendo borrar esa carpeta completa (`rm -rf docs/info/orderflow_1.34.0/`), probablemente quedó de un `tar -xzf` hecho sin querer dentro del repo.

## Punto 3 — `omnilinks-standalone`: no hay nada que limpiar en `featurelist.json` (confirmado, cero menciones) — pero sí hay documentación viva describiendo una arquitectura que ya no existe

Corrección al diagnóstico original: `omnilinks-standalone` **sí existió** — era una copia exacta (mismos checksums, 40/40 archivos) de `biolinks-standalone`, resultado de un rebranding a "OmniBio" que duplicó la carpeta en vez de renombrarla. Se borró correctamente junto con el original en el mismo cleanup. No se perdió código.

Lo que sí queda vivo y desactualizado:
- `docs/plans/omnibi/OMNIBIO_STANDALONE_TUNING.md` — describe `@orderflow/omni-bio-standalone`, puerto 3022, DB dedicada, `@orderflow/auth-shared` — arquitectura completamente retirada.
- `docs/plans/omniBio/PLAN_OMNIBIO_MEJORAS_v1.md` — todavía referencia `/omnilinks` vs `/bio` "(standalone)" como si el servicio standalone siguiera existiendo.
- `docs/plans/finalizados/SCHEMA_DECOUPLING_PLAN.md` — ya está en `finalizados/`, no requiere corrección (es histórico por diseño).

**Recomendación:** no es parte de los 3 puntos originales, pero si vas a tocar documentación de OmniBio de todos modos, marcar `OMNIBIO_STANDALONE_TUNING.md` y `PLAN_OMNIBIO_MEJORAS_v1.md` con una nota de "arquitectura superada — el módulo vive en `backend/biolinks/`" evita que alguien planifique trabajo sobre un puerto/DB que no existen.

---

## Prompt de implementación (los 3 puntos, un solo Implementador)

```
Rol: Implementador (OrderFlow/OmniFlow), repo core.

Tarea 1 — context/featurelist.json, FEAT-107:
- assigned_module: quitar "services/hr-standalone/", dejar
  "backend/hr/, docs/planes/capital-humano/PLAN_OMNICAPITALHUMANO.md".
- description: quitar la frase "Diseñado como microservicio standalone
  desacoplado (services/hr-standalone, :3028 / rrhh.<domain>) compartiendo
  @orderflow/auth-shared." — reemplazar por una frase que indique que vive
  en el core (backend/hr/), sin planes de extracción a standalone.
- NO tocar el campo "status" — dejarlo en in_progress hasta confirmación
  explícita del estado real de los gaps listados en el informe de la Tarea 2.

Tarea 2 — docs/info/INFORME_ROADMAP_HR_STANDALONE.md:
- Renombrar a docs/info/INFORME_ESTADO_HR_CORE.md.
- Reescribir el Resumen Ejecutivo y la tabla de "Estado Actual de la
  Implementación": eliminar la fila "Microservicio Standalone", y agregar
  una línea explícita de que el módulo no se va a extraer a standalone
  (arquitectura core-modular).
- Mantener sin cambios la sección "Diagnóstico de Gaps & Discrepancias".
- Borrar la carpeta docs/info/orderflow_1.34.0/ completa (37MB, copia
  duplicada de un tar.gz viejo pegada dentro de docs/info/ por error).

Tarea 3 — no requiere cambios en featurelist.json (verificado: cero
menciones de "omnilinks"). Opcional si se toca documentación de OmniBio
de todos modos: agregar una nota de "arquitectura superada" al inicio de
docs/plans/omnibi/OMNIBIO_STANDALONE_TUNING.md y
docs/plans/omniBio/PLAN_OMNIBIO_MEJORAS_v1.md indicando que el servicio
vive en backend/biolinks/, sin puerto ni DB propia.

Sincronizar el cambio de versión/documentación según AGENTS.md si alguna
de estas ediciones cuenta como cambio de arquitectura documentado.
```
