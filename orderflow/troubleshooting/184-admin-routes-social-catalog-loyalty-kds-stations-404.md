# Troubleshooting #184: 404 en `/admin/social-catalog`, `/admin/loyalty` y `/admin/gastro/kds-stations` (rutas borradas del router)

> **Fecha:** 2026-10-21
> **Módulo / Área:** Frontend / React Router / Admin
> **Severidad:** Media (3 módulos del panel admin inaccesibles)
> **Estado:** ✅ **RESUELTO** en v1.39.22 (commit `c0a0a80c`)

---

## 1. Síntoma / Problema

Al navegar a las rutas del panel de administración el usuario recibe
**"404 — Página no encontrada"**:

| Ruta | Menú (Sidebar) | Resultado |
|---|---|---|
| `/admin/social-catalog` | "Social Commerce & WhatsApp Catalog" (`Sidebar.tsx:64`) | ❌ 404 |
| `/admin/loyalty` | "Programa Puntos & Cashback" (`Sidebar.tsx:66`) | ❌ 404 |
| `/admin/gastro/kds-stations` | "Estaciones KDS & Impresión" (`Sidebar.tsx:85`) | ❌ 404 |
| `/admin/whatsapp-catalog` | (ruta alias) | ❌ 404 (redirige a `/admin/social-catalog`) |

Reproducción verificada en navegador contra `https://provecchio.local` y
`https://provecchio.com` tras el deploy de **v1.39.21** (login como admin,
navegación headless). El control `/admin/products` carga normal.

---

## 2. Causa Raíz

**Las rutas existían y fueron borradas del router por el commit `7f6bae00`**
("feat: add omnigastro-config module with payment routing configuration",
2026-10-17, co-authored por `openhands`), que corrompió `frontend/src/AdminApp.tsx`:

```diff
@@ src/AdminApp.tsx
-              <Route path="gastro/kds-stations" element={<GastroKdsStationsPage />} />
-              <Route path="loyalty" element={<LoyaltyPage />} />
-              <Route path="social-catalog" element={<SocialCatalogAdminPage />} />
```

Diferencia de rutas registradas antes y después de ese commit:

```
$ git show 7f6bae00^:frontend/src/AdminApp.tsx | grep -oE 'Route path="[^"]+"' | sort > before.txt
$ grep -oE 'Route path="[^"]+"' frontend/src/AdminApp.tsx | sort > now.txt
$ comm -23 before.txt now.txt
Route path="gastro/kds-stations"
Route path="loyalty"
Route path="social-catalog"
```

Ese mismo commit además **reemplazó** la línea del import de `Refine` y el
lazy import de `BiAdminPage` por un `OmnigastroPaymentRoutingConfigPage`
duplicado (el import superior y el `lazy()` con el mismo nombre). Los
imports siguientes quedaron **muertos pero presentes**, por eso TypeScript
noMarca error:

```tsx
const GastroKdsStationsPage = lazy(() => import("./pages/admin/gastro-kds-stations")...);
const LoyaltyPage           = lazy(() => import("./pages/admin/loyalty")...);
const SocialCatalogAdminPage= lazy(() => import("./pages/admin/social-catalog")...);
// ... pero NO existe ningún <Route path="social-catalog" /> en el archivo
```

Consecuencias:

1. Las 3 rutas caen en el catch-all `<Route path="*">` de `AdminApp.tsx:457`
   que renderiza el `Result` con `status="404" / subTitle="Página no encontrada"`.
2. `/admin/whatsapp-catalog` sí tiene ruta, pero su página
   (`pages/admin/whatsapp-catalog.tsx`) hace `navigate("/admin/social-catalog")`
   → redirige a una ruta inexistente → 404.

**Las páginas, sus imports y sus APIs backend están intactos** (verificado):
`pages/admin/social-catalog.tsx` (94 KB), `pages/admin/loyalty.tsx` (17 KB),
`pages/admin/gastro-kds-stations.tsx` (13 KB) y sus endpoints responden 200:
`/api/v1/admin/social-catalog/instances`, `/api/v1/loyalty/rules`,
`/api/v1/kds/stations`, `/api/v1/catalog/categories/tree`. Por lo tanto la
corrección es **restaurar las 3 rutas**, no reimplementar nada.

---

## 3. Por qué el pipeline no lo detectó

Dos señales existían pero ninguna bloqueaba:

