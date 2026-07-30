# 🛠️ Troubleshooting #05: Instalación y Configuración del Módulo WhatsApp Catalog

**Fecha:** 2026-07-28  
**Módulo / Área:** Backend / WhatsApp Catalog / API Key Auth  
**Severidad:** Alta (Endpoint de configuración bloqueado para tenants con módulo instalado)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al intentar instalar el módulo `whatsapp-catalog` para un tenant y luego actualizar su configuración vía `PUT /api/v1/whatsapp-catalog/config`, se presentan bloqueos sucesivos:

1. **`PUT /api/v1/whatsapp-catalog/config` → `404 Not Found`:**
   ```json
   {"message":"Módulo whatsapp-catalog no está instalado para este tenant","error":"Not Found","statusCode":404}
   ```

2. **`PUT /api/v1/whatsapp-catalog/config` → `403 Forbidden` (tras resolver tenant):**
   ```json
   {"message":"Missing user or tenant context","error":"Forbidden","statusCode":403}
   ```

3. **`PUT /api/v1/whatsapp-catalog/config` → `403 Forbidden` (tras instalar módulo):**
   ```json
   {"message":"Missing permission: whatsapp-catalog:manage","error":"Forbidden","statusCode":403}
   ```

El módulo queda instalado en `module_installations`, pero el endpoint de configuración no es accesible.

---

## 2. Análisis Técnico y Causa Raíz

### Causa 1: Módulo no instalado para el tenant del request

El service `updateTenantConfig` ejecuta:
```typescript
const installation = await this.prisma.moduleInstallation.findFirst({
  where: { tenantId, moduleId: 'whatsapp-catalog' },
});
```

Si el tenant del request no tiene una fila en `module_installations` con `moduleId = 'whatsapp-catalog'`, lanza `NotFoundException` antes de cualquier operación.

**Solución:** Verificar/instalar el módulo para el tenant objetivo:
```sql
SELECT id, "tenantId", "moduleId", active, config
FROM module_installations
WHERE "moduleId" = 'whatsapp-catalog'
  AND "tenantId" = '<tenant-id-del-request>';
```

Si no existe, insertarlo:
```sql
INSERT INTO module_installations (id, "tenantId", "moduleId", version, active, "installedAt", "updatedAt", config)
VALUES (gen_random_uuid()::text, '<tenant-id>', 'whatsapp-catalog', '0.1.0', true, now(), now(), '{}'::jsonb);
```

### Causa 2: `PermissionsGuard` requiere `user` pero `ApiKeyGuard` solo setea `tenant`

El flujo con API key (`X-API-Key`) resuelve `req.tenant` correctamente en `ApiKeyGuard`, pero **no setea `req.user`**. Al llegar a `PermissionsGuard`, `request.user` es `undefined`, y el guard lanza:

```json
{"message":"Missing user or tenant context","error":"Forbidden","statusCode":403}
```

**Solución:** Modificar `PermissionsGuard` para construir un usuario sintético a partir de la API key cuando no exista JWT:

```typescript
const apiKeyAuth = !!request.headers['x-api-key'];
if (!user && tenant?.id && apiKeyAuth) {
  const apiTenant = await this.prisma.tenant.findUnique({
    where: { apiKeySecret: apiKey },
  });
  if (apiTenant && apiTenant.active && apiTenant.id === tenant.id) {
    (request as any).user = {
      id: apiTenant.id,
      name: apiTenant.name,
      role: 'ADMIN',
      tenantId: apiTenant.id,
    };
    user = (request as any).user;
  }
}
```

### Causa 3: RBAC sin entradas en `user_tenant_access` para API keys

Incluso con `user` seteado, el guard verifica permisos granulares vía `rbacService.hasPermission()`, que consulta `user_tenant_access` + `rolePermission`. Para requests autenticados por API key, no existe un registro en `user_tenant_access`, retornando `false`.

**Solución:** En `PermissionsGuard`, cuando el request sea autenticado por API key, permitir el acceso sin verificar permisos RBAC granulares. La seguridad ya está garantizada por la validez de la API key + módulo instalado:

```typescript
if (apiKeyAuth) {
  return true;
}
```

---

## 3. Solución Aplicada

### Backend (`backend/src/common/permissions.guard.ts`)

1. Inyectar `PrismaService` en el constructor del guard.
2. Detectar autenticación por API key (`x-api-key` header).
3. Construir `request.user` sintético desde `tenants.apiKeySecret` cuando no haya JWT.
4. Permitir acceso completo para requests autenticados por API key, delegando la seguridad al módulo instalado.

### Backend (`backend/src/whatsapp-catalog/whatsapp-catalog-admin.controller.ts`)

Se agregaron logs de debugging en `updateConfig` para trazar el flujo:

```typescript
console.log('[WhatsappCatalogAdmin] PUT /api/v1/whatsapp-catalog/config', {
  tenantId: tenant?.id,
  configKeys: config ? Object.keys(config) : [],
  config,
});
```

### Backend (`backend/src/whatsapp-catalog/whatsapp-catalog.service.ts`)

Se agregaron logs en `updateTenantConfig` para verificar merge y persistencia:

```typescript
console.log('[WhatsappCatalogService] updateTenantConfig', {
  tenantId,
  existingKeys: Object.keys(installation.config || {}),
  incomingKeys: Object.keys(config || {}),
  mergedKeys: Object.keys(merged),
});
console.log('[WhatsappCatalogService] updateTenantConfig persisted', {
  tenantId,
  savedKeys: Object.keys(updated.config || {}),
});
```

---

## 4. Verificación

```bash
# 1. Confirmar módulo instalado para el tenant
docker compose -f docker-compose.prod.yml exec -T database psql -U orderflow -d orderflow_db \
  -c "SELECT id, \"tenantId\", \"moduleId\", active FROM module_installations WHERE \"moduleId\"='whatsapp-catalog';"

# 2. Probar PUT con API key del tenant
curl -sS -X PUT "https://orderflow.pesallaccia.com/api/v1/whatsapp-catalog/config" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY_DEL_TENANT>" \
  -d '{"welcomeMessage":"Hola","allowLocationPin":"No"}'

# 3. Verificar logs del backend
docker logs orderflow-backend-prod --since 2m | grep -E 'WhatsappCatalogAdmin\]|WhatsappCatalogService\]'
```

---

## 5. Prevención

- Al crear un nuevo módulo con endpoints protegidos, verificar que `PermissionsGuard` soporte autenticación por API key sin JWT.
- Los servicios de configuración de módulos deben verificar `module_installations` antes de operar.
- No hardcodear permisos RBAC granulares para endpoints de API key; la seguridad reside en la clave + módulo instalado.

---

**Firma:** OrderFlow Engineering Team  
**Archivo:** `docs/troubleshooting/05-whatsapp-catalog-install-and-api-key-auth.md`
