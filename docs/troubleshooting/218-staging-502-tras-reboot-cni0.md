# 218 — Staging devuelve 502 después de reiniciar el homeserver

## Síntoma

Tras reiniciar el homeserver, `https://orderflow.local` responde **502**.
`docker compose ps -a` muestra:

```
orderflow-frontend-staging   Exited (128)
orderflow-backend-staging    Exited (255)
orderflow-database-staging   Up (healthy)
orderflow-redis-staging      Up (healthy)
orderflow-odoo-adapter-staging Up (healthy)
```

Los logs del contenedor traen:

```
failed to bind host port 10.42.0.1:3002/tcp: cannot assign requested address
failed to bind host port 10.42.0.1:3010/tcp: cannot assign requested address
```

## Causa raíz

El stack publica `frontend` y `backend` **solo** en la gateway CNI de k3s
(`10.42.0.1`). En el boot, Docker arranca los contenedores (por
`restart: unless-stopped`) antes de que k3s cree la interfaz `cni0`, así que
el bind falla y los contenedores quedan `Exited`.

`restart: unless-stopped` **no** los recupera: el fallo ocurre al preparar la
red del contenedor y Docker no reintenta. Peor: un `docker compose up -d`
posterior puede arrancar el contenedor con `NetworkSettings.Ports` vacío
(el puerto queda sin publicar aunque `HostConfig.PortBindings` exista), por
lo que hay que recrearlo con `--force-recreate`.

k3s, el Ingress, el Secret TLS y dnsmasq sí sobreviven al reboot (dnsmasq
queda `enabled`).

## Solución aplicada

Unit de systemd `deploy/staging/systemd/orderflow-staging.service`:

1. `ExecStartPre` espera hasta 180 s a que `cni0` tenga `10.42.0.1`.
2. Levanta `database`, `redis` y `odoo_adapter` (no publican en la CNI).
3. Recrea `frontend` y `backend` con `--force-recreate` para evitar los
   contenedores con la red rota.

Instalación:

```bash
cd /srv/orderflow
sudo install -m 644 deploy/staging/systemd/orderflow-staging.service \
  /etc/systemd/system/orderflow-staging.service
sudo systemctl daemon-reload
sudo systemctl enable --now orderflow-staging.service
systemctl status orderflow-staging.service --no-pager
```

El unit no construye imágenes: usa las existentes. `systemctl start` fuerza
un corte breve de `frontend`/`backend`; `systemctl stop` detiene el stack de
staging.

## Verificación

```bash
systemctl is-enabled orderflow-staging.service
systemctl is-active orderflow-staging.service
docker port orderflow-frontend-staging   # 80/tcp -> 10.42.0.1:3002
docker port orderflow-backend-staging    # 3010/tcp -> 10.42.0.1:3010

curl -kI --resolve orderflow.local:443:192.168.100.204 https://orderflow.local/
curl -k  --resolve api.orderflow.local:443:192.168.100.204 \
  https://api.orderflow.local/api/v1/health
```

Si se reinicia el homeserver, después del boot:

```bash
systemctl status orderflow-staging.service --no-pager
docker compose -f /srv/orderflow/docker-compose.prod.yml \
  -f /srv/orderflow/docker-compose.staging.yml \
  --env-file /srv/orderflow/.env.staging ps
```

## Archivos

- `deploy/staging/systemd/orderflow-staging.service`
- `deploy/staging/README.md` (sección 4)
