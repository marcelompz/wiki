# Plan de Implementación — Tailscale para Réplica Provecchio

**Objetivo:** Reemplazar la exposición provisional del puerto 5432 por una red privada segura entre el servidor primary (`178.105.226.175`) y Provecchio (`192.168.69.240`), usando Tailscale como solución inicial por simplicidad y soporte a WireGuard.

**Contexto:** El contenedor `orderflow-database-replica-prod` no puede alcanzar `178.105.226.175:5432` porque el contenedor primary no publica puertos al host. La medida provisional actual (`ports: "5432:5432"` en `docker-compose.prod.yml`) expone PostgreSQL a Internet, lo cual es inseguro.

**Propuesta:** Usar Tailscale para crear una red privada entre ambos servidores, permitiendo que la réplica alcance el primary por la IP de Tailscale sin exponer 5432 públicamente.

---

## 1. Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────┐
│  Servidor Primary (Hetzner)                                  │
│  - PostgreSQL Primary (container IP: 172.18.0.2)            │
│  - Tailscale (IP tailnet: 100.x.y.z)                        │
│  - docker-compose.prod.yml SIN ports expuestos               │
└──────────────────────────┬──────────────────────────────────┘
                            │
                            │ Tailscale WireGuard (puerto 41641/UDP)
                            │
┌──────────────────────────▼──────────────────────────────────┐
│  Servidor Provecchio (192.168.69.240)                        │
│  - PostgreSQL Replica                                        │
│  - Tailscale (IP tailnet: 100.x.y.w)                        │
│  - database-replica se conecta a 100.x.y.z:5432             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerrequisitos

- Acceso root a ambos servidores.
- Puerto `41641/UDP` habilitado en el firewall de ambos servidores.
- Cuenta de Tailscale con capacidad para 2 nodos (plan gratuito alcanza).
- Permiso para modificar `docker-compose.prod.yml` en el primary.

---

## 3. Pasos de Implementación

### 3.1 Instalar Tailscale en el Servidor Primary

```bash
ssh root@178.105.226.175 "curl -fsSL https://tailscale.com/install.sh | sh"
```

Configurar como **no subnet router** (solo nodo individual):

```bash
ssh root@178.105.226.175 "tailscale up --authkey=${TAILSCALE_AUTH_KEY} --hostname=orderflow-primary"
```

Verificar IP de tailnet:

```bash
ssh root@178.105.226.175 "tailscale ip -4"
# Ejemplo de salida: 100.101.102.103
```

Anotar esta IP como `PRIMARY_TAILSCALE_IP`.

---

### 3.2 Instalar Tailscale en Provecchio

```bash
ssh root@192.168.69.240 "curl -fsSL https://tailscale.com/install.sh | sh"
ssh root@192.168.69.240 "tailscale up --authkey=${TAILSCALE_AUTH_KEY} --hostname=orderflow-provecchio"
```

Verificar IP de tailnet:

```bash
ssh root@192.168.69.240 "tailscale ip -4"
# Ejemplo de salida: 100.101.102.104
```

Verificar conectividad desde Provecchio hacia Primary:

```bash
ssh root@192.168.69.240 "nc -z -w3 ${PRIMARY_TAILSCALE_IP} 5432 && echo 'reachable' || echo 'unreachable'"
```

---

### 3.3 Configurar PostgreSQL para Aceptar Conexiones desde Tailscale

**Importante:** El contenedor PostgreSQL usa `listen_addresses = '*'`, pero `pg_hba.conf` solo permite localhost. Para réplica, debemos permitir la subred de Tailscale.

Opción A (recomendada: usar script de inicialización):

Modificar `docker-compose.prod.yml` en el primary para montar un script de inicialización que ajuste `pg_hba.conf` dinámicamente:

```yaml
services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-orderflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-orderflow_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/mnt/nfs_storage/backups
      - ./scripts/init-replica-access.sh:/docker-entrypoint-initdb.d/init-replica-access.sh:ro
    restart: unless-stopped
    # ELIMINAR ports: - "5432:5432" DESPUÉS DE VALIDAR TAILSCALE
```

Crear `scripts/init-replica-access.sh`:

```bash
#!/bin/bash
set -e

# Esperar a que PostgreSQL esté listo
until pg_isready -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}"; do
  sleep 1
done

# Permitir replicación desde la subred de Tailscale (100.64.0.0/10 es la subred CGNAT usada por Tailscale)
psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "ALTER SYSTEM SET listen_addresses = '*';"
psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "ALTER SYSTEM SET wal_level = replica;"
psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "ALTER SYSTEM SET max_wal_senders = 10;"
psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "ALTER SYSTEM SET wal_keep_size = '1GB';"

# Reload para aplicar cambios
psql -U "${POSTGRES_USER:-orderflow}" -d "${POSTGRES_DB:-orderflow_db}" -c "SELECT pg_reload_conf();"

echo "[OK] PostgreSQL configurado para aceptar réplicas desde Tailscale"
```

---

