# 216 — Staging LAN en el homeserver: k3s ServiceLB se queda con `:80/:443`

## Síntoma

En el homeserver `192.168.100.204` (staging LAN), el stack Docker de staging
quedaba **healthy**, pero:

- `https://orderflow.local` devolvía `HTTP 404`.
- El certificado presentado era `CN=TRAEFIK DEFAULT CERT`, no el autofirmado.
- El contenedor `orderflow-traefik-staging` no registraba ninguna request.

## Causa raíz

El host también corre **k3s**. Su controlador ServiceLB mantiene pods
`svclb-traefik-*` que hacen DNAT de `:80/:443` a nivel host. Aunque el pod
Traefik de k3s escucha internamente en `8000/8443`, ServiceLB gana los puertos
públicos y **ningún** contenedor Docker puede recibir tráfico en `:80/:443`.

Se comprobó deteniendo el Traefik propio: `:443` seguía respondiendo con el
certificado default de Traefik y 404, es decir, la respuesta venía de k3s.

## Solución aplicada

El staging usa el **Traefik de k3s** como único proxy:

1. Se elimina el servicio `traefik` del compose de staging y la carpeta
   `deploy/staging/traefik/`; los certificados pasan a `deploy/staging/certs/`.
2. `frontend` y `backend` se publican **solo** en la gateway CNI `10.42.0.1`
   (`3002` y `3010`), nunca en la LAN.
3. En k3s se crea el namespace `orderflow-staging` con:
   - Services sin selector (`orderflow-frontend:80`, `orderflow-backend:3010`).
   - EndpointSlices manuales → `10.42.0.1:3002/3010`.
   - Secret TLS `orderflow-staging-tls` desde `deploy/staging/certs/`.
   - Middleware `orderflow-staging-redirect-to-https`.
   - Ingress HTTPS (`orderflow.local`, `api.orderflow.local`) e Ingress HTTP
     para el redirect.
4. `scripts/apply-staging-k8s.sh` aplica todo de forma idempotente y
   `scripts/deploy-staging-homeserver.sh` lo invoca tras el `up`.

`kubectl` es un symlink a `k3s` y busca `/etc/rancher/k3s/k3s.yaml` (root). Se
usa una copia en `$HOME/.kube/config` (600) y `KUBECONFIG=$HOME/.kube/config`.

## Archivos

- `docker-compose.staging.yml`
- `deploy/staging/k8s/*.yaml`
- `deploy/staging/generate-certs.sh`
- `scripts/apply-staging-k8s.sh`
- `scripts/deploy-staging-homeserver.sh`
- `deploy/staging/README.md`

## Verificación

```bash
curl -kI --resolve orderflow.local:443:127.0.0.1 https://orderflow.local/
curl -k  --resolve api.orderflow.local:443:127.0.0.1 https://api.orderflow.local/api/v1/health
curl -sI -H 'Host: orderflow.local' http://127.0.0.1/    # 301/308

KUBECONFIG=$HOME/.kube/config kubectl -n orderflow-staging \
  get services,endpointslices,middlewares,ingress
```

El Ingress catch-all de qBittorrent (`torrents/qbittorrent-ingress`, entrypoint
`web`) sigue funcionando: las reglas por `Host(...)` de staging tienen mayor
prioridad que `PathPrefix(/)`.

## Nota: referencia al Middleware desde un Ingress

El provider `kubernetes` (Ingress estándar) resuelve los Middleware del
provider `kubernetescrd` con el nombre **`<namespace>-<middleware>`**. El
annotation correcto es:

```yaml
traefik.ingress.kubernetes.io/router.middlewares: orderflow-staging-orderflow-staging-redirect-to-https@kubernetescrd
```

Con el nombre corto (`...@kubernetescrd`) Traefik loguea `middleware ... does
not exist` y el router HTTP queda sin redirect (responde 200 del backend en
lugar de 301/308).

Además, Traefik tarda unos segundos en recargar Ingress/TLS después del
`kubectl apply`; por eso el deploy reintenta la validación HTTPS/redirect
hasta 60 s antes de fallar.

## Regla

En hosts con k3s, **no** desplegar otro proxy en `:80/:443`. Publicar los
contenedores en la gateway CNI (`10.42.0.1`) y enrutar con Ingress del Traefik
de k3s.
