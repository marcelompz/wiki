# Troubleshooting: Aislamiento Multi-Tenant DB 100% & JwtAuthGuard Root Fix (FEAT-115)

## 📋 Síntoma / Problema

1. En tenants con nivel de aislamiento de base de datos dedicada (`isolationTier = DEDICATED`), las peticiones autenticadas vía JWT (POS, Admin Dashboard, KDS) continuaban usando la conexión Prisma compartida central (`this.prisma`) en lugar de la base de datos dedicada del cliente.
2. Existía un fallback hardcodeado de `JWT_SECRET` (`'orderflow-secret-key-change-in-production'`) en 4 archivos de infraestructura auth (`auth.module.ts`, `jwt-auth.guard.ts`, `auth.service.ts`, `api-key.guard.ts`).
3. Al agregar `@TenantPrisma() db?: PrismaClient` en controllers, algunos unit tests de controllers (`giveaways`, `loyalty`, `bookings`, `contacts`, `biolinks`) fallaron por aserciones `toHaveBeenCalledWith` que no esperaban el argumento opcional `undefined`.
4. El build de Docker (`npm run build`) falló inicialmente por errores de compilación TypeScript (`TS2304`, `TS7006`, `TS2345`, `TS2554`) en `social-catalog-admin.controller.ts`, `catalog.service.ts` y `bookings.service.ts`.

---

## 🔍 Causa Raíz

1. **JwtAuthGuard Incompleto:** `ApiKeyGuard` poseía la lógica para resolver `req.tenantPrisma` mediante `TenantResolutionService`, pero `JwtAuthGuard` solo seteaba `req.tenant` y `req.user`, omitiendo `req.tenantPrisma`. Por ello, cualquier decorador `@TenantPrisma()` caía al cliente Prisma compartido global en tráfico JWT.
2. **Hardcodeo de JWT_SECRET:** Fallback inseguro presente al instanciar `JwtModule` o verificar tokens si la variable de entorno `JWT_SECRET` no estaba definida.
3. **Firmas de Tests Incompatibles:** Los mocks de los unit tests de controllers evaluaban la firma exacta de llamadas a servicios (ej: `toHaveBeenCalledWith('tenant-1', data)`), pero al inyectar `@TenantPrisma() db?: PrismaClient`, los controllers pasaban `undefined` como último argumento al servicio.
4. **Errores de Compilación TypeScript en Docker Build:**
   - `social-catalog-admin.controller.ts`: Omisión de import de `PrismaService` y parámetros implícitos con tipo `any` en funciones lambda `.map()`, `.filter()`, `.flatMap()` y `$transaction()`.
   - `social-catalog.controller.ts`: Firma de `getCategoryTree` requería 4 argumentos (`tenantId`, `instanceKey`, `includeEmpty`, `db`), pero se le pasaban 3. `getActiveChannels` no aceptaba `db?: PrismaClient`.
   - `catalog.service.ts` y `bookings.service.ts`: Mapeo estricto de tipos de Pydantic/Prisma DTOs en `updateCategory` y `createBooking` que rechazaba propiedades extendidas (`isFeatured`, `seoTitle`, `checkedAt`, `conflicts`).

---

## 🛠️ Solución Aplicada

1. **Servicio Centralizado de Resolución de Tenant (`TenantResolutionService`):**
   - Inyección de `TenantResolutionService` tanto en `JwtAuthGuard` como en `ApiKeyGuard`.
   - Al validar la sesión JWT, `JwtAuthGuard` resuelve atómicamente la instancia `tenantPrisma` (DB dedicada o compartida) y la adjunta al objeto `Request`.

2. **Migración Completa de 19 Módulos de Dominio:**
   - Migración homogénea en controllers: `@TenantPrisma() db?: PrismaClient`
   - Migración homogénea en services: `private getDb(db?: PrismaClient) { return db || this.prisma; }`
   - Cobertura 100% en: `quotations`, `purchases`, `finances`, `saved-views`, `documents`, `inventory`, `contacts`, `biolinks`, `loyalty`, `giveaways`, `qr`, `social-catalog`, `tags`, `ribbons`, `catalog`, `analytics`, `bookings`, `customers`, `products`.

3. **Guardia de Arquitectura Anti-Regresión (`backend/src/common/architecture.spec.ts`):**
   - Creación de test automatizado en Jest que escanea `backend/src/` para garantizar 0 accesos directos desaprobados a `this.prisma.` en los 19 módulos de dominio.

4. **Fail-Fast Security & JWT_SECRET:**
   - Creación de `getRequiredEnv('JWT_SECRET')` que hace fallar el arranque de la aplicación de inmediato (`fail-fast`) si no existe la variable de entorno configurada.

5. **Corrección de Tipos y Tests Unitarios:**
   - Corrección de imports y typings en `social-catalog-admin.controller.ts`, `social-catalog.controller.ts`, `social-catalog.service.ts`, `catalog.service.ts` y `bookings.service.ts`.
   - Actualización de aserciones `toHaveBeenCalledWith(..., undefined)` en los unit tests de controllers.

---

## ✅ Verificación de Éxito

- **Suite de Pruebas Unitaria (Jest):** `114/114` Test Suites PASS (`790/790` tests passing).
- **Test de Arquitectura:** `PASS src/common/architecture.spec.ts` (0 violaciones de aislamiento).
- **Compilación NestJS Local & Docker Production Build:** `npm run build` ejecutado con éxito.
- **Sincronización:** Repositorios git actualizados y sincronizados con la Wiki oficial (`/opt/wiki/orderflow/`).
