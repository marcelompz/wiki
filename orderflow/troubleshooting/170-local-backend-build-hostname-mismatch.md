# 170 — Backend Local Fuera de Docker: Hostname `postgres` vs `localhost`

| Área | Síntoma principal | Estado |
|------|-------------------|--------|
| DevOps / Docker / Local Deploy | Backend compilado localmente no arranca: `PrismaClientInitializationError: Can't reach database server at postgres:5432` | ✅ Resuelto |

## Síntoma
Al correr el backend compilado localmente (`node dist/src/main`) para pruebas rápidas sin Docker, el proceso cae inmediatamente con:

```
PrismaClientInitializationError: Can't reach database server at `postgres:5432`
    at t (/opt/orderflow/backend/node_modules/@prisma/client/runtime/library.js:112:2488)
    at async Proxy.onModuleInit (/opt/orderflow/backend/dist/src/common/prisma.service.js:14:9)
```

## Causa Raíz
El `DATABASE_URL` en `.env.local` apunta a `localhost:5433` (puerto expuesto del contenedor PostgreSQL), pero el cliente Prisma configurado en el contenedor Docker usa el hostname `postgres:5432` (nombre del servicio Docker). Cuando el backend se ejecuta **fuera** del contenedor Docker, no puede resolver el hostname `postgres` y falla.

## Solución Aplicada
1. **No correr el backend fuera de Docker para pruebas locales.** Usar siempre `docker compose up -d` o `docker compose up --build -d` para que el backend esté en la misma red que PostgreSQL.
2. Si es estrictamente necesario correr el backend localmente, cambiar `DATABASE_URL` a `postgresql://orderflow:PASSWORD@localhost:5433/orderflow_db` (usando el puerto expuesto).
3. Para despliegues de producción, el backend siempre se ejecuta dentro de Docker, por lo que el hostname `postgres` es correcto.

## Lección Aprendida
- El backend está configurado para ejecutarse dentro del contenedo Docker donde el hostname `postgres` es resoluble por el DNS interno de Docker.
- Los health checks locales deben hacerse contra `http://localhost:3000/api/v1/health` después de `docker compose up -d`, no contra el backend compilado directamente con `node`.