# 🛠️ Guía de Troubleshooting #51: AnalyticsCacheService Redis Connection Failure

> **Módulo:** Backend NestJS / Analytics / Redis / Docker Compose  
> **Ámbito:** Producción (Provecchio / Hetzner)  
> **Fecha de registro:** 2026-08-22  
> **Versión de referencia:** v1.20.15+

---

## 🚨 Síntoma

- Backend arranca pero logs muestran bucle infinito:
  ```
  ERROR [AnalyticsCacheService] Redis connection error in AnalyticsCacheService
  ERROR [AnalyticsCacheService] AggregateError
  ```
- Backend `healthy` pero `AnalyticsCacheService` no conecta a Redis.
- Log: `Analytics Cache initialized on Redis localhost:6379` (debería ser `redis:6379`).

---

## 🔍 Causa Raíz

**Tres factores combinados:**

1. **Configuración hardcodeada en `AnalyticsCacheService`:**
   ```typescript
   // backend/src/analytics/cache/analytics-cache.service.ts
   const host = this.configService.get<string>('REDIS_HOST') || 'localhost';  // ❌ localhost
   const port = this.configService.get<number>('REDIS_PORT') || 6379;
   ```
   En Docker, Redis es el servicio `redis`, no `localhost`.

2. **`REDIS_URL` en docker-compose con variable sin expandir:**
   ```yaml
   # docker-compose.prod.yml
   - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
   ```
   Docker Compose no expande `${REDIS_PASSWORD}` dentro de `command:` ni de variables de entorno de otros servicios si no está definida en el mismo scope.

3. **Redis con password pero backend sin password (o viceversa):**
   - Redis arrancaba con `--requirepass ${REDIS_PASSWORD}` (variable no expandida → password literal `${REDIS_PASSWORD}`).
   - Backend usaba `REDIS_URL` con password distinta o sin password.

---

## 🛠️ Solución Implementada

### 1. Fix en `AnalyticsCacheService` — Parsear `REDIS_URL`

**Archivo:** `backend/src/analytics/cache/analytics-cache.service.ts`

```typescript
onModuleInit() {
  if (this.enabled) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    let host = 'redis';
    let port = 6379;
    let password: string | undefined;

    if (redisUrl) {
      const url = new URL(redisUrl);
      host = url.hostname;
      port = parseInt(url.port, 10) || 6379;
      password = url.password || undefined;
    } else {
      host = this.configService.get<string>('REDIS_HOST') || 'redis';
      port = this.configService.get<number>('REDIS_PORT') || 6379;
      password = this.configService.get<string>('REDIS_PASSWORD') || undefined;
    }

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    // ...
  }
}
```

### 2. Fix en `docker-compose.prod.yml` — Sin password, host Docker

```yaml
# docker-compose.prod.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server          # sin --requirepass
    volumes:
      - redis_data:/data
    # ...
  backend:
    environment:
      - REDIS_URL=redis://redis:6379   # sin password, host = nombre del servicio
```

### 3. Limpieza de `.env` (opcional)
```bash
# .env - opcional, si no se usa password
REDIS_URL=redis://redis:6379
# REDIS_PASSWORD=  # comentado o vacío
```

---

## ✅ Verificación Post-Fix

```bash
# 1. Redis responde sin password
docker exec orderflow-redis-1 redis-cli ping
# → PONG

# 2. Backend ve REDIS_URL correcta
docker exec orderflow-backend-prod env | grep REDIS
# REDIS_URL=redis://redis:6379

# 3. Logs backend limpios
docker compose -f docker-compose.prod.yml logs backend --tail=20
# LOG [AnalyticsCacheService] Analytics Cache initialized on Redis redis:6379
# (sin errores de conexión)
```

---

## 📋 Checklist Rápido

```bash
# 1. Verificar REDIS_URL en compose
grep REDIS_URL docker-compose.prod.yml
# → REDIS_URL=redis://redis:6379

# 2. Verificar comando redis sin password
grep -A 2 "redis:" docker-compose.prod.yml | grep command
# command: redis-server

# 3. Verificar código AnalyticsCacheService parsea REDIS_URL
grep -A 20 "onModuleInit" backend/src/analytics/cache/analytics-cache.service.ts
# Debe parsear new URL(redisUrl) y extraer hostname/password
```

---

## 📝 Referencias

- Commit fix: `bfdcc82` — "fix: AnalyticsCacheService usa REDIS_URL en lugar de localhost"
- Commit compose fix: `898f3e8` → `bfdcc82` (frontend) + backend fix
- Related: #04 (Redis auth en WebSockets), #17 (Production deploy issues)