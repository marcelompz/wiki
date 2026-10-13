# Guía de Despliegue — Provecchio Réplica / Backup

**Propósito:** Instalar el servidor Provecchio como réplica read-only de PostgreSQL y servidor de backup standby para OrderFlow.  
**Cuándo usarla:** Cuando quieras agregar el servidor de backups/réplica en la red de Provecchio.  
**Requisitos:**  
- Acceso SSH al servidor Provecchio  
- Acceso al servidor primary (Hetzner VPS) para configurar PostgreSQL  
- Docker y Docker Compose instalados en ambos servidores  
- Misma red entre Provecchio y el primary (conectividad TCP/5432)

---

## 1. Preparar el Servidor Primary (Hetzner VPS)

### 1.1 Configurar PostgreSQL para replicación

```bash
# Ingresar al contenedor de PostgreSQL
docker compose -f /srv/orderflow/docker-compose.prod.yml exec database psql -U orderflow -d orderflow_db
```

Dentro de `psql`, ejecutar:

```sql
-- Crear usuario de replicación
CREATE USER replica_user WITH REPLICATION ENCRYPTED PASSWORD 'tu_password_seguro';

-- Verificar configuración actual
SHOW wal_level;
SHOW max_wal_senders;
SHOW wal_keep_size;
```

**Configuración requerida:**

| Parámetro | Valor esperado | Si no coincide |
|-----------|---------------|----------------|
| `wal_level` | `replica` | Agregar en `docker-compose.prod.yml`: `command: postgres -c wal_level=replica` |
| `max_wal_senders` | `>= 3` | Agregar: `-c max_wal_senders=3` |
| `wal_keep_size` | `>= 1GB` | Agregar: `-c wal_keep_size=1GB` |

**Ejemplo de ajuste en `docker-compose.prod.yml`:**

```yaml
services:
  database:
    image: postgres:15-alpine
    command: >
      postgres
      -c wal_level=replica
      -c max_wal_senders=3
      -c wal_keep_size=1GB
    # ... resto de la config
```

Guardar cambios y recrear el contenedor:

```bash
docker compose -f /srv/orderflow/docker-compose.prod.yml up -d database
```

**Nota:** Esto no reinicia la base de datos, pero puede causar un breve corte. Programar en ventana de mantenimiento si es necesario.

---

## 2. Preparar Provecchio

### 2.1 Clonar el repositorio

```bash
# En Provecchio
git clone https://github.com/marcelompz/orderflow.git
cd orderflow
```

### 2.2 Crear archivo de variables de entorno

```bash
# Copiar el ejemplo
cp .env.provecchio.example .env.provecchio

# Editar con los valores reales
nano .env.provecchio
```

**Variables obligatorias en `.env.provecchio`:**

```env
# Conexión al primary
PRIMARY_HOST=178.105.226.175
POSTGRES_USER=orderflow
POSTGRES_PASSWORD=GwV2UpPdZnCocfdjmOKUfqiX
POSTGRES_DB=orderflow_db
POSTGRES_PORT=5432

# Redis (opcional, si usás Redis en Provecchio)
REDIS_PASSWORD=cambiar_redis_password_produccion_aleatorio
```

**Importante:** No commitear `.env.provecchio` al repositorio. Ya está en `.gitignore`.

---

## 3. Desplegar la Réplica

### 3.1 Iniciar la réplica

```bash
bash scripts/replica-start.sh
```

**Qué hace este script:**
1. Ejecuta `pg_basebackup` desde el primary hacia Provecchio.
2. Configura `primary_conninfo` para streaming replication.
3. Inicia PostgreSQL en modo réplica.

**Duración estimada:** 5-15 minutos, dependiendo del tamaño de la base de datos.

### 3.2 Verificar logs

```bash
docker compose -f docker-compose.provecchio.yml logs database-replica
```

**Qué buscar:**
- `base backup completed` — indica que el backup base se copió correctamente.
- `started streaming WAL` — indica que la replicación en tiempo real está activa.
- `database system is ready to accept connections` — réplica lista.

### 3.3 Verificar estado de la réplica

```bash
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c "SELECT pg_is_in_recovery();"
```

**Resultado esperado:** `true`  
Si retorna `false`, la réplica no está en modo recovery (posible error).

**Verificar lag de replicación:**

```bash
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c "SELECT * FROM pg_stat_replication;"
```

