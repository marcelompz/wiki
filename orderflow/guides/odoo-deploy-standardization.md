# Infrastructure Deploy Manager (OmniFlow)

## 1. Visión General

Este documento define la estrategia de estandarización de despliegues de infraestructura gestionada desde OmniFlow, aplicable tanto a despliegues manuales como a la automatización desde el panel de Super Admin.

**Alcance:** despliegue y gestión de instancias de:
- Odoo (18/19/20+)
- OmniFlow/OrderFlow (multi-tenant)
- Axon Ecosystem
- AIEER
- VitaLog
- LeadQualifierCRM
- Otros sistemas gestionados

**Regla de separación (OBLIGATORIA):**
- El deploy de OrderFlow (`deploy-production.sh`, `docker-compose.prod.yml`) **NO incluye instancias de Odoo ni de otros sistemas**.
- Las instancias de Odoo se despliegan en servidores independientes y no comparten el stack de contenedores de OrderFlow.
- Los datos de paths (`/srv/odoo-deploy`, `/srv/odoo-addons`, etc.) se conservan como configuración de referencia.
- La creación y ciclo de vida de instancias se realiza exclusivamente desde `/admin/deploy` (Infrastructure Deploy Manager).

---

## 2. Repositorios oficiales

| Repo | URL | Propósito |
|------|-----|-----------|
| `odoo-deploy` | https://github.com/marcelompz/odoo-deploy.git | Infraestructura Docker Compose Odoo, scripts de deploy, configuraciones Traefik |
| `odoo-addons` | https://github.com/marcelompz/odoo-addons.git | Addons custom Odoo (`orderflow_connector`, etc.) |
| `odoo-l10n-py` | https://github.com/marcelompz/odoo-l10n-py.git | Localizaciones Paraguay / l10n_py |
| `traefik-orderflow` | https://github.com/marcelompz/traefik-orderflow.git | Configuración Traefik compartida para OrderFlow, Odoo y otros sistemas |
| `orderflow` | https://github.com/marcelompz/orderflow.git | Código fuente OmniFlow/OrderFlow |

**Branch strategy:** cada repo usa branches por versión cuando aplique: `18`, `19`, `20`, etc.

---

## 3. Modelo de deploy

### 3.1 Tipos de instancia

Cada sistema gestionado puede tener múltiples instancias desplegadas en servidores físicos o cloud.

**Instancia =** combinación única de:
- Servidor destino
- Sistema/versión
- Tenant/cliente
- Puerto web
- Base de datos
- Host público

### 3.2 Directorios canónicos

```
/srv/<sistema>-deploy/
├── <version>/
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── config/
│   ├── migracion/
│   ├── init_prod_db.sh
│   ├── modules.conf
│   ├── deploy.sh
│   ├── web-data/
│   └── db-data/
├── <tenant>/
│   ├── docker-compose.yml
│   ├── .env
│   ├── web-data/
│   └── db-data/
```

Ejemplos:
- `/srv/odoo-deploy/18/` + `/srv/odoo-deploy/18_cliente_a/`
- `/srv/orderflow-deploy/main/` + `/srv/orderflow-deploy/provecchio/`
- `/srv/axon-deploy/stable/` + `/srv/axon-deploy/cliente_x/`

### 3.3 Recursos compartidos por sistema

```
/srv/<sistema>-addons/
├── <version>/
│   └── ...

/srv/<sistema>-l10n-py/
├── <version>/
│   └── ...
```

Ejemplos:
- `/srv/odoo-addons/18/`
- `/srv/orderflow-addons/main/`

### 2.3 Árbol multi-instancia (ejemplo Odoo)

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

**Reglas multi-instancia:**
- Cada instancia tiene su propio `docker-compose.yml` override basado en el template del sistema/versión.
- Cada instancia tiene su `.env` con puertos, nombres de contenedor, DB y volúmenes.
- Addons/localizaciones se comparten por sistema/versión para evitar duplicación.
- Los datos son completamente independientes por instancia.
- Traefik routea por host: `cliente-a.odoo.provecchio.com` → `odoo_cliente_a:8069`.

Ejemplo para otros sistemas:
- `/srv/orderflow-deploy/main/` → instancia core OmniFlow
- `/srv/axon-deploy/stable/` → instancia Axon Ecosystem
- `/srv/aieer-deploy/v1/` → instancia AIEER
- `/srv/vitalog-deploy/prod/` → instancia VitaLog
- `/srv/leadqualifier-deploy/prod/` → instancia LeadQualifierCRM

---

## 3. Wizard de despliegue automatizado (OmniFlow Super Admin)

### 3.1 Módulo backend

Ruta propuesta: `backend/src/deploy-manager/`

```
backend/src/deploy-manager/
├── deploy-manager.controller.ts
├── deploy-manager.service.ts
├── dto/
│   ├── create-server.dto.ts
│   ├── create-instance.dto.ts
│   └── deploy-action.dto.ts
└── deploy-manager.module.ts
```

