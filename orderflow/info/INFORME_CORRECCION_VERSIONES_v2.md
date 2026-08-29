# Informe de Corrección del Historial de Versiones — OrderFlow / OmniFlow (v2)

**Fecha del informe:** 2026-08-18
**Paquete auditado:** `orderflow_1_20_10_tar.gz`
**Paquete de referencia (auditoría anterior):** `orderflow_1_2_0_tar.gz`
**Fuente de verdad utilizada:** `docs/guides/CHANGELOG.md`

Este informe actualiza el anterior (`INFORME_CORRECCION_VERSIONES.md`) con el estado del nuevo paquete entregado. No lo reemplaza: documenta qué se corrigió, qué sigue pendiente y qué problemas nuevos aparecieron.

---

## 1. Resumen ejecutivo

De las 10 discrepancias de versión detectadas en el informe anterior, **8 fueron corregidas** y ahora todo el "primer anillo" de archivos (VERSION, ambos `package.json`, Swagger, `featurelist.json`, `docs/ROADMAP.md`, `context/README.md`) declara consistentemente **`1.20.10`**. `CHANGELOG.md` pasó de tener su última entrada real en `1.5.1` a tener entradas hasta `1.20.10`, incorporando 5 versiones nuevas documentadas.

Sin embargo:
- **`context/ROADMAP.md` no fue tocado** y es ahora el único archivo desalineado, con una autocontradicción interna sin resolver.
- El defecto de orden interno del `CHANGELOG.md` (entradas `0.2.2`/`0.2.3` mal ubicadas) **sigue sin corregirse**.
- Aparecieron **dos discrepancias nuevas**: una fecha distinta para `v1.20.0` entre `CHANGELOG.md` y `docs/timeline.md`, y un estado de feature contradictorio entre `CHANGELOG.md` (da FEAT-071 por completada) y `featurelist.json` (la mantiene `in_progress`).
- La brecha de documentación se redujo pero no se cerró: aún faltan entradas de changelog para varias versiones que otros documentos dan por completadas.

---

## 2. Estado de las correcciones solicitadas (informe v1 → v2)

| Archivo | Valor en v1 (auditoría anterior) | Valor en v2 (este paquete) | Estado |
|---|---|---|---|
| `context/VERSION` | `1.2.0` | `1.20.10` | ✅ Corregido |
| `backend/package.json` | `1.2.0` | `1.20.10` | ✅ Corregido |
| `frontend/package.json` | `1.2.0` | `1.20.10` | ✅ Corregido |
| `backend/main.ts` (Swagger) | `1.20.6` | `1.20.10` | ✅ Corregido |
| `context/featurelist.json` (version) | `1.20.4` | `1.20.10` | ✅ Corregido |
| `context/README.md` (badge) | `1.20.8` | `1.20.10` | ✅ Corregido |
| `context/README.md` (pie de página) | `1.20.4` | `1.20.10` | ✅ Corregido |
| `docs/ROADMAP.md` ("Versión actual") | `1.20.6` | `1.20.10` | ✅ Corregido |
| `context/ROADMAP.md` (título) | `v1.20.8` | `v1.20.8` *(sin cambios)* | ❌ No corregido |
| `context/ROADMAP.md` (cuerpo, "Versión Actual") | `v1.1.5` | `v1.1.5` *(sin cambios)* | ❌ No corregido |
| `CHANGELOG.md` (última entrada) | `1.5.1` (2026-08-02) | `1.20.10` (2026-08-18) | ✅ Corregido (parcial, ver §4) |
| Reordenar `0.2.2`/`0.2.3` en `CHANGELOG.md` | Mal ubicadas al final | Mal ubicadas al final *(sin cambios)* | ❌ No corregido |

**8 de 10 puntos corregidos. Los 2 restantes están concentrados en un solo archivo: `context/ROADMAP.md`.**

---

## 3. `context/ROADMAP.md`: el único archivo que quedó atrás

Es idéntico, byte a byte, al del paquete anterior. Sigue leyéndose así, en 4 líneas consecutivas:

```
# 🗺️ ROADMAP DE ORDERFLOW - v1.5.1 → v2.0.0
Última Actualización: 2026-08-14 ART (Release v1.20.8 — ...)
Versión Actual: v1.1.5 🔄 EN DESARROLLO
Próximo Release: v1.20.10 (En progreso — Deploy Manager Odoo)
Estado: ... COMMERCIAL RELEASE v1.5.1 STABLE ...
```

Con el resto del sistema ya en `1.20.10`, esta desalineación se agravó: el archivo describe `v1.20.10` como un release **futuro "en progreso"**, cuando en realidad ya es la versión **actual y publicada** según `VERSION`, `package.json`, Swagger, `featurelist.json` y `docs/ROADMAP.md`.

**Corrección propuesta** (única línea de verdad, consistente con el resto del sistema):
```
Versión Actual: v1.20.10
Próximo Release: (definir — no puede ser la versión ya actual)
Estado: COMMERCIAL RELEASE v1.20.10 STABLE
```

---

## 4. Historial de versiones verificado (actualizado desde CHANGELOG.md)

Nuevas entradas incorporadas desde la última auditoría, en **negrita**:

| Versión | Fecha | Título |
|---|---|---|
| **`1.16.0`** | **2026-08-03** | — |
| **`1.17.0`** | **2026-08-05** | — |
| **`1.18.0`** | **2026-08-08** | — |
| **`1.20.0`** | **2026-08-15** | Schema Decoupling, Rebranding OmniFlow & Analytics Hub (FEAT-064–FEAT-071) |
| **`1.20.10`** | **2026-08-18** | — |

