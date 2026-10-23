# 189 — Marca Blanca: `PATCH /api/v1/tenants/:id` devolvía 500 y podía borrar la configuración del tenant

> **Fecha:** 2026-10-22 · **Estado:** ✅ **Resuelto en v1.40.1** · **Rama:** `fix/white-label-patch-500`
> **Detectado en:** verificación del guardado del modal 🏷️ Marca Blanca en `provecchio.com` tras v1.40.0

## Síntoma

El modal **🏷️ Marca Blanca** del Super Admin ya cargaba los datos (eso lo resolvió v1.40.0 con
`GET /api/v1/tenants/:id/config`), pero al pulsar **"Guardar Marca Blanca"**:

```text
PATCH /api/v1/tenants/provecchio-dimora-001   →  HTTP 500
{"statusCode":500,"message":"Internal server error"}
```

En el log del backend:

```text
Invalid `prisma.tenant.update()` invocation:
Unknown argument `customDomainVerified`. Available options are marked with ?.
```

y, con el payload completo que envía el modal, además:

```text
Unknown argument `whiteLabel`. Available options are marked with ?.
```

## Causa raíz (3 defectos)

### D1 — Campo inexistente en el schema

`backend/src/tenants/tenants.controller.ts` (`update()`) escribía:

```ts
payload.customDomainVerified = true;   // ❌
```

`model Tenant` define **`domainVerified`** (schema.prisma). El resto del controller usa el nombre
correcto en 10 puntos (`getTenantConfig`, `getAll`, `getById`, `create`…); solo el `update()`
introducido en el commit `8da98262` usaba el nombre inventado. Prisma rechaza argumentos
desconocidos → 500.

### D2 — Objeto anidado que no es columna

El frontend (`super-admin-dashboard.tsx`, `handleSaveWhiteLabel`) enviaba:

```ts
whiteLabel: { customDomain, themeLogoUrl, removeOrderflowBranding }
```

No existe tal campo en `Tenant` → `Unknown argument 'whiteLabel'`. Los mismos valores ya viajaban
en el nivel superior del payload.

### D3 — Reemplazo del JSON `config` (pérdida de datos, enmascarada)

El frontend enviaba:

```ts
config: { footerCredits: values.footerCredits }
```

`Tenant.config` es una columna `Json?` que contiene **toda** la configuración del tenant:
`gastro` (con `qrTokens`, `waiterOptions`, `defaultServiceMode`), `homepageBlocks`,
`homepagePreset`, `subscription`, `fontFamily`, `denseTables`, `defaultTheme`, `sidebarBehavior`…

Un `update` de Prisma **reemplaza** el JSON completo. D1 y D2 abortaban la petición antes de
escribir, y eso **enmascaraba** el D3: al corregir solo el 500, el primer guardado habría borrado
la configuración del tenant.

## Solución aplicada (v1.40.1)

**Backend** — `backend/src/tenants/tenants.controller.ts`:

```ts
const existing = await this.prisma.tenant.findUnique({
  where: { id },
  select: { customDomain: true, subdomain: true, config: true },   // + config
});

const payload: any = { ...data };
delete payload.whiteLabel;                                          // D2

// ...
payload.domainVerified = true;                                      // D1

// D3: merge aditivo, no reemplazo
if (data.config && typeof data.config === 'object' && !Array.isArray(data.config)) {
  payload.config = {
    ...((existing?.config as Record<string, unknown> | null) ?? {}),
    ...data.config,
  };
}
```

**Frontend** — `frontend/src/pages/admin/super-admin-dashboard.tsx`: se elimina el bloque
`whiteLabel` redundante del payload (los campos top-level ya lo cubren).

## Prevención

- **Nunca** escribir en `prisma.*.update()` un campo que no esté en el schema: el spread
  `{ ...data }` de un `@Body() data: any` propaga cualquier clave del cliente. Conviene
  **whitelist** de campos o DTOs con `ValidationPipe`.
- Los campos `Json` nunca se actualizan con el objeto parcial del cliente: **mergear** siempre
  (`{ ...existing, ...incoming }`).
- Un `PATCH` sin DTO de validación es un riesgo doble: 500 por argumentos desconocidos y
  sobreescritura silenciosa de JSON.

## Evidencia

| Verificación | Resultado |
|---|---|
| Unitarios `tenants.controller.spec.ts` | **16 passed** (6 nuevos: normalización + `domainVerified`, limpieza a `null`, descarte de `whiteLabel`, merge de `config`, Cloudflare solo si cambia el dominio) |
| Suite backend completa | **135 suites / 1015 tests** |
| E2E `frontend/e2e/white-label-modal.spec.ts` | PATCH idempotente **200**, `whiteLabel` tolerado, `config` preservada, modal carga `customDomain` |
| Producción | `PATCH` con `HTTPS://Provecchio.COM/admin/?x=1` → **200**, `customDomain: "provecchio.com"`, `domainVerified: true`, **sin** llamadas a Cloudflare |
| Datos | Los `PATCH` fallidos de v1.40.0 nunca escribieron → **sin pérdida de datos** |

## Referencias

- Plan: [`docs/plans/omnigastro/plan-actualizacion-v1.40.1-white-label-patch.md`](../plans/omnigastro/plan-actualizacion-v1.40.1-white-label-patch.md)
- Relacionado: [#187](187-select-prisma-sin-id-error-ts2339.md) (mismo origen: el modal de Marca Blanca en `8da98262`)
- `backend/src/tenants/tenants.controller.ts` (`update`, `getTenantConfig`)
- `frontend/src/pages/admin/super-admin-dashboard.tsx` (`handleSaveWhiteLabel`)