**Endpoints:**
- `POST /api/v1/deploy-manager/servers` — Crear/registrar servidor
- `GET /api/v1/deploy-manager/servers` — Listar servidores
- `PATCH /api/v1/deploy-manager/servers/:id` — Actualizar servidor
- `DELETE /api/v1/deploy-manager/servers/:id` — Eliminar servidor

- `POST /api/v1/deploy-manager/instances` — Crear nueva instancia
- `GET /api/v1/deploy-manager/instances` — Listar instancias
- `GET /api/v1/deploy-manager/instances/:id` — Obtener instancia
- `POST /api/v1/deploy-manager/instances/:id/deploy` — Desplegar/redesplegar
- `POST /api/v1/deploy-manager/instances/:id/start` — Iniciar
- `POST /api/v1/deploy-manager/instances/:id/stop` — Detener
- `POST /api/v1/deploy-manager/instances/:id/restart` — Reiniciar
- `POST /api/v1/deploy-manager/instances/:id/backup` — Backup manual
- `POST /api/v1/deploy-manager/instances/:id/restore` — Restaurar backup
- `GET /api/v1/deploy-manager/instances/:id/status` — Estado del deploy
- `DELETE /api/v1/deploy-manager/instances/:id` — Eliminar instancia

### 3.2 Flujo del wizard

