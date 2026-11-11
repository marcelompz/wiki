# 219 — pnpm 10: symlinks rotos en backend tras la primera instalación del workspace

## Síntoma

Tras un `pnpm install` desde `node_modules` vacío (clone fresco o limpieza
total), los binarios del workspace fallan con errores de resolución que
apuntan **por encima de la raíz del repo**:

```
Error: Cannot find module '/opt/node_modules/.pnpm/@nestjs+cli@10.4.9/node_modules/@nestjs/cli/bin/nest.js'
```

Los symlinks rotos se detectan con:

```bash
find backend/node_modules -type l ! -exec test -e {} \; -print
# backend/node_modules/ts-jest
# backend/node_modules/@nestjs/testing
# backend/node_modules/@nestjs/cli
# backend/node_modules/@types/node
# backend/node_modules/@types/jest
# backend/node_modules/jest
```

## Causa raíz

Bug de pnpm 10.34.9 reproducido en este monorepo: cuando un paquete se
comparte entre importers de **distinta profundidad** (`backend/` a
profundidad 1 vs `services/<x>/` a profundidad 2), pnpm calcula el target
relativo del symlink una sola vez (para la profundidad del primer importer
procesado) y lo clona al resto. En `backend/node_modules` quedan links con
un `../` de más que resuelven a `/opt/node_modules/...` (inexistente).

Solo muerde en la **primera** instalación desde cero; los installs
posteriores conservan los links sanos.

## Solución aplicada

`scripts/fix-pnpm-links.sh` (idempotente): detecta links rotos con
`find -type l ! -exec test -e`, los elimina y ejecuta `pnpm install`, que
los recalcula con la profundidad correcta.

```bash
bash scripts/fix-pnpm-links.sh
# ✅ No hay symlinks rotos en el workspace.
```

Ejecutar tras todo clone o instalación fresca del workspace. Verificado dos
veces con instalación limpia + curación (2026-11-11).

## Notas

- Los shims de `.bin` (`nest`, `ts-node`, `tsc`) también quedan rotos; el
  script los deja que `pnpm install` los regenere.
- pnpm 11 corrige posiblemente el bug pero requiere node ≥ 22
  (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` en node 20.19.2); pnpm 12 usa
  binario nativo incompatible con corepack 0.24. Por eso el pin es
  `pnpm@10.34.9` en `package.json` (raíz).
