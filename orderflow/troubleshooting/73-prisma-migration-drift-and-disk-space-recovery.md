# 🛠️ Troubleshooting #73 — Desincronización de Migraciones Prisma en Deploy & Recuperación por Saturación de Disco

> **Área:** Backend / Prisma ORM / PostgreSQL / Docker Deploy  
> **Síntomas:**  
> 1. Errores **HTTP 500** al consultar `/api/v1/saved-views`, `/api/v1/products`, `/api/v1/catalog/categories` y `/api/v1/admin/social-catalog/products` por columnas y tablas inexistentes en base de datos (`saved_views`, `product_categories.isVisible`, `products.handle`).  
> 2. Fallo del pipeline de deploy en servidor por agotamiento de espacio en disco (`ResourceExhausted: no space left on device`) y crash de PostgreSQL (`PANIC: could not locate a valid checkpoint record`).  
> **Estado:** ✅ Resuelto en `v1.20.41`  

---

## 🔍 Causa Raíz

1. **Desincronización del Archivo de Migraciones de Prisma:**  
   Se introdujeron los modelos `SavedView` y las columnas `isVisible` en `ProductCategory` y `handle` en `Product` en `schema.prisma`, pero **no se había generado ni subido la carpeta física de migración con su archivo `.sql`** en `backend/prisma/migrations/`.  
   Al ejecutar `./scripts/deploy-production.sh`, el comando `npx prisma migrate deploy` reportaba *"No pending migrations to apply"*, dejando la base de datos de producción desactualizada con respecto al cliente Prisma.

2. **Saturación del Disco y Crash de WAL en PostgreSQL:**  
   El disco `/dev/sda1` del servidor de producción llegó al 100% de ocupación (38 GB) debido a capas residuales acumuladas por Docker BuildKit. El fallo por espacio provocó un apagado abrupto de PostgreSQL, corrompiendo el registro de checkpoint primario en el archivo WAL.

3. **Ausencia de Salvaguarda para `tenantId` Nulo:**  
   Al consultar endpoints desde contextos sin autenticación o sin subdominio de tenant resuelto, la lectura de `req.tenant.id` lanzaba excepciones de tipo `TypeError` no capturadas.

---

## 🛠️ Solución Aplicada

1. **Sincronización Directa & Creación de Migración Oficial:**  
   - Se ejecutó `npx prisma db push` en el contenedor de producción para actualizar la estructura de tablas al instante.
   - Se creó la migración oficial [`backend/prisma/migrations/20260827230000_add_dataview_saved_views_and_fields/migration.sql`](file:///opt/orderflow/backend/prisma/migrations/20260827230000_add_dataview_saved_views_and_fields/migration.sql) y se incorporó al repositorio para que deploys en otros servidores (como Provecchio) apliquen automáticamente las diferencias vía `npx prisma migrate deploy`.

2. **Limpieza de Disco & Reparación WAL de PostgreSQL:**  
   - Se purgó el almacenamiento en disco liberando 3.3 GB (`docker system prune -a --volumes -f`).
   - Se reparó el estado del registro WAL de PostgreSQL mediante `pg_resetwal -f`, devolviendo la base de datos a estado de aceptación de conexiones.

3. **Defensiva de Nulos en Controladores:**  
   - Se agregaron cláusulas `if (!req.tenant?.id) return [];` en `ProductsController`, `CatalogController`, `SocialCatalogController` y `SavedViewsController`.

---

## 🧪 Validación

- **Base de Datos:** Verificada la existencia de la tabla `saved_views` y columnas `isVisible` y `handle`.
- **API Health:** Endpoint `/api/v1/health` respondiendo `200 OK` con estado de base de datos en `ok`.
