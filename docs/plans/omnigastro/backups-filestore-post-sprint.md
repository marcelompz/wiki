# Plan Post-Sprint: Módulo de Backups con Filestore y Restore Estructurado

**Objetivo:** Extender el módulo de backups actual para generar artifacts completos (DB + filestore) y contar con un proceso de restauración estandarizado para migraciones/DR.

**Contexto:** 
- El módulo actual (`backend/src/backups/backups.service.ts`) genera backups de PostgreSQL vía `pg_dump` y los sube a SFTP.
- No incluye el filestore de uploads del tenant.
- El restore actual solo restaura la base de datos.
- Existe riesgo de pérdida de uploads al no tener backups del filestore.

**Alcance:**
1. Backup completo: `.tar.gz` con dump PostgreSQL + filestore del tenant.
2. Endpoint de restore que restaure DB y filestore desde el mismo artifact.
3. Documentación de restore estandarizado para DR/migración.

**Fuera de scope (post plan):**
- App Android para mozo.
- Fixes de UI/UX del modal de llamada al mozo.

**Criterios de éxito:**
- Backup generado incluye DB + filestore en un solo archivo.
- Restore exitoso desde el artifact completo.
- Documentación de procedimiento de restore publicada.

---

## Tareas

### T1 — Backup completo con filestore
- Modificar `createAndUploadBackup` en `backups.service.ts`:
  - Generar dump PostgreSQL con `pg_dump -F c`.
  - Empaquetar dump + `uploads/social-catalog/<tenantId>/` en `.tar.gz`.
  - Subir el `.tar.gz` a SFTP.
- Actualizar naming: `orderflow_backup_<tenant>_<timestamp>.tar.gz`.

### T2 — Restore estructurado
- Modificar `restoreBackupFromFile` en `backups.service.ts`:
  - Descargar `.tar.gz` desde SFTP.
  - Extraer dump SQL y directorio de uploads.
  - Restaurar DB con `pg_restore`.
  - Restaurar filestore en `/app/uploads/social-catalog/<tenantId>/`.
- Manejar casos: backup sin filestore, restore parcial.

### T3 — Endpoints de backup/restore
- Verificar endpoints existentes:
  - `POST /api/v1/backups/trigger`
  - `POST /api/v1/backups/restore`
  - `GET /api/v1/backups/list`
- Actualizar documentación Swagger si es necesario.

### T4 — Documentación
- Actualizar `docs/backups.md` con procedimiento de backup/restore completo.
- Crear `docs/guides/BACKUP_RESTORE.md` si no existe.
- Documentar procedimiento de DR/migración de servidor.

---

## Archivos afectados
- `backend/src/backups/backups.service.ts`
- `backend/src/backups/backups.controller.ts` (posible update)
- `docs/backups.md`
- `docs/guides/BACKUP_RESTORE.md` (nuevo)
- `docs/troubleshooting/165-uploads-volume-loss-on-deploy.md` (update)

## Timeline estimado
| Tarea | Duración |
|-------|----------|
| T1 — Backup con filestore | 2h |
| T2 — Restore estructurado | 2h |
| T3 — Endpoints | 30min |
| T4 — Documentación | 1h |
| **Total** | **~5.5h** |
