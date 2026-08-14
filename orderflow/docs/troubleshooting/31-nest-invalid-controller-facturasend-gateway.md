# 🛠️ Troubleshooting — FacturasendGateway Registrado como Controller en NestJS

**Fecha:** 2026-08-11  
**Módulo / Área:** Backend / NestJS / Facturasend / Deploy  
**Severidad:** Alta (HTTP 502 Bad Gateway en backend tras deploy en producción)  
**Estado:** ✅ **RESUELTO**  

---

## 1. Síntomas

Al desplegar una actualización en el entorno de producción (ej. `provecchio`), la verificación de salud del backend falla tras 60 segundos (`Backend health check failed after 60s`).
Las peticiones HTTP públicas (ej. `https://provecchio.com/api/v1/health`) retornan **HTTP 502 Bad Gateway** generado por Traefik/Cloudflare.

Al revisar los contenedores en el host remoto (`docker ps`), el contenedor `orderflow-backend-prod` se encuentra en estado de reinicio continuo (`Up X seconds (health: starting)` o `Restarting`).

## 2. Causa Raíz

En los logs del contenedor backend (`docker logs orderflow-backend-prod`), se observa la siguiente excepción al intentar arrancar NestJS:

```text
/app/node_modules/@nestjs/core/router/router-explorer.js:54
            throw new unknown_request_mapping_exception_1.UnknownRequestMappingException(metatype);
                  ^

UnknownRequestMappingException [Error]: An invalid controller has been detected. "FacturasendGateway" does not have the @Controller() decorator but it is being listed in the "controllers" array of some module.
    at RouterExplorer.extractRouterPath (/app/node_modules/@nestjs/core/router/router-explorer.js:54:19)
    at /app/node_modules/@nestjs/core/router/routes-resolver.js:39:53
```

El Gateway de WebSockets `FacturasendGateway` (decorado con `@WebSocketGateway()`) fue registrado erróneamente en el arreglo `controllers: [...]` del archivo `backend/src/integrations/facturasend/facturasend.module.ts`. NestJS exige que todos los elementos en `controllers` tengan la anotación `@Controller()`, por lo que abortaba el arranque del proceso Node.js de inmediato.

## 3. Solución Aplicada

1. **Remoción de `FacturasendGateway` de `controllers`**:  
   En `backend/src/integrations/facturasend/facturasend.module.ts`, se eliminó `FacturasendGateway` del arreglo `controllers`, manteniéndolo únicamente en `providers`.

   ```typescript
   @Module({
     controllers: [FacturasendController],
     providers: [
       FacturasendService,
       FacturasendAuthService,
       FacturasendClient,
       FacturasendMapper,
       FacturasendLocationService,
       FacturasendGateway,
       PrismaService,
     ],
     exports: [FacturasendService, FacturasendMapper],
   })
   export class FacturasendModule {}
   ```

2. **Corrección de firmas e interfaces auxiliares**:
   - Se añadió el método `toDeFromDirect` en `FacturasendMapper` para mapear llamadas directas.
   - Se actualizó el parámetro `orderId: string | null` en `persistElectronicDocument` de `FacturasendService`.

## 4. Verificación

- Se ejecutó `./scripts/init.sh` asegurando compilación limpia del backend NestJS (`nest build`) y paso de la suite completa de unit tests (`jest`).
- Al desplegar la nueva imagen a producción, `orderflow-backend-prod` arrancó limpiamente registrando sus rutas sin lanzar `UnknownRequestMappingException`.

---

**Archivos Afectados:**
- `backend/src/integrations/facturasend/facturasend.module.ts`
- `backend/src/integrations/facturasend/facturasend.service.ts`
- `backend/src/integrations/facturasend/facturasend.mapper.ts`
