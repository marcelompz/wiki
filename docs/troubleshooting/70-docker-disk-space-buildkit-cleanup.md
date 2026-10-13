# 🛠️ Troubleshooting #70: Saturación de Almacenamiento `/var/lib/docker` por Caché de BuildKit y Purga Post-Deploy Automatizada

> **Módulo:** DevOps / Docker / BuildKit / Discos  
> **Ubicación:** `docs/troubleshooting/70-docker-disk-space-buildkit-cleanup.md`  
> **Fecha:** 26 de Agosto de 2026  
> **Estado:** ✅ Resuelto y Automatizado

---

## 📌 Síntomas y Diagnóstico
En servidores de producción (ej. `dimora-server`), la partición `/var` (`/dev/mapper/dimora--server--vg-var`) alcanzó el **89% de uso** (18 GB ocupados de 21 GB disponibles).

Al auditar con `du -h -d 1 /var/lib/docker/` y `docker system df`:
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          50        12        10.73GB   4.268GB (39%)
Build Cache     171       0         9.256GB   2.932GB
Local Volumes   9         7         1.367GB   648.2MB (47%)
```

### Causa Raíz
1. Las ejecuciones recurrentes de `docker compose up -d --build` acumulan capas intermedias de BuildKit en `/var/lib/docker/buildkit` (llegando a más de **9.25 GB**).
2. El script de despliegue `deploy-production.sh` únicamente ejecutaba `docker container prune` y `docker image prune --filter 'until=48h'`, omitiendo la purga de BuildKit (`docker builder prune`), volúmenes huérfanos (`docker volume prune`) y logs de sistema antiguos de `journalctl`.

---

## 🛠️ Solución Aplicada

### 1. Limpieza de Emergencia
Se ejecutaron los siguientes comandos vía SSH en el servidor:
```bash
docker builder prune -a -f
docker image prune -a -f --filter "until=48h"
docker volume prune -f
journalctl --vacuum-time=3d
```

**Resultado Inmediato:** `/var` se redujo de **89% (18 GB)** a **29% (5.7 GB)**, liberando **12.3 GB de almacenamiento**.

### 2. Automatización en `scripts/deploy-production.sh`
Se actualizó la etapa post-despliegue en `scripts/deploy-production.sh` para incluir la purga completa tras cada deploy:

```bash
echo "🧹 Cleaning old images, build cache, stopped containers and old logs on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "docker container prune -f >/dev/null 2>&1 && docker image prune -a -f --filter 'until=48h' >/dev/null 2>&1 && docker builder prune -f >/dev/null 2>&1 && docker volume prune -f >/dev/null 2>&1 && journalctl --vacuum-time=7d >/dev/null 2>&1" || true
```

---

## 🔒 Verificación de Calidad
- Servidor `dimora-server`: `/var` estable en 29%.
- Próximos deploys con `./scripts/deploy-production.sh` mantendrán el servidor limpio de forma totalmente autónoma.
