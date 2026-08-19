# Informe de Corrección del Historial de Versiones — OrderFlow / OmniFlow

**Fecha del informe:** 2026-08-18
**Paquete auditado:** `orderflow_1_2_0_tar.gz`
**Fuente de verdad utilizada:** `docs/guides/CHANGELOG.md` (única fuente con versión + fecha + contenido verificable línea por línea)

---

## 1. Resumen ejecutivo

El proyecto tiene **10 referencias de "versión actual" distintas repartidas en 8 archivos**, y ninguna coincide entre sí. Al usar `CHANGELOG.md` como fuente de verdad (por ser el único documento que registra *qué cambió, cuándo y en qué versión*, en vez de solo afirmar un número), se concluye lo siguiente:

- La **última versión con evidencia real** (entrada de changelog completa, con fecha y contenido) es **`1.5.1` (2026-08-02)**.
- Todo lo que hoy se referencia como `1.6.x` → `1.20.x` en `featurelist.json`, `README.md`, `docs/ROADMAP.md`, `context/ROADMAP.md`, `docs/timeline.md` y el Swagger de `backend/main.ts` **no tiene una entrada correspondiente en `CHANGELOG.md`**. No es que esas versiones sean falsas — es que son **inverificables** con la documentación entregada: no hay forma de confirmar qué contiene cada una.
- El propio `CHANGELOG.md` tiene un **defecto estructural interno**: dos entradas (`0.2.3` y `0.2.2`) están mal ubicadas al final del archivo, rompiendo el orden cronológico descendente que sigue el resto del documento.

Este informe no inventa contenido para las versiones faltantes (`1.6.0`–`1.20.x`): eso solo lo puede completar quien tenga el historial real de commits/despliegues. Lo que sí entrega es (a) el historial verificado y reordenado correctamente, (b) el listado exacto de qué corregir en cada archivo, y (c) el listado de qué entradas de changelog faltan escribir para cerrar la brecha.

---

## 2. Historial de versiones verificado (reconstruido desde CHANGELOG.md)

Reordenado cronológicamente (ascendente por fecha real, no por posición en el archivo). Se marcan en **negrita** las dos entradas que estaban mal ubicadas en el archivo original.

| # | Versión | Fecha | Título | Posición original en el archivo |
|---|---------|-------|--------|----------------------------------|
| 1 | `0.0.1` | 2026-06-13 | Initial Commit | Correcta (línea 393) |
| 2 | `0.1.0-alpha.1` | 2026-06-22 | — | Correcta (línea 370) |
| 3 | `0.1.0-alpha.2` | 2026-06-22 | — | Correcta (línea 346) |
| 4 | `0.1.0-alpha.3` | 2026-06-22 | — | Correcta (línea 294) |
| 5 | `0.1.0-alpha.4` | 2026-06-23 | — | Correcta (línea 281) |
| 6 | `0.1.0-alpha.5` | 2026-06-28 | — | Correcta (línea 264) |
| 7 | `0.1.0-alpha.6` | 2026-06-28 | — | Correcta (línea 246) |
| 8 | **`0.2.2`** | 2026-07-03 | Single-Tenant + Super Admin | ⚠️ Mal ubicada (línea 542, debería ir aquí) |
| 9 | **`0.2.3`** | 2026-07-04 | Tenant Switcher + Gestión de Sesiones | ⚠️ Mal ubicada (línea 403, debería ir aquí) |
| 10 | `0.2.0-beta.1` | 2026-07-04 | — | Correcta (línea 144) |
| 11 | `0.2.0-beta.2` | 2026-07-05 | — | Correcta (línea 104) |
| 12 | `0.4.0` | 2026-07-14 | — | Correcta (línea 69) |
| 13 | `1.1.4` | 2026-07-29 | — | Correcta (línea 57) |
| 14 | `1.1.5` | 2026-07-30 | WhatsApp Catalog UX & Guardias de Estabilidad | Correcta (línea 44) |
| 15 | `1.1.7` | 2026-07-30 | QA E2E Rendering Suite & Subdominios Dinámicos | Correcta (línea 34) |
| 16 | `1.2.0` | 2026-07-31 | Integración Adaptador Multi-Tenant Tango ERP | Correcta (línea 22) |
| 17 | `1.5.1` | 2026-08-02 | Responsive UX/UI Backoffice + Traefik v3.4 (QA-001) | Correcta (línea 5) |
| **18+** | **`1.6.0` → `1.20.x`** | **2026-08-03 → hoy (2026-08-18)** | **⛔ SIN ENTRADA DE CHANGELOG** | No existe |

### 2.1 Anomalía adicional dentro del propio CHANGELOG

- `0.2.2` (2026-07-03) y `0.2.3` (2026-07-04) están **semánticamente fuera de orden** además de mal ubicadas: numéricamente son *mayores* que `0.2.0-beta.1`/`0.2.0-beta.2` (que llevan fecha igual o posterior), lo cual sugiere que en algún momento se bifurcó una rama `0.2.x` estable en paralelo a la rama `0.2.0-beta.x`. Esto debe aclararse con una nota editorial en el propio changelog (ver §5), no solo reordenarse.

---

## 3. Tabla de corrección por archivo

