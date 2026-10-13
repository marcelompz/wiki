# Troubleshooting #33 — No se pudo escribir la configuración de Traefik

> **Área:** DevOps / Traefik / Deploy Manager  
> **Síntoma principal:** Error al crear instancia en `/admin/deploy`: `No se pudo escribir la configuración de Traefik para <domain>`  
> **Estado:** Resuelto

---

## Síntomas

- Al crear una instancia desde `/admin/deploy` se recibe el mensaje:
  - `No se pudo escribir la configuración de Traefik para provecchio.com. Verifica que el directorio /opt/traefik-orderflow/dynamic/deploy-manager exista en el host y esté montado en el contenedor de OmniFlow.`
- El deploy de la instancia falla antes de ejecutar `deploy.sh`.
- Los logs del backend muestran:
  - `[Traefik] Failed to write route config: /opt/traefik-orderflow/dynamic/deploy-manager/<id>.yml`
  - `EACCES` o `ENOENT` al intentar escribir el archivo YAML.

---

## Causa raíz

El servicio `DeployTraefikService` escribe archivos YAML dinámicos en `/opt/traefik-orderflow/dynamic/deploy-manager` para que Traefik los cargue automáticamente.

Ese directorio debe existir **en el host** y estar **montado como volumen** dentro del contenedor de OmniFlow backend.

Si el directorio no existe en el host, o no está montado en el contenedor, la escritura falla con `ENOENT` o `EACCES`.

### Detalle técnico

- Backend: `DeployTraefikService.writeRouteFile()` usa `fs.writeFile()` en `/opt/traefik-orderflow/dynamic/deploy-manager`.
- Si ese path no está montado en el contenedor, escribe en un directorio virtual del contenedor que no persiste y puede no existir.
- El mensaje de error original solo mostraba el dominio, sin indicar la causa real.

---

## Solución

### 1. Crear el directorio en el host

```bash
ssh root@192.168.69.240 "mkdir -p /opt/traefik-orderflow/dynamic/deploy-manager"
```

### 2. Montar el directorio en el contenedor de OmniFlow

En el `docker-compose.prod.yml` de OmniFlow, agregar un volumen para el directorio dinámico de Traefik:

```yaml
services:
  backend:
    volumes:
      - /opt/traefik-orderflow/dynamic/deploy-manager:/opt/traefik-orderflow/dynamic/deploy-manager:rw
```

Si el directorio ya está montado, verificar permisos:

```bash
ssh root@192.168.69.240 "chown -R 1000:1000 /opt/traefik-orderflow/dynamic/deploy-manager"
```

### 3. Verificar que Traefik cargue el directorio

En la configuración de Traefik (`/opt/traefik-orderflow/traefik.yml` o equivalente), asegurar que tenga:

```yaml
providers:
  file:
    directory: /opt/traefik-orderflow/dynamic/deploy-manager
    watch: true
```

### 4. Reiniciar servicios

```bash
ssh root@192.168.69.240 "docker compose -f /srv/orderflow/docker-compose.prod.yml --env-file /srv/orderflow/.env.prod up -d backend"
```

---

## Prevención

- El script `deploy-production.sh` debe validar que el directorio dinámico de Traefik exista en el host antes de iniciar los contenedores.
- El backend debe retener el mensaje de error original con el path completo para facilitar diagnóstico.

---

## Referencias

- `backend/src/deploy-manager/traefik/deploy-traefik.service.ts`
- `docs/guides/odoo-deploy-standardization.md`
- Troubleshooting [#24](24-deploy-script-bugs-fixed.md) — Traefik sin conexión al backend.
