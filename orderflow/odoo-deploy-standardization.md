# Plan: Estandarización de Despliegue Odoo

**Fecha:** 2026-08-10  
**Objetivo:** Unificar el despliegue de Odoo en 3 repositorios versionados, con paths fijos en producción, CI/CD por branch y volumenes Docker persistentes.

---

## 1. Estado actual del desorden

| Repo actual | Problema |
|-------------|----------|
| `github.com/marcelompz/odoo19CE` | Repo entero por version, debería ser branch de `odoo-deploy` |
| `github.com/marcelompz/Odoo18CE` | Idem anterior, además con nombre inconsistente |
| Addons mezclados en `/srv/odoo/odoo19CE/addons/` | No hay separación entre infra y addons |
| `/srv/odoo8085/` | Instancia Odoo separada sin repo ni estructura clara |
| `/opt/odoo/odoo8084/` | Path local de desarrollo, no sincronizado con producción |
| Sin CI/CD Odoo | No hay automatización de deploy por version |

Paths actuales encontrados:
- `/srv/odoo/odoo19CE/addons/orderflow_connector` (addons dentro del deploy)
- `/srv/odoo8085/` (instancia standalone)
- `/opt/odoo/odoo8084/addons/orderflow_connector` (local)

---

## 2. Modelo objetivo

### 2.1 Repositorios

| Repo | Propósito | Branchs |
|------|-----------|---------|
| `odoo-deploy` | Infraestructura Docker Compose, scripts de init/migracion, configuraciones Traefik | `18`, `19`, `20`, ... |
| `odoo-addons` | Modulos custom (`orderflow_connector`, etc.) | `18`, `19`, `20`, ... |
| `odoo-l10n-py` | Localizaciones Paraguay / l10n_py | `18`, `19`, `20`, ... |

### 2.2 Paths producción (fijos, sin symlinks)

```
/srv/odoo-deploy/
├── 18/                    # checkout de odoo-deploy branch 18
│   ├── docker-compose.yml
│   ├── .env
│   ├── config/
│   ├── migracion/
│   ├── init_prod_db.sh
│   ├── web-data/          # filestore + sesiones Odoo
│   └── db-data/           # datos PostgreSQL Odoo
├── 19/                    # checkout de odoo-deploy branch 19
│   └── ...

/srv/odoo-addons/
├── 18/                    # checkout de odoo-addons branch 18
│   ├── orderflow_connector/
│   └── ...
├── 19/                    # checkout de odoo-addons branch 19
│   └── ...

/srv/odoo-l10n-py/
├── 18/                    # checkout de odoo-l10n-py branch 18
│   ├── l10n_py_ar/
│   └── ...
└── 19/                    # checkout de odoo-l10n-py branch 19
    └── ...
```

Regla: `odoo-deploy` nunca incluye addons. Solo monta `/srv/odoo-addons/<version>` y `/srv/odoo-l10n-py/<version>` como volumenes.

### 2.3 Árbol multi-tenant (ejemplo para múltiples clientes de la nube)

```
/srv/odoo-deploy/
├── 18/                                   # template base Odoo 18
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── config/
│   └── migracion/
├── 18_cliente_a/                         # instancia cliente A
│   ├── docker-compose.yml                # override / symlink al template
│   ├── .env                              # variables específicas
│   ├── web-data/                         # filestore cliente A
│   └── db-data/                          # PostgreSQL cliente A
├── 18_cliente_b/                         # instancia cliente B
│   ├── docker-compose.yml
│   ├── .env
│   ├── web-data/
│   └── db-data/
└── 19/
    ├── 19_cliente_x/
    │   ├── docker-compose.yml
    │   ├── .env
    │   ├── web-data/
    │   └── db-data/
    └── 19_cliente_y/
        ├── docker-compose.yml
        ├── .env
        ├── web-data/
        └── db-data/

/srv/odoo-addons/
├── 18/                                   # addons compartidos Odoo 18
│   ├── orderflow_connector/
│   └── ...
└── 19/                                   # addons compartidos Odoo 19
    └── ...

/srv/odoo-l10n-py/
├── 18/                                   # localizaciones compartidas Odoo 18
│   └── l10n_py_*/
└── 19/                                   # localizaciones compartidas Odoo 19
    └── l10n_py_*/
```

**Reglas multi-tenant:**
- Cada cliente tiene su propio `docker-compose.yml` override basado en el template de la versión
- Cada cliente tiene su `.env` con `WEB_HOST`, `WEB_PORT`, `DB_NAME`, `WEB_VOLUMES`, `DB_VOLUMES`
- Los addons y localizaciones se comparten por versión para evitar duplicación
- Los datos son completamente independientes por cliente
- El deploy por cliente no afecta a otros clientes

### 2.3 Docker Compose (version-aware)

