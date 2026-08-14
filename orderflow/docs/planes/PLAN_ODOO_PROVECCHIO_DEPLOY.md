# Plan Detallado: Deploy Odoo 18 Provecchio desde OmniFlow

## 1. Estado Actual de Provecchio

### 1.1 Infraestructura Detectada
- **Servidor:** `dimoraserverlocal` (`root@192.168.69.240`)
- **Directorio:** `/srv/odoo-deploy/18_provecchio/`
- **Docker Compose:** proyecto `18_provecchio`
- **Contenedores:**
  - `odoo_provecchio` (Up 2h, puerto 8086→8069)
  - `db_provecchio` (Up 2h, puerto 5772→5432)
  - `odoo_init_db_18` (Exited 0, 2h ago)
- **Histórico:** también existe `odoo_web_8085`/`db_odoo_8085` (versión anterior, 25h)

### 1.2 Estado de OmniFlow
- **Tenant:** Provecchio Di Mora (único tenant en el servidor)
- **Base de datos:** Schema sincronizado (troubleshooting #32 resuelto)
- **Módulo deploy-manager:** FEAT-059 en `in_progress`, backend funcional

## 2. Diagnóstico del Deploy Anterior

### 2.1 Hallazgos de Logs
- **Odoo:** logs actuales sin errores (cron jobs funcionando)
- **PostgreSQL:** estable, checkpoints normales
- **Docker events:** contenedores creados hace 2h, init exitoso (exit 0)

### 2.2 Problemas Identificados
El deploy anterior **no falló en Odoo en sí**, sino en la **integración OmniFlow↔Odoo**:

1. **Sin registro en OmniFlow:** la instancia `18_provecchio` no existe como `DeployInstance` en la DB de OmniFlow
2. **Sin conector instalado:** `orderflow_connect` no fue instalado en el Odoo desplegado
3. **Sin `odooConnection`:** el tenant no tiene configurado el campo `odooConnection` en OmniFlow
4. **Script no integrado:** el `deploy.sh` real de Provecchio nunca fue invocado desde el wizard de OmniFlow; se ejecutó manualmente por SSH

### 2.3 Troubleshooting Aplicable
- **#03** — Sincronización Odoo & módulos tenant (diff de usuarios)
- **#32** — Schema drift (ya resuelto, pero verificar columnas `deploy_instances`, `odooConnection`)
- **#24** — Bugs deploy script (ya corregidos en `deploy-production.sh`, pero `deploy-manager` aún no usa el script real)

## 3. Objetivo del Plan

Ejecutar el **deploy.sh real de Provecchio** desde el wizard `/admin/deploy` de OmniFlow, con:

- Tenant asociado automáticamente (`Provecchio Di Mora`)
- Instalación del conector `orderflow_connect`
- Configuración de `odooConnection` en el tenant
- Generación de passwords aleatorios
- Informe de deploy con credenciales visibles en el frontend

## 4. Arquitectura de la Solución

### 4.1 Estructura de Directorios (Canónica)

```
/srv/odoo-deploy/
├── 18/                              # Template base Odoo 18
│   ├── docker-compose.yml
│   ├── .env.example
│   └── config/
├── 18_provecchio/                   # Instancia Provecchio
│   ├── docker-compose.yml           # Override con variables específicas
│   ├── .env                         # Variables específicas
│   ├── deploy.sh                    # Script de deploy real
│   ├── init_prod_db.sh              # Script de inicialización
│   ├── Dockerfile                   # Imagen custom con dependencias
│   ├── config/                      # Configuración Odoo
│   ├── migracion/                   # Scripts de importación
│   ├── web-data/                    # Filestore + sesiones
│   ├── db-data/                     # PostgreSQL
│   └── logs/                        # Logs de deploy

/srv/odoo-addons/
└── 18/                              # Addons custom (orderflow_connector, etc.)

/srv/odoo-l10n-py/
└── 18/                              # Localización Paraguay
```

### 4.2 Flujo
```
Super Admin /admin/deploy
    ↓
Crear/Seleccionar instancia Odoo 18 Provecchio
    ↓
Backend valida: servidor, dominio, puerto
    ↓
Backend ejecuta deploy.sh REAL por SSH (no template)
    ↓
deploy.sh: docker compose down/up + init_prod_db.sh + migración
    ↓
Backend instala orderflow_connect vía SSH
    ↓
Backend guarda odooConnection en Tenant
    ↓
Frontend muestra informe con passwords generados
```

### 4.3 Principios
- **No condicionar lógica** por `ORDERFLOW_MODE`
- **`tenantId` sagrado:** siempre presente en queries
- **Traefik exclusivo:** rutas managed por `/opt/traefik-orderflow`
- **Script respetado:** usar `deploy.sh` real del servidor sin reescribirlo
- **Estructura canónica:** respetar directorios `/srv/odoo-deploy/<version>/<tenant>/`, `/srv/odoo-addons/<version>/`, `/srv/odoo-l10n-py/<version>/`

## 5. Cambios Específicos

### 5.1 Backend — `OdooDeployHandler`

**Archivo:** `backend/src/deploy-manager/handlers/odoo/odoo.handler.ts`

**Cambios:**
- En `deploy()`, ejecutar el `deploy.sh` real de la instancia por SSH
- El path se construye según la estructura canónica:
  - Instancia: `${server.basePath}/${instance.version}/${instance.instanceName}`
  - Addons: `${server.basePath.replace('odoo-deploy', 'odoo-addons')}/${instance.version}`
  - L10N: `${server.basePath.replace('odoo-deploy', 'odoo-l10n-py')}/${instance.version}`
- Usar `DeploySshService.executeCommand()` para ejecutar el script
- Capturar stdout/stderr para el informe
- Generar passwords aleatorios si no vienen en el DTO
- Retornar `deploymentReport` con todas las credenciales

**Código base:**
```typescript
async deploy(instance: DeployInstance, server: Server, draftMode?: boolean): Promise<any> {
  if (draftMode) return { success: true, mode: 'draft', ... };

  const edition = instance.extraConfig?.edition || 'ce';
  const instancePath = `${server.basePath}/${instance.version}/${instance.instanceName}`;
  const addonsPath = `${server.basePath.replace('odoo-deploy', 'odoo-addons')}/${instance.version}`;
  const l10nPath = `${server.basePath.replace('odoo-deploy', 'odoo-l10n-py')}/${instance.version}`;

  const dbPassword = instance.dbPassword || generateRandomPassword();
  const adminPassword = instance.adminPassword || generateRandomPassword();

  await this.executeOdooDeploy(instance, server, instancePath, addonsPath, l10nPath, dbPassword, adminPassword);

  return {
    success: true,
    mode: 'production',
    deploymentReport: {
      tenantId: instance.tenantId,
      instanceName: instance.instanceName,
      version: instance.version,
      edition,
      domain: instance.domain,
      webPort: instance.webPort,
      dbName: instance.dbName,
      dbUser: instance.dbUser,
      dbPassword,
      adminEmail: instance.adminEmail,
      adminPassword,
      instancePath,
      addonsPath,
      l10nPath,
      server: { host: server.host, basePath: server.basePath },
    },
    ...
  };
}
```

### 5.2 Backend — `DeployManagerService`

**Archivo:** `backend/src/deploy-manager/deploy-manager.service.ts`

**Cambios:**
- Ya aplicado: `deployInstance()` ahora mergea el resultado del handler con el `instance` actualizado de DB
- Asegurar que el informe completo (`deploymentReport`) se retorne al frontend

### 5.3 Backend — `OdooIntegrationService`

**Archivo:** `backend/src/deploy-manager/integrations/odoo-integration.service.ts`

**Cambios:**
- Mover la instalación de `orderflow_connect` desde el handler al post-deploy flow
- Después de `deployInstance()`, llamar a `connectOdooToOmniFlow()`
- Capturar errores sin abortar el deploy (ya está implementado así)

### 5.4 Backend — Validaciones

**Archivo:** `backend/src/deploy-manager/deploy-validation.service.ts`

**Mejoras:**
- `validateServerAccess()`: verificar conectividad SSH real antes de crear instancia
- `validateDomainAvailable()`: verificar que el dominio no esté ya en Traefik
- `validatePortAvailable()`: verificar puerto en el servidor destino (no solo en DB)

### 5.5 Frontend — Wizard `/admin/deploy`

**Archivo:** `frontend/src/pages/admin/deploy-manager.tsx`

**Cambios:**
- **Formulario de instancia Odoo:**
  - Pre-llenar `system: "odoo"`, `version: "18"`, `instanceName: "18_provecchio"`
  - Pre-llenar `serverId`, `domain: "provecchio.com"`, `webPort: 8086`
  - Campo `tenantId` visible y pre-seleccionado
  - Checkbox `--with-products` para importar datos del tenant
  - Checkbox `--clean` para limpiar DB (solo SuperAdmin)
- **Informe de deploy:**
  - Mostrar `deploymentReport` completo
  - Mostrar passwords generados en campos `<Text code copyable>`
  - Mostrar estado de instalación de `orderflow_connect`
  - Mostrar estado de `odooConnection`

### 5.6 Prisma Schema

**Archivo:** `backend/prisma/schema.prisma`

**Verificar:**
- Modelo `DeployInstance` tiene `system`, `instanceName`, `version`, `domain`, `webPort`, `dbName`, `dbUser`, `dbPassword`, `adminEmail`, `adminPassword`, `addonsPath`, `extraConfig`
- Modelo `Tenant` tiene `odooConnection` (Json?)
- Índices necesarios para `DeployInstance`

## 6. Pasos de Implementación

### Paso 1: Adaptar OdooDeployHandler (2h)
- Modificar `deploy()` para ejecutar `deploy.sh` real por SSH
- Agregar validación de existencia del script
- Capturar output completo
- Generar passwords seguros

### Paso 2: Mejorar Validaciones (1h)
- `validateServerAccess()`: SSH connectivity check
- `validateDomainAvailable()`: verificar Traefik
- `validatePortAvailable()`: verificar puerto en servidor destino

### Paso 3: Post-Deploy Integration (1h)
- Asegurar que `OdooIntegrationService.connectOdooToOmniFlow()` se ejecute después del deploy
- Retry logic si la instalación del conector falla
- Actualizar `Tenant.odooConnection` con la config real

### Paso 4: Frontend Wizard (2h)
- Pre-llenar formulario para Provecchio
- Modales de confirmación para `--clean` y `--with-products`
- Mostrar `deploymentReport` con credenciales
- Botón de copiar credenciales

### Paso 5: Pruebas (2h)
- Unit tests: `OdooDeployHandler` con mock de SSH
- Integration test: deploy end-to-end en staging
- Validar que `orderflow_connect` se instale
- Validar que `odooConnection` se guarde

### Paso 6: Deploy a Producción (1h)
- Ejecutar `./scripts/init.sh`
- Commit + push
- Deploy a Provecchio con `./scripts/deploy-production.sh provecchio`

## 7. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `deploy.sh` no es idempotente | Ejecutar solo si `status = pending` o `draftMode` |
| SSH key no configurada | Validar en `validateServerAccess()` |
| Puerto ocupado | `validatePortAvailable()` contra servidor destino |
| Dominio duplicado | `validateDomainAvailable()` |
| `orderflow_connect` no se instala | Retry 3x, luego marcar `odooConnection.status = 'error'` |
| DB preexistente se sobrescribe | `deploy.sh` ya protege con `IS_NEW_DB` check |
| Traefik 502 | `DeployTraefikService` ya maneja `ensureRouteForInstance` |

## 8. Criterios de Aceptación

- [ ] Desde `/admin/deploy` se puede crear/editar la instancia `18_provecchio`
- [ ] Al ejecutar deploy, se invoca el `deploy.sh` real del servidor
- [ ] El contenedor Odoo queda corriendo con los datos de Provecchio
- [ ] Se instala `orderflow_connect` en el Odoo desplegado
- [ ] El tenant tiene `odooConnection` configurado en OmniFlow
- [ ] El informe muestra passwords generados y estado de conexión
- [ ] `./scripts/init.sh` pasa sin errores

## 9. Preguntas Pendientes

1. ¿El `deploy.sh` actual de Provecchio debe ejecutarse con `-y` (no interactivo) desde el wizard?
2. ¿Qué pasa si la instancia ya existe en Docker pero no en OmniFlow? ¿Se registra o se redeploya?
3. ¿Los scripts de migración (`import_*.py`) deben ejecutarse siempre o solo en deploy inicial?
