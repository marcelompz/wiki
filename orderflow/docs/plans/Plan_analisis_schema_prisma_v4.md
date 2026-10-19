# Plan de análisis del schema Prisma

**Versión 4** · verificada contra el repositorio y con decisiones del dueño

---

## Qué cambió desde la versión 3

Un agente contrastó el plan v3 con el repositorio real y el dueño resolvió varias preguntas abiertas. Esta versión incorpora esas verificaciones, corrige dos datos y reordena la ejecución para empezar ya con lo que no requiere tocar producción.

| Tema | v3 | v4 |
|---|---|---|
| Verificación | Análisis sobre los paquetes 1.38.12 y 1.39.8 | Contrastado con el repositorio real (`/opt/orderflow`): migraciones, `entrypoint.sh`, script de provisión y 11 schemas standalone confirmados |
| Conteo de modelos | 161 modelos | Sigue siendo 161. El 159 de un `grep` literal omite los dos modelos declarados con sangría (`OmnigastroSettings` y `ProductCategory`) |
| Ruta del schema | `backend/schema.prisma` (según el paquete) | `backend/prisma/schema.prisma` en el repo real; el paquete lo aplanó |
| Fuente de verdad | Pregunta abierta | `provecchio.local` (copia local de provecchio.com). Nada se ejecuta directo contra producción |
| Decisiones del dueño | Pendientes | Standalone con opción A; eliminar duplicados; eliminar `birthday_logs.type`; recuperar RLS desde `pg_policies` |
| Despliegue | Solo entrypoint y provisión | Se suma el problema del contexto de build (más de 4,5 GB) y el riesgo de desplegar 1.39.8 sin migraciones |
| Orden | 0, 3, 2, 1 | 3 y 1 en paralelo con el diagnóstico del Plan 0; baseline después; división al final |

---

## Estado verificado

| Métrica | Dato verificado |
|---|---|
| Core | `backend/prisma/schema.prisma`: 4.471 líneas · 161 modelos · 56 enums |
| Migraciones | 38 carpetas; la última es `20261003180000_migrate_positions_to_snake_case` |
| Historial vs schema | 52 `CREATE TABLE` y 15 `CREATE TYPE` en las migraciones frente a 161 modelos y 56 enums (señal fuerte de historial incompleto) |
| `entrypoint.sh` | Línea 15: `npx prisma migrate deploy \|\| true` (un fallo no detiene el arranque) |
| Provisión de bases dedicadas | `provision-orderflow-company.sh` usa `prisma db push --accept-data-loss` |
| Standalone | 11 schemas en `services/*/prisma/schema.prisma`; 7 con modelos homónimos al core |
| Build en el servidor | Contexto de más de 4,5 GB, con `Dockerfile.dev` y un `.dockerignore` de 245 bytes |

**Nota sobre el conteo:** para contar modelos hay que usar una expresión que tolere sangrías:

```bash
grep -cE '^\s*model\s+\w+\s*\{' backend/prisma/schema.prisma   # esperado: 161
```

Cualquier script de división o de diagrama debe hacer lo mismo, y `prisma format` debe correr antes.

> Aviso sobre el 52 vs 161: el conteo sale de buscar `CREATE TABLE` y `CREATE TYPE` en los `.sql`. Puede haber tablas creadas con otra sintaxis o fuera del repositorio, así que es una señal fuerte, no una prueba. La Fase 0A la confirma contra la base.

---

## Decisiones ya tomadas

1. **Fuente de verdad: `provecchio.local`.** Es la copia local de provecchio.com. Todo `prisma migrate diff` y el baseline corren contra esa copia, nunca directo contra producción.
2. **Standalone: opción A.** Chequeo de deriva en CI entre los modelos compartidos y el core. Se eliminan los duplicados exactos (`bookings` con `omnibookings`, `omnicatalog` con `social-catalog`).
3. **`birthday_logs.type`:** se elimina la columna con una migración idempotente.
4. **RLS:** se recupera desde `pg_policies` en `provecchio.local` y se reconstruye y versiona la migración.
5. **Columnas con `@map` nuevo:** siguen sin resolverse. Hay que verificarlas una por una en `provecchio.local` antes de decidir entre migración o corrección del schema.

---

## Riesgos inmediatos de despliegue

Estos puntos no son parte del análisis del schema, pero condicionan cualquier deploy mientras no se resuelvan.

