# CIRCULAR DEPENDENCY EN THROTTLER:MODULE_OPTIONS

## Descripción

Error fatal en el startup del backend NestJS:

```
A circular dependency has been detected inside "THROTTLER:MODULE_OPTIONS".
Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()".
Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.
```

## Error en los logs

```
[Nest] 1  - 08/26/2026, 9:06:25 PM   ERROR [ExceptionHandler] A circular dependency has been detected inside "THROTTLER:MODULE_OPTIONS".
Error: A circular dependency has been detected inside "THROTTLER:MODULE_OPTIONS".
    at Injector.loadInstance (/app/node_modules/@nestjs/core/injector/injector.js:43:23)
    at Injector.loadProvider (/app/node_modules/@nestjs/core/injector/injector.js:98:20)
    ...
```

## Causa Raíz

El módulo `ThrottlerModule.forRootAsync()` en `AppModule` tiene una dependencia circular con otros módulos cargados simultáneamente (en este proyecto hay 23 módulos registrados). NestJS no puede resolver la instancia porque las funciones no pueden ser llamadas más de una vez en el ciclo de inicialización del injector.

## Solución Aplicada

En el archivo `src/app.module.ts`, envolver el `ThrottlerModule.forRootAsync()` con `forwardRef()`:

```typescript
import { forwardRef } from '@nestjs/common';

// En el @Module({
  ThrottlerModule.forRootAsync(forwardRef(() => ({
    inject: [ThrottlerStorage],
    useFactory: (storage: ThrottlerStorage) => ({
      throttlers: [{ ttl: 60000, limit: 100 }],
      storage,
    }),
  })),
}),
```

## Archivos Modificados

- `src/app.module.ts` - Agregado `forwardRef()` wrap en `ThrottlerModule.forRootAsync()`

## Preventivo

- Evitar crear proveedores circulares en el injector a nivel de módulo
- Revisar el orden de imports de módulos si se agregan nuevos módulos
- Usar `forwardRef()` siempre que se detecten relaciones bidireccionales entre proveedores

## Verificación

Después del fix, el backend debe iniciar sin errores y el container dejará de estar en `Restarting (1)` estado:

```bash
$ docker compose ps
NAME                          IMAGE                    COMMAND                  SERVICE        STATUS
orderflow-backend-prod        orderflow-backend        "/entrypoint.sh"         backend        Up 10 minutes (healthy)
```