```yaml
1. Selección de sistema:
   - Odoo (18/19/20)
   - OmniFlow/OrderFlow
   - Axon Ecosystem
   - AIEER
   - VitaLog
   - LeadQualifierCRM
   - Otro

2. Selección de servidor:
   - Si existe configuración de servidores: selector
   - Si no: formulario "Crear servidor"
   - Datos del servidor: nombre, host, puerto SSH, usuario, clave SSH, path base, estado

3. Ingreso de datos de la instancia:
   - Nombre de instancia
   - Tenant/cliente asociado (opcional para sistemas multi-tenant)
   - Versión del sistema
   - Host público (ej: cliente-a.pesallaccia.com)
   - Puerto web
   - Credenciales DB
   - Credenciales admin del sistema
   - Repositorios/addons específicos (opcional)

4. Validación:
   - Verificar que el dominio público no esté en uso en Traefik
   - Validar que el puerto web esté libre en el servidor destino
   - Validar accesibilidad SSH al servidor
   - Verificar espacio en disco

5. Aprobación:
   - Resumen de configuración
   - Confirmación de despliegue

6. Ejecución:
   - Crear directorios en /srv/<sistema>-deploy/<version>/<instancia>/
   - Generar .env específico
   - Copiar/crear docker-compose override
   - Ejecutar docker compose up -d
   - Registrar ruta en Traefik
   - Ejecutar init/seed si aplica
   - Verificar health check

7. Finalización:
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
- `host` único entre servidores
- Si se provee `sshKey`, debe ser una clave RSA/Ed25519 válida
- `basePath` debe ser escribible por el usuario SSH

#### 3.3.2 Formulario de instancia

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `system` | string | sí | Sistema a desplegar: `odoo`, `orderflow`, `axon`, `aieer`, `vitalog`, `leadqualifier`, `other` |
| `serverId` | string | sí | Servidor destino |
| `instanceName` | string | sí | Nombre de la instancia |
| `tenantId` | string | no | Tenant asociado (para sistemas multi-tenant) |
| `version` | string | sí | Versión del sistema |
| `domain` | string | sí | Dominio público |
| `webPort` | number | sí | Puerto web |
| `dbName` | string | sí | Nombre de base de datos |
| `dbUser` | string | sí | Usuario DB |
| `dbPassword` | string | sí | Password DB |
| `adminEmail` | string | sí | Email admin |
| `adminPassword` | string | sí | Password admin |
| `addonsPath` | string | no | Addons/código custom |
| `extraConfig` | json | no | Configuración específica del sistema |

Validaciones:
- `domain`: formato válido, no duplicado en Traefik
- `webPort`: puerto libre en el servidor
- `dbName`: no duplicado en el servidor
- `instanceName` + `system` + `version`: único por servidor

### 3.4 Persistencia de servidores e instancias

Los servidores e instancias se almacenan en la base de datos de OmniFlow para poder reutilizarlos en deploys futuros.

Modelos propuestos:

```ts
interface Server {
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

interface DeployInstance {
  id: string;
  serverId: string;
  system: string; // odoo, orderflow, axon, aieer, vitalog, leadqualifier, other
  instanceName: string;
  tenantId?: string;
  version: string;
  domain: string;
  webPort: number;
  dbName: string;
  dbUser: string;
  dbPassword?: string;
  adminEmail: string;
  adminPassword?: string;
  addonsPath?: string;
  extraConfig?: any;
  status: string; // pending, running, error, stopped
  lastDeployedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.5 UI Admin

Ruta propuesta: `/admin/deploy`

**Vistas:**
- Dashboard: lista de instancias con estado, versión, URL, acciones
- Wizard: formulario paso a paso para nueva instancia
- Detalle: logs, health, backup/restore, lifecycle (start/stop/restart), eliminar
- Configuración global: servidores destino, plantillas por sistema/versión

---

## 4. Seguridad y auditoría

- Permiso específico: `infra:deploy` / `super-admin`.
- Credenciales siempre en `.env` con permisos `600`.
- Si es posible, credenciales cifradas también en la base de datos de OmniFlow.
- Log de cada acción (quién, cuándo, instancia, acción).
- Backup automático previo a cada deploy / restore.

---

## 5. Despliegue manual

### 5.1 Prerrequisitos

- Acceso SSH al servidor destino
- Docker y Docker Compose instalados
- Estructura de directorios creada
- Addons y localizaciones copiados según sistema

### 5.2 Crear nueva instancia manualmente

```bash
# 1. Crear directorios
mkdir -p /srv/<sistema>-deploy/<version>/<instancia>/{web-data,db-data,config,migracion}

# 2. Copiar template base
cp /srv/<sistema>-deploy/<version>/docker-compose.yml /srv/<sistema>-deploy/<version>/<instancia>/
cp -r /srv/<sistema>-deploy/<version>/config/* /srv/<sistema>-deploy/<version>/<instancia>/config/

# 3. Crear .env específico
cat > /srv/<sistema>-deploy/<version>/<instancia>/.env << EOF
WEB_HOST=<instancia>
WEB_IMAGE_NAME=<sistema>
WEB_IMAGE_TAG=<version>
WEB_PORT=<puerto>
DB_IMAGE=postgres
DB_TAG=15
DB_HOST=db_<instancia>
DB_PORT=5432
DB_NAME=<instancia>
DB_USER=<db_user>
DB_PASSWD=<db_password>
ADMIN_EMAIL=<admin_email>
ADMIN_PASSWORD=<admin_password>
ADDONS_PATH=/srv/<sistema>-addons/<version>
WEB_VOLUMES=/srv/<sistema>-deploy/<version>/<instancia>/web-data
DB_VOLUMES=/srv/<sistema>-deploy/<version>/<instancia>/db-data
EOF

# 4. Levantar servicios
cd /srv/<sistema>-deploy/<version>/<instancia>
docker compose up -d

# 5. Ejecutar init/seed si aplica
docker compose exec web <comando_init_segun_sistema>

# 6. Verificar health
curl -s http://localhost:<puerto>/web/health
```

### 5.3 Rollback manual

```bash
# 1. Detener servicios
cd /srv/<sistema>-deploy/<version>/<instancia>
docker compose down

# 2. Restaurar backup
docker compose up -d db
docker exec -i db_<instancia> <comando_restore> < backup.sql

# 3. Levantar servicios
docker compose up -d
```

### 5.4 Troubleshooting común

| Problema | Solución |
|----------|----------|
| Permisos denegados en web-data | `chown -R 100:101 /srv/<sistema>-deploy/<version>/<instancia>/web-data` |
| Puerto ocupado | Cambiar `WEB_PORT` en `.env` |
| Base de datos no conecta | Verificar `DB_HOST` y credenciales en `.env` |
| Traefik 502 | Verificar que el servicio esté registrado y en la misma red |
| Sesiones no escriben | Verificar permisos en `/var/lib/<sistema>/sessions` dentro del volumen |

---

## 6. Integración con OmniFlow

### 6.1 Módulo deploy-manager

El wizard debe vivir en OmniFlow como módulo de Super Admin, separado de los conectores específicos por sistema.

**Responsabilidades:**
- Gestión del ciclo de vida de instancias de cualquier sistema gestionado
- Despliegue automatizado de instancias
- Backup/restore por instancia
- Monitoreo de salud y logs
- Gestión de Traefik routes por host
- Gestión multi-tenant

### 6.2 Seguridad

- El módulo requiere permisos `super-admin` o `infra:deploy`.
- Las credenciales de DB/admin se almacenan en `.env` con permisos restrictivos (`600`).
- El acceso a `/srv/<sistema>-deploy/` se controla por usuario del sistema.

### 6.3 Auditoría

- Cada acción del wizard genera un log.
- Se registra: quién, cuándo, qué instancia, qué acción.
- Backups automáticos previos a cada deploy / restore.

---

## 7. Próximos pasos

1. Backend `deploy-manager` (CRUD de servidores + instancias + acciones de ciclo de vida).
2. UI Super Admin (`/admin/deploy`) con dashboard + wizard.
3. Validaciones (SSH, puerto libre, dominio no duplicado en Traefik, espacio en disco).
4. Handlers por sistema (empezando por Odoo y OrderFlow).
5. Integración dinámica con Traefik.
6. Métricas y alertas por instancia.
