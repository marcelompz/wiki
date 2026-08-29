# Informe de Corrección del Historial de Versiones — OrderFlow / OmniFlow (v3)

**Fecha del informe:** 2026-08-18
**Paquete auditado:** `orderflow_1_20_10_tar.gz` (tercera entrega, misma versión de producto que la segunda)
**Informes de referencia:** `INFORME_CORRECCION_VERSIONES.md` (v1), `INFORME_CORRECCION_VERSIONES_v2.md` (v2)
**Fuente de verdad utilizada:** `docs/guides/CHANGELOG.md`

---

## 1. Resumen ejecutivo

Las **5 incoherencias documentales** señaladas en el informe v2 quedaron **resueltas en esta entrega**. El sistema de versionado y documentación "narrativa" (ROADMAP, timeline, changelog, contexto para agentes) es ahora internamente consistente.

Persisten, sin cambios desde la auditoría original (v1), **5 hallazgos de infraestructura y estructura de datos** que no son incoherencias de versión sino defectos de código/configuración — no fueron objeto de este ciclo de corrección.

---

## 2. Incoherencias del informe v2 — todas corregidas

| # | Hallazgo (v2) | Estado en v3 |
|---|---|---|
| 1 | `context/ROADMAP.md` se contradecía en 4 líneas seguidas (título `v1.20.8`, cuerpo `v1.1.5`, próximo release `v1.20.10`, estable `v1.5.1`) | ✅ **Corregido.** Ahora: versión actual `v1.20.10`, próximo release `v1.21.0` (Ingesta Histórica Odoo 14 OmniBI), "COMMERCIAL RELEASE v1.20.10 STABLE" — sin contradicciones internas. |
| 2 | Fecha de `v1.20.0` distinta entre `CHANGELOG.md` (`2026-08-15`) y `docs/timeline.md` (`2026-08-11`) | ✅ **Corregido.** `docs/timeline.md` ahora usa `2026-08-15`, igual que `CHANGELOG.md`. |
| 3 | `CHANGELOG.md` daba por entregada `FEAT-071` (OmniBI) en la entrada `[1.20.0]`, mientras `featurelist.json` la mantenía `in_progress` | ✅ **Corregido.** El título de la entrada pasó de "FEAT-064 - FEAT-071" a **"FEAT-064 - FEAT-070"** — ya no reclama como entregado algo que la lista de features no cierra. |
| 4 | `AGENTS.md` enlazaba a `docs/ROADMAP_MICROSERVICES.md`, inexistente (el archivo real vive en `docs/guides/`) | ✅ **Corregido** en `AGENTS.md` y en `docs/00-contexto-agentes.md` — ambos apuntan ahora a `docs/guides/ROADMAP_MICROSERVICES.md`. |
| 5 | `docs/00-contexto-agentes.md` citaba `v1.18.2` como versión actual | ✅ **Corregido.** Ahora dice `v1.20.10`. |

---

## 3. Hallazgos pendientes (sin cambios desde el informe v1)

Estos no son incoherencias de versión — son defectos de infraestructura, código y estructura de datos detectados en la primera auditoría (paquete `1.2.0`) que se mantienen idénticos en las tres entregas siguientes:

| # | Hallazgo | Ubicación | Impacto |
|---|---|---|---|
| 1 | Entradas `0.2.2` y `0.2.3` del changelog mal ubicadas (después de `0.0.1`, rompiendo el orden cronológico descendente del resto del archivo) | `docs/guides/CHANGELOG.md` (líneas 445 y 584) | Bajo — cosmético/legibilidad, no afecta al número de versión actual |
| 2 | Faltan las entradas individuales `FEAT-067`, `FEAT-068`, `FEAT-069`, `FEAT-070` en la lista estructurada de features (aunque sí están nombradas con título en `docs/ROADMAP.md`) | `context/featurelist.json` | Medio — rompe la trazabilidad 1:1 entre roadmap narrativo y sistema de memoria estructurada que exige la Regla 4 de `AGENTS.md` |
| 3 | Servicio `nginx:alpine` sirviendo el build de frontend | `infra/docker-compose.yml` (líneas 108, 112-113) | Medio — viola la Regla de Arquitectura "NO usar Nginx: Traefik administra SSL y subdominios" |
| 4 | Imagen `traefik:v3.2` pineada, por debajo del v3.3/v3.4 exigido en la documentación | `infra/docker-compose.yml` (línea 6) | Medio — mismo archivo que el hallazgo anterior; ambos sugieren que este compose (perfil de desarrollo local) no se actualiza junto con el resto del stack |
| 5 | `new PrismaClient()` instanciado directamente, fuera del manager designado (`TenantConnectionManager`) | `backend/social-catalog/migrations/migrate-whatsapp-to-social.ts` (línea 4) | Medio — viola la Regla de Arquitectura "Prohibido Instanciar PrismaClient Directamente"; es un script de migración one-off, pero la regla no documenta una excepción para este caso |

Adicionalmente, siguen sin existir en el paquete los directorios que `featurelist.json` referencia como `assigned_module` de las dos features `in_progress`:
- `FEAT-012` (app móvil Expo) → `mobile/` no existe.
- `FEAT-071` (OmniBI) → `backend/bi/`, `odoo-adapter/` no existen.

Esto es coherente con que ambas sigan marcadas `in_progress` — no se reporta como contradicción, solo como recordatorio de que el trabajo declarado abierto efectivamente no tiene código entregado todavía en este paquete.

---

## 4. Recomendación

El proceso de corrección documental (versión, fechas, enlaces, contradicciones narrativas) está funcionando bien ciclo a ciclo. Sugiero que el próximo ciclo de trabajo se enfoque en los 5 hallazgos de la §3, que son de naturaleza distinta (infraestructura/código, no documentación) y llevan **tres auditorías consecutivas sin tocarse**:

1. Reordenar `0.2.2`/`0.2.3` en `CHANGELOG.md` (5 minutos, cero riesgo).
2. Agregar `FEAT-067`–`FEAT-070` a `featurelist.json` con los títulos que ya existen en `docs/ROADMAP.md` (sincronización de datos, sin código).
3. Decidir y documentar si `infra/docker-compose.yml` es un perfil de desarrollo local exento de las reglas de producción (Nginx, Traefik v3.2) — y si lo es, anotarlo explícitamente en `AGENTS.md` como excepción; si no, migrarlo a Traefik y actualizar la imagen.
4. Igual criterio para `new PrismaClient()` en el script de migración: o se documenta como excepción permitida para scripts fuera de NestJS DI, o se refactoriza para usar el manager.