1. **ESLint sí loignala**, pero como *warning*:

   ```
   43:7  warning  'GastroKdsStationsPage' is assigned a value but never used
   45:7  warning  'LoyaltyPage' is assigned a value but never used
   50:7  warning  'SocialCatalogAdminPage' is assigned a value but never used
   ```

   Con el **ratchet** introducido en v1.39.20 (`--max-warnings=440`) los
   warnings no bloquean el pipeline, y el ratchet solo mira el **conteo total**,
   no si el conjunto de warnings **creció**. Por eso la regresión pasó
   inadvertida.

2. **El QA E2E post-deploy naviga `/admin/social-catalog` y lo da por bueno**,
   porque una SPA devuelve **HTTP 200** incluso para la pantalla de 404
   (el 404 es un `<Result>` de Ant Design renderizado en cliente). El chequeo
   solo detecta errores JS y respuestas 502/404 de red, no el texto
   "Página no encontrada".

---

## 4. Solución Aplicada

### 4.1 Restauración de las 3 rutas

En `frontend/src/AdminApp.tsx`, reinsertar junto al resto de rutas del bloque
admin:

```tsx
<Route path="gastro/kds-stations" element={<GastroKdsStationsPage />} />
<Route path="loyalty" element={<LoyaltyPage />} />
<Route path="social-catalog" element={<SocialCatalogAdminPage />} />
```

### 4.2 Test de regresión (prevención de la recurrencia)

Este bug era la **segunda** ocurrencia de la misma clase (la anterior:
[troubleshooting #160](160-inventory-admin-routes-missing.md)). Se añadió
`frontend/src/components/sidebar-routes.test.ts` con tres aserciones:

1. el menú lateral declara enlaces;
2. **cada enlace del menú tiene su ruta registrada** en `AdminApp.tsx`;
3. **ninguna página importada queda sin ruta que la monte**.

Comprobado que el test **falla** si se borra una ruta (verificado rompiendo
`social-catalog` a propósito: el test reporta
`/admin/social-catalog (falta <Route path="social-catalog">)`).

### 4.3 QA E2E post-deploy endurezado

`scripts/qa_e2e_check.py` tenía **dos** puntos ciegos:

- **No se autenticaba**: solo hacía un login sintético con password inválida
  para descartar HTTP 500. Al navegar las rutas admin sin sesión, el router
  redirigía a `/login` y la verificación de rutas era un **no-op** (la SPA
  responde 200 con el formulario de login).
- **Solo miraba el HTTP status**: una SPA devuelve 200 también en su pantalla
  de 404, porque el catch-all renderiza un `<Result>` de Ant Design.

Corrección: el QA ahora **autentica al admin** (credenciales por
`QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD`), recorre las rutas con sesión y
**falla si el body renderizado contiene "Página no encontrada"**. Se agregó
`/admin/gastro/kds-stations` a la lista de rutas verificadas y el flag
`QA_IGNORE_CERT=1` para validar contra el certificado auto-firmado de
`*.local`.

Comprobado en ambos sentidos: con la ruta rota el QA falla con
`❌ La ruta /admin/social-catalog renderiza la pantalla 404 del router`, y
con el fix pasa las 8 rutas.

---

## 5. Procedimiento de Verificación

```bash
# 1) Reproducir antes del fix (esperado: 404 en las 3 rutas)
cd /opt/orderflow/qa && python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
    pg = b.new_context(ignore_https_errors=True).new_page()
    pg.goto("https://provecchio.local/login", wait_until="networkidle")
    pg.fill('input[type="email"]', "marcelo@pesallaccia.com")
    pg.fill('input[type="password"]', "Provecchio2026!")
    pg.click('button[type="submit"]'); pg.wait_for_timeout(4000)
    for r in ["/admin/social-catalog", "/admin/loyalty", "/admin/gastro/kds-stations"]:
        pg.goto(f"https://provecchio.local{r}", wait_until="networkidle"); pg.wait_for_timeout(2500)
        print(r, "404" if "Página no encontrada" in pg.inner_text("body") else "OK")
    b.close()
PY

# 2) Aplicar el fix y reconstruir
cd /opt/orderflow/frontend && npm run build

# 3) Verificar después del fix (esperado: OK en las 3 rutas)
#    + vitest del test de regresión
npx vitest run src/components/sidebar-routes.test.ts
```

---

## 6. Referencias

- Commit que introdujo la regresión: `7f6bae00` (2026-10-17, v1.39.7).
- Caso previo de la misma clase: [troubleshooting #160](160-inventory-admin-routes-missing.md).
- Archivos afectados: `frontend/src/AdminApp.tsx`, `frontend/src/components/Sidebar.tsx`,
  `frontend/src/pages/admin/whatsapp-catalog.tsx`.
- Ratchet de lint introducido en v1.39.20: `.github/workflows/ci.yml`.
- QA E2E post-deploy: `scripts/qa_e2e_check.py`.
