# Odoo 14 en `odoo14.provecchio.com` con certificado auto-firmado (MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT)

## Síntoma

Firefox (y cualquier cliente con HSTS) bloquea el acceso a `https://odoo14.provecchio.com/`:

> odoo14.provecchio.com tiene una política de seguridad llamada HTTP Strict Transport Security
> (HSTS)… No puede añadir una excepción para visitar este sitio.
> El certificado de este sitio está **autofirmado**. No fue emitido por una autoridad de
> certificación reconocida.
> **Código de error: MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT**

Además, el dominio no resolvía fuera de la intranet:

```bash
nslookup odoo14.provecchio.com 1.1.1.1     # -> sin respuesta
getent hosts odoo14.provecchio.com          # -> 192.168.69.240 (DNS interno, split-horizon)
```

## Causa raíz

Dos problemas encadenados en el router de Traefik:

1. **El router mezclaba dos dominios en un solo bloque TLS:**

   ```yaml
   odoo14-provecchio:
     rule: "Host(`odoo14.provecchio.local`) || Host(`odoo14.provecchio.com`)"
     tls: {}                      # <-- auto-firmado
   ```

   Con `tls: {}` Traefik sirve el **TRAEFIK DEFAULT CERT**. El dominio `.local` no puede obtener
   un certificado de Let's Encrypt (no existe en DNS público), y al estar en el mismo bloque que
   `.com`, cualquier intento de emisión para `.com` fallaría igual (Traefik pide un certificado que
   cubra **todos** los nombres del router).

2. **El dominio no existía en la zona de Cloudflare**, así que no había ni DNS público ni token
   ACME que presentar.

Verificación del estado previo:

```bash
echo | openssl s_client -connect 192.168.69.240:443 -servername odoo14.provecchio.com \
  | openssl x509 -noout -subject -issuer
# subject=CN=TRAEFIK DEFAULT CERT
# issuer=CN=TRAEFIK DEFAULT CERT
```

## Solución aplicada

### 1. DNS (Cloudflare, zona `provecchio.com`)

Registro nuevo, con el mismo patrón que `odoo.provecchio.com`:

| Nombre | Tipo | Contenido | Proxied |
|---|---|---|---|
| `odoo14.provecchio.com` | CNAME | `provecchio.com` | sí (orange cloud) |

El DNS-01 de Let's Encrypt funciona con el proxy naranja de Cloudflare: Traefik crea el TXT
`_acme-challenge.odoo14.provecchio.com` y el CA lo valida sin necesidad de que el puerto 80 sea
alcanzable desde internet.

### 2. Traefik (`dynamic/services.yml`)

Separación de routers (regla general: **nunca mezclar `.com` y `.local` en el mismo bloque TLS**):

```yaml
odoo14-provecchio:            # producción -> certificado válido
  rule: "Host(`odoo14.provecchio.com`)"
  entryPoints: [websecure]
  tls:
    certResolver: letsencrypt

odoo14-provecchio-local:      # intranet -> auto-firmado
  rule: "Host(`odoo14.provecchio.local`)"
  entryPoints: [websecure]
  tls: {}
```

(Equivalentes para el entrypoint `web`.)

### 3. Sincronización y recarga

```bash
scp dynamic/services.yml root@192.168.69.240:/opt/srv/traefik/dynamic/services.yml
ssh root@192.168.69.240 'docker kill -s HUP traefik'

scp -P 2021 dynamic/services.yml root@38.52.135.227:/srv/traefik/dynamic/services.yml
scp -P 2021 dynamic/services.yml root@38.52.135.227:/opt/srv/traefik/dynamic/services.yml
ssh -p 2021 root@38.52.135.227 'docker kill -s HUP traefik'
```

> Existen **dos** instancias de Traefik en producción y ambas deben recibir el cambio:
> `192.168.69.240` (dimoraserverlocal, LAN, Traefik v3.4) y `38.52.135.227` (dimora-server,
> público, Traefik v3.3). Cloudflare alcanza al segundo; el DNS interno de la oficina al primero.

## Verificación

```bash
# Certificado emitido (almacén ACME)
docker exec traefik sh -c "cat /letsencrypt/acme.json" | grep -o "odoo14.provecchio.com"

# Cert servido por ambas instancias
echo | openssl s_client -connect 192.168.69.240:443 -servername odoo14.provecchio.com \
  | openssl x509 -noout -subject -issuer -dates
# subject=CN=odoo14.provecchio.com
# issuer=C=US, O=Let's Encrypt, CN=YR2
# notBefore=Oct 19 22:09:49 2026 GMT   notAfter=Jan 17 22:09:48 2027 GMT

# HTTPS real validando la cadena (sin -k)
curl -s -o /dev/null -w "%{http_code} ssl_verify=%{ssl_verify_result}\n" \
  https://odoo14.provecchio.com/web/login
# 200 ssl_verify=0
```

## Notas

- `odoo14.provecchio.local` **sigue con certificado auto-firmado** a propósito: es un nombre
  interno, sin DNS público, y Let's Encrypt no puede emitir para él (AGENTS.md, Regla #2: `tls: {}`
  está permitido en local, nunca en producción).
- El DNS interno de la oficina resuelve **cualquier** `*.provecchio.com` a `192.168.69.240`
  (split-horizon). Un dominio mal escrito (por ejemplo `odo14.provecchio.com`) resuelve igual, pero
  cae en el router por defecto → `TRAEFIK DEFAULT CERT` y el mismo error de Firefox.
- Errores **preexistentes** observados en los logs de Traefik (no relacionados con este cambio):
  los routers `aieer-*` referencian el resolver `letsencrypt-http`, que no existe en el
  `traefik.yml` de los servidores de producción, y `capacitaciones.psicovital.com.py` falla porque
  la zona `psicovital.com.py` no está en la cuenta de Cloudflare del token.