- **Desplegar 1.39.8 sin migraciones.** La imagen nueva genera el client de Prisma con `@map("tenant_id")` en seis modelos y con `OmnigastroSettings`. Si las columnas reales siguen en camelCase o la tabla no existe, las consultas fallan al arrancar. Verificar columna por columna antes de desplegar.
- **Contexto de build de más de 4,5 GB.** El servidor construye con `Dockerfile.dev` y un `.dockerignore` de 245 bytes. Un build interrumpido no reemplaza el contenedor, pero uno que termine sí lo hace automáticamente. Diagnosticar con `du` en `backend/` y ampliar el `.dockerignore` (sin excluir `backups` ni `*.sql` genéricos, porque `backend/backups` es código y `migrations` contiene `.sql`).
- **Arranque con `migrate deploy` y `&&`.** En el compose con `Dockerfile.dev`, si `migrate deploy` falla el contenedor no levanta. En el entrypoint de prod el `|| true` oculta el fallo. Los dos comportamientos conviven y ninguno es el deseado.
- **`rsync` del deploy.** `--exclude='backups'` y `--exclude='uploads'` sin barra inicial coinciden a cualquier profundidad, incluida `backend/backups` (código). Anclarlos con `/` al inicio y confirmar que ese módulo llega al servidor.
- **Credencial en texto plano.** `infra/docker-compose.yml` y `docs/info/files/docker-compose.yml` incluyen `ODOO_PASSWORD`. Rotarla y moverla al `.env`.

---

## Rama y rollout

- **Rama de trabajo:** `feat/schema-prisma-analysis-v3`, creada desde `main` después de `git pull origin main`. Sin cambios en `main` hasta cumplir todos los gates.
- **Gate 1:** baseline capturado.
- **Gate 2:** todas las migraciones aplicadas sin error en `provecchio.local`, probando una base existente (con `migrate resolve --applied`) y una base vacía creada solo con `migrate deploy`.
- **Gate 3:** `prisma migrate diff` entre migraciones y schema sale vacío.
- **Gate 4:** `./scripts/init.sh` en verde.
- **Gate 5:** prueba E2E en localhost sobre un respaldo restaurado de producción.
- **Merge y deploy:** solo con los cinco gates; el deploy usa `./scripts/deploy-production.sh` con autorización explícita (AGENTS.md regla 9). Después se borra la rama.

---

## Plan 3: Diagrama de relaciones

**Estado:** riesgo bajo, factible sin acceso a datos. Es el punto de partida.

1. Ejecutar `prisma validate` y `prisma format` sobre el schema antes de parsear, para normalizar las sangrías.
2. **Parseo** del core y de los 11 standalone, asignando dominios con el mapa del Plan 2.
3. **Nivel 1:** mapa de dominios con flechas ponderadas por relaciones cruzadas.
4. **Nivel 1b:** core frente a standalone, con modelos compartidos, bases separadas y canales de comunicación.
5. **Nivel 2 y 3:** un diagrama por dominio y flujos clave (`Order` → `Payment` → `ElectronicDocument` → `StockMove`; `Employee` → `Attendance` → `Payroll`).
6. **Métricas de acoplamiento** y módulos candidatos a extracción bloqueados por dependencias.

**Entregable:** diagrama de dominios, vista core frente a standalone, diagramas por dominio y tabla de acoplamiento.

---

## Plan 1: Revisión del schema

**Estado:** riesgo bajo; puede correr en paralelo sobre el archivo único actual. Los resultados del diagnóstico del Plan 0 lo alimentan.

1. **Aislamiento multi-tenant en tres capas:** modelos sin `tenantId` (recalcular sobre 161), tablas con RLS (de `pg_policies`) y los 77 archivos con `this.prisma` de la auditoría del 2026-09-02, que conviene repetir.
2. **Float y Decimal.** Los 13 `Float` y la precisión de los `Decimal` en nómina, propinas, tipos de cambio y facturación.
3. **Índices y restricciones.** Cruzar FK contra índices, detectar redundantes y buscar `unique` faltantes como el reciente de `TableGuest`.
4. **onDelete.** Cascadas peligrosas sobre historial fiscal y de nómina.
5. **Inventario de camelCase y mapeo mixto,** según §2.4 de AGENTS.md. La decisión de migrar queda en manos del propietario.
6. **`OmnigastroSettings.paymentRouting`.** Es `Json` sin estructura declarada: agregar una tarea de validación con DTO en la aplicación, o evaluar una tabla relacionada.
7. **Duplicados dentro del core** (`BillOfMaterials` frente a `ProductBom`/`BomLine`, modelos de caja) y campos `Json` o `String` que merezcan enum.

**Entregable:** informe priorizado (crítico, importante, mejora) con migraciones propuestas que sigan §2.4.

---

## Plan 0: Línea base y rescate de migraciones

**Estado:** riesgo alto en su segunda parte. Se divide en una fase de diagnóstico que puede empezar ya y una de baseline que espera sus resultados.

### Fase 0A: Diagnóstico sobre `provecchio.local`