```yaml
services:
  odoo:
    image: odoo:${ODOO_VERSION:-19}
    volumes:
      - /srv/odoo-deploy/${ODOO_VERSION:-19}:/etc/odoo
      - /srv/odoo-addons/${ODOO_VERSION:-19}:/mnt/extra-addons
      - /srv/odoo-l10n-py/${ODOO_VERSION:-19}:/mnt/l10n-py
      - odoo${ODOO_VERSION:-19}-data:/var/lib/odoo
    environment:
      - ODOO_VERSION=${ODOO_VERSION:-19}
```

---

## 3. Tareas de estandarización

### Fase 1: Crear estructura de repos (sin tocar producción)

1. **Crear `odoo-deploy`** con branches `18`, `19`
   - Contenido: `docker-compose.yml`, `deploy.sh`, `init_prod_db.sh`, `migracion/`, `config/`
   - Mover contenido actual de `odoo19CE` excluyendo addons
   - Mover contenido de `Odoo18CE` excluyendo addons

2. **Crear `odoo-addons`** con branches `18`, `19`
   - Extraer `orderflow_connector` de `/srv/odoo/odoo19CE/addons/`
   - Extraer addons de `/opt/odoo/odoo8084/addons/`
   - Mantener versionado por branch Odoo

3. **Crear `odoo-l10n-py`** con branches `18`, `19`
   - Mover localizaciones Paraguay existentes
   - Estructura: `l10n_py_*/` por modulo

### Fase 2: Estandarizar paths producción

4. **Definir paths canónicos:**
   ```
   /srv/odoo-deploy/<version>/     # checkout de odoo-deploy branch <version>
   /srv/odoo-addons/<version>/     # checkout de odoo-addons branch <version>
   /srv/odoo-l10n-py/<version>/    # checkout de odoo-l10n-py branch <version>
   ```

5. **Migrar instancias existentes:**
   - `/srv/odoo/odoo19CE/` → `/srv/odoo-deploy/19/`
   - `/srv/odoo8085/` → eliminar o archivar (definir en fase 2)
   - Volumenes Docker existentes se mantienen, solo cambian mounts

### 2.3 Árbol multi-tenant (ejemplo para múltiples clientes de la nube)

```
/srv/odoo-deploy/
├── 18/                                   # template base Odoo 18
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── config/
│   └── migracion/
├── 18_cliente_a/                         # instancia cliente A
│   ├── docker-compose.yml                # override / symlink al template
│   ├── .env                              # variables específicas
│   ├── web-data/                         # filestore cliente A
│   └── db-data/                          # PostgreSQL cliente A
├── 18_cliente_b/                         # instancia cliente B
│   ├── docker-compose.yml
│   ├── .env
│   ├── web-data/
│   └── db-data/
└── 19/
    ├── 19_cliente_x/
    │   ├── docker-compose.yml
    │   ├── .env
    │   ├── web-data/
    │   └── db-data/
    └── 19_cliente_y/
        ├── docker-compose.yml
        ├── .env
        ├── web-data/
        └── db-data/

/srv/odoo-addons/
├── 18/                                   # addons compartidos Odoo 18
│   ├── orderflow_connector/
│   └── ...
└── 19/                                   # addons compartidos Odoo 19
    └── ...

/srv/odoo-l10n-py/
├── 18/                                   # localizaciones compartidas Odoo 18
│   └── l10n_py_*/
└── 19/                                   # localizaciones compartidas Odoo 19
    └── l10n_py_*/
```

**Reglas multi-tenant:**
- Cada cliente tiene su propio `docker-compose.yml` override basado en el template de la versión
- Cada cliente tiene su `.env` con `WEB_HOST`, `WEB_PORT`, `DB_NAME`, `WEB_VOLUMES`, `DB_VOLUMES`
- Los addons y localizaciones se comparten por versión para evitar duplicación
- Los datos son completamente independientes por cliente
- El deploy por cliente no afecta a otros clientes
- Traefik routea por host: `cliente-a.odoo.provecchio.com` → `odoo_cliente_a:8069`

---

## 3. Automatización en OmniFlow

### 3.1 Módulo de Gestión Odoo (Backend)

Nuevo módulo backend: `backend/src/odoo-deploy/`

```
backend/src/odoo-deploy/
├── odoo-deploy.controller.ts       # API endpoints
├── odoo-deploy.service.ts          # Lógica de deploy
├── dto/
│   ├── create-tenant.dto.ts
│   └── deploy-version.dto.ts
└── odoo-deploy.module.ts
```

**Endpoints:**
- `POST /api/v1/odoo-deploy/tenants` — Crear nuevo tenant/cliente
- `GET /api/v1/odoo-deploy/tenants` — Listar tenants
- `POST /api/v1/odoo-deploy/tenants/:id/deploy` — Desplegar versión específica
- `POST /api/v1/odoo-deploy/tenants/:id/backup` — Backup manual
- `POST /api/v1/odoo-deploy/tenants/:id/restore` — Restaurar backup
- `GET /api/v1/odoo-deploy/tenants/:id/status` — Estado del deploy

### 3.2 Flujo Automatizado

