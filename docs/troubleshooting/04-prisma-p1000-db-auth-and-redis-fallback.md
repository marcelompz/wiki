# 🛠️ Guía de Troubleshooting #04: Diagnóstico de Fallos de Conexión a Base de Datos (P1000) y Autenticación Redis / Socket.io

> **Módulo:** Backend NestJS / Prisma ORM / Redis / PostgreSQL 15  
> **Ámbito:** Producción & Staging (Docker Compose / Hetzner VPS)  
> **Fecha de registro:** 2026-07-26  
> **Versión de referencia:** v1.1.0+ / v1.2.0-dev

---

## 1. Incidencia #1: Error Prisma P1000 — Fallo de Autenticación contra PostgreSQL en Docker

### 🚨 Síntoma
- Las peticiones del frontend o login responden con **`HTTP 502 Bad Gateway`**.
- El contenedor `orderflow-backend-prod` entra en bucle de reinicio (`Restarting (1) X seconds ago`).
- Los logs del contenedor (`docker logs orderflow-backend-prod`) muestran la excepción:
  ```text
  PrismaClientInitializationError: Authentication failed against database server at `database`, the provided database credentials for `orderflow` are not valid (errorCode: P1000).
  ```

### 🔍 Causa Raíz
PostgreSQL en Docker inicializa el usuario y contraseña (`POSTGRES_USER` / `POSTGRES_PASSWORD`) **únicamente la primera vez** que se crea el volumen persistente `postgres_data`. 

Si posteriormente se rota la clave en el archivo de entorno `.env.production` o se actualiza la variable `DATABASE_URL` sin modificar el usuario existente en PostgreSQL, el cliente de Prisma falla al intentar conectar (`P1000`), provocando el colapso del proceso Node.js.

---

### 🛠️ Solución & Mejores Prácticas

#### Opción A: Actualización de Contraseña en PostgreSQL en Caliente (Recomendado — Preserva Datos)
Ejecutar en la terminal del servidor VPS para sincronizar la nueva clave definida en `.env.production` con el usuario dentro de PostgreSQL:

```bash
# 1. Cargar las variables de entorno de producción
source .env.production

# 2. Alterar la contraseña del usuario diretamente en PostgreSQL
docker compose -f docker-compose.prod.yml exec -T database psql -U ${POSTGRES_USER:-orderflow} -d postgres -c "ALTER USER ${POSTGRES_USER:-orderflow} WITH PASSWORD '${POSTGRES_PASSWORD}';"

# 3. Reiniciar el contenedor backend
docker compose -f docker-compose.prod.yml restart backend
```

#### Opción B: Reinicio Completo del Volumen Persistente (Solo para Entornos de Test/Staging)
```bash
docker compose -f docker-compose.prod.yml down -v
./scripts/deploy-production.sh
```

---

## 2. Incidencia #2: Fallo de Autenticación Redis (`WRONGPASS`) en Adaptador WebSockets

### 🚨 Síntoma
- Excepción en logs del backend: `ReplyError: WRONGPASS invalid username-password pair or user is disabled.`
- El adaptador `ioredis` para Socket.io reintenta indefinidamente en segundo plano, tumbando la aplicación.

### 🔍 Causa Raíz
Si la clave `REDIS_PASSWORD` de Redis difiere entre el contenedor Redis y la URL `REDIS_URL` inyectada al backend, la librería `ioredis` inicia un bucle de reconexión sin fin.

---

### 🛠️ Solución Implementada
En [backend/src/common/redis-io.adapter.ts](file:///opt/orderflow/backend/src/common/redis-io.adapter.ts), se implementó:
1. `retryStrategy: () => null`: Desactiva los reintentos infinitos en segundo plano ante errores de contraseña.
2. `ENABLE_REDIS_WS`: Bandera en [backend/src/main.ts](file:///opt/orderflow/backend/src/main.ts) que permite utilizar el adaptador nativo en memoria (*In-Memory Adapter*) de Socket.io de forma ultra-estable cuando no se requiere escalado multinodo en Redis.

---

## 📋 Resumen de Comprobaciones Rápidas

```bash
# Verificar estado de salud de todos los contenedores
docker compose -f docker-compose.prod.yml ps

# Inspeccionar logs en vivo del backend
docker logs orderflow-backend-prod -f --tail 100
```
