# Down con volumen eliminó datos base de producción

## Síntoma
Después de `docker compose down -v` en Provecchio, los endpoints devolvieron:
- `GET /api/v1/users/staff` → 401/500 por tablas vacías o columnas inconsistentes.
- `GET /api/v1/auth/login` → 404 `User not found or inactive`.
- `GET /api/v1/users/staff` con token viejo → 401 `Invalid or inactive tenant`.
- `GET /api/v1/uploads/social-catalog/...` → 404/Imagen rota en catálogo público.
- E2E QA `scripts/qa_e2e_check.py` falla por `naturalWidth == 0` en logo del tenant.

## Causa raíz
El flag `-v` elimina volúmenes de Docker. En producción, eso incluye:
1. `orderflow_postgres_data` → base de datos perdida/parcial.
2. `uploads_data` → todos los archivos subidos eliminados (`/app/uploads/social-catalog/`, `/app/uploads/products/`, etc.).

Al levantar el stack nuectamente, la base quedó vacía o parcial, y el schema de Prisma empezó a fallar por columnas/tablas legacy faltantes (`employees`, `tenants.apiKeyPreviousSecret`, `orders.exchangeRate`, etc.). Además, las URLs de imágenes guardadas en `SocialCatalogConfig.logoUrl`, `bannerUrl`, `categoryBackgrounds`, etc., apuntan a archivos que ya no existen en el volumen `uploads_data`.

## Solución aplicada
1. Recrear tabla `employees` con columnas snake_case (`tenant_id`, `first_name`, etc.) y datos de demo.
2. Agregar columnas faltantes manualmente en `tenants` y `orders`.
3. Restaurar desde backup `pre_deploy_provecchio_20260921_212300.sql`.
4. Corregir estado de empleados de `DRAFT` a `ACTIVE`.
5. Aumentar `stockAvailable` del producto `Aeropress` para permitir confirmación.
6. Re-subir manualmente el logo/isotipo del tenant desde `/admin/social-catalog` (el archivo `1787496288294_provecchio_isotipo.png` fue eliminado por `docker compose down -v`).

## Prevención
- Usar `docker compose down` sin `-v` en producción.
- Si es necesario limpiar volúmenes, hacer backup previo y restaurar luego.
- Mantener script de restauración de datos base (superadmin, tenant, empleados demo).
- Hacer backup del volumen `uploads_data` antes de cualquier operación con `-v`.

## Estado del circuito OmniGastro (post-restauración)
- Login superadmin: ✅
- Staff endpoint: ✅ (Natalia, Ivan, Paula con PIN `1234`)
- Productos y mesas: ✅
- Crear pedido: ✅
- Confirmar pedido: ✅
- Enviar a cocina: ✅ ticket KDS en `PREPARING`
- Cierre/cobro por POS session: pendiente de prueba manual en frontend/admin
- E2E QA: ❌ Imagen rota en catálogo público (`uploads_data` wiping)

## Próximo paso recomendado
Restaurar el estado anterior desde backup, o recrear manualmente:
- Usuario superadmin (`marcelo@pesallaccia.com`)
- Tenant `provecchio-dimora-001`
- Empleados: Natalia, Ivan, Paula
- PINs unificados
- **Logo/isotipo del tenant**: re-subir desde `/admin/social-catalog` → sección "Branding"
