# Troubleshooting 153: Social Catalog Search No Funciona

## 🎯 Síntoma
Usuario reporta: "El buscador de social-catalog no funciona". Afecta tanto la página pública (`/social-catalog` o `/omni-catalog`) como la admin (`/admin/social-catalog`).

## 🔍 Investigación
- **Público**: Búsqueda es client-side (filtering en `omni-catalog.tsx` líneas 515-558). Productos cargan correctamente (respuesta ~100KB de `/api/v1/public/social-catalog/products`). Si filtros no funcionan, puede ser un bug de JS en el frontend.
- **Admin**: Búsqueda es server-side (`/api/v1/admin/social-catalog/products?search=xxx`). Endpoint requiere permiso `social-catalog:read`.
- **Backend**: Endpoint `/api/v1/social-catalog/products` responde 404 (URL incorrecta - debería ser `/api/v1/public/social-catalog/products`).
- **Backend** `getCatalogProducts()` en `social-catalog.service.ts` línea 660: maneja `query.search` correctamente con Prisma OR conditions.

## 🛠️ Diagnóstico Necesario
1. Verificar si el problema es en el frontend (error JS al filtrar)
2. Verificar si el problema es en el backend (permisos, conexión DB)
3. Verificar si el problema es de permisos (permisos `social-catalog:read` existentes en DB)

## 📋 Estado
🔬 En investigación
