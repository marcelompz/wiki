# Plan de actualización — v1.40.1: el `PATCH /api/v1/tenants/:id` (Marca Blanca) devuelve 500 y puede borrar la configuración del tenant

> **Fecha:** 2026-10-22 · **Rama:** `fix/white-label-patch-500` · **Tipo:** `patch` (1.40.0 → 1.40.1)
> **Origen:** verificación del modal 🏷️ Marca Blanca en producción tras el deploy de v1.40.0
> **Aprobado por el usuario:** sí (alcance completo de los 3 defectos + deploy a producción tras validación local)
> **Estado:** ✅ **COMPLETADO Y DESPLEGADO** — PR #16 (`f6ba3907`), tag `v1.40.1`, producción verificada.
> Reporte de deploy: [`DEPLOY_REPORT_2026-10-22-v1.40.1.md`](./DEPLOY_REPORT_2026-10-22-v1.40.1.md)

## 1. Contexto

v1.40.0 corrigió la **lectura** del modal de Marca Blanca (`GET /api/v1/tenants/:id/config`).
Al probar el **guardado** en producción se obtuvo `HTTP 500` y el análisis de logs reveló
tres defectos, dos de ellos bloqueantes y uno destructivo enmascarado.

## 2. Defectos

### D1 — `customDomainVerified` no existe en el schema (500)

`backend/src/tenants/tenants.controller.ts:951,954`:

```ts
payload.customDomainVerified = true;   // ❌ no es columna de Tenant
```

`model Tenant` define **`domainVerified`** (schema.prisma:28). El resto del controller usa
`domainVerified` en 10 puntos; solo el `update()` introducido en el commit `8da98262` usa el
nombre inexistente. Prisma responde:

```
Unknown argument `customDomainVerified`. Available options are marked with ?.
```

### D2 — El frontend envía `whiteLabel` anidado (500)

`frontend/src/pages/admin/super-admin-dashboard.tsx:126-130` envía:

```ts
whiteLabel: { customDomain, themeLogoUrl, removeOrderflowBranding }
```

No es columna de `Tenant` → `Unknown argument 'whiteLabel'`. Los mismos valores ya viajan en el
nivel superior del payload.

### D3 — `config` se reemplaza completo (pérdida de datos)

El frontend envía `config: { footerCredits }` (líneas 131-133). `Tenant.config` es una columna
`Json?` que contiene **toda** la configuración del tenant: `gastro` (con `qrTokens`,
`waiterOptions`, `defaultServiceMode`), `homepageBlocks`, `homepagePreset`, `subscription`,
`fontFamily`, `denseTables`, `defaultTheme`, `sidebarBehavior`…

Un `update` de Prisma **reemplaza** el JSON entero. Con D1 y D2 presentes la petición muere con
500 y nunca escribe; al corregirlos sin tocar `config`, el primer guardado desde el modal
**destruiría** la configuración del tenant.

## 3. Solución

