# Troubleshooting: WebSocket (socket.io) Connection Failed on provecchio.local

**Fecha:** 2026-10-18  
**Entorno:** Local (provecchio.local) / Traefik v3.4  
**Severidad:** Alta — KDS, POS, tiempo real no funcionan

---

## Síntoma

```
LibreWolf can't establish a connection to the server at wss://provecchio.local/socket.io/?EIO=4&transport=websocket
The connection to wss://provecchio.local/socket.io/?EIO=4&transport=websocket was interrupted while the page was loading.
```

- KDS no recibe pedidos en tiempo real
- POS no abre al seleccionar mesa en `/admin/gastro`
- Notificaciones push no funcionan
- Consola del navegador muestra errores de WebSocket repetidos

---

## Causa Raíz

**Traefik no tenía ruta para `/socket.io/`** — las conexiones WebSocket iban al frontend (servidor estático) en lugar del backend (NestJS + socket.io).

Archivo: `/opt/orderflow/traefik/dynamic/provecchio-router.yml` — faltaba router `ws-provecchio-local`.

---

## Solución

Agregar router WebSocket con prioridad alta (200) para que coincida antes que el frontend:

```yaml
http:
  routers:
    frontend-provecchio-local:
      rule: "Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)"
      entryPoints:
        - websecure
      service: provecchio-frontend
      tls: {}
    api-provecchio-local:
      rule: "(Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      service: provecchio-api
      tls: {}
      priority: 100
    ws-provecchio-local:
      rule: "(Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)) && PathPrefix(`/socket.io`)"
      entryPoints:
        - websecure
      service: provecchio-api
      tls: {}
      priority: 200
  services:
    provecchio-frontend:
      loadBalancer:
        servers:
          - url: "http://orderflow_frontend:80"
    provecchio-api:
      loadBalancer:
        servers:
          - url: "http://orderflow_backend:3010"
```

Aplicar:
```bash
docker kill -s HUP orderflow_traefik
```

---

## Verificación

```bash
# Test upgrade request (400 es esperado - socket.io rechaza handshake inválido)
curl -sk -I -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  https://provecchio.local/socket.io/
# HTTP/2 400 → OK (llega al backend socket.io)

# En navegador: abrir https://provecchio.local/admin/gastro
# → Seleccionar mesa G7 → POS abre correctamente
# → KDS recibe pedidos en tiempo real
# → Sin errores de WebSocket en consola
```

---

## Requisitos Backend

`.env` debe tener:
```bash
ENABLE_REDIS_WS=true
REDIS_URL=redis://:password@orderflow_omnisync_redis:6379
```

Backend (`main.ts`) usa `RedisIoAdapter` para adapter multi-instancia:
```typescript
if (process.env.ENABLE_REDIS_WS === 'true') {
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  if (redisIoAdapter.isReady()) {
    app.useWebSocketAdapter(redisIoAdapter);
  }
}
```

---

## Regla General

> **Todo path que use WebSocket (`/socket.io`, `/live`, `/notifications`, etc.) debe tener su propio router en Traefik con `priority > 100` para ganar sobre el router del frontend.**

Patrón:
```yaml
ws-mi-dominio:
  rule: "(Host(`dominio.local`) || HostRegexp(`{sub}.dominio\\.local$`)) && PathPrefix(`/socket.io`)"
  priority: 200
  service: mi-backend
```

---

## Referencias

- AGENTS.md Regla #4: "Infraestructura Proxy Exclusive Traefik v3.4"
- AGENTS.md Regla #13: "Diagram-Driven Development" — diagramas de ruteo WebSocket
- Archivo: `/opt/orderflow/traefik/dynamic/provecchio-router.yml`
- Relacionado: #175 (precedencia de operadores Traefik)