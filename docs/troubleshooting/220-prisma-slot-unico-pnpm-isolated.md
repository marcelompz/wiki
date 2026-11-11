# 220 — Prisma: un solo slot de cliente generado bajo pnpm `node-linker=isolated`

## Síntoma

Con el workspace pnpm (`node-linker=isolated`), tras una reinstalación fresca
el build del backend explota con cientos de errores de tipos:

```
error TS2305: Module '"@prisma/client"' has no exported member 'UserRole'.
error TS7006: Parameter 'uta' implicitly has an 'any' type.   (decenas)
```

Y/o el runtime de un servicio standalone usa modelos que no son los de su
schema ("último `prisma generate` gana").

## Causa raíz

El stub de `@prisma/client` hace `require('.prisma/client/default')`. Node
resuelve los symlinks por **realpath**: el stub de cualquier importer cae en
la instancia física compartida
`node_modules/.pnpm/@prisma+client@<versión>/`, por lo que existe **un solo
slot de cliente generado por versión de `@prisma/client`** en todo el
workspace:

1. La reinstalación fresca reconstruye `.pnpm` desde la store → el cliente
   generado (que vive dentro) se pierde → TS2305/TS7006 masivos.
2. Cada `prisma generate` de un proyecto con output default pisa el slot de
   los demás. Bajo npm cada proyecto tenía su copia en su propio
   `node_modules` (el require relativo no escapaba), por eso antes coexistían.

Casos concretos del monorepo:

| Proyecto | Impacto |
| :--- | :--- |
| `backend` | Determinista: regenerar antes de construir/probar. |
| `odoo-adapter` | Nulo en runtime: usa `pg` crudo (`Pool`), nunca importa el cliente. |
| 9 services standalone (output `../node_modules/.prisma/client`) | Su output custom queda invisible bajo pnpm (realpath del stub escapa del `node_modules` del importer) → el import de `'@prisma/client'` resuelve el slot compartido. **Docker no se ve afectado**: dentro del build cada proyecto instala con npm en directorios reales. |
| `omnibi-standalone` | ✅ Patrón correcto: `output = "../node_modules/@prisma/omnibi-client"` + `import from '@prisma/omnibi-client'` (import directo desde el propio `node_modules`, sin realpath escape). |

## Solución aplicada (fase 1)

- Workflow backend: `pnpm --filter orderflow-backend run prisma:generate`
  antes de build/test (igual que siempre se necesitó con npm).
- No se requiere cambio de código en fase 1: el runtime local de los services
  standalone no está en el alcance y sus Docker builds (npm adentro) funcionan
  igual que siempre.

## Trabajo futuro (fase 2)

Migrar los 9 services standalone al patrón omnibi: `output` con nombre propio
(`../node_modules/@prisma/<nombre>-client`) + import directo en el código
(en lugar de `'@prisma/client'`). Ver
`docs/plans/estratega-comercial-microservicios/03-optimizacion-monorepo-pnpm.md`.
