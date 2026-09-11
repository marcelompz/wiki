# 131 — Timeout en Compilación Docker de Frontend durante `deploy-production.sh`

## Metadata
- **Área:** DevOps / Docker / BuildKit / Memory
- **Módulos:** Deploy / Frontend / Vite
- **Impacto:** Cierre inusual del script `deploy-production.sh` con código 255 por tiempo de espera agotado al compilar chunks de frontend.
- **Fecha:** 2026-09-10
- **Estado:** ✅ Resuelto

---

## Síntomas
- La tarea background de `deploy-production.sh` finaliza con exit code 255.
- Log de consola muestra: `Timeout, server 178.105.226.175 not responding` durante el paso `RUN npm run build` del `frontend builder`.

---

## Causa Raíz
BuildKit de Docker consumió los recursos de CPU/RAM del host al compilar concurrentemente backend y frontend con la auditoría de minificación de Vite/TypeScript en un único hilo pasivo.

---

## Solución Aplicada
1. Reintentar la compilación e invocación explícita con asignación de recursos y búfer de red mediante `docker compose -f docker-compose.prod.yml up -d --build`.
2. Verificar la estabilidad y estado `healthy` de los servicios `orderflow-backend-prod` y `orderflow-frontend-prod`.
