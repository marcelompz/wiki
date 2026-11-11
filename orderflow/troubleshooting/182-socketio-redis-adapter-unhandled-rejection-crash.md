# 182 — Backend en crash-loop: `Stream isn't writeable and enableOfflineQueue options is false` (Socket.IO + Redis adapter)

## Área
Backend NestJS / Redis / Socket.IO WebSockets / Docker Compose (local) / Deploy

## Síntoma principal

El contenedor `orderflow_backend` queda en **ciclo de reinicio** (`RestartCount` creciente) y nunca pasa a `healthy`:

```
Container orderflow_backend  Recreate
Container orderflow_backend  Started
orderflow_backend  Up 11 seconds (health: starting)   <-- se reinicia solo
```

El health check nunca responde y el log muestra:

```
[Nest] LOG  [RedisIoAdapter] Connecting Socket.io Redis Adapter to redis://:****@redis:6379
/app/node_modules/ioredis/built/Redis.js:376
                command.reject(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
                               ^
Error: Stream isn't writeable and enableOfflineQueue options is false
    at EventEmitter.sendCommand (ioredis/built/Redis.js:376:32)
    at EventEmitter.psubscribe (ioredis/built/utils/Commander.js:90:25)
    at new RedisAdapter (@socket.io/redis-adapter/dist/index.js:99:28)
    at RedisIoAdapter.createIOServer (dist/common/redis-io.adapter.js:54:20)
    at SocketServerProvider.scanForSocketServer (@nestjs/websockets/socket-server-provider.js:21:20)
    ...
Node.js v22.23.3
```

Síntoma secundario previo (mismo entorno local): `TypeError: Configuration key "JWT_SECRET" does not exist` al arrancar, porque el servicio `backend` del compose no heredaba el `.env` del repositorio.

---

## Causa Raíz

### 1. El cliente `sub` de Redis nunca se conectaba

`backend/src/common/redis-io.adapter.ts` creaba el cliente de pub/sub así:

```ts
pubClient = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false, retryStrategy: () => null });
await pubClient.connect();

subClient = pubClient.duplicate();          // hereda lazyConnect:true + enableOfflineQueue:false
subClient.on('error', ...);                 // NUNCA se hacía await subClient.connect()

this.adapterConstructor = createAdapter(pubClient, subClient);
```

`@socket.io/redis-adapter` ejecuta `psubscribe` / `subscribe` de forma **fire-and-forget** (sin `await`) al construir el adapter de cada namespace:

```js
this.subClient.psubscribe(this.channel + "*");
this.subClient.subscribe([this.requestChannel, this.responseChannel, this.specificResponseChannel]);
```

Con `lazyConnect: true` el cliente `sub` está en estado `wait` (stream no escribible) y con `enableOfflineQueue: false` el comando **se rechaza en vez de encolarse**. Como el adapter no expone esa promesa, el rechazo se convierte en `unhandledRejection` y **Node 22 termina el proceso** (comportamiento por defecto desde Node 15).

El `try/catch` de `connectToRedis()` no podía capturar nada: el rechazo ocurre en la cadena de promesas interna del adapter, no en la llamada que sí estaba dentro del `try`.

**Por qué solo aparecía cuando Redis era alcanzable:** con password incorrecta, `pubClient.connect()` fallaba primero (NOAUTH) y el `catch` activaba el fallback al adapter in-memory de Socket.IO → el proceso arrancaba "sano" pero **sin pub/sub** (KDS multi-nodo degradado). Con Redis bien configurado, el `connect()` tenía éxito y el crash ocurría después, en la construcción del namespace.

### 2. El compose local no propagaba la configuración de Redis ni el `.env`

`docker-compose.yml` (servicio `backend`) no tenía `env_file` ni variables de Redis:

- Sin `env_file: .env` → faltaban `JWT_SECRET`, `JWT_REFRESH_SECRET`, etc. → `TypeError: Configuration key "JWT_SECRET" does not exist`.
- Sin `REDIS_URL` / `REDIS_PASSWORD` / `ENABLE_REDIS_WS` → el servicio corría con el placeholder `redis://:***@redis:6379` (fallo silencioso) y sin pub/sub.

