# OmniFlow como plataforma de gestión de infraestructura

**Fecha:** 2026-08-11  
**Contexto:** OmniFlow es el sistema principal desde el cual se gestiona la empresa de tecnología y se orquesta el despliegue de todos los servicios (Odoo, OrderFlow/OmniFlow multi-tenant, Axon Ecosystem, AIEER, VitaLog, LeadQualifierCRM y futuros sistemas).

El documento original `Infrastructure Deploy.md` ya apunta en esta dirección. A continuación se formalizan los ajustes recomendados para que el diseño refleje el rol real de OmniFlow.

---

## 1. Naming y ownership

- Renombrar de “odoo-deploy” / “odoo-deploy-manager” a algo genérico: **`deploy-manager`** o **`infra-deploy`**.
- Rutas de API y UI:
  - API: `/api/v1/deploy-manager/...`
  - UI Admin: `/admin/deploy` (o `/admin/infrastructure`)
- El módulo vive dentro de OmniFlow como capacidad de **Super Admin**, no como extensión del conector Odoo.

---

## 2. Modelo de datos unificado

Mantener las entidades `Server` y `DeployInstance`.

- `system` es el discriminador principal:  
  `odoo | orderflow | axon | aieer | vitalog | leadqualifier | other`
- `extraConfig` (JSON) es el lugar correcto para particularidades por sistema:
  - módulos Odoo a instalar
  - seed de OrderFlow
  - flags de Axon
  - cualquier configuración específica del sistema

### Interfaces propuestas

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

---

## 3. Directorios y templates

La estructura ya definida escala correctamente:

```
/srv/<sistema>-deploy/<version>/          # template base
/srv/<sistema>-deploy/<instance>/         # instancia concreta
/srv/<sistema>-addons/<version>/          # addons/código compartido
```

Ejemplos:
- `/srv/odoo-deploy/18/` + `/srv/odoo-deploy/18_cliente_a/`
- `/srv/orderflow-deploy/main/` + `/srv/orderflow-deploy/provecchio/`
- `/srv/axon-deploy/stable/` + `/srv/axon-deploy/cliente_x/`

**Reglas:**
- Cada instancia tiene su propio `docker-compose.yml` (override o basado en el template).
- Cada instancia tiene su `.env` con puertos, nombres de contenedor, DB y volúmenes.
- Addons/localizaciones se comparten por sistema/versión.
- Los datos (web-data, db-data) son completamente independientes por instancia.
- Traefik routea por host público.

---

## 4. Wizard genérico de despliegue

Los pasos existentes son correctos y se mantienen:

1. Selección de sistema
2. Selección / creación de servidor
3. Datos de la instancia
4. Validación (dominio libre en Traefik, puerto libre, SSH, espacio en disco)
5. Aprobación (resumen + confirmación)
6. Ejecución (directorios, `.env`, compose, Traefik, init/seed, health-check)
7. Finalización (URL pública, credenciales, estado activo)

La parte de **ejecución** debe ser pluggable por sistema (handlers distintos para init de Odoo, seed de OrderFlow, health-check de Axon, etc.).

---

## 5. Seguridad y auditoría

- Permiso específico: `infra:deploy` / `super-admin`.
- Credenciales siempre en `.env` con permisos `600`.
- Si es posible, credenciales cifradas también en la base de datos de OmniFlow.
- Log de cada acción (quién, cuándo, instancia, acción).
- Backup automático previo a cada deploy / restore.

---

## 6. Próximos pasos prioritarios

1. Backend `deploy-manager` (CRUD de servidores + instancias + acciones de ciclo de vida).
2. UI Super Admin (`/admin/deploy`) con dashboard + wizard.
3. Validaciones (SSH, puerto libre, dominio no duplicado en Traefik, espacio en disco).
4. Handlers por sistema (empezando por Odoo y OrderFlow).
5. Integración dinámica con Traefik.
6. Métricas y alertas por instancia.

---

## Resumen

OmniFlow deja de ser solo el acelerador comercial original (OrderFlow) y se convierte en la **plataforma central** de la empresa de tecnología: gestión operativa + orquestación del despliegue y ciclo de vida de toda la infraestructura de servicios.

El módulo `deploy-manager` debe diseñarse desde el inicio como genérico y extensible, no centrado exclusivamente en Odoo.
