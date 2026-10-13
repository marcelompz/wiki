# 🛠️ Troubleshooting #28: Exceso de Conexiones en PostgreSQL (`FATAL: sorry, too many clients already`)

**Fecha:** 2026-08-06  
**Módulo / Área:** DevOps / PostgreSQL / Docker / Deploy Script  
**Severidad:** Alta (Causa errores 500/502 en el backend al agotar el pool de conexiones de PostgreSQL)  
**Estado:** ✅ **RESUELTO**

---

## 1. Síntomas

En los logs de la base de datos de producción (`orderflow-database-1`) aparecía repetidamente la siguiente falla fatal:

```text
2026-08-06 14:39:54.070 UTC [102117] FATAL: sorry, too many clients already
2026-08-06 14:40:00.048 UTC [102123] FATAL: sorry, too many clients already
2026-08-06 16:02:26.266 UTC [105964] LOG: could not receive data from client: Connection reset by peer
```

---

## 2. Diagnóstico Técnico y Causa Raíz

Al inspeccionar `pg_stat_activity` y los contenedores en ejecución con Docker inspect en Hetzner:

1. **Límite de `max_connections`**: El servidor PostgreSQL tiene configurado `max_connections = 100`.
2. **Fuga de Conexiones por Contenedores Efímeros Detenidos**: 
   - Durante cada despliegue con `./scripts/deploy-production.sh`, se ejecutaba `docker compose run --rm --entrypoint 'npx prisma migrate deploy' backend`.
   - Aunque la bandera `--rm` elimina el contenedor de la lista activa, si un despliegue previo o cancelación manual dejaba contenedores `backend-run-*` en estado detenido o dormido, las conexiones inactivas (*idle connections*) abiertas por Prisma no se cerraban inmediatamente, consumiendo entre 30 y 32 conexiones por cada contenedor residual.
   - En este caso, existían dos contenedores huérfanos (`orderflow-backend-run-c1bcf63c1245` y `orderflow-backend-run-cf6be30981bb`) acaparando **63 conexiones en estado `idle`**, dejando solo unas pocas disponibles para el servicio principal `orderflow-backend-prod` y saturando el límite de 100 conexiones.

---

## 3. Solución Aplicada

1. **Limpieza Inmediata de Contenedores Huérfanos**:
   Se eliminaron manualmente los contenedores residuales de migraciones en Hetzner:
   ```bash
   docker rm -f orderflow-backend-run-c1bcf63c1245 orderflow-backend-run-cf6be30981bb
   ```
   Esto redujo instantáneamente las conexiones activas en PostgreSQL de 97 a **29 conexiones** (exclusivas del backend activo).

2. **Automatización de Limpieza en `deploy-production.sh`**:
   Se añadió la instrucción `docker container prune -f` en el paso de finalización de [`deploy-production.sh`](file:///opt/orderflow/scripts/deploy-production.sh) para garantizar la remoción automática de cualquier contenedor detenido huérfano tras las migraciones de Prisma en cada deploy.

---

## 4. Verificación Post-Fix

Inspección de `pg_stat_activity` en producción:
```text
 max_connections 
-----------------
 100

 count | state  | client_addr 
-------+--------+-------------
     5 |        | 
     1 | active | 
    29 | idle   | 172.18.0.12 (orderflow-backend-prod)
```
La base de datos opera ahora con holgura (~29 de 100 conexiones consumidas).