---

## 4. Probar Failover (Opcional pero Recomendado)

### 4.1 Promocionar la réplica a primary

```bash
bash scripts/replica-promote.sh
```

### 4.2 Verificar que es primary

```bash
docker compose -f docker-compose.provecchio.yml exec database-replica psql -U orderflow -d orderflow_db -c "SELECT pg_is_in_recovery();"
```

**Resultado esperado:** `false`

### 4.3 Apuntar el backend a la nueva base de datos

```bash
# En Provecchio, modificar docker-compose.provecchio.yml para exponer el backend
# O actualizar DATABASE_URL en el servicio de backend
export DATABASE_URL=postgresql://orderflow:GwV2UpPdZnCocfdjmOKUfqiX@database-replica:5432/orderflow_db?schema=public
```

### 4.4 Reiniciar servicios

```bash
docker compose -f docker-compose.provecchio.yml up -d backend frontend
```

### 4.5 Verificar funcionamiento

```bash
curl -f https://provecchio.com/health
curl -f https://provecchio.com/api/v1/health
```

### 4.6 Recuperar el primary original

Cuando el servidor principal se recupera, puede convertirse en réplica de Provecchio:

```bash
# En Hetzner VPS (antiguo primary)
docker compose -f /srv/orderflow/docker-compose.prod.yml down

# Reconfigurar como réplica (similar a docker-compose.provecchio.yml)
# Apuntar a Provecchio como PRIMARY_HOST
```

---

## 5. Procedimientos de Uso Diario

### 5.1 Iniciar réplica para backup o mantenimiento

```bash
bash scripts/replica-start.sh
```

### 5.2 Detener réplica para ahorrar recursos

```bash
bash scripts/replica-stop.sh
```

**Nota:** Al detenerse, la réplica deja de sincronizar. Al reiniciar, hará un nuevo `pg_basebackup` para sincronizar.

### 5.3 Backup desde la réplica

```bash
# Iniciar réplica
bash scripts/replica-start.sh
sleep 30

# Ejecutar backup
docker compose -f docker-compose.provecchio.yml exec database-replica pg_dump -Fc -U orderflow -d orderflow_db -f /tmp/db_replica.dump

# Copiar a local
docker compose -f docker-compose.provecchio.yml cp database-replica:/tmp/db_replica.dump /opt/orderflow/backups/postgres/db_replica_$(date +%Y%m%d_%H%M%S).dump

# Detener réplica
bash scripts/replica-stop.sh
```

---

## 6. Troubleshooting

### 6.1 Error de conexión en `pg_basebackup`

```bash
# Verificar conectividad desde Provecchio hacia Hetzner
nc -zv 178.105.226.175 5432

# Verificar que el usuario replica_user existe
docker compose -f /srv/orderflow/docker-compose.prod.yml exec database psql -U orderflow -c "SELECT * FROM pg_user WHERE usename='replica_user';"
```

### 6.2 Réplica no sincroniza

```bash
# Verificar logs
docker compose -f docker-compose.provecchio.yml logs database-replica | grep -i error

# Verificar configuración de primary_conninfo
docker compose -f docker-compose.provecchio.yml exec database-replica cat /var/lib/postgresql/data/postgresql.conf | grep primary_conninfo
```

### 6.3 Contenedor no inicia

```bash
# Verificar que .env.provecchio existe y tiene las variables correctas
cat .env.provecchio

# Verificar que el volumen no tiene datos corruptos
docker compose -f docker-compose.provecchio.yml down
docker volume rm orderflow_postgres_replica_data
bash scripts/replica-start.sh
```

---

## 7. Próximos Pasos

1. Configurar `wal_level = replica` en el primary.
2. Crear usuario `replica_user` en el primary.
3. Probar `replica-start.sh` en Provecchio.
4. Automatizar backup diario desde la réplica con cron.
5. Documentar runbook de failover para el equipo de soporte.
6. Agregar monitoreo de lag de replicación en Grafana.

---

## 8. Contacto y Soporte

- **Documentación principal:** `docs/REPLICA_STANDBY.md`
- **Scripts:** `scripts/replica-start.sh`, `scripts/replica-stop.sh`, `scripts/replica-promote.sh`
- **Compose:** `docker-compose.provecchio.yml`
- **Variables:** `.env.provecchio.example`
