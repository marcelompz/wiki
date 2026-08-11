# Odoo Deploy Standardization

## 1. Visión General

Este documento define la estrategia de estandarización de despliegues de Odoo para OrderFlow/OmniFlow, aplicable tanto a despliegues manuales como a la futura automatización desde el panel admin.

**Alcance:** Odoo 18/19/20+ en servidores on-premise o cloud, con soporte multi-tenant.

---

## 2. Estructura de directorios

### 2.1 Template base por versión

```
/srv/odoo-deploy/
├── 18/
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── config/
│   │   └── odoo.conf
│   ├── migracion/
│   │   └── *.sql
│   ├── init_prod_db.sh
│   ├── modules.conf
│   ├── deploy.sh
│   ├── web-data/          # filestore + sesiones Odoo
│   └── db-data/           # datos PostgreSQL Odoo
├── 19/
│   └── ...
└── README.md
```

### 2.2 Addons y localizaciones compartidas

```
/srv/odoo-addons/
├── 18/
│   ├── orderflow_connector/
│   └── ...
└── 19/
    └── ...

/srv/odoo-l10n-py/
├── 18/
│   └── l10n_py_*/
└── 19/
    └── l10n_py_*/
```

### 2.3 Árbol multi-tenant (ejemplo)

```
/srv/odoo-deploy/
├── 18/
│   ├── docker-compose.yml          # template base
│   ├── .env.example
│   └── config/
├── 18_cliente_a/                   # instancia cliente A
│   ├── docker-compose.yml          # override o symlink al template
│   ├── .env                        # variables específicas
│   ├── web-data/                   # filestore cliente A
│   └── db-data/                    # PostgreSQL cliente A
├── 18_cliente_b/                   # instancia cliente B
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
```

**Reglas multi-tenant:**
- Cada cliente tiene su propio `docker-compose.yml` override basado en el template de la versión.
- Cada cliente tiene su `.env` con `WEB_HOST`, `WEB_PORT`, `DB_NAME`, `WEB_VOLUMES`, `DB_VOLUMES`.
- Addons y localizaciones se comparten por versión para evitar duplicación.
- Los datos son completamente independientes por cliente.
- Traefik routea por host: `cliente-a.odoo.provecchio.com` → `odoo_cliente_a:8069`.

---

## 3. Wizard de despliegue automatizado (OmniFlow)

### 3.1 Módulo backend

Ruta propuesta: `backend/src/odoo-deploy/`

```
backend/src/odoo-deploy/
├── odoo-deploy.controller.ts
├── odoo-deploy.service.ts
├── dto/
│   ├── create-tenant.dto.ts
│   ├── deploy-version.dto.ts
│   └── tenant-config.dto.ts
└── odoo-deploy.module.ts
```

**Endpoints:**
- `POST /api/v1/odoo-deploy/tenants` — Crear nuevo tenant/cliente
- `GET /api/v1/odoo-deploy/tenants` — Listar tenants
- `POST /api/v1/odoo-deploy/tenants/:id/deploy` — Desplegar versión específica
- `POST /api/v1/odoo-deploy/tenants/:id/backup` — Backup manual
- `POST /api/v1/odoo-deploy/tenants/:id/restore` — Restaurar backup
- `GET /api/v1/odoo-deploy/tenants/:id/status` — Estado del deploy
- `DELETE /api/v1/odoo-deploy/tenants/:id` — Eliminar tenant

### 3.2 Flujo del wizard

```yaml
1. Selección de servidor:
   - Si existe configuración de servidores: selector
   - Si no: formulario "Crear servidor"
   - Datos del servidor: nombre, host, puerto SSH, usuario, clave SSH, path base, estado

2. Ingreso de datos del tenant:
   - Nombre cliente
   - clientId (slug único)
   - Dominio público (ej: cliente-a.pesallaccia.com)
   - Versión Odoo (18/19/20)
   - Puerto web
   - Credenciales DB
   - Credenciales admin Odoo
   - Repositorios de addons/l10n (opcional)

3. Validación:
   - Verificar que el dominio no esté en uso
   - Validar accesibilidad del servidor destino
   - Verificar espacio en disco
   - Validar conectividad SSH

4. Aprobación:
   - Resumen de configuración
   - Confirmación de despliegue

5. Ejecución:
   - Crear directorios en /srv/odoo-deploy/<version>/<clientId>/
   - Generar .env específico
   - Copiar/crear docker-compose override
   - Ejecutar docker compose up -d
   - Registrar ruta en Traefik
   - Ejecutar init_db.sh si es nuevo
   - Verificar health check

6. Finalización:
   - URL pública generada
   - Credenciales admin generadas
   - Estado: activo
```

### 3.3 Formularios del wizard

