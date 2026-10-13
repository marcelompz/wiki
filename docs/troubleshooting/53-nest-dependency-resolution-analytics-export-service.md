# 🛠️ Resolución de 502 Bad Gateway — Nest ExceptionHandler: AnalyticsExportService Dependency Resolution

**Fecha:** 2026-08-22  
**Módulo / Área:** Backend / NestJS / Analytics / Documents  
**Severidad:** Alta (HTTP 502 Bad Gateway en `provecchio.com` tras deploy)  
**Estado:** ✅ **RESUELTO**

---

## 1. Descripción del Problema

Tras el despliegue de la versión v1.20.16 a Provecchio (`provecchio.com`), las peticiones a la API devolvían **HTTP 502 Bad Gateway**.

En los logs del contenedor Docker `orderflow-backend-prod`:
```text
ERROR [ExceptionHandler] Nest can't resolve dependencies of the AnalyticsExportService (?). 
Please make sure that the argument AnalyticsService at index [0] is available in the DocumentsModule context.

Potential solutions:
- Is DocumentsModule a valid NestJS module?
- If AnalyticsService is a provider, is it part of the current DocumentsModule?
- If AnalyticsService is exported from a separate @Module, is that module imported within DocumentsModule?
```

## 2. Causa Raíz

En `backend/src/documents/documents.module.ts`:
- `AnalyticsExportService` estaba declarado directamente en el arreglo `providers` de `DocumentsModule`.
- `AnalyticsExportService` requiere en su constructor `AnalyticsService`.
- `AnalyticsModule` no estaba importado en `DocumentsModule`, por lo que NestJS lanzaba un error fatal de resolución de dependencias durante el `InstanceLoader`, crasheando la aplicación NestJS e impidiendo que el backend iniciara (lo que provocaba HTTP 502 en Traefik).

## 3. Solución Aplicada

1. En `backend/src/analytics/analytics.module.ts`:
   - Exportar los servicios consumidos por otros módulos:
   ```typescript
   exports: [AnalyticsService, AnalyticsExportService, WopiService],
   ```

2. En `backend/src/documents/documents.module.ts`:
   - Importar `AnalyticsModule` usando `forwardRef(() => AnalyticsModule)` y remover la re-declaración duplicada de proveedores en `DocumentsModule`:
   ```typescript
   @Module({
     imports: [AnalyticsCacheModule, forwardRef(() => AnalyticsModule)],
     controllers: [DocumentsController],
     providers: [
       DocumentsService,
       WopiLockService,
       LocalFileSystemStorageAdapter,
     ],
     exports: [DocumentsService, WopiLockService, LocalFileSystemStorageAdapter],
   })
   export class DocumentsModule {}
   ```

3. Recompilar y verificar que `npm run build` en `backend/` complete limpiamente sin errores de inyección.
