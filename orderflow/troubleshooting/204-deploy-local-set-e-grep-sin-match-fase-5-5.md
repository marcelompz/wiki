# #204 — `deploy-local.sh` muere silenciosamente en la fase [5/5] (bundle match) por `set -e` + grep sin match

> **Fecha:** 2026-10-26 · **Relacionados:** #203, regla #2 de AGENTS (routers provecchio websecure-only) · **Impacto:** barrera de deploy local incompleta (fases 7/final nunca corren) sin mensaje de error

## Síntoma

`./scripts/deploy-local.sh` imprime `🔍 [5/5] Frontend bundle matches build... ` y **termina sin imprimir resultado ni summary** — en el primer ciclo también se perdieron la salida de las fases 8/E2E. El exit code engañoso: el script parece "cortado" y no fallido.

## Causa raíz

El check compara el entrypoint del HTML servido contra el del disco así:

```bash
SERVED_ENTRY=$(curl -s "http://${DOMAIN}:80/" | grep -oE 'assets/index-...' | head -1)
```

Los routers `provecchio-*` del Traefik local usan **solo entrypoint `websecure`** (HTTPS): HTTP al :80 retorna **404** (esperado, el redirect lo maneja edge/Cloudflare) → el body no contiene `assets/index-*.js` → `grep` sale con **exit 1** → `set -euo pipefail` mata el script **en la asignación** (`VAR=$(...)` propaga el exit code del pipeline) — silenciosamente, porque no hay `|| true`.

Dos errores superpuestos:
1. Consultar **HTTP** en lugar de HTTPS (websecure-only) → grep sin match.
2. Un pipeline que puede fallar dentro de una asignación sin `|| true` bajo `set -e`.

## Solución aplicada (2026-10-26)

En `scripts/deploy-local.sh`:

1. `[5/5]` y fase 7.1 ahora consultan **`https://${DOMAIN}` con `-k`** (cert autosignado de `.local` — permitido en dev, regla #2 de AGENTS).
2. Pipes blindados contra `set -e`: `| head -1 || true` en `DISK_ENTRY`/`SERVED_ENTRY`.
3. Verificado con re-run completo: fases 6-7 + summary completos (5/5 OK, 4/4 funcionales OK).

```bash
DISK_ENTRY=$(grep -oE 'assets/index-...' "${BASE_DIR}/frontend/dist/index.html" | head -1 || true)
SERVED_ENTRY=$(curl -sk "https://${DOMAIN}/" | grep -oE 'assets/index-...' | head -1 || true)
```

## Prevención / Lecciones

1. **Toda asignación `VAR=$(pipeline…)` bajo `set -e`** con un comando que puede no-matchear (`grep`, `sed` sin match) debe terminar en `|| true` — si no, el script muere sin mensaje en la línea exacta y solo se nota por el output truncado.
2. Tras el deploy de routers **websecure-only** (patrón provecchio, regla #2), los health-checks que consultan el frontend deben usar **HTTPS + `-k`** en `.local` — HTTP/80 devuelve 404 *por diseño*.
3. Síntoma típico de este bug: barrera con output que "muere" en la última línea de una fase (sin FAIL) — sospechar `set -e` antes de investigar más lejos.
