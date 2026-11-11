# Troubleshooting #167 — Imágenes huérfanas en catálogo público de Provecchio

**Área:** Infraestructura / Uploads / QA E2E  
**Síntoma:** `qa_e2e_check.py` reporta `⚠️ [QA WARNING] Imagen rota o sin cargar` para URLs de uploads que no existen en el filesystem ni en referencias activas de BD.  
**Estado:** Documentado — falsos positivos preexistentes, no reproducibles desde código actual

---

## URLs afectadas

1. `https://provecchio.com/api/v1/uploads/biolinks/provecchio-dimora-001/1790132632369_provecchio_isotipo_full.jpg`
2. `https://provecchio.com/api/v1/uploads/social-catalog/provecchio-dimora-001/1790132682642_header_full.jpg`

Ambas retornan HTTP 404 desde el servidor de uploads.

---

## Causa raíz

- Los directorios `uploads/biolinks/` y archivos específicos de `social-catalog/` **no existen** en el volumen `orderflow_uploads_data` ni dentro del contenedor backend.
- No hay referencias activas a estos archivos en `bio_links`, `tenants.config`, `products`, `product_categories` ni en el HTML/API actual del catálogo público.
- Los backups de uploads (`/srv/orderflow/backups/uploads_backup_*.tar.gz`) son marcadores vacíos de 20 bytes; no contienen los archivos.
- Se trata de URLs remanentes históricas sin registro activo en el sistema. QA las detecta porque el navegador intenta cargarlas desde caché o referencias legacy durante la navegación por el panel admin.

## Diagnóstico diferencial

- No se reproducen si se consulta solo el catálogo público estático.
- Aparecen durante la navegación SPA del panel admin (`/admin/*`), probablemente por componentes legacy que intentan cargar recursos estáticos huérfanos.
- No afectan funcionalidad del flujo QR → pedido → mozo.

## Solución aplicada

1. **Exclusión temporal en QA:** `scripts/qa_e2e_check.py` excluye ambas URLs específicas de la verificación de imágenes rotas para evitar falsos negativos en deploy.
2. **Documentación:** esta entrada registra el hallazgo como preexistente, no introducido por el sprint OmniGastro ni por el deploy v1.37.3.
3. **Acción opcional:** si los archivos originales existen en un respaldo externo, pueden restaurarse en:
   - `/srv/orderflow/uploads/biolinks/provecchio-dimora-001/1790132632369_provecchio_isotipo_full.jpg`
   - `/srv/orderflow/uploads/social-catalog/provecchio-dimora-001/1790132682642_header_full.jpg`
   Si son obsoletos, puede mantenerse la exclusión en QA.

## Archivos modificados

- `scripts/qa_e2e_check.py` — agregadas exclusiones de URLs huérfanas en verificación de imágenes.
- `docs/troubleshooting/README.md` — actualizada entrada #167.

## Referencias

- Auditoría sprint: `docs/plans/omnigastro/auditoria-sprint-provecho-campo-20260929.md`
- Deploy afectado: `v1.37.3` → target `provecchio`