El defecto de orden reportado en v1 sigue presente sin cambios: `0.2.3` (2026-07-04) y `0.2.2` (2026-07-03) continúan ubicadas al final del archivo (líneas 445 y 584), después de `0.0.1`, en vez de entre `0.1.0-alpha.6` y `0.2.0-beta.1`, que es donde corresponde cronológicamente.

### 4.1 Brecha restante (versiones citadas en otros documentos, aún sin entrada propia en CHANGELOG.md)

`docs/timeline.md` y `docs/ROADMAP.md` siguen citando como completadas versiones que no tienen entrada individual — quedaron implícitas dentro del bloque agregado `[1.20.0]`, o directamente ausentes:

| Versión citada | Dónde se cita | ¿Tiene entrada propia en CHANGELOG.md? |
|---|---|---|
| `v1.3.0`, `v1.4.0` (FacturaSend) | `docs/timeline.md` | No |
| `v1.9.0` (Bookings, Pagopar) | `docs/timeline.md` | No |
| `v1.15.0` (Social Catalog Hub) | `docs/timeline.md` | No |
| `v1.16.1` (RLS, Tenant Image Isolation) | `docs/timeline.md` | No (solo existe `1.16.0`) |
| `v1.19.0` (Rebranding — "hito histórico") | `docs/timeline.md`, `docs/ROADMAP.md` | No (absorbida dentro de `1.20.0`) |
| `v1.20.1` a `v1.20.9` | `docs/timeline.md` (gantt), `docs/ROADMAP.md` (detalle por versión) | No (el changelog salta de `1.20.0` a `1.20.10` directo) |

---

## 5. Discrepancias nuevas detectadas en este paquete

### 5.1 Fecha distinta para `v1.20.0` entre dos documentos

- `docs/guides/CHANGELOG.md`: `## [1.20.0] - 2026-08-15`
- `docs/timeline.md` (línea de tiempo Mermaid): `2026-08-11 : v1.20.0`

Mismo número de versión, cuatro días de diferencia. Uno de los dos está mal.

### 5.2 `CHANGELOG.md` da por completada una feature que `featurelist.json` marca como abierta

La entrada `[1.20.0]` de `CHANGELOG.md` agrupa explícitamente "FEAT-064 - FEAT-071" como parte de lo entregado en esa versión — es decir, incluye **FEAT-071** (módulo OmniBI). Sin embargo, `context/featurelist.json` (con `last_updated: 2026-08-18`, la misma fecha que la última entrada del changelog) sigue marcando:

- `FEAT-071` → `in_progress`
- `FEAT-012` → `in_progress`

El changelog no debería reportar como entregada una feature que el sistema de memoria estructurada (`featurelist.json`, fuente exigida por la Regla 4 de `AGENTS.md`) todavía no cierra.

---

## 6. Hallazgos previos que siguen sin cambios (no corregidos en este paquete)

Estos ítems ya estaban en la auditoría original y continúan idénticos:

- `featurelist.json` sigue sin las entradas individuales `FEAT-067`, `FEAT-068`, `FEAT-069`, `FEAT-070` (aunque `docs/ROADMAP.md` sí las nombra con título propio).
- `infra/docker-compose.yml` sigue usando `nginx:alpine` para servir el build de frontend — contradice la regla "NO usar Nginx" de `AGENTS.md`.
- `infra/docker-compose.yml` sigue pineando `traefik:v3.2`, por debajo del v3.3/v3.4 exigido en la documentación.
- `new PrismaClient()` directo persiste en `backend/social-catalog/migrations/migrate-whatsapp-to-social.ts`.
- `AGENTS.md` sigue enlazando a `docs/ROADMAP_MICROSERVICES.md`; el archivo real está en `docs/guides/ROADMAP_MICROSERVICES.md`.
- Los directorios referenciados por `FEAT-012` (`mobile/`) y `FEAT-071` (`backend/bi/`, `odoo-adapter/`) siguen sin existir en el paquete entregado.
- No se detectaron `.env` reales ni secretos filtrados — se mantiene limpio. ✅

---

## 7. Recomendaciones actualizadas

1. **Corregir `context/ROADMAP.md`** con los mismos 4 valores ya alineados en el resto del sistema (§3). Es la única pieza que falta para tener una fuente de versión 100% consistente.
2. **Reordenar `0.2.2`/`0.2.3`** dentro de `CHANGELOG.md` a su posición cronológica correcta (pendiente desde v1, sigue sin costo de implementación).
3. **Reconciliar la fecha de `v1.20.0`** entre `CHANGELOG.md` (08-15) y `docs/timeline.md` (08-11) — determinar cuál es la real y corregir la otra.
4. **No declarar `FEAT-071` como entregada en `CHANGELOG.md`** hasta que `featurelist.json` la marque `completed`; o, si ya está lista, actualizar `featurelist.json` en el mismo paso (Regla 4 y 7 de `AGENTS.md` lo exigen).
5. **Desagregar el bloque `[1.20.0]`** en entradas individuales `1.20.1`–`1.20.9` (o documentar explícitamente que fue un release consolidado y por qué se saltearon los intermedios), para que `docs/timeline.md` y `docs/ROADMAP.md` dejen de citar versiones sin respaldo en el changelog.
6. Mantiene vigencia la recomendación de automatizar esta verificación (`scripts/check-version-sync.sh`) — el hecho de que 8/10 discrepancias se hayan corregido a mano en un solo ciclo, mientras el archivo restante (`context/ROADMAP.md`) quedó completamente afuera, es evidencia de que el proceso manual es propenso a este tipo de omisión.