| # | Archivo | Cambio |
|---|---|---|
| 1 | `backend/src/tenants/tenants.controller.ts` | `customDomainVerified` → **`domainVerified`** (D1) |
| 2 | `backend/src/tenants/tenants.controller.ts` | `delete payload.whiteLabel` antes del `update` (D2) |
| 3 | `backend/src/tenants/tenants.controller.ts` | **merge** de `config`: `{ ...existing.config, ...data.config }` + `config` en el `select` (D3) |
| 4 | `frontend/src/pages/admin/super-admin-dashboard.tsx` | eliminar el bloque `whiteLabel` redundante del payload |
| 5 | `VERSION`, `backend/package.json`, `frontend/package.json`, `mobile/package.json`, `backend/src/main.ts`, `featurelist.json`, `README.md`, `ROADMAP.md`, `docs/ROADMAP.md`, `CHANGELOG.md`, `docs/guides/CHANGELOG.md` | bump a **1.40.1** (Regla #11) |

### Comportamiento esperado del `PATCH`

| Entrada | Resultado |
|---|---|
| `customDomain: "HTTPS://Provecchio.COM/admin/?x=1"` | `customDomain: "provecchio.com"`, `domainVerified: true` |
| `customDomain: ""` o `null` | `customDomain: null`, `domainVerified: false` |
| `whiteLabel: {...}` presente | se ignora (no rompe) |
| `config: { footerCredits: "..." }` | se mergea; el resto de claves se conserva |
| `subdomain` | sanitización existente, sin cambios |

## 4. Riesgos y efectos secundarios

| Riesgo | Mitigación |
|---|---|
| El merge de `config` afecta a otros llamadores de `PATCH /tenants/:id` | El merge es aditivo: solo cambia claves enviadas; el resto de llamadores (settings, homepage-builder usan `PATCH /tenants/config`) no se ven afectados |
| Cloudflare DNS se dispara al cambiar `customDomain` | Sin cambios de comportamiento: solo actúa si el dominio normalizado difiere del existente |
| Pérdida de config si un cliente envía `config: null` | Se respeta el `null` explícito; el modal nunca lo envía |
| Regresión en la lectura (`GET .../config`) | No se toca; cubierto por el E2E existente |

## 5. Estrategia de testing

- **Unitarios (jest)** en `backend/src/tenants/tenants.controller.spec.ts`:
  1. `customDomain` sucio → normaliza y escribe `domainVerified` (no `customDomainVerified`).
  2. `customDomain` vacío → `null` + `domainVerified: false`.
  3. `whiteLabel` presente → ausente del `data` enviado a Prisma.
  4. `config` parcial → merge con el existente (conserva `homepageBlocks` y `subscription`).
- **E2E (Playwright)** `frontend/e2e/white-label-modal.spec.ts` contra `provecchio.local`:
  abrir el modal, verificar que carga los datos, guardar y comprobar `PATCH 200`, que
  `customDomain` quedó normalizado y que `config` conserva `homepageBlocks`/`subscription`.
- **Smoke de API** contra `provecchio.local`: `PATCH` con valor idempotente + `GET` de
  verificación + `GET /api/v1/health`.

## 6. Despliegue

Protocolo AGENTS.md §3.1.1 completo: backup de producción → restore local → paridad de datos →
`deploy-local.sh` → E2E → diagnóstico pre-deploy → `deploy-production.sh provecchio` →
verificación post-deploy (health, `PATCH` idempotente, `GET` del modal, sitios 200).

## 7. Documentación

`docs/troubleshooting/189-*.md` + fila en el índice, `CHANGELOG.md` (+ espejo),
`docs/info/OmniGastro.md`, `ROADMAP.md`, `featurelist.json` (FEAT-199) y Wiki.

## 8. Resultado (ejecutado)

| Verificación | Resultado |
|---|---|
| `tenants.controller.spec.ts` (6 casos nuevos) | ✅ **16 passed** |
| Suite backend completa | ✅ **135 suites / 1015 tests** |
| `tsc` backend y frontend | ✅ limpio |
| `deploy-local.sh` | ✅ **ALL CHECKS PASSED** — `1.40.1`, bundle fresco |
| E2E localhost (4 nuevos + 10 de regresión) | ✅ **14/14 passed** |
| PR / merge | ✅ **PR #16** → `f6ba3907` en `main` |
| Tag | ✅ `v1.40.1` sobre `f6ba3907`, publicado |
| Deploy producción | ✅ **🎉 Complete** — 9/9 healthy, 39 migraciones (0 pendientes), health `1.40.1`, bundle `assets/index-BPoU28fx.js` |
| `PATCH` en producción (idempotente) | ✅ **200**, `customDomain: "provecchio.com"`, `domainVerified: true`, sin llamadas a Cloudflare |
| `config` en producción | ✅ 8 → 9 claves, **ninguna perdida**; `homepageBlocks`/`subscription`/`gastro`/`fontFamily` idénticas |
| Datos previos | ✅ los `PATCH` fallidos de v1.40.0 nunca escribieron — **sin pérdida de datos** |

**Cierre:** ✅ plan cumplido en su totalidad; ver
[`DEPLOY_REPORT_2026-10-22-v1.40.1.md`](./DEPLOY_REPORT_2026-10-22-v1.40.1.md).

