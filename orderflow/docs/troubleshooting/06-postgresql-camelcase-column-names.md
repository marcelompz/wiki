# 🛠️ Troubleshooting #06: Nombres de Columnas en PostgreSQL (camelCase vs snake_case)

**Fecha:** 2026-07-28  
**Módulo / Área:** Backend / Prisma ORM / PostgreSQL  
**Severidad:** Media (Errores de sintaxis SQL al consultar metadatos o hacer migraciones manuales)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al ejecutar consultas SQL directas contra la base de datos de producción (por ejemplo, para inspeccionar `module_installations` o `tenants`), aparecen errores de sintaxis:

```text
ERROR: column "tenant_id" does not exist
LINE 1: SELECT ... tenant_id ... FROM module_installations ...
           ^
HINT:  Perhaps you meant to reference the column "module_installations.tenantId".
```

O bien:

```text
ERROR: column "installedat" of relation "module_installations" does not exist
LINE 1: ... "installedAt" ... ORDER BY installed_at ...
                                                      ^
HINT:  Perhaps you meant to reference the column "module_installations.installedAt".
```

Esto bloquea diagnósticos, backups manuales y migraciones ad-hoc en producción.

---

## 2. Análisis Técnico y Causa Raíz

OrderFlow usa **Prisma ORM** con la convención de nombres **camelCase** para columnas en PostgreSQL. Esto significa:

| Concepto | Nombre en Schema Prisma | Nombre real en PostgreSQL |
|----------|------------------------|---------------------------|
| Tenant ID | `tenantId` | `"tenantId"` (con comillas) |
| Module ID | `moduleId` | `"moduleId"` (con comillas) |
| Installed At | `installedAt` | `"installedAt"` (con comillas) |
| API Key | `apiKeySecret` | `"apiKeySecret"` (con comillas) |

PostgreSQL convierte automáticamente los identificadores sin comillas a **minúsculas** (`tenant_id`, `installedat`), que no existen en el esquema real de OrderFlow. Por eso cualquier consulta que use `tenant_id` o `installed_at` falla.

---

## 3. Solución Aplicada

### Regla 1: Usar comillas dobles en consultas SQL directas

Siempre que ejecutes SQL manual contra la base de datos, usa comillas dobles around camelCase column names:

```sql
-- Correcto
SELECT id, "tenantId", "moduleId", active, "installedAt", config
FROM module_installations
WHERE "moduleId" = 'whatsapp-catalog'
ORDER BY "updatedAt" DESC;

-- Incorrecto
SELECT tenant_id, module_id, installed_at
FROM module_installations;
```

### Regla 2: Descubrir columnas reales antes de escribir consultas

Si no estás seguro de los nombres de columnas, consulta `information_schema`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'module_installations'
ORDER BY ordinal_position;
```

### Regla 3: Usar `prisma migrate deploy` en producción

Para cambios de schema, **no ejecutes SQL DDL manual**. Usa el flujo de migraciones de Prisma:

```bash
cd /srv/orderflow
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend npx prisma migrate deploy
```

Esto garantiza que el schema de Prisma y la base de datos estén sincronizados sin errores de naming.

---

## 4. Ejemplos de Consultas Correctas

### module_installations

```sql
SELECT id, "tenantId", "moduleId", version, active, "installedAt", "updatedAt", config
FROM module_installations
WHERE "moduleId" = 'whatsapp-catalog'
ORDER BY "updatedAt" DESC
LIMIT 20;
```

### tenants

```sql
SELECT id, name, "apiKeySecret", active, subdomain, "createdAt"
FROM tenants
WHERE active = true
ORDER BY "createdAt" DESC;
```

### user_tenant_access

```sql
SELECT id, "userId", "tenantId", role, active
FROM user_tenant_access
WHERE "tenantId" = 'auto-repuestos-001';
```

---

## 5. Prevención

- Documentar en todo runbook/deploy script que OrderFlow usa **camelCase** en PostgreSQL.
- Preferir `prisma migrate deploy` antes que SQL manual para cualquier cambio de schema.
- Al crear nuevos servicios/scripts que consulten metadata de DB, usar `information_schema.columns` para descubrir nombres reales.
- En troubleshooting rápido, agregar `\d+ <tabla>` en `psql` para ver el esquema completo antes de escribir queries.

---

## 6. Comandos de Verificación Rápidos

```bash
# Ver columnas de cualquier tabla
docker compose -f docker-compose.prod.yml exec -T database psql -U orderflow -d orderflow_db \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = '<tabla>' ORDER BY ordinal_position;"

# Sincronizar schema con Prisma
ssh hetzner-orderflow "cd /srv/orderflow && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend npx prisma migrate deploy"
```

---

**Firma:** OrderFlow Engineering Team  
**Archivo:** `docs/troubleshooting/06-postgresql-camelcase-column-names.md`