---

## Solución Implementada

### 1. `backend/src/common/redis-io.adapter.ts`

```ts
await pubClient.connect();

subClient = pubClient.duplicate();
subClient.on('error', (err) => this.logger.error('Redis Sub Client Error:', err.message));

// El adaptador de @socket.io/redis-adapter ejecuta psubscribe/subscribe de forma
// asíncrona y sin await durante la construcción del namespace. Con lazyConnect el
// cliente sub aún no está conectado y, con enableOfflineQueue=false, la promesa
// se rechaza sin ser manejada, provocando un unhandledRejection que termina el
// proceso. Conectamos explícitamente el cliente sub antes de crear el adaptador.
await subClient.connect();

this.adapterConstructor = createAdapter(pubClient, subClient);
```

Además:

- `maskCredentials()` oculta la password en los logs (`redis://***@redis:6379`); antes se imprimía la URL completa con el secreto.
- `safeQuit()` cierra `pub`/`sub` de forma segura si la inicialización falla, evitando clientes colgados.
- El `catch` sigue activando el fallback al adapter in-memory (el backend nunca debe morir por Redis).

### 2. `backend/src/main.ts` — guard de `unhandledRejection` acotado a Redis

```ts
process.on('unhandledRejection', (reason: any) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (/redis|ioredis|stream isn't writeable/i.test(message)) {
    console.error('[RedisIoAdapter] Rechazo de Redis no manejado (ignorado):', message);
    return;
  }
  console.error('[Unhandled Rejection]', reason);
  process.exit(1);
});
```

Solo se absorben rechazos relacionados con Redis (pub/sub es una función **no crítica**); cualquier otro rechazo conserva el comportamiento por defecto de Node (terminar el proceso).

### 3. `docker-compose.yml` — variables de Redis y `.env` en el backend

```yaml
    env_file:
      - .env
    environment:
      ...
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      ENABLE_REDIS_WS: "true"
```

`environment` tiene precedencia sobre `env_file`, de modo que `DATABASE_URL` y `REDIS_URL` siguen apuntando a los alias de red correctos (`postgres`, `redis`).

---

## Verificación

- `docker compose up -d --no-deps backend` → `RestartCount=0`, `Status=running`, `Health=healthy`.
- `GET /api/v1/health` → `200 {"version":"1.39.10","services":{"database":{"status":"ok"},"odoo_adapter":{"status":"ok"}},"status":"ok"}`.
- Log de arranque: `✅ Socket.io Redis Adapter initialized successfully` y `Analytics Cache initialized on Redis redis:6379`.
- Unit tests backend: **127 suites / 940 tests OK**.
- E2E Playwright contra `provecchio.local`: **64/64 OK** (incluye los 22 de `omnigastro.spec.ts` y la validación de importación de datos de provecchio.com).

---

## Prevención

- Si el backend reinicia en loop, leer **primero** `docker logs orderflow_backend | grep -iE "error|rejection"`: un `unhandledRejection` de ioredis es el symptom del adapter.
- No asumir que "el backend arrancó sin Redis" es sano: con password incorrecta cae al fallback in-memory y el síntoma visible es KDS/POS sin sincronización entre instancias.
- Verificar siempre `REDIS_URL` / `REDIS_PASSWORD` / `ENABLE_REDIS_WS` en el `.env` del entorno y que el Redis arranca con `--requirepass` **con la misma** password.
- Ante cualquier cambio en `redis-io.adapter.ts` o en el flujo de pub/sub, reconstruir la imagen (`docker compose up --build -d backend`); `restart` no refresca la imagen.

## Referencias

- `backend/src/common/redis-io.adapter.ts`
- `backend/src/main.ts`
- `docker-compose.yml`
- [04 — Prisma P1000 & fallback de Redis](04-prisma-p1000-db-auth-and-redis-fallback.md)
- [51 — AnalyticsCacheService Redis Connection Failure](51-analytics-cache-service-redis-connection-failure.md)
- [179 — Production Deploy Provecchio v1.39.8](179-production-deploy-provecchio-v1.39.8.md)
