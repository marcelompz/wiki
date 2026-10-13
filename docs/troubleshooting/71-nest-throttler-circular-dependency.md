# 🛠️ Troubleshooting #71: Crash en Bootstrap NestJS por Dependencia Circular en `THROTTLER:MODULE_OPTIONS`

> **Módulo:** Backend / NestJS / ThrottlerModule / Rate Limiting  
> **Ubicación:** `docs/troubleshooting/71-nest-throttler-circular-dependency.md`  
> **Fecha:** 26 de Agosto de 2026  
> **Estado:** ✅ Resuelto

---

## 📌 Síntomas
Al desplegar o arrancar la aplicación NestJS, el bootstrap se interrumpe inmediatamente después de registrar `CloudflareModule`:

```
[Nest] 1  - 08/26/2026, 11:36:16 PM   ERROR [ExceptionHandler] A circular dependency has been detected inside "THROTTLER:MODULE_OPTIONS". Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()". Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.
Error: A circular dependency has been detected inside "THROTTLER:MODULE_OPTIONS".
```

---

## 🔍 Causa Raíz
En `app.module.ts`, la registración de `ThrottlerModule` utilizaba la forma asíncrona `forRootAsync({ inject: [ThrottlerStorage], ... })` intentando inyectar `ThrottlerStorage` dentro de la fábrica de opciones.

Al resolverse el árbol de dependencias global de NestJS, la inyección del provider `THROTTLER:MODULE_OPTIONS` cerraba un ciclo bidireccional entre la fábrica de opciones y el almacenamiento de límites de peticiones.

---

## 🛠️ Solución Aplicada

Se reemplazó la registración asíncrona por la registración estática sincrónica en `backend/src/app.module.ts`:

```typescript
// ANTES (Causaba dependencia circular):
ThrottlerModule.forRootAsync({
  inject: [ThrottlerStorage],
  useFactory: (storage: ThrottlerStorage) => ({
    throttlers: [{ ttl: 60000, limit: 100 }],
    storage,
  }),
})

// DESPUÉS (Configuración estática limpia):
ThrottlerModule.forRoot([
  {
    ttl: 60000,
    limit: 100,
  },
])
```

---

## 🔒 Verificación
- El comando `npm run build` en `backend/` finaliza con código 0.
- El bootstrap de NestJS inicializa todos los módulos sin ninguna excepción de ciclo en `THROTTLER:MODULE_OPTIONS`.
