# Troubleshooting #165 — Pérdida de uploads de tenant tras deploy/reinicio

- **Fecha:** 2026-09-28
- **Área:** Infraestructura / Docker / Uploads / Deploy
- **Síntoma:** Luego de un deploy o reinicio, las imágenes del tenant (`/uploads/social-catalog/<tenantId>/`, logo, fondos de categoría, etc.) no se sirven y el volumen `orderflow_uploads_data` aparece vacío o sin la carpeta del tenant.
- **Causa raíz:** El deploy script ejecuta `docker volume prune -f` y `docker compose rm -f -s` + `up -d --remove-orphans`. Aunque el volumen `uploads_data` está declarado en `docker-compose.prod.yml`, durante ventanas de redeploy puede quedar temporalmente sin contenedor referenciado y, en combinación con `--delete` en rsync, puede perderse sincronización o contenido si el host no persiste correctamente el bind/volume.
- **Archivos afectados:**
  - `scripts/deploy-production.sh`
  - `docker-compose.prod.yml`
  - `backend/src/backups/backups.service.ts`
- **Solución aplicada:**
  1. Excluir `uploads_data` del prune:
     ```bash
     docker volume prune -f --filter 'label!=com.docker.compose.volume=uploads_data'
     ```
  2. Backup automático del volumen antes de cada deploy en `backups/uploads_backup_<timestamp>.tar.gz`.
  3. El módulo de backups (`/admin/modules?module=backups`) ahora genera artifacts `.tar.gz` que combinan:
     - Dump de PostgreSQL (`pg_dump` custom format)
     - Filestore del tenant (`uploads/social-catalog/<tenantId>/`)
  4. Endpoint estandarizado de restore en `POST /api/v1/backups/restore`, que restaura DB y filestore desde el mismo artifact.
- **Prevención:**
  - Nunca ejecutar `docker volume prune -f` sin excluir volúmenes de datos de clientes.
  - Verificar que el volumen existe antes de deploy: `docker volume ls | grep uploads_data`.
  - Usar el módulo de backups para generar artifacts completos antes de migraciones/DR.
  - Restaurar desde backup completo (DB + filestore) en caso de pérdida.
