# Troubleshooting #79 — Excepción HTTP 500 en GET /api/v1/catalog/categories por Invocación Directa de Prisma no Inyectado en Controlador

## 📋 Síntoma
En consola del navegador se registraba:
`Error loading categories: AxiosError: Request failed with status code 500`
`GET https://pesallaccia.com/api/v1/catalog/categories?includeChildren=false&limit=500&active=true 500`

## 🔍 Causa Raíz
Inspección de logs de producción (`docker compose logs backend`):
`TypeError: Cannot read properties of undefined (reading 'product') at CatalogController.autoSyncCategoriesFromProducts (/app/dist/src/catalog/catalog.controller.js:43:39)`
El controlador `CatalogController` llamaba internamente a `autoSyncCategoriesFromProducts` pasando `prisma` extraído dinámicamente de `this.catalogService['prisma']`. Sin embargo, `CatalogController` no inyecta `PrismaService` en su constructor, resultando en un objeto no inicializado que fallaba al leer `.product`.

## 🛠️ Solución Aplicada
1. Se encapsuló `autoSyncCategoriesFromProducts` dentro de `CatalogService` (`catalog.service.ts`), donde `this.prisma` está inyectado directamente por NestJS.
2. Se agregaron salvaguardas defensivas `try/catch` para que cualquier advertencia no fatal en auto-sincronización no interrumpa la respuesta HTTP de categorías.
3. Se actualizó `CatalogController` para invocar `await this.catalogService.autoSyncCategoriesFromProducts(tenant.id, prisma)`.
4. Compilado y desplegado en release **`v1.20.56`**.
