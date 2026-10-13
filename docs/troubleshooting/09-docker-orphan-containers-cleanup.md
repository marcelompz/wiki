# 09 — Contenedores Duplicados y Limpieza Automática de Huérfanos en Docker Compose

> **Área:** DevOps / Docker Compose / Deploy  
> **Fecha:** 2026-07-31  
> **Estado:** ✅ Resuelto  

---

## 🛑 Síntoma Principal

Al inspeccionar los procesos en el servidor con `docker compose ps` o `docker ps | grep backend`, aparecían 2 contenedores `backend` ejecutándose simultáneamente en paralelo:

```bash
NAME                                  IMAGE               COMMAND            STATUS
3f01b91f8333_orderflow-backend-prod   orderflow-backend   "/entrypoint.sh"   Up 41 hours (healthy)
orderflow-backend-prod                orderflow-backend   "/entrypoint.sh"   Up 41 hours (healthy)
```

---

## 🔍 Causa Raíz

Cuando un servicio se renombra, cambia de archivo `docker-compose.yml` o se actualiza sin la bandera `--remove-orphans`, Docker Compose no elimina la instancia anterior creada con una ID o nombre alternativo. El contenedor previo continúa activo en segundo plano, consumiendo recursos de memoria/CPU e interfiriendo con el enrutamiento.

---

## 🛠️ Solución Aplicada

1. **Inclusión Obligatoria de `--remove-orphans` en los Scripts de Despliegue:**
   Se verificó y aseguró la bandera en los scripts de despliegue automatizado (`scripts/deploy-production.sh` y `scripts/deploy-staging.sh`):

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
   ```

2. **Limpieza Manual del Servidor (`dimoraserverlocal` / `Hetzner`):**
   ```bash
   cd /srv/orderflow
   docker compose -f docker-compose.prod.yml stop backend
   docker compose -f docker-compose.prod.yml rm -f backend
   docker compose -f docker-compose.prod.yml up -d --build --remove-orphans backend
   ```

---

## 📌 Verificación

Con la adición de `--remove-orphans`, la salida de `docker compose ps` refleja exactamente el listado limpio de servicios activos sin duplicados.
