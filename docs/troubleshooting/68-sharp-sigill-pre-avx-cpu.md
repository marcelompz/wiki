# 🛠️ Troubleshooting #68 — Backend Crash Loop por `sharp` en CPU sin AVX (SIGILL)

## 📅 Fecha
2026-08-26

## 🎯 Síntoma
- Contenedor `orderflow-backend-prod` en crash loop perpetuo en Provecchio
- `docker logs` muestra: `🚀 Starting... → 📦 Applying migrations... → 🔥 Starting application...` y luego silencio → reinicio
- Health check falla después de 60s: `❌ Backend health check failed after 60s`
- `https://provecchio.com/api/v1/health` también falla
- El Dockerfile tiene `vips` instalado (distinto del #41)

## 🔍 Causa Raíz
El servidor físico Provecchio tiene un **AMD G-T56N** (2011, arquitectura Bobcat).
Este procesador **no soporta AVX ni SSE4.2** — solo SSE3/SSE4a.

El paquete `sharp` (introducido en FEAT-089 via `ImageProcessingService`) compila
`libvips` con optimizaciones modernas (AVX2/SSE4.2) en el builder Docker. Al cargar
el binding nativo en el servidor físico, Node recibe **SIGILL (exit code 132)**
y muere silenciosamente sin lanzar ninguna excepción visible en logs.

```bash
# Diagnóstico:
docker exec orderflow-backend-prod node -e 'require("sharp")'
# → exit code 132 (SIGILL) sin ningún output
docker exec orderflow-backend-prod node -e 'const os=require("os"); console.log(os.cpus()[0].model)'
# → AMD G-T56N Processor
```

**Diferencia con #41:** en #41, el problema era `libvips` no instalado en Alpine.
Aquí `libvips` está instalado pero la CPU física es demasiado antigua para las
instrucciones del binario compilado.

## ✅ Solución Aplicada
**Eliminar `sharp` del backend** (commit `296cdaf`):

1. **`backend/src/common/image-processing.service.ts`**: reescrito sin `sharp`.
   - Las imágenes se guardan en su formato original (sin conversión a WebP ni resize).
   - `thumbUrl` apunta al mismo archivo que `fullUrl` (sin thumbnail separado).
   - El procesamiento/optimización de imágenes queda como responsabilidad del frontend.

2. **`backend/package.json`**: `npm uninstall sharp` — removido de dependencias.

3. **`backend/Dockerfile.prod`**: eliminados `vips-dev`, `build-base` y
   `RUN npm rebuild sharp` de la etapa builder; eliminado `vips` de la etapa runtime.

## 🧪 Verificación
```bash
# En Provecchio
docker logs orderflow-backend-prod --tail 20
# Debe mostrar: "Nest application successfully started"

docker exec orderflow-backend-prod wget -qO- http://127.0.0.1:3010/api/v1/health
# {"status":"ok",...}

curl -sf https://provecchio.com/api/v1/health
# {"status":"ok",...}
```

## ⚠️ Impacto Funcional
- La subida de imágenes en productos y social-catalog **sigue funcionando**.
- Las imágenes se almacenan en formato original (JPG/PNG) en vez de WebP.
- No hay thumbnail separado (fullUrl = thumbUrl).
- Impacto visual mínimo: los catálogos cargan las imágenes originales.
- **No afecta** pedidos, pagos, auth, tenants ni ningún módulo de negocio.

## 🔗 Referencias
- Commit: `296cdaf` — `fix(backend): remove sharp to resolve SIGILL crash on pre-AVX CPUs`
- Archivos: `backend/src/common/image-processing.service.ts`, `backend/Dockerfile.prod`, `backend/package.json`
- Relacionado: [#41 — NestJS Crash Loop por sharp en Alpine](41-sharp-alpine-crash-on-startup.md)
- Feature original: FEAT-089 (ImageProcessingService introducido en v1.20.24)