### 3.4 Actualizar `docker-compose.provecchio.yml` para Usar Tailscale

Modificar el servicio `database-replica` para que se conecte al `PRIMARY_TAILSCALE_IP` en vez de `178.105.226.175`:

```yaml
services:
  database-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-orderflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-orderflow_db}
      PRIMARY_HOST: ${PRIMARY_TAILSCALE_IP}  # Cambiar de 178.105.226.175 a IP tailnet
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    command: |
      bash -c "rm -rf /var/lib/postgresql/data/* &&
               pg_basebackup -h ${PRIMARY_TAILSCALE_IP} -U ${POSTGRES_USER} -D /var/lib/postgresql/data -P --wal-method=stream &&
               echo "primary_conninfo = host=${PRIMARY_TAILSCALE_IP} port=5432 user=${POSTGRES_USER}" >> /var/lib/postgresql/data/postgresql.conf &&
               postgres -D /var/lib/postgresql/data -c config_file=/var/lib/postgresql/data/postgresql.conf"
    networks:
      - orderflow-network
```

---

### 3.5 Cerrar Puerto 5432 Público en Primary

**Solo después de validar** que la réplica se conecta correctamente por Tailscale:

```bash
ssh root@178.105.226.175 "cd /srv/orderflow && docker compose -f docker-compose.prod.yml stop database && docker compose -f docker-compose.prod.yml rm -f database"
```

Editar `docker-compose.prod.yml` y **eliminar** la línea `ports: - "5432:5432"`.

Levantar nuevamente:

```bash
ssh root@178.105.226.175 "cd /srv/orderflow && docker compose -f docker-compose.prod.yml up -d database"
```

Verificar desde Provecchio:

```bash
ssh root@192.168.69.240 "nc -z -w3 ${PRIMARY_TAILSCALE_IP} 5432 && echo 'OK' || echo 'FAIL'"
# Debe responder OK
```

Verificar que NO es accesible públicamente:

```bash
# Desde un host externo (ej: tu máquina local)
nc -z -w3 178.105.226.175 5432 && echo 'PUBLICLY EXPOSED' || echo 'Not exposed'
# Debe responder "Not exposed"
```

---

## 4. Validación

### 4.1 Verificar Conectividad Tailscale

```bash
# En primary
ssh root@178.105.226.175 "tailscale ping ${PROVECCHIO_TAILSCALE_IP}"

# En provecchio
ssh root@192.168.69.240 "tailscale ping ${PRIMARY_TAILSCALE_IP}"
```

Ambas deben responder con latencia < 50ms.

### 4.2 Verificar Réplica Funcionando

```bash
ssh root@192.168.69.240 "docker compose -f docker-compose.provecchio.yml logs database-replica | grep -i 'replication\|started\|ready'"
```

Verificar lag de WAL:

```bash
ssh root@192.168.69.240 "docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c 'SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS wal_lag;'"
```

### 4.3 Verificar Health Checks

```bash
ssh root@192.168.69.240 "docker compose -f docker-compose.provecchio.yml ps"
# database-replica debe estar "Up" o "healthy"
```

---

## 5. Rollback

Si algo falla durante la implementación:

1. **Mantener puerto 5432 expuesto** temporalmente (no eliminar `ports` de `docker-compose.prod.yml`).
2. Revertir `docker-compose.provecchio.yml` a usar `178.105.226.175` en vez de `PRIMARY_TAILSCALE_IP`.
3. Eliminar `scripts/init-replica-access.sh`.
4. Reiniciar contenedores en ambos servidores.

---

## 6. Tareas Pendientes de Seguridad (Post-Tailscale)

1. **Cerrar puerto 5432 públicamente** (paso 3.5).
2. **Configurar ACL de Tailscale** para restringir acceso solo entre `orderflow-primary` y `orderflow-provecchio`.
3. **Habilitar `--accept-dns=false`** si no querés que Tailscale gestione DNS.
4. **Monitoreo:** agregar alerta si el estado de réplica cambia a `down`.
5. **Failover automation:** una vez validado Tailscale, automatizar el failover script actual para usar la IP tailnet.

---

## 7. Timeline Estimado

| Tarea | Duración | Dependencia |
|-------|----------|-------------|
| Instalar Tailscale en primary | 5 min | Acceso SSH |
| Instalar Tailscale en Provecchio | 5 min | Acceso SSH |
| Configurar pg_hba.conf / init script | 10 min | Tailscale activo |
| Actualizar docker-compose.provecchio.yml | 5 min | IPs tailnet conocidas |
| Validar conectividad y réplica | 15 min | Contenedores corriendo |
| Cerrar puerto 5432 público | 5 min | Réplica estable |
| **Total** | **~45 min** | - |

---

## 8. Referencias

- [Tailscale Docs: Install](https://tailscale.com/kb/installation)
- [Tailscale Docs: Access Controls](https://tailscale.com/kb/1240/access-controls)
- [PostgreSQL Replication Docs](https://www.postgresql.org/docs/15/warm-standby.html)
