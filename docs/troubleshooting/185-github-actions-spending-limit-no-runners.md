# Troubleshooting #185: GitHub Actions no asigna runners — spending limit / sin fondos

> **Fecha:** 2026-10-21
> **Módulo / Área:** DevOps / CI / GitHub Actions
> **Severidad:** Media (bloquea la verificación en CI; no bloquea el deploy)
> **Estado:** ⚠️ **ABIERTO** — depende de topped-up de la cuenta

---

## 1. Síntoma / Problema

Tras corregir los defectos del pipeline, **todos** los jobs de los tres
workflows fallan de forma simultánea en 2-3 segundos, **sin ejecutar un solo
step**:

```
Backend Load Tests (k6)          fail  3s
Backend Tests & Build             fail  3s
E2E Tests (Python / Playwright)   fail  2s
Frontend E2E (Playwright)         fail  2s
Frontend Tests & Build            fail  2s
Mobile Tests & Build (TSC)        fail  2s
backend                           fail  3s
frontend                          fail  3s
semgrep                           fail  3s
```

La API de GitHub muestra el detalle:

```bash
gh api repos/marcelompz/orderflow/check-runs/<id>/annotations --jq '.[] | .message'
```

```
The job was not started because recent account payments have failed or your
spending limit needs to be increased. Please check the 'Billing & plans'
section in your settings
```

Indicadores adicionales:

- `runner_name` vacío y `steps: []` en el objeto job → **nunca se asignó runner**.
- `gh run rerun <id> --failed` reproduce el fallo idéntico (no es un incidente transitorio).
- `https://www.githubstatus.com` reporta **All Systems Operational** → no es una
  caída de la plataforma, es el **límite de gasto de la cuenta**.

---

## 2. Causa Raíz

La cuenta de GitHub **agotó sus minutos/créditos de Actions** (o tiene el
*spending limit* en 0 / muy bajo). Cuando se alcanza el límite, GitHub crea
los jobs pero **no les asigna runner**, y los marca como fallidos de inmediato
con el mensaje de facturación anterior.

Es importante distinguirlo de un fallo de código:

| Síntoma | Defecto de código | Límite de facturación |
|---|---|---|
| El job ejecuta steps y alguno falla | ✅ | ❌ |
| `steps: []`, `runner_name: ""` | ❌ | ✅ |
| Falla en 2-3 s en todos los jobs a la vez | ❌ | ✅ |
| GitHub Status "All Systems Operational" | ❌ | ✅ |

---

## 3. Impacto en el flujo de release

- El pipeline **no puede verificar** los cambios: `npm ci`, jest, vitest,
  tsc, builds, gitleaks, semgrep, qa_e2e y E2E quedan sin ejecutar.
- **No bloquea el deploy**: el protocolo de `AGENTS.md` §3.1.1 exige
  backup → restore en localhost → pruebas locales → deploy, y toda la
  verificación puede ejecutarse en la máquina de desarrollo.
- **No se deben "arreglar" los jobs por el fallo de facturación**: los jobs
  fallaban por código en v1.39.17–v1.39.19 y se corrigieron; después del
  arreglo el único rojo restante era la facturación.

---

## 4. Mitigación aplicada (v1.39.21)

Mientras no haya fondos, la validación se hizo **100 % en local**, replicando
lo que hace cada job de CI:

| Job de CI | Equivalente local ejecutado |
|---|---|
| `backend` (tsc + eslint + audit + jest) | `npx tsc --noEmit` (0 errores) · `eslint` (0 errores, 439 warnings bajo el ratchet de 440) · `npm audit --omit=dev --audit-level=critical` (0 críticas) · `jest` **995/995** |
| `frontend` (tsc + eslint + build) | `npx tsc --noEmit` (0 errores) · `eslint` (0 errores) · `npm run build` OK · `vitest` **17/17** |
| `mobile` (tsc) | `npx tsc --noEmit` (0 errores) |
| `Frontend E2E (Playwright)` | `npx playwright test` → **73 passed / 5 skipped / 0 failed** |
| `qa_e2e` (Python / Playwright) | verificado en CI el 2026-10-21 17:36 UTC (`conclusion: success`, 43 s) con el fix de `apt` |
| `Backend Load Tests (k6)` | no reproducido localmente (requiere stack desplegado) |

Además, el fix del OOM de Node (`NODE_OPTIONS=--max-old-space-size=4096`) se
**reprodujo localmente** para demostrar que era la causa del `exit 134`:
con 2 GB el `tsc` aborta con *"Ineffective mark-compacts near heap limit"* y
con 4 GB pasa limpio.

---

## 5. Procedimiento para Reanudar CI

1. Top-up de la cuenta o ampliación del *spending limit* en
   **GitHub → Settings → Billing & plans** (o en la organización, si el repo
   pertenece a una org).
2. Verificar que el límite y los minutos muestran saldo disponible.
3. Reejecutar los jobs fallidos:

   ```bash
   gh run rerun <run-id> --failed
   # o, para relanzar todo el pipeline del PR:
   gh workflow run ci.yml --ref fix/ci-pipeline-verde
   ```

4. Confirmar que los jobs **sí reciben runner** (deben tardar minutos, no
   segundos) y que el `E2E Tests (Python / Playwright)` sigue en verde.

---

## 6. Recomendaciones para que no vuelva a pasar

- **Presupuestar los minutos**: los deploys completos (3 workflows × N jobs,
  con re-ejecuciones) consumen bastante. Configurar alertas de gasto bajo.
- **Ejecutar en self-hosted runner** si el consumo es recurrente
  (`runs-on: [self-hosted, linux]`), lo que además elimina el límite.
- **Job `Frontend E2E`**: ya quedó como informativo (`continue-on-error`)
  porque requiere un stack sembrado que CI no aprovisiona; cuando se implemente
  el seed reproducible por tenant, promotinglo a bloqueante suma consumo.

---

## 7. Referencias

- Workflows afectados: `.github/workflows/ci.yml`, `.github/workflows/ci-cd.yml`,
  `.github/workflows/qa_e2e.yml`.
- Mensaje literal de GitHub: *"recent account payments have failed or your
  spending limit needs to be increased"*.
- Release v1.39.21: `main` `cd955955`, tags `v1.39.20` y `v1.39.21`.
- Deploy a producción realizado **sin** CI verde, con validación local
  completa (§4) y verificación post-deploy (health `1.39.21`, 11 endpoints
  críticos en 200, flujo de caja probado por API en producción).
