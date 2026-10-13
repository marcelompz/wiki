# Troubleshooting: `/api/v1/sync/customers` devuelve 404

## Síntoma
El frontend admin muestra error 404 al cargar clientes, dashboard, quotations, spa-dashboard y checkout.

## Causa Raíz
El backend refactorizó `SyncCustomersController` en `CustomersController` con ruta base `@Controller('api/v1/customers')`, pero el frontend seguía llamando a `/api/v1/sync/customers`.

Endpoints correctos:
- `GET /api/v1/customers` — listar clientes
- `POST /api/v1/customers/sync` — crear clientes masivos
- `GET /api/v1/customers/lookup/:taxId` — buscar en directorio global
- `GET /api/v1/customers/dnit/:documento` — consultar DNIT
- `GET /api/v1/customers/delete/:id` — eliminar cliente

## Solución
Actualizar todos los calls del frontend:
- `frontend/src/pages/admin/customers.tsx`
- `frontend/src/pages/admin/dashboard.tsx`
- `frontend/src/pages/admin/spa-dashboard.tsx`
- `frontend/src/pages/admin/quotations.tsx`
- `frontend/src/pages/checkout.tsx`
- `frontend/src/pages/checkout-simple.tsx`

Reemplazar `/api/v1/sync/customers` por `/api/v1/customers` y `/api/v1/sync/customers/sync` por `/api/v1/customers/sync`.

## Prevención
Mantener el contrato de API documentado en `docs/API_CONTRACT.md` y actualizar frontend y backend simultáneamente.