| Archivo | Valor actual | Valor correcto según CHANGELOG.md | Acción |
|---|---|---|---|
| `context/VERSION` | `1.2.0` | `1.5.1` | Corregir |
| `backend/package.json` (`version`) | `1.2.0` | `1.5.1` | Corregir |
| `frontend/package.json` (`version`) | `1.2.0` | `1.5.1` | Corregir |
| `backend/main.ts` (Swagger `.setVersion()`) | `1.20.6` | `1.5.1` *(o congelar hasta backfill, ver §4)* | Corregir |
| `context/featurelist.json` (`version`) | `1.20.4` | `1.5.1` *(o backfill, ver §4)* | Corregir |
| `README.md` (badge shield.io) | `1.20.8` | `1.5.1` *(o backfill, ver §4)* | Corregir |
| `README.md` (pie de página "Versión") | `1.20.4` | `1.5.1` *(o backfill, ver §4)* | Corregir |
| `docs/ROADMAP.md` ("Versión actual") | `1.20.6` | `1.5.1` *(o backfill, ver §4)* | Corregir |
| `context/ROADMAP.md` (título) | `v1.20.8` | `1.5.1` *(o backfill, ver §4)* | Corregir |
| `context/ROADMAP.md` (cuerpo, "Versión Actual") | `v1.1.5` | `1.5.1` | Corregir — además contradice al título del mismo archivo (`v1.20.8`) |

**Nota:** en las filas marcadas *"o backfill"*, la corrección honesta a `1.5.1` es la única defendible **hoy** con la evidencia disponible. Si el equipo confirma que la plataforma en producción realmente está en `~1.20.x` (lo cual es plausible dado el volumen de trabajo documentado en `featurelist.json` y `docs/ROADMAP.md`), entonces la corrección real no es "bajar el número a 1.5.1" sino **escribir las ~19 entradas de changelog faltantes** (§4) y recién entonces dejar el número alto — de lo contrario el número seguirá siendo una afirmación sin respaldo.

---

## 4. Brecha de documentación: trabajo sin entrada de changelog

Cruzando `context/featurelist.json` (67 features, 65 `completed`) y `docs/ROADMAP.md` contra `CHANGELOG.md`, **ninguna feature con ID mayor a las que ya constan en changelog tiene su entrada correspondiente**. Esto incluye, como mínimo, todo lo asociado a los siguientes hitos que otros documentos dan por completados en versiones `1.6.x`–`1.20.x`:

| Rango de versión citado (en otros docs) | Feature(s) asociada(s) según featurelist.json / ROADMAP.md | Documento fuente |
|---|---|---|
| `v1.9.0` | Bookings WhatsApp+Google Calendar sync, Pagopar | `docs/timeline.md` |
| `v1.15.0` | Social Catalog Hub (FEAT-048) | `docs/timeline.md` |
| `v1.16.1` | Row Level Security, Tenant Image Isolation | `docs/timeline.md` |
| `v1.17.0` | Odoo 19 CE Adapter (FEAT-031/054) | `docs/timeline.md` |
| `v1.18.0` | Follow-Up Omnicanal (FEAT-056), Seller Attribution (FEAT-057) | `docs/timeline.md` |
| `v1.19.0` | Rebranding OmniFlow (FEAT-066) | `docs/timeline.md` ("Hito histórico") |
| `v1.20.0`–`v1.20.10` | FEAT-059 a FEAT-071 (Deploy Manager, Manuales Playwright, Mobile Admin UX, Orders Debug, Schema Decoupling, Backups SFTP, Multi-Tenant User Mgmt, OmniBI) | `docs/ROADMAP.md`, `context/featurelist.json` |

**Ninguna de estas ~19 versiones intermedias tiene entrada en `CHANGELOG.md`.** Esta es la causa raíz de todo el desorden detectado en §3: cada documento fue avanzando su propio número de versión de forma independiente porque no existía un changelog actualizado contra el cual validarse.

---

## 5. Recomendaciones concretas

1. **Aplicar ya** las correcciones de la tabla §3 (bajar todos los archivos a `1.5.1`), para que exista un único número verdadero mientras se resuelve la brecha.
2. **Reordenar `CHANGELOG.md`**: mover las entradas `0.2.2` y `0.2.3` a su posición cronológica correcta (entre `0.1.0-alpha.6` y `0.2.0-beta.1`), y agregar una nota editorial explicando la bifurcación de rama `0.2.x` vs `0.2.0-beta.x`.
3. **Backfill obligatorio antes de reclamar `1.20.x` en cualquier lugar:** escribir las ~19 entradas faltantes (§4) en `CHANGELOG.md`, una por cada salto de versión real detectado en `featurelist.json` / `docs/ROADMAP.md` / `docs/timeline.md`. Sin esto, cualquier número por encima de `1.5.1` seguirá siendo no verificable.
4. **Adoptar la Regla 7 de `AGENTS.md` de forma literal y automatizada:** hoy la regla exige sincronizar versión en `VERSION`, `CHANGELOG.md`, `ROADMAP.md`, `docs/timeline.md`, `README.md`, `backend/main.ts`, `package.json` y manifiestos "en el mismo paso", pero no hay ningún mecanismo (script, CI check) que lo haga cumplir — de ahí que haya 10 valores distintos. Se recomienda un script de verificación (`scripts/check-version-sync.sh`) que falle el build si detecta valores distintos entre esos archivos.
5. **Corregir la autocontradicción interna de `context/ROADMAP.md`** (título dice `v1.20.8`, cuerpo dice `v1.1.5`) como parte del mismo paso.

---

## 6. Qué NO incluye este informe

No se generó contenido ficticio para las entradas de changelog faltantes (`1.6.0`–`1.20.x`). Redactar esas ~19 entradas requiere el historial real de cambios (commits, PRs o memoria del equipo que hizo el trabajo), que no viene incluido en este paquete `.tar.gz`. Este informe deja el listado exacto de qué falta (§4) para que ese backfill se haga con datos reales.