#### 3.3.1 Formulario de servidor

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | sí | Nombre lógico del servidor |
| `host` | string | sí | Hostname o IP |
| `sshPort` | number | sí | Puerto SSH |
| `sshUser` | string | sí | Usuario SSH |
| `sshKey` | string | no | Clave SSH privada |
| `basePath` | string | sí | Path base en el servidor |
| `active` | boolean | sí | Estado activo/inactivo |

Validaciones:
- El host no puede estar duplicado
- Si se provee `sshKey`, debe ser una clave RSA/Ed25519 válida
- `basePath` debe ser escribible por el usuario SSH

#### 3.3.2 Formulario de tenant/deploy

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `serverId` | string | sí | Servidor destino |
| `clientId` | string | sí | Slug único del cliente |
| `clientName` | string | sí | Nombre del cliente |
| `domain` | string | sí | Dominio público |
| `odooVersion` | string | sí | Versión Odoo |
| `webPort` | number | sí | Puerto web |
| `dbName` | string | sí | Nombre de base de datos |
| `dbUser` | string | sí | Usuario DB |
| `dbPassword` | string | sí | Password DB |
| `adminEmail` | string | sí | Email admin Odoo |
| `adminPassword` | string | sí | Password admin Odoo |
| `addonsPath` | string | no | Addons custom |
| `l10nPath` | string | no | Localizaciones |
| `draftMode` | boolean | no | Modo borrador |

Validaciones:
- `clientId`: slug único, sin espacios
- `domain`: formato válido, no duplicado
- `webPort`: puerto libre en el servidor
- `dbName`: no duplicado en el servidor

### 3.4 Persistencia de servidores

Los servidores se almacenan en la base de datos de OmniFlow para poder reutilizarlos en deploys futuros.

Modelo propuesto:

```ts
interface OdooServer {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  sshUser: string;
  sshKey?: string;
  basePath: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Endpoint:
- `POST /api/v1/odoo-deploy/servers` — Crear servidor
- `GET /api/v1/odoo-deploy/servers` — Listar servidores
- `GET /api/v1/odoo-deploy/servers/:id` — Obtener servidor
- `PATCH /api/v1/odoo-deploy/servers/:id` — Actualizar servidor
- `DELETE /api/v1/odoo-deploy/servers/:id` — Eliminar servidor

### 3.3 UI Admin

Ruta propuesta: `/admin/odoo-deploy`

**Vistas:**
- Dashboard: lista de tenants con estado, versión, URL, acciones
- Wizard: formulario paso a paso para nuevo tenant
- Detalle: logs, health, backup/restore, eliminar
- Configuración global: servidores destino, plantillas por versión

---

## 4. Despliegue manual

### 4.1 Prerrequisitos

- Acceso SSH al servidor destino
- Docker y Docker Compose instalados
- Estructura de directorios creada
- Addons y l10n copiados en `/srv/odoo-addons/<version>/` y `/srv/odoo-l10n-py/<version>/`

### 4.2 Crear nuevo tenant manualmente

```bash
# 1. Crear directorios
mkdir -p /srv/odoo-deploy/18/cliente_nuevo/{web-data,db-data,config,migracion}

# 2. Copiar template base
cp /srv/odoo-deploy/18/docker-compose.yml /srv/odoo-deploy/18/cliente_nuevo/
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
| Traefik 502 | Verificar que el servicio esté registrado y en la misma red |
| Sesiones no escriben | Verificar permisos en `/var/lib/odoo/sessions` dentro del volumen |

---

## 5. Integración con OrderFlow/OmniFlow

### 5.1 Módulo de gestión Odoo

El wizard debe vivir en OmniFlow como módulo operativo, separado del módulo de integración Odoo existente.

**Responsabilidades:**
- Gestión del ciclo de vida de instancias Odoo por cliente
- Despliegue automatizado de instancias
- Backup/restore por instancia
- Monitoreo de salud y logs
- Gestión de Traefik routes por host

### 5.2 Seguridad

- El wizard requiere permisos `super-admin` o `odoo-deploy:manage`.
- Las credenciales de Odoo/DB se almacenan en `.env` con permisos restrictivos (`600`).
- El acceso a `/srv/odoo-deploy/` se controla por usuario del sistema.

### 5.3 Auditoría

- Cada acción del wizard genera un log en `logs/odoo-deploy/`.
- Se registra: quién, cuándo, qué tenant, qué acción.
- Backups automáticos antes de cada deploy.

---

## 6. Próximos pasos

1. Implementar backend `odoo-deploy` module.
2. Implementar UI admin `/admin/odoo-deploy`.
3. Agregar validaciones de servidor y disco.
4. Agregar métricas y alertas por instancia.
5. Sincronizar con Traefik dinámicamente.
