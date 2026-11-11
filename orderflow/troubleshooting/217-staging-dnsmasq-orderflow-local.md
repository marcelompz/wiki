# 217 — `orderflow.local` no resuelve en la LAN (dnsmasq + aviso mDNS)

## Síntoma

Desde un cliente de la LAN:

```bash
dig orderflow.local
# status: NXDOMAIN, SERVER: 192.168.100.1#53
```

`https://orderflow.local` funciona en el homeserver con `--resolve`, pero el
nombre no resuelve solo. Agregar la entrada a `/etc/hosts` en cada equipo es
un parche manual y no escala.

## Causa raíz

1. El DNS del router (`192.168.100.1`) no conoce `orderflow.local` y responde
   `NXDOMAIN`.
2. `local` está reservado para **Multicast DNS** (RFC 6762). Algunos clientes
   (macOS, Linux con `nss-mdns`/Avahi) intentan resolver `*.local` por mDNS y
   **no** consultan el DNS unicast.

## Solución aplicada

`dnsmasq` en el homeserver (`192.168.100.204`) sirve los nombres de staging y
reenvía el resto al router:

- Config versionada: `deploy/staging/dnsmasq/orderflow.conf`.
- Destino: `/etc/dnsmasq.d/orderflow.conf` (644).
- `interface=enp5s0` + `bind-dynamic` (la IP del host es DHCP).
- `no-resolv` + `server=192.168.100.1`.
- `address=/orderflow.local/192.168.100.204` cubre `orderflow.local` y todos
  sus subdominios (`api.orderflow.local`).

Instalación:

```bash
cd /srv/orderflow
sudo apt-get update && sudo apt-get install -y dnsmasq
sudo install -m 644 deploy/staging/dnsmasq/orderflow.conf \
  /etc/dnsmasq.d/orderflow.conf
sudo dnsmasq --test -7 /etc/dnsmasq.d
sudo systemctl enable --now dnsmasq
sudo ufw allow 53/tcp && sudo ufw allow 53/udp   # solo si ufw está activo
```

No hace falta editar `/etc/dnsmasq.conf`: Debian arranca el servicio con
`-7 /etc/dnsmasq.d` (`CONFIG_DIR` en `/etc/default/dnsmasq`).

Después hay que apuntar el DNS de los clientes (o el DHCP del router) a
`192.168.100.204`. En el ONT **Huawei HG8245W5** de esta LAN: *LAN → DHCP
Server Configuration* → `Primary DNS server` y `Secondary DNS server` =
`192.168.100.204`. Para que la IP no cambie, conviene una reserva DHCP.

No dejar el router como secundario: ante un `NXDOMAIN` el cliente no prueba el
siguiente servidor. Si el ONT anuncia DNS por IPv6 (RA/RDNSS) hacia
`fe80::1`, hay que desactivar ese anuncio o apuntarlo al homeserver; si no,
algunos clientes pueden seguir consultando al router.

## Verificación

```bash
# En el homeserver
ss -lntup | grep -E ':53\s'
dig @192.168.100.204 orderflow.local +short       # 192.168.100.204
dig @192.168.100.204 api.orderflow.local +short   # 192.168.100.204
dig @192.168.100.204 debian.org +short            # reenvío OK

# En un cliente con DNS = 192.168.100.204
getent hosts orderflow.local
curl -kI https://orderflow.local/
curl -k https://api.orderflow.local/api/v1/health
```

`dig` sin `@192.168.100.204` sigue preguntando al DNS del cliente: úsalo para
comprobar qué servidor tiene configurado, no para validar dnsmasq.

Verificado el 2026-11-10 desde un cliente de la LAN (`192.168.100.179`) por
UDP y TCP, y con `curl -k` contra frontend (`200`) y
`/api/v1/health` (`version 1.46.2`).

## Límite conocido: `.local` y mDNS

Si un cliente resuelve `.local` por mDNS, dnsmasq no se consulta y el nombre
sigue fallando: `dig` funciona (va directo al DNS), pero `getent`/`curl`
fallan. Comprobado en un cliente Debian con `avahi-daemon`:

```
hosts: files myhostname mdns4_minimal [NOTFOUND=return] dns
```

`mdns4_minimal` intercepta `.local` y `[NOTFOUND=return]` corta la búsqueda
antes de `dns`.

**Decisión de esta LAN:** mantener `.local` y parchear los clientes que lo
necesiten.

Linux con Avahi (poner `dns` antes de `mdns4_minimal`; el fallback mDNS sigue
funcionando para otros nombres `.local` que no resuelva dnsmasq):

```bash
sudo cp /etc/nsswitch.conf /etc/nsswitch.conf.bak
sudo sed -i 's/^hosts:.*/hosts: files myhostname dns mdns4_minimal [NOTFOUND=return]/' \
  /etc/nsswitch.conf
getent hosts orderflow.local
```

macOS (mDNSResponder no consulta DNS unicast para `.local`; usar `hosts`):

```bash
echo "192.168.100.204 orderflow.local api.orderflow.local" | sudo tee -a /etc/hosts
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

Windows no necesita parche. En iOS/Android no hay `hosts` editable: usar la
IP o, si molesta, migrar los hostnames a `orderflow.home.arpa` (RFC 8375):
regenerar certificado, actualizar Ingress, `.env.staging` y rebuild del
frontend.

## Archivos

- `deploy/staging/dnsmasq/orderflow.conf`
- `deploy/staging/README.md` (sección 6)