```yaml
Trigger: Admin crea tenant desde OmniFlow
  ↓
1. OmniFlow valida configuración
  ↓
2. OmniFlow crea directorios en /srv/odoo-deploy/18/<tenant>/
  ↓
3. OmniFlow genera .env específico del tenant
  ↓
4. OmniFlow ejecuta docker compose up -d
  ↓
5. OmniFlow registra tenant en Traefik
  ↓
6. OmniFlow ejecuta init_db.sh
  ↓
7. OmniFlow verifica health check
  ↓
8. OmniFlow notifica completion
```

### 3.3 UI Admin

Nueva página en OmniFlow Admin: `/admin/odoo-deploy`

**Features:**
- Lista de tenants Odoo desplegados
- Estado de cada instancia (up/down/error)
- Botón deploy/restart por tenant
- Formulario de creación de tenant
- Logs en tiempo real
- Backup/restore con un click

---

## 4. Despliegue Manual (Documentación)

### 4.1 Prerrequisitos

- Acceso SSH al servidor Provecchio (`root@192.168.69.240` vía jump host `38.52.135.227:2021`)
- Docker y Docker Compose instalados
- Estructura de directorios creada (Fase 1)

### 4.2 Crear nuevo tenant manualmente

```bash
# 1. Crear directorios
mkdir -p /srv/odoo-deploy/18/cliente_nuevo/{web-data,db-data,config,migracion}
mkdir -p /srv/odoo-addons/18
mkdir -p /srv/odoo-l10n-py/18

# 2. Copiar template base
cp -r /srv/odoo-deploy/18/docker-compose.yml /srv/odoo-deploy/18/cliente_nuevo/
cp -r /srv/odoo-deploy/18/config/* /srv/odoo-deploy/18/cliente_nuevo/config/

# 3. Crear .env específico
cat > /srv/odoo-deploy/18/cliente_nuevo/.env << EOF
WEB_HOST=odoo_cliente_nuevo
WEB_IMAGE_NAME=odoo
WEB_IMAGE_TAG=18.0
WEB_PORT=8090
DB_IMAGE=postgres
DB_TAG=15
DB_HOST=db_cliente_nuevo
DB_PORT=5432
DB_NAME=cliente_nuevo
DB_USER=odoo
DB_PASSWD=odoo_segura
ADMIN_EMAIL=admin@cliente.com
ADMIN_PASSWORD=password_segura
WEB_ADDONS_CUSTOMIZE=/srv/odoo-addons/18
WEB_ADDONS_L10NPY=/srv/odoo-l10n-py/18
WEB_VOLUMES=/srv/odoo-deploy/18/cliente_nuevo/web-data
DB_VOLUMES=/srv/odoo-deploy/18/cliente_nuevo/db-data
EOF

# 4. Levantar servicios
cd /srv/odoo-deploy/18/cliente_nuevo
docker compose up -d

# 5. Ejecutar init de base de datos (solo primera vez)
docker compose exec web odoo -d cliente_nuevo -i base --without-demo=all --stop-after-init

# 6. Verificar health
curl -s http://localhost:8090/web/health
```

### 4.3 Rollback manual

```bash
# 1. Detener servicios
cd /srv/odoo-deploy/18/cliente_nuevo
docker compose down

# 2. Restaurar backup
docker compose up -d db
docker exec -i db_cliente_nuevo psql -U odoo cliente_nuevo < backup.sql

# 3. Levantar servicios
docker compose up -d
```

### 4.4 Troubleshooting común

| Problema | Solución |
|----------|----------|
| Permisos denegados en web-data | `chown -R 100:101 /srv/odoo-deploy/18/cliente_nuevo/web-data` |
| Puerto ocupado | Cambiar `WEB_PORT` en `.env` |
| Base de datos no conecta | Verificar `DB_HOST` y credenciales en `.env` |
| Traefik 502 | Verificar que el servicio esté registrado en Traefik |

---

## 4. Puntos de validación

| Check | Criterio |
|-------|----------|
| Repos creados | 3 repos con branches `18` y `19` |
| Paths producción | `/srv/odoo-deploy/18/`, `/srv/odoo-deploy/19/`, `/srv/odoo-addons/18/`, `/srv/odoo-addons/19/`, `/srv/odoo-l10n-py/18/`, `/srv/odoo-l10n-py/19/` |
| Docker | Volumenes montados correctamente, datos persistentes |
| CI/CD | Workflow dispara en push a branch version |
| Docs actualizadas | Referencias a paths nuevos, sin referencias a `odoo19CE` |
| Producción funcionando | Odoo 18 y 19 accesibles por Traefik sin 502 |

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Romper instancia Odoo producción | Hacer backup de DB y volúmenes antes de migrar paths |
| Pérdida de addons custom | Verificar que `orderflow_connector` y otros estén versionados en `odoo-addons` |
| Traefik 502 post-deploy | Asegurar red `traefik-public` y labels correctos en docker-compose |
| Conflicto de branches | Usar branch naming estricto: solo numeros `18`, `19`, `20` |

---

## 6. Pregunta pendiente al usuario

¿Querés que ordene eliminar/archivar los repos viejos (`odoo19CE`, `Odoo18CE`) una vez que la migración esté validada, o querés mantenerlos como read-only para auditoría?
