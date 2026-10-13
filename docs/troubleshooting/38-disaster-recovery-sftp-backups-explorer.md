# 🛠️ Troubleshooting #38 — Disaster Recovery: Explorador SFTP & Consola de Restauración Multi-Tenant

**Estado:** ✅ Resuelto  
**Fecha:** 2026-08-15  
**Área:** Backend / Frontend / Backups / Disaster Recovery  
**Síntoma principal:** El módulo de respaldos únicamente abría un modal de parámetros SFTP sin posibilidad de consultar respaldos históricos, restaurar la base de datos o eliminar archivos remotos.

---

## 📋 Resumen

Para dotar a la plataforma OmniFlow SaaS de resiliencia de clase Enterprise, se implementó una **Consola Completa de Disaster Recovery & Exploración SFTP Remota** directamente accesible desde el panel de Super Admin y en la ruta de configuración del módulo de backups (`/admin/modules?module=backups`).

### Funcionalidades Añadidas:

1. **Nombre de Archivo por Tenant**:
   - Estructura: `orderflow_backup_{tenant_subdomain_o_nombre}_{timestamp}.sql`
   - Facilita la identificación clara de a qué comercio pertenece cada volcado.

2. **Explorador SFTP en Tiempo Real**:
   - Conexión dinámica por SFTP2 al directorio remoto (`/backups`).
   - Listado con nombre de archivo, fecha/hora de modificación y tamaño en MB.

3. **Restauración & Disaster Recovery (Despliegue)**:
   - Endpoint `POST /api/v1/backups/restore`.
   - Descarga temporal desde el servidor SFTP y ejecución con `pg_restore` para reconstruir la base de datos y restaurar el estado del tenant.

4. **Operación de Limpieza**:
   - Endpoint `POST /api/v1/backups/delete` para borrar respaldos del servidor remoto con confirmación de seguridad.

---

## 🧪 Verificación

1. **Backups Remotos**:
   ```bash
   curl -s -H "Authorization: Bearer <TOKEN>" https://pesallaccia.com/api/v1/backups/list?tenantId=gaia-wellness-001
   ```

2. **Restauración**:
   ```bash
   curl -s -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"filename":"orderflow_backup_gaia-wellness-001_2026-08-15T12-45-00-000Z.sql","tenantId":"gaia-wellness-001"}' \
     https://pesallaccia.com/api/v1/backups/restore
   ```

---

## 🔗 Referencias

- Contexto general: [docs/00-contexto-agentes.md](../00-contexto-agentes.md)
- Troubleshooting anterior de Schema Drift: [docs/troubleshooting/32-production-schema-drift-missing-migrations.md](32-production-schema-drift-missing-migrations.md)
