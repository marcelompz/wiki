# 🛠️ Troubleshooting #41 — NestJS Crash Loop por `sharp` en Alpine

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
- Contenedor `orderflow-backend-prod` en estado `starting` (healthcheck falla)
- `docker logs` muestra loop infinito: `🚀 Starting... → 📦 Applying migrations... → 🔥 Starting application...` y luego silencio
- `docker exec ... wget http://localhost:3010/api/v1/health` → `Connection refused`
- `netstat` dentro del contenedor no muestra nada escuchando en puerto 3010
- Proceso Node (`node dist/src/main.js`) corriendo como PID 1 pero sin escuchar puerto

## 🔍 Causa Raíz
El módulo `QrCodeService` importa `sharp` en top-level:
```typescript
import sharp from 'sharp';
```

`sharp` es una librería nativa que requiere `libvips` en runtime. En `node:22-alpine`, `libvips` **no viene instalado por defecto**. Al intentar cargar el binding nativo (`sharp-linux-x64.node`), Node se cuelga (event loop bloqueado en `dlopen`) sin lanzar excepción visible, impidiendo que NestJS complete el bootstrap y llame a `app.listen(3010)`.

El `Dockerfile.prod` solo instalaba:
```dockerfile
RUN apk add --no-cache postgresql-client openssl libc6-compat netcat-openbsd
```
Faltaba `vips` (runtime de libvips).

## ✅ Solución Aplicada
**Opción 1 (rápida): Eliminar dependencia `sharp` del backend** — Mover generación de QR con logo al frontend.  
**Opción 2 (mantener funcionalidad): Instalar `vips` en Dockerfile.**

Se aplicó **Opción 1** (commit `02dfe68`):
- Eliminado `import sharp from 'sharp'` de `backend/src/qr/qr.service.ts`
- Eliminado método `embedLogo()` y bloque de composición de logo
- Removido `sharp` de `backend/package.json` y `package-lock.json` (`npm uninstall sharp`)
- QR generator ahora genera códigos sin logo embebido (el frontend puede hacer la composición si se necesita)

## 🧪 Verificación
```bash
# En servidor
docker logs orderflow-backend-prod --tail 20
# Debe mostrar: "Nest application successfully started" y health check 200
docker exec orderflow-backend-prod wget -qO- http://127.0.0.1:3010/api/v1/health
# {"status":"ok",...}
```

## 🔗 Referencias
- Commit: `02dfe68` — `fix: remove sharp dependency from QR module to resolve Alpine startup crash`
- Archivos: `backend/Dockerfile.prod`, `backend/src/qr/qr.service.ts`, `backend/package.json`
