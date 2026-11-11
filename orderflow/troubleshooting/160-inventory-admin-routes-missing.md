# Troubleshooting #160: Admin Inventory Routes Missing (404 SPA)

> **Fecha:** 2026-10-04  
> **Módulo / Área:** Frontend / React Router  
> **Severidad:** Media  
> **Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Al navegar a `/admin/inventory/warehouses`, `/admin/inventory/locations`, `/admin/inventory/stock`, o `/admin/inventory/transfers` desde el navegador, la página mostraba **404 Not Found** (ruta no definida en React Router).

## 2. Causa Raíz

El `Sidebar.tsx` (líneas 40-43) incluía enlaces de navegación a estas rutas:
```tsx
{ key: '/admin/inventory/warehouses', label: 'Depósitos / Almacenes', ... },
{ key: '/admin/inventory/locations', label: 'Ubicaciones (Pasillos / Estantes)', ... },
{ key: '/admin/inventory/stock', label: 'Stock Actual & Existencias', ... },
{ key: '/admin/inventory/transfers', label: 'Movimientos & Kardex', ... },
```

Pero `AdminApp.tsx` no tenía los `<Route>` correspondientes para renderizar los componentes de página. Las páginas de inventario no existían.

## 3. Solución Aplicada

### Paso 1: Crear componentes de página

Se crearon 4 archivos nuevos siguiendo el patrón de otras páginas admin:

| Archivo | Componente | API Endpoints |
|---------|-----------|---------------|
| `frontend/src/pages/admin/warehouses.tsx` | `WarehousesPage` | GET/POST/PATCH `/api/v1/inventory/warehouses` |
| `frontend/src/pages/admin/locations.tsx` | `LocationsPage` | GET/POST `/api/v1/inventory/locations` |
| `frontend/src/pages/admin/stock.tsx` | `StockPage` | GET `/api/v1/inventory/quants` |
| `frontend/src/pages/admin/transfers.tsx` | `TransfersPage` | GET `/api/v1/inventory/moves/history`, POST `/api/v1/inventory/moves` |

### Paso 2: Registrar imports lazy en `AdminApp.tsx`

```tsx
const WarehousesPage = lazy(() => import("./pages/admin/warehouses").then(m => ({ default: m.WarehousesPage })));
const LocationsPage = lazy(() => import("./pages/admin/locations").then(m => ({ default: m.LocationsPage })));
const StockPage = lazy(() => import("./pages/admin/stock").then(m => ({ default: m.StockPage })));
const TransfersPage = lazy(() => import("./pages/admin/transfers").then(m => ({ default: m.TransfersPage })));
```

### Paso 3: Agregar routes en `AdminApp.tsx`

```tsx
<Route path="inventory/warehouses" element={<WarehousesPage />} />
<Route path="inventory/locations" element={<LocationsPage />} />
<Route path="inventory/stock" element={<StockPage />} />
<Route path="inventory/transfers" element={<TransfersPage />} />
```

## 4. Verificación

```bash
curl -sS -o /dev/null -w '%{http_code}' "http://provecchio.local/admin/inventory/warehouses"
# 200 (SPA shell HTML returned)

curl -sS -o /dev/null -w '%{http_code}' -H "x-api-key: sk_master_dyDtImtW39jXa7RroYjQgkro" "http://provecchio.local/api/v1/inventory/warehouses"
# 200 (API data returned)
```

---

**Archivo:** `docs/troubleshooting/160-inventory-admin-routes-missing.md`