1. **Confirmar que la copia representa a producción.** Comparar un `pg_dump --schema-only` de producción (solo lectura) con el de `provecchio.local`. Si difieren, la referencia no es confiable.
2. **Medir la deriva.** `prisma migrate diff` (`--from-url` a `--to-schema-datamodel`, en modo script) contra `provecchio.local`.
3. **Verificar los `@map` columna por columna** en `api_key_rotations`, `customer_bi_snapshots`, `real_events`, `table_transfer_logs`, `tango_id_maps` y `product_preparation_stations`; confirmar también que existan `omnigastro_settings` y el unique de `table_guests`.
4. **Inspeccionar `birthday_logs`.** Revisar `SELECT count(*), count(DISTINCT type) FROM birthday_logs;` para saber si `type` tiene datos útiles antes de eliminarla.
5. **Listar las políticas RLS** desde `pg_policies`, y compararlas también con las de producción antes de reconstruir la migración.

### Fase 0B: Baseline y endurecimiento (después de 0A)

1. **Decidir caso por caso quién gana** (schema o base) y escribir migraciones idempotentes que respeten §2.4: `IF NOT EXISTS`, nombres reales de tabla y timestamp completo.
2. **Migración para `birthday_logs.type`** con `DROP COLUMN IF EXISTS`, y migración de RLS reconstruida y versionada.
3. **Crear el baseline** con `migrate diff --from-empty --to-url`. Probar las dos rutas: base existente con `migrate resolve --applied` y base vacía creada solo con `migrate deploy`. Comprobar cómo se comporta `migrate deploy` con las migraciones viejas archivadas; si se queja, conservar las carpetas y agregar el baseline como una más.
4. **Endurecer el despliegue.** Quitar el `|| true` del entrypoint (o hacer que el fallo alerte y detenga el despliegue), reemplazar `db push --accept-data-loss` en el script de provisión, ampliar el `.dockerignore` y construir la imagen fuera del servidor de producción.
5. **CI.** Falla si `prisma migrate diff` entre migraciones y schema no sale vacío, y falla si los modelos compartidos con un standalone divergen (opción A).

**Nota:** la única escritura en producción será `migrate resolve` sobre `_prisma_migrations`. No toca tablas, pero es una escritura y debe ir dentro de la autorización explícita del deploy.

**Entregable:** informe de deriva, migraciones de reconciliación, baseline verificado y CI que impida nuevas derivas.

---

## Plan 2: Dividir en múltiples archivos

**Estado:** riesgo medio; bloqueado por el baseline (Fase 0B).

1. **Prerrequisitos:** `prisma validate` y `prisma format` sobre el schema, Fase 0B terminada y rutas definidas (el schema vive en `backend/prisma/`).
2. **Mapa de archivos** por dominio (ver abajo), con OmniGastro agrupado en POS.
3. **Mover sin editar.** El script tolera sangrías, usa conteo de llaves y no toca `@map`, `@@map` ni comentarios.
4. **Validar equivalencia** con `prisma validate`, `prisma format` y `migrate diff` entre original y nuevo (debe salir vacío); regenerar el client y compilar.
5. **Actualizar rutas** en Dockerfile, `entrypoint.sh`, `nest-cli.json`, `deploy-production.sh`, `package.json` y CI.
6. **Standalone (opción A).** Eliminar los duplicados exactos y agregar el chequeo de deriva en CI.

### Mapa de archivos propuesto

| Archivo / carpeta | Contenido |
|---|---|
| `base.prisma` | generator y datasource |
| `platform/` | tenant, auth/RBAC, auditoría, billing, provisioning |
| `commerce/` | catálogo, órdenes, pagos |
| `pos/` | POS, restaurante, KDS, OmniGastro |
| `inventory/` | almacenes, stock, compras, proveedores |
| `crm/` | contactos, lealtad, cumpleaños, retención, marketing |
| `hr/` | empleados, posiciones, asistencia, nómina, propinas |
| `fiscal/` | Facturasend, Tango, tipos de cambio |
| `modules/` | giveaways, bio links, NFC, quotations |
| `intel/` y `omnichannel/` | analytics, market intel, canales, bots y conversaciones |

**Entregable:** carpeta de schema verificada con diff vacío.

---

## Orden de ejecución

1. **Plan 3 (diagrama)** ahora: no toca la base y desbloquea el mapa de dominios.
2. **Plan 1 (revisión) y Fase 0A (diagnóstico) en paralelo.** Ambos corren sobre `provecchio.local` y el archivo único actual.
3. **Fase 0B (baseline y endurecimiento)** con los resultados de 0A y las decisiones ya tomadas.
4. **Plan 2 (dividir)** sobre una base ya reproducible.

Antes de cualquier nuevo deploy a producción deben estar resueltos los riesgos inmediatos: verificación de los `@map`, contexto de build y comportamiento de `migrate deploy`.
