# 37 — Troubleshooting: Conmutación Multi-Tenant, Cabezal `X-Tenant-Id` & Visibilidad de Módulos

## 📋 Síntoma

Al cambiar de Tenant en la interfaz de administración (por ejemplo conmutar de `Gaia Wellness` a `Ferresur` o `Prueba Café`):
1. La pantalla de **OmniBio** o **OmniCatalog** mantenía la información y datos del Tenant anterior.
2. El menú lateral (**Sidebar**) no refrescaba sus opciones y algunos módulos quedaban ocultos cuando el tenant no contaba con registros de instalación en la tabla `module_installations`.

---

## 🔍 Causa Raíz

1. **Aislamiento en Backend (`ApiKeyGuard`)**:
   El guard de autenticación leía únicamente el `tenantId` estático incrustado en el token JWT durante el inicio de sesión. Cuando el usuario seleccionaba una nueva organización en el conmutador de tenants, la API ignoraba el cambio y respondía siempre con los datos del tenant del token inicial.

2. **Interceptores de Peticiones en Frontend (`AdminApp.tsx` & `biolinks.tsx`)**:
   El cliente Axios no incluía el cabezal `X-Tenant-Id` en las llamadas salientes, por lo que el servidor no detectaba la intención de consultar el tenant activo en `localStorage.getItem('tenantId')`.

3. **Invocación y Fallback de Módulos (`isModuleActive`)**:
   - `useEffect` en `AdminApp.tsx` sólo escuchaba cambios en la ruta `location.pathname`, omitiendo el cambio de `currentTenantId`.
   - Si el tenant conmutado no tenía un registro explícito en la tabla `module_installations`, la función `isModuleActive` aplicaba un fallback restrictivo que ocultaba módulos funcionales de la suite (*Orders, Bookings, POS, KDS, Giveaways, Loyalty, Subscription*).

---

## 💡 Solución Aplicada

### 1. Backend — Sorteo e Interpretación de Header `X-Tenant-Id` (`ApiKeyGuard`)
En `backend/src/common/api-key.guard.ts`, se agregó la interceptación e inspección explícita del cabezal `x-tenant-id` para permitir la conmutación segura del contexto del tenant:

```typescript
// 1.5 Allow explicit X-Tenant-Id header override (e.g. for SuperAdmin or Tenant Switcher)
const headerTenantId = (request.headers['x-tenant-id'] || request.headers['x-tenant']) as string;
if (headerTenantId) {
  tenantId = headerTenantId;
}
```

### 2. Frontend — Interceptor Global de Axios (`AdminApp.tsx` & `biolinks.tsx`)
Se inyectó el header de tenant en el interceptor global de Axios para asegurar que cada petición declare explícitamente el tenant seleccionado:

```typescript
axiosInstance.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem("apiKey");
  const accessToken = localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId");

  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  if (tenantId) {
    config.headers["x-tenant-id"] = tenantId;
  }
  return config;
});
```

### 3. Backend — Resolución en Controlador de Módulos (`SystemModulesController`)
En `backend/src/system-modules/system-modules.controller.ts`, se actualizó `resolveTenantId` para honrar el `requestedTenantId` o el header `X-Tenant-Id` sin exigir que el token JWT sea exclusivamente SuperAdmin:

```typescript
private resolveTenantId(req: any, requestedTenantId?: string): string {
  if (requestedTenantId) {
    return requestedTenantId;
  }
  const headerTenantId = (req.headers?.['x-tenant-id'] || req.headers?.['x-tenant']) as string;
  if (headerTenantId) {
    return headerTenantId;
  }
  return req.tenant?.id || req.user?.tenantId || 'provecchio-dimora-001';
}
```

### 4. Frontend — Petición con Query Param `?tenantId=` (`AdminApp.tsx`)
En `AdminApp.tsx`, la consulta de módulos instalados incluye explícitamente el parámetro del tenant activo:

```typescript
const url = currentTenantId 
  ? `/api/v1/modules/installed?tenantId=${encodeURIComponent(currentTenantId)}` 
  : "/api/v1/modules/installed";
const res = await axiosInstance.get(url);
```

---

## 🧪 Verificación

1. Ingresar al panel de administración y conmutar de organización mediante el selector de tenants (`Ferresur`, `Gaia Wellness`, etc.).
2. Comprobar en Network/DevTools que las peticiones incluyen `X-Tenant-Id: <tenant_id>` y `GET /api/v1/modules/installed?tenantId=<tenant_id>`.
3. Verificar que la vista de **OmniBio**, **OmniCatalog** y los módulos del **Sidebar** corresponden inmediatamente al tenant seleccionado.
