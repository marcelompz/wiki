# Troubleshooting #156 — Imagen rota en catálogo público después de `docker compose down -v`

## Fecha
2026-09-22

## Síntoma
E2E QA (`scripts/qa_e2e_check.py`) falla en `https://provecchio.com/social-catalog` con:

```
⚠️ [QA WARNING] Imagen rota o sin cargar: https://provecchio.com/api/v1/uploads/social-catalog/provecchio-dimora-001/1787496288294_provecchio_isotipo.png
❌ [QA ERROR] Hay 1 imágenes rotas en la vista pública del catálogo
```

El backend responde HTTP 200 para la página, pero la imagen tiene `naturalWidth == 0`.

## Causa raíz
El flag `-v` en `docker compose down -v` eliminó el volumen `uploads_data`, que contiene los archivos servidos estáticamente por `UploadsController` (`/api/v1/uploads/social-catalog/:tenantId/:filename`).

La base de datos conserva URLs como `logoUrl`, `bannerUrl`, `categoryBackgrounds`, etc., pero los archivos físicos en `/app/uploads/social-catalog/{tenantId}/` ya no existen.

## Solución
1. Ir a `/admin/social-catalog` → sección **Branding**.
2. Subir el logo/isotipo nuevamente.
3. Guardar cambios.
4. Re-ejecutar `python3 scripts/qa_e2e_check.py` para validar.

## Prevención
- No usar `docker compose down -v` en producción sin backup previo de `uploads_data`.
- Hacer backup del volumen antes de operaciones de limpieza.

## Estado
✅ No requiere cambios de código. Acción manual en panel admin.